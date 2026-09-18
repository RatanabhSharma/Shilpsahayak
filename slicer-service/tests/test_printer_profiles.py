import copy
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import resolve_production_printer_profile
from app.pricing_engine import compute_job_config_hash


PROFILE = {
    "id": "BAMBU-A1-MINI-01",
    "manufacturer": "Bambu Lab",
    "model": "A1 mini",
    "displayName": "Bambu Lab A1 mini",
    "printerProfileFile": "bambu_a1_mini_0.4.ini",
    "enabled": True,
    "defaultForProduction": True,
    "slicerAdapter": "bambu_studio_cli",
    "slicerName": "Bambu Studio",
    "slicerVersion": "02.08.02.61",
    "slicerSettingsId": "GM020",
    "printerSettingsId": "Bambu Lab A1 mini 0.4 nozzle",
    "processSettingsId": "0.20mm Standard @BBL A1M",
    "materialProfileIds": ["Generic PLA @BBL A1M"],
    "machineProfileFile": "Bambu Lab A1 mini 0.4 nozzle.json",
    "processProfileFile": "0.20mm Standard @BBL A1M.json",
    "buildVolumeX": 180,
    "buildVolumeY": 180,
    "buildVolumeZ": 180,
    "nozzleDiameter": 0.4,
    "extruderCount": 1,
    "supportsMulticolor": True,
    "machineParameters": {"printerStructure": "i3"},
    "defaultLayerHeight": 0.2,
    "defaultInfill": 20,
    "defaultSupportMode": "auto",
    "profileVersion": "Bambu Studio machine profile GM020",
}


def test_a1_mini_profile_can_be_selected_and_a1_can_coexist():
    a1_mini = resolve_production_printer_profile(PROFILE)
    a1 = copy.deepcopy(PROFILE)
    a1.update({"id": "BAMBU-A1-01", "model": "A1", "displayName": "Bambu Lab A1"})
    resolved_a1 = resolve_production_printer_profile(a1)
    assert a1_mini["id"] == "BAMBU-A1-MINI-01"
    assert resolved_a1["id"] == "BAMBU-A1-01"
    assert a1_mini["id"] != resolved_a1["id"]


def test_disabled_or_invalid_profiles_cannot_be_resolved():
    disabled = copy.deepcopy(PROFILE)
    disabled["enabled"] = False
    assert resolve_production_printer_profile(disabled) is None

    missing = copy.deepcopy(PROFILE)
    missing["printerProfileFile"] = "missing.ini"
    assert resolve_production_printer_profile(missing) is None

    unsupported = copy.deepcopy(PROFILE)
    unsupported["slicerAdapter"] = "future_slicer"
    assert resolve_production_printer_profile(unsupported) is None


def test_production_profile_changes_job_configuration_hash():
    first = compute_job_config_hash("a" * 64, 1, 1, 1, "BAMBU-A1-MINI-01:1", "pla", "standard", 1, "auto", False)
    second = compute_job_config_hash("a" * 64, 1, 1, 1, "BAMBU-A1-01:1", "pla", "standard", 1, "auto", False)
    assert first != second


