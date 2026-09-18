"""
Shilp Studio Payment Abstraction & Production Order Engine
Enforces:
1. Strict Server-Side Amount Rule:
   Payment order creation loads the frozen quote snapshot by quoteId and uses
   the stored frozen totalPrice. Any client-supplied amount is completely ignored.
2. Webhook & Payment Idempotency (§12a):
   Every webhook event is de-duplicated by eventId. Replays are logged and ignored.
   Payment orders transition pending -> paid exactly once.
3. State Machines:
   Payment: pending -> paid / failed / refunded
   Production: awaiting_payment -> paid -> queued -> printing -> completed / cancelled
   Refund: paid -> refund_requested -> refunded
"""

import os
import json
import uuid
import threading
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.quote_store import quote_store, QuoteStatus, PaymentStatus, ProductionStatus

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSISTENT_DIR = os.path.join(BASE_DIR, "storage")
ORDERS_FILE = os.path.join(PERSISTENT_DIR, "persistent_orders.json")
WEBHOOK_EVENTS_FILE = os.path.join(PERSISTENT_DIR, "persistent_webhook_events.json")

_LOCK = threading.Lock()

class PaymentEngine:
    def __init__(self):
        self._orders: Dict[str, Dict[str, Any]] = {}
        self._processed_webhook_events: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        with _LOCK:
            if os.path.exists(ORDERS_FILE):
                try:
                    with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                        self._orders = json.load(f)
                except Exception:
                    self._orders = {}

            if os.path.exists(WEBHOOK_EVENTS_FILE):
                try:
                    with open(WEBHOOK_EVENTS_FILE, "r", encoding="utf-8") as f:
                        self._processed_webhook_events = json.load(f)
                except Exception:
                    self._processed_webhook_events = {}

    def _flush_orders(self):
        try:
            with open(ORDERS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._orders, f, indent=2)
        except Exception as e:
            print(f"[PaymentEngine] Error writing orders: {e}")

    def _flush_webhooks(self):
        try:
            with open(WEBHOOK_EVENTS_FILE, "w", encoding="utf-8") as f:
                json.dump(self._processed_webhook_events, f, indent=2)
        except Exception as e:
            print(f"[PaymentEngine] Error writing webhook events: {e}")

    def create_payment_order(
        self,
        quote_id: str,
        customer_id: str,
        idempotency_key: Optional[str] = None,
        gateway: str = "mock",
        client_supplied_amount: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Creates a Payment Order referencing the frozen quote.
        CRITICAL: client_supplied_amount is strictly ignored.
        """
        quote = quote_store.get_quote(quote_id)
        if not quote:
            raise ValueError("QUOTE_NOT_FOUND: Quote does not exist or has expired.")

        if quote.get("status") == QuoteStatus.EXPIRED:
            raise ValueError("QUOTE_EXPIRED: Quote has passed its 24-hour validity window.")

        # Replayed idempotency check
        if idempotency_key:
            for oid, o in self._orders.items():
                if o.get("idempotencyKey") == idempotency_key:
                    return o

        # Authoritative price loaded directly from frozen quote snapshot
        frozen_pricing = quote.get("pricing", {})
        authoritative_total = frozen_pricing.get("totalPrice")
        if authoritative_total is None or authoritative_total <= 0:
            raise ValueError("INVALID_QUOTE_PRICING: Quote does not contain a valid frozen price.")

        currency = frozen_pricing.get("currency", "INR")
        order_id = f"ord_{uuid.uuid4().hex[:12]}"

        # Mark quote accepted if it was quoted
        if quote.get("status") == QuoteStatus.QUOTED:
            try:
                quote_store.transition_quote_status(quote_id, QuoteStatus.ACCEPTED)
            except Exception:
                pass

        order = {
            "orderId": order_id,
            "quoteId": quote_id,
            "customerId": customer_id,
            "currency": currency,
            "amount": int(authoritative_total),
            "amountIgnoredFromClient": client_supplied_amount,
            "paymentStatus": PaymentStatus.PENDING,
            "productionStatus": ProductionStatus.AWAITING_PAYMENT,
            "gateway": gateway,
            "idempotencyKey": idempotency_key,
            "quoteSnapshot": quote,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }

        with _LOCK:
            self._orders[order_id] = order
            self._flush_orders()

        return order

    def get_order(self, order_id: str) -> Optional[Dict[str, Any]]:
        with _LOCK:
            return self._orders.get(order_id)

    def process_payment_webhook(
        self,
        gateway: str,
        event_id: str,
        order_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processes webhook delivery with strict eventId idempotency and replay guards.
        """
        with _LOCK:
            # 1. Event Idempotency Check (§12a)
            if event_id in self._processed_webhook_events:
                existing = self._processed_webhook_events[event_id]
                return {
                    "status": "already_processed",
                    "duplicate_replayed": True,
                    "eventId": event_id,
                    "orderId": order_id,
                    "firstProcessedAt": existing.get("processedAt"),
                    "message": f"Webhook event {event_id} was already processed. Replay ignored."
                }

            order = self._orders.get(order_id)
            if not order:
                raise ValueError(f"ORDER_NOT_FOUND: Order {order_id} not found.")

            # Record event in persistent log
            self._processed_webhook_events[event_id] = {
                "eventId": event_id,
                "orderId": order_id,
                "gateway": gateway,
                "eventType": event_type,
                "processedAt": datetime.now(timezone.utc).isoformat()
            }
            self._flush_webhooks()

            # 2. State machine transitions
            if event_type in ["payment.success", "payment.captured", "charge.successful"]:
                if order["paymentStatus"] == PaymentStatus.PAID:
                    # Idempotent no-op for order already paid
                    return {
                        "status": "success",
                        "orderId": order_id,
                        "paymentStatus": order["paymentStatus"],
                        "productionStatus": order["productionStatus"],
                        "note": "Order was already marked paid. Replay ignored."
                    }

                order["paymentStatus"] = PaymentStatus.PAID
                order["productionStatus"] = ProductionStatus.QUEUED
                order["paidAt"] = datetime.now(timezone.utc).isoformat()
                order["updatedAt"] = datetime.now(timezone.utc).isoformat()
                self._flush_orders()

            elif event_type in ["payment.failed"]:
                if order["paymentStatus"] != PaymentStatus.PAID:
                    order["paymentStatus"] = PaymentStatus.FAILED
                    order["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self._flush_orders()

            elif event_type in ["refund.created", "refund.processed"]:
                order["paymentStatus"] = PaymentStatus.REFUNDED
                order["productionStatus"] = ProductionStatus.CANCELLED
                order["refundedAt"] = datetime.now(timezone.utc).isoformat()
                order["updatedAt"] = datetime.now(timezone.utc).isoformat()
                self._flush_orders()

            return {
                "status": "success",
                "orderId": order_id,
                "paymentStatus": order["paymentStatus"],
                "productionStatus": order["productionStatus"]
            }

    def request_refund(self, order_id: str, reason: str) -> Dict[str, Any]:
        with _LOCK:
            order = self._orders.get(order_id)
            if not order:
                raise ValueError(f"Order {order_id} not found.")

            if order["paymentStatus"] != PaymentStatus.PAID:
                raise ValueError(f"Cannot refund order with paymentStatus={order['paymentStatus']}.")

            order["paymentStatus"] = PaymentStatus.REFUND_REQUESTED
            order["refundReason"] = reason
            order["updatedAt"] = datetime.now(timezone.utc).isoformat()
            self._flush_orders()
            return order

payment_engine = PaymentEngine()

