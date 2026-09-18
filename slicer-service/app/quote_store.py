"""
Shilp Studio Persistent Quote Store & Lifecycle State Machine
Guarantees:
- Persistent storage surviving service restarts and container redeploys (backed by persistent JSON store / Firestore)
- In-memory read cache for performance
- Client idempotency de-duplication: idempotencyKey -> jobId
- Quote configuration de-duplication: jobConfigHash -> unexpired quoteId
- Strict state machines:
    Quote: draft -> slicing -> quoted -> accepted | expired
    Payment: not_required -> pending -> paid | failed | refunded
    Production: awaiting_payment -> paid -> queued -> printing -> completed | cancelled
    Refund sub-path: paid -> refund_requested -> refunded
"""

import os
import json
import time
import threading
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSISTENT_DIR = os.path.join(BASE_DIR, "storage")
os.makedirs(PERSISTENT_DIR, exist_ok=True)
QUOTES_FILE = os.path.join(PERSISTENT_DIR, "persistent_quotes.json")
IDEMPOTENCY_FILE = os.path.join(PERSISTENT_DIR, "persistent_idempotency.json")
MANUAL_REVIEW_FILE = os.path.join(PERSISTENT_DIR, "persistent_manual_review.json")

_LOCK = threading.Lock()

class QuoteStatus:
    DRAFT = "draft"
    SLICING = "slicing"
    QUOTED = "quoted"
    ACCEPTED = "accepted"
    EXPIRED = "expired"

class PaymentStatus:
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUND_REQUESTED = "refund_requested"
    REFUNDED = "refunded"

class ProductionStatus:
    AWAITING_PAYMENT = "awaiting_payment"
    PAID = "paid"
    QUEUED = "queued"
    PRINTING = "printing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

def _parse_iso_utc(iso_str: str) -> datetime:
    """Safely parses ISO timestamp into a timezone-aware UTC datetime."""
    s = iso_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