def test_regression_same_model_printer_and_settings_cache_invalidation(tmp_path, monkeypatch):
    import app.quote_store
    from datetime import datetime, timezone, timedelta
    from app.quote_store import PersistentStore, QuoteStatus

    temp_quotes = str(tmp_path / "persistent_quotes.json")
    temp_idemp = str(tmp_path / "persistent_idempotency.json")
    temp_review = str(tmp_path / "persistent_manual_review.json")
    monkeypatch.setattr(app.quote_store, "QUOTES_FILE", temp_quotes)
    monkeypatch.setattr(app.quote_store, "IDEMPOTENCY_FILE", temp_idemp)
    monkeypatch.setattr(app.quote_store, "MANUAL_REVIEW_FILE", temp_review)

    store = PersistentStore()

    a1_mini_profile = copy.deepcopy(PROFILE)
    a1_profile = copy.deepcopy(PROFILE)
    a1_profile.update({
        "id": "BAMBU-A1-01",
        "model": "A1",
        "displayName": "Bambu Lab A1",
        "machineProfileFile": "Bambu Lab A1 0.4 nozzle.json",
        "processProfileFile": "0.20mm Standard @BBL A1.json",
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
    })

    file_sha = "f" * 64
    model_dims = {"x": 100.0, "y": 100.0, "z": 100.0}

    # 1. Same model + A1 mini -> quote A
    hash_a = compute_job_config_hash(
        file_sha256=file_sha,
        scale_x=1.0, scale_y=1.0, scale_z=1.0,
        printer_profile=a1_mini_profile["id"],
        material_key="pla",
        quality_profile="standard",
        quantity=1,
        support_mode="auto",
        packaging_included=False,
        effective_dimensions=model_dims,
        production_profile=a1_mini_profile,
        infill_percent=20,
    )

    quote_a = {
        "quoteId": "qt_test_mini_a",
        "status": QuoteStatus.QUOTED,
        "fileSha256": file_sha,
        "jobConfigHash": hash_a,
        "expiresAt": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "production": {"printerId": "BAMBU-A1-MINI-01", "printerProfile": "BAMBU-A1-MINI-01"},
        "slice": {
            "filamentGrams": 50.0,
            "printTimeSeconds": 3600,
            "statistics": {"filament_grams": 50.0, "print_time_seconds": 3600},
        },
        "pricing": {"totalPrice": 200},
    }
    store.save_quote(quote_a)

    # 2. Same model + A1 -> quote B
    hash_b = compute_job_config_hash(
        file_sha256=file_sha,
        scale_x=1.0, scale_y=1.0, scale_z=1.0,
        printer_profile=a1_profile["id"],
        material_key="pla",
        quality_profile="standard",
        quantity=1,
        support_mode="auto",
        packaging_included=False,
        effective_dimensions=model_dims,
        production_profile=a1_profile,
        infill_percent=20,
    )

    # A quote generated for A1 mini must NEVER be returned for an A1 job:
    assert hash_a != hash_b, "Hash A (A1 mini) must not equal Hash B (A1)"
    assert store.find_active_quote_by_config_hash(hash_b) is None, "A1 request must not hit A1 mini cached quote"

    quote_b = {
        "quoteId": "qt_test_a1_b",
        "status": QuoteStatus.QUOTED,
        "fileSha256": file_sha,
        "jobConfigHash": hash_b,
        "expiresAt": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        "production": {"printerId": "BAMBU-A1-01", "printerProfile": "BAMBU-A1-01"},
        "slice": {
            "filamentGrams": 52.0,
            "printTimeSeconds": 3400,
            "statistics": {"filament_grams": 52.0, "print_time_seconds": 3400},
        },
        "pricing": {"totalPrice": 210},
    }
    store.save_quote(quote_b)

    # 3. Requesting A1 again -> must return quote B
    cached_b = store.find_active_quote_by_config_hash(hash_b)
    assert cached_b is not None
    assert cached_b["quoteId"] == "qt_test_a1_b"
    assert cached_b["production"]["printerId"] == "BAMBU-A1-01"

    # Requesting A1 mini again -> must return quote A
    cached_a = store.find_active_quote_by_config_hash(hash_a)
    assert cached_a is not None
    assert cached_a["quoteId"] == "qt_test_mini_a"
    assert cached_a["production"]["printerId"] == "BAMBU-A1-MINI-01"

    # 4. Changing printer profile settings invalidates previous quote cache
    modified_a1 = copy.deepcopy(a1_profile)
    modified_a1["nozzleDiameter"] = 0.6  # Changed nozzle
    hash_c = compute_job_config_hash(
        file_sha256=file_sha,
        scale_x=1.0, scale_y=1.0, scale_z=1.0,
        printer_profile=modified_a1["id"],
        material_key="pla",
        quality_profile="standard",
        quantity=1,
        support_mode="auto",
        packaging_included=False,
        effective_dimensions=model_dims,
        production_profile=modified_a1,
        infill_percent=20,
    )
    assert hash_c != hash_b, "Changed nozzle must produce a different hash"
    assert store.find_active_quote_by_config_hash(hash_c) is None, "Modified profile settings must invalidate cache"

    # Changing infill percent produces a different hash
    hash_d = compute_job_config_hash(
        file_sha256=file_sha,
        scale_x=1.0, scale_y=1.0, scale_z=1.0,
        printer_profile=a1_profile["id"],
        material_key="pla",
        quality_profile="standard",
        quantity=1,
        support_mode="auto",
        packaging_included=False,
        effective_dimensions=model_dims,
        production_profile=a1_profile,
        infill_percent=35,
    )
    assert hash_d != hash_b, "Changed infill percent must produce a different hash"
    assert store.find_active_quote_by_config_hash(hash_d) is None
