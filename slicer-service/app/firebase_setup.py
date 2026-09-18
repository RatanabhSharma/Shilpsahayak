import os
import time
import json
import logging
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, Any, Optional

logger = logging.getLogger("shilp_studio.firebase")

_db = None
_pricing_cache = None
_pricing_cache_time = 0
CACHE_TTL = 60  # 1 minute

def init_firebase():
    global _db
    if _db is not None:
        return
    
    try:
        if not firebase_admin._apps:
            # Check for explicit JSON string in env var first
            creds_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
            if creds_json:
                cred_dict = json.loads(creds_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
            else:
                # Fallback to default (relies on GOOGLE_APPLICATION_CREDENTIALS)
                firebase_admin.initialize_app()
        _db = firestore.client()
        logger.info("Firebase Admin initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin: {e}")

def get_pricing_config(force_refresh: bool = False) -> Optional[Dict[str, Any]]:
    global _pricing_cache, _pricing_cache_time
    
    if not force_refresh and _pricing_cache and (time.time() - _pricing_cache_time < CACHE_TTL):
        return _pricing_cache
        
    init_firebase()
    if not _db:
        logger.warning("Firestore client not available. Using cached or none.")
        return _pricing_cache
        
    try:
        doc_ref = _db.collection('settings').document('pricing')
        doc = doc_ref.get()
        if doc.exists:
            _pricing_cache = doc.to_dict()
            _pricing_cache_time = time.time()
            return _pricing_cache
        else:
            logger.warning("pricing config document does not exist in Firestore.")
            return None
    except Exception as e:
        logger.error(f"Error fetching pricing config from Firestore: {e}")
        return _pricing_cache

def get_public_pricing_config() -> Dict[str, Any]:
    """Returns only the non-sensitive parts of the pricing config for the frontend UI."""
    config = get_pricing_config() or {}
    
    # Extract only what the frontend needs for UI selection
    public_config = {
        "materials": config.get("materials", []),
        "printProfiles": config.get("printProfiles", []),
        "quantityDiscounts": config.get("quantityDiscounts", []),
        "amsSlots": config.get("amsSlots", []),
        "productionPrinterProfile": config.get("productionPrinterProfile", {}),
        "productionPrinterProfiles": config.get("productionPrinterProfiles", []),
        "pricingVersion": config.get("pricingVersion", "v1"),
        "updatedAt": config.get("updatedAt"),
        "pricingConfig": {
            "maxBuildVolume": config.get("pricingConfig", {}).get("maxBuildVolume", {"x": 256, "y": 256, "z": 200}),
            "slicingStrategy": config.get("pricingConfig", {}).get("slicingStrategy", "auto"),
            "gstEnabled": config.get("pricingConfig", {}).get("gstEnabled", False),
            "gstRate": config.get("pricingConfig", {}).get("gstRate", 18.0)
        }
    }
    return public_config