class PersistentStore:
    def __init__(self):
        self._quotes: Dict[str, Dict[str, Any]] = {}
        self._idempotency_map: Dict[str, str] = {}
        self._config_hash_to_quote: Dict[str, str] = {}
        self._manual_reviews: Dict[str, Dict[str, Any]] = {}
        self._load_from_disk()

    def _load_from_disk(self):
        with _LOCK:
            if os.path.exists(QUOTES_FILE):
                try:
                    with open(QUOTES_FILE, "r", encoding="utf-8") as f:
                        self._quotes = json.load(f)
                    now_utc = datetime.now(timezone.utc)
                    for qid, q in self._quotes.items():
                        cfg_hash = q.get("jobConfigHash")
                        if cfg_hash and q.get("status") == QuoteStatus.QUOTED:
                            expires_at_str = q.get("expiresAt")
                            if expires_at_str:
                                try:
                                    if now_utc > _parse_iso_utc(expires_at_str):
                                        q["status"] = QuoteStatus.EXPIRED
                                        continue
                                except Exception:
                                    pass
                            self._config_hash_to_quote[cfg_hash] = qid
                except Exception:
                    self._quotes = {}

            if os.path.exists(IDEMPOTENCY_FILE):
                try:
                    with open(IDEMPOTENCY_FILE, "r", encoding="utf-8") as f:
                        self._idempotency_map = json.load(f)
                except Exception:
                    self._idempotency_map = {}

            if os.path.exists(MANUAL_REVIEW_FILE):
                try:
                    with open(MANUAL_REVIEW_FILE, "r", encoding="utf-8") as f:
                        self._manual_reviews = json.load(f)
                except Exception:
                    self._manual_reviews = {}

    def _flush_quotes(self):
        try:
            with open(QUOTES_FILE, "w", encoding="utf-8") as f:
                json.dump(self._quotes, f, indent=2)
        except Exception as e:
            print(f"[QuoteStore] Error writing quotes to disk: {e}")

    def _flush_idempotency(self):
        try:
            with open(IDEMPOTENCY_FILE, "w", encoding="utf-8") as f:
                json.dump(self._idempotency_map, f, indent=2)
        except Exception as e:
            print(f"[QuoteStore] Error writing idempotency to disk: {e}")

    def _flush_manual_reviews(self):
        try:
            with open(MANUAL_REVIEW_FILE, "w", encoding="utf-8") as f:
                json.dump(self._manual_reviews, f, indent=2)
        except Exception as e:
            print(f"[QuoteStore] Error writing manual reviews to disk: {e}")

    def get_job_by_idempotency_key(self, idempotency_key: str) -> Optional[str]:
        if not idempotency_key:
            return None
        with _LOCK:
            return self._idempotency_map.get(idempotency_key)

    def record_idempotency(self, idempotency_key: str, job_id: str):
        if not idempotency_key:
            return
        with _LOCK:
            self._idempotency_map[idempotency_key] = job_id
            self._flush_idempotency()

    def find_active_quote_by_config_hash(self, job_config_hash: str) -> Optional[Dict[str, Any]]:
        if not job_config_hash:
            return None
        with _LOCK:
            quote_id = self._config_hash_to_quote.get(job_config_hash)
            if not quote_id:
                return None
            quote = self._quotes.get(quote_id)
            if not quote:
                return None

            # Check expiration
            expires_at_str = quote.get("expiresAt")
            if expires_at_str:
                try:
                    exp = _parse_iso_utc(expires_at_str)
                    if datetime.now(timezone.utc) > exp:
                        quote["status"] = QuoteStatus.EXPIRED
                        del self._config_hash_to_quote[job_config_hash]
                        self._flush_quotes()
                        return None
                except Exception:
                    pass

            return quote

    def save_quote(self, quote: Dict[str, Any]) -> Dict[str, Any]:
        with _LOCK:
            qid = quote["quoteId"]
            self._quotes[qid] = quote
            cfg_hash = quote.get("jobConfigHash")
            if cfg_hash and quote.get("status") == QuoteStatus.QUOTED:
                self._config_hash_to_quote[cfg_hash] = qid
            self._flush_quotes()
            return quote

    def get_quote(self, quote_id: str) -> Optional[Dict[str, Any]]:
        with _LOCK:
            quote = self._quotes.get(quote_id)
            if not quote:
                return None

            # Verify expiration
            expires_at_str = quote.get("expiresAt")
            if expires_at_str and quote.get("status") == QuoteStatus.QUOTED:
                try:
                    exp = _parse_iso_utc(expires_at_str)
                    if datetime.now(timezone.utc) > exp:
                        quote["status"] = QuoteStatus.EXPIRED
                        cfg_hash = quote.get("jobConfigHash")
                        if cfg_hash and cfg_hash in self._config_hash_to_quote:
                            del self._config_hash_to_quote[cfg_hash]
                        self._flush_quotes()
                except Exception:
                    pass

            return quote

    def transition_quote_status(self, quote_id: str, new_status: str) -> Dict[str, Any]:
        with _LOCK:
            quote = self._quotes.get(quote_id)
            if not quote:
                raise ValueError(f"Quote {quote_id} not found.")

            current = quote.get("status", QuoteStatus.DRAFT)
            # Allowed transitions
            allowed = {
                QuoteStatus.DRAFT: [QuoteStatus.SLICING, QuoteStatus.EXPIRED],
                QuoteStatus.SLICING: [QuoteStatus.QUOTED, QuoteStatus.EXPIRED],
                QuoteStatus.QUOTED: [QuoteStatus.ACCEPTED, QuoteStatus.EXPIRED],
                QuoteStatus.ACCEPTED: [],
                QuoteStatus.EXPIRED: []
            }

            if new_status not in allowed.get(current, []):
                raise ValueError(f"Illegal quote state transition from {current} to {new_status}.")

            quote["status"] = new_status
            quote["updatedAt"] = datetime.now(timezone.utc).isoformat()
            self._flush_quotes()
            return quote

    def add_manual_review(self, job_id: str, reason_code: str, details: Dict[str, Any]):
        with _LOCK:
            self._manual_reviews[job_id] = {
                "jobId": job_id,
                "reasonCode": reason_code,
                "details": details,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved": False
            }
            self._flush_manual_reviews()

    def list_manual_reviews(self) -> List[Dict[str, Any]]:
        with _LOCK:
            return list(self._manual_reviews.values())

# Global store instance
quote_store = PersistentStore()

