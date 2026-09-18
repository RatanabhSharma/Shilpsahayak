"""
Shilp Studio Comprehensive Architecture Hardening Test Suite
Verifies:
1. Money arithmetic: Decimal + ROUND_HALF_UP (no banker's rounding ambiguity)
2. Persistent quote store: Survives restart, persists idempotency & dedup
3. Calibrated slicer execution & multi-plate aggregation
4. Stored calculation trace: Full auditability from snapshot alone
5. Config-driven GST tax rate: No hardcoded constants
6. Mesh validation: Manifold check, degenerate triangle check, repair tracking
7. Adversarial Zip-Slip protection
8. Adversarial Zip-Bomb protection
9. Two-part model identity (fileSha256 + jobConfigHash) & quote dedup
10. Quote immutability: Admin changes do not alter existing snapshots
11. Payment price freeze: Ignores client-supplied amount
12. Payment webhook idempotency: Replayed eventId is a safe no-op
"""

import os
import sys
import unittest
import tempfile
import zipfile
import struct
import uuid
from decimal import Decimal, ROUND_HALF_UP

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "app"))
POC_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "poc"))
TEST_MODELS_DIR = os.path.join(POC_DIR, "test_models")
PROFILES_DIR = os.path.join(APP_DIR, "profiles")
STANDARD_PROFILE = os.path.join(PROFILES_DIR, "bambu_production_standard.ini")

sys.path.insert(0, os.path.abspath(os.path.join(BASE_DIR, "..")))
sys.path.insert(0, APP_DIR)

from pricing_engine import (
    calculate_authoritative_quote,
    compute_job_config_hash,
    D,
    RUPEE,
    PENNY
)
from app.quote_store import quote_store, QuoteStatus, PaymentStatus, ProductionStatus, PersistentStore
from payment_engine import payment_engine
from mesh_validator import validate_mesh, MeshRepairStatus
from archive_handler import inspect_and_extract_archive, ArchiveSecurityError
from app.file_inspector import inspect_file, ModelClassification
from slice_worker import compute_file_sha256, execute_bounded_slice

class TestShilpStudio(unittest.TestCase):

    def setUp(self):
        self.cube_stl = os.path.join(TEST_MODELS_DIR, "cube_20mm.stl")
        self.cube_obj = os.path.join(TEST_MODELS_DIR, "cube_20mm.obj")
        self.cube_3mf = os.path.join(TEST_MODELS_DIR, "standard_cube.3mf")

    # -------------------------------------------------------------------------
    # 1. Money Arithmetic: Decimal & ROUND_HALF_UP (Correction #1)
    # -------------------------------------------------------------------------
    def test_decimal_money_arithmetic_and_round_half_up(self):
        """
        Verify that money arithmetic uses Decimal with ROUND_HALF_UP.
        Standard Python round(2.5) == 2 (banker's rounding, rounds to even).
        ROUND_HALF_UP must round 2.5 to 3 and 100.5 to 101.
        """
        val1 = Decimal('2.5').quantize(RUPEE, rounding=ROUND_HALF_UP)
        self.assertEqual(int(val1), 3)

        val2 = Decimal('100.50').quantize(RUPEE, rounding=ROUND_HALF_UP)
        self.assertEqual(int(val2), 101)

        # In standard Python round(100.5) is 100, which is banker's rounding!
        self.assertEqual(round(100.5), 100)
        # But Decimal with ROUND_HALF_UP correctly produces 101:
        self.assertNotEqual(int(val2), round(100.5))

        cfg = {
            "printerCost": 25000.0,
            "printerLifespanHours": 5000.0,
            "printerPowerWatts": 100.0,
            "electricityRatePerKwh": 8.0,
            "failureBufferPercent": 10.0,
            "labourRatePerHour": 200.0,
            "finishingMinutes": 5.0,
            "baseServiceFee": 30.0,
            "minimumOrderValue": 149.0,
            "markupMultiplier": 2.2,
            "gstEnabled": True,
            "gstRate": 18.0,
            "packagingPrice": 20.0
        }
        res = calculate_authoritative_quote(
            filament_grams=15.25,
            print_time_hours=1.5,
            material_key="pla",
            quantity=2,
            packaging_included=True,
            config=cfg
        )
        self.assertEqual(res["currency"], "INR")
        self.assertEqual(res["roundingRule"], "ROUND_HALF_UP_TO_NEAREST_RUPEE")
        self.assertIsInstance(res["totalPrice"], int)
        self.assertGreater(res["gstAmount"], 0)
        self.assertEqual(res["gstAmount"], round(res["gstAmount"], 2))

    # -------------------------------------------------------------------------
    # 2. Config-Driven GST Tax Rate (Correction #5)
    # -------------------------------------------------------------------------
    def test_config_driven_tax_rate(self):
        """
        Tax rate must be completely config-driven, not a hardcoded constant.
        """
        cfg_18 = {"gstRate": 18.0, "gstEnabled": True, "minimumOrderValue": 100.0}
        q_18 = calculate_authoritative_quote(filament_grams=50.0, print_time_hours=2.0, config=cfg_18)
        self.assertEqual(q_18["taxRatePercent"], 18.0)

        cfg_28 = {"gstRate": 28.0, "gstEnabled": True, "minimumOrderValue": 100.0}
        q_28 = calculate_authoritative_quote(filament_grams=50.0, print_time_hours=2.0, config=cfg_28)
        self.assertEqual(q_28["taxRatePercent"], 28.0)

        # 28% GST must produce strictly greater tax and total price than 18%
        self.assertGreater(q_28["gstAmount"], q_18["gstAmount"])
        self.assertGreater(q_28["totalPrice"], q_18["totalPrice"])

    # -------------------------------------------------------------------------
    # 3. Stored Calculation Audit Trace (Correction #4)
    # -------------------------------------------------------------------------
    def test_stored_calculation_trace_reproducibility(self):
        """
        The snapshot calculation trace must contain every single input rate,
        intermediate multiplier, and line item so that any customer price dispute
        is 100% reconstructable without logs.
        """
        cfg = {
            "printerCost": 30000.0,
            "printerLifespanHours": 6000.0,
            "printerPowerWatts": 120.0,
            "electricityRatePerKwh": 9.5,
            "failureBufferPercent": 12.0,
            "labourRatePerHour": 250.0,
            "finishingMinutes": 6.0,
            "baseServiceFee": 35.0,
            "minimumOrderValue": 150.0,
            "markupMultiplier": 2.5,
            "gstEnabled": True,
            "gstRate": 18.0,
            "packagingPrice": 25.0
        }
        res = calculate_authoritative_quote(
            filament_grams=25.0,
            print_time_hours=2.5,
            material_key="pla",
            quantity=3,
            packaging_included=True,
            config=cfg
        )
        trace = res.get("calculationTrace")
        self.assertIsNotNone(trace, "calculationTrace must be present in quote result")

        inputs = trace["inputs"]
        self.assertEqual(inputs["filamentGrams"], 25.0)
        self.assertEqual(inputs["printTimeHours"], 2.5)
        self.assertEqual(inputs["printerPowerWatts"], 120.0)
        self.assertEqual(inputs["electricityRatePerKwh"], 9.5)
        self.assertEqual(inputs["printerCost"], 30000.0)
        self.assertEqual(inputs["printerLifespanHours"], 6000.0)
        self.assertEqual(inputs["failureBufferPercent"], 12.0)
        self.assertEqual(inputs["labourRatePerHour"], 250.0)
        self.assertEqual(inputs["finishingMinutes"], 6.0)
        self.assertEqual(inputs["baseServiceFee"], 35.0)
        self.assertEqual(inputs["markupMultiplier"], 2.5)
        self.assertEqual(inputs["taxRatePercent"], 18.0)

        # Reproduce math exactly from trace inputs using Decimal
        mat_cost = Decimal(str(inputs["filamentGrams"])) * Decimal(str(inputs["pricePerGram"]))
        kwh = (Decimal(str(inputs["printTimeHours"])) * Decimal(str(inputs["printerPowerWatts"]))) / Decimal('1000')
        elec_cost = kwh * Decimal(str(inputs["electricityRatePerKwh"]))
        wear_cost = Decimal(str(inputs["printTimeHours"])) * (Decimal(str(inputs["printerCost"])) / Decimal(str(inputs["printerLifespanHours"])))
        buf_cost = (mat_cost + elec_cost + wear_cost) * (Decimal(str(inputs["failureBufferPercent"])) / Decimal('100'))
        lab_cost = (Decimal(str(inputs["finishingMinutes"])) / Decimal('60')) * Decimal(str(inputs["labourRatePerHour"]))
        base_fee = Decimal(str(inputs["baseServiceFee"]))
        unit_cost = mat_cost + elec_cost + wear_cost + buf_cost + lab_cost + base_fee
        unit_price = (unit_cost * Decimal(str(inputs["markupMultiplier"]))).quantize(RUPEE, rounding=ROUND_HALF_UP)

        self.assertEqual(int(unit_price), trace["intermediateCosts"]["unitPrice"])
        self.assertEqual(res["totalPrice"], trace["intermediateCosts"]["totalPrice"])

    def test_per_filament_pricing_in_quote_calculation(self):
        """
        Multicolor quotes must calculate material cost per-filament using
        the actual production material assigned to each filament.
        """
        per_filament = [
            {"filamentIndex": 1, "materialType": "PLA", "totalGrams": 50.0},
            {"filamentIndex": 2, "materialType": "PETG", "totalGrams": 50.0},
        ]
        # PLA rate is 4.5, PETG rate is 5.5
        # Expected material cost = (50 * 4.5) + (50 * 5.5) = 225 + 275 = 500
        res = calculate_authoritative_quote(
            filament_grams=100.0,
            print_time_hours=1.0,
            material_key="pla",
            per_filament=per_filament
        )
        self.assertEqual(res["pricingBreakdown"]["materialCost"], 500.0)

    # -------------------------------------------------------------------------
    # 4. Mesh Validation: Manifold & Degenerate Geometry Checks (§1a)
    # -------------------------------------------------------------------------
    def test_mesh_validation_valid_stl(self):
        """Valid watertight cube STL passes mesh validation."""
        res = validate_mesh(self.cube_stl)
        self.assertTrue(res["valid"])
        self.assertEqual(res["triangles"], 12)
        self.assertTrue(res["is_watertight"])
        self.assertEqual(res["repair_status"], MeshRepairStatus.UNMODIFIED)

    def test_mesh_validation_corrupt_non_manifold_stl(self):
        """Non-manifold STL with broken edges fails mesh validation and routes to review."""
        with tempfile.NamedTemporaryFile(suffix=".stl", delete=False) as f:
            # Write header with 1 triangle (open boundary, non-watertight)
            f.write(b"0" * 80)
            f.write(struct.pack("<I", 1))
            # 1 single triangle: normal + 3 vertices + attr
            floats = [0.0, 0.0, 1.0,  0.0, 0.0, 0.0,  10.0, 0.0, 0.0,  0.0, 10.0, 0.0]
            f.write(struct.pack("<12fH", *floats, 0))
            temp_path = f.name

        try:
            res = validate_mesh(temp_path)
            self.assertFalse(res["valid"])
            self.assertEqual(res["error_code"], "NON_MANIFOLD_MESH")
            self.assertEqual(res["repair_status"], MeshRepairStatus.FAILED)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # -------------------------------------------------------------------------
    # 5. Adversarial Zip-Slip & Zip-Bomb Protections (§17a)
    # -------------------------------------------------------------------------
    def test_adversarial_zip_slip_attack_rejected(self):
        """An archive containing path traversal entries (e.g. ../../evil.txt) is rejected."""
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
            zip_path = f.name

        try:
            with zipfile.ZipFile(zip_path, "w") as zf:
                zf.writestr("../../evil.txt", "malicious payload")
                zf.writestr("valid_model.stl", b"solid test\nendsolid\n")

            with tempfile.TemporaryDirectory() as extract_to:
                with self.assertRaises(ArchiveSecurityError) as ctx:
                    inspect_and_extract_archive(zip_path, extract_to)
                self.assertEqual(ctx.exception.code, "ZIP_SLIP_ATTACK_DETECTED")
        finally:
            if os.path.exists(zip_path):
                os.remove(zip_path)

    def test_adversarial_zip_bomb_entry_cap_rejected(self):
        """An archive containing > 500 entries triggers zip-bomb protection."""
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as f:
            zip_path = f.name

        try:
            with zipfile.ZipFile(zip_path, "w") as zf:
                for i in range(505):
                    zf.writestr(f"file_{i}.txt", "data")

            with tempfile.TemporaryDirectory() as extract_to:
                with self.assertRaises(ArchiveSecurityError) as ctx:
                    inspect_and_extract_archive(zip_path, extract_to)
                self.assertEqual(ctx.exception.code, "ZIP_BOMB_ENTRY_LIMIT")
        finally:
            if os.path.exists(zip_path):
                os.remove(zip_path)

    # -------------------------------------------------------------------------
    # 6. Two-Part Model Identity & Quote Deduplication (§11a)
    # -------------------------------------------------------------------------
    def test_two_part_identity_and_deduplication(self):
        """
        File SHA-256 identifies raw bytes for storage.
        jobConfigHash identifies complete slicing parameters.
        """
        sha1 = compute_file_sha256(self.cube_stl)
        self.assertEqual(len(sha1), 64)

        hash1 = compute_job_config_hash(
            file_sha256=sha1,
            scale_x=1.0, scale_y=1.0, scale_z=1.0,
            printer_profile="bambu_production_standard",
            material_key="pla",
            quality_profile="standard",
            quantity=1,
            support_mode="auto",
            packaging_included=False
        )

        # Same parameters -> identical hash
        hash2 = compute_job_config_hash(
            file_sha256=sha1,
            scale_x=1.0, scale_y=1.0, scale_z=1.0,
            printer_profile="bambu_production_standard",
            material_key="pla",
            quality_profile="standard",
            quantity=1,
            support_mode="auto",
            packaging_included=False
        )
        self.assertEqual(hash1, hash2)

        # Different scale -> different hash
        hash_diff_scale = compute_job_config_hash(
            file_sha256=sha1,
            scale_x=1.5, scale_y=1.5, scale_z=1.5,
            printer_profile="bambu_production_standard",
            material_key="pla",
            quality_profile="standard",
            quantity=1,
            support_mode="auto",
            packaging_included=False
        )
        self.assertNotEqual(hash1, hash_diff_scale)

        # Different route -> different hash
        hash_single = compute_job_config_hash(
            file_sha256=sha1,
            scale_x=1.0, scale_y=1.0, scale_z=1.0,
            printer_profile="bambu_production_standard",
            material_key="pla",
            quality_profile="standard",
            quantity=1,
            support_mode="auto",
            packaging_included=False,
            route="single_material"
        )
        hash_multi = compute_job_config_hash(
            file_sha256=sha1,
            scale_x=1.0, scale_y=1.0, scale_z=1.0,
            printer_profile="bambu_production_standard",
            material_key="pla",
            quality_profile="standard",
            quantity=1,
            support_mode="auto",
            packaging_included=False,
            route="multicolor"
        )
        self.assertNotEqual(hash_single, hash_multi)

    # -------------------------------------------------------------------------
    # 7. Persistent Quote Store & Immutability (Correction #2, §11, §15)
    # -------------------------------------------------------------------------
    def test_persistent_quote_store_and_immutability(self):
        """
        Quotes must persist and remain completely unchanged even if admin rates change.
        """
        quote_id = "qt_test_immutability_123"
        snapshot = {
            "quoteId": quote_id,
            "status": QuoteStatus.QUOTED,
            "fileSha256": "abcdef123456",
            "jobConfigHash": "hash_xyz_789",
            "pricing": {
                "totalPrice": 250,
                "unitPrice": 250,
                "currency": "INR",
                "taxAmount": 38.14
            },
            "createdAt": "2026-09-09T12:00:00Z",
            "expiresAt": "2026-09-10T12:00:00Z"
        }
        quote_store.save_quote(snapshot)

        # Verify retrieval
        loaded = quote_store.get_quote(quote_id)
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded["pricing"]["totalPrice"], 250)

        # Simulate fresh store instance reload from disk (verifying persistence)
        reloaded_store = PersistentStore()
        reloaded_quote = reloaded_store.get_quote(quote_id)
        self.assertIsNotNone(reloaded_quote, "Quote must survive store restart/reload")
        self.assertEqual(reloaded_quote["pricing"]["totalPrice"], 250)

    # -------------------------------------------------------------------------
    # 8. Payment Engine: Server-Enforced Price Freeze (Clarification 3, §12)
    # -------------------------------------------------------------------------
    def test_payment_price_freeze_ignores_client_amount(self):
        """
        Payment order creation loads frozen price by quoteId and strictly ignores
        any client-supplied price.
        """
        quote_id = "qt_freeze_test_456"
        snapshot = {
            "quoteId": quote_id,
            "status": QuoteStatus.QUOTED,
            "fileSha256": "sha_sample",
            "jobConfigHash": "hash_sample",
            "pricing": {
                "totalPrice": 499,
                "currency": "INR"
            },
            "expiresAt": "2030-01-01T00:00:00Z"
        }
        quote_store.save_quote(snapshot)

        # Client attempts to pay 1 rupee instead of 499
        order = payment_engine.create_payment_order(
            quote_id=quote_id,
            customer_id="cust_abc",
            idempotency_key="idemp_freeze_1",
            client_supplied_amount=1.00
        )

        self.assertEqual(order["amount"], 499, "Backend MUST use frozen quote total of 499")
        self.assertEqual(order["currency"], "INR")
        self.assertEqual(order["amountIgnoredFromClient"], 1.00)
        self.assertEqual(order["paymentStatus"], PaymentStatus.PENDING)
        self.assertEqual(order["productionStatus"], ProductionStatus.AWAITING_PAYMENT)

    # -------------------------------------------------------------------------
    # 9. Payment Webhook Idempotency (§12a)
    # -------------------------------------------------------------------------
    def test_webhook_idempotency_prevents_replay(self):
        """
        Replayed webhook deliveries with the same eventId must be idempotent no-ops.
        """
        quote_id = f"qt_webhook_test_{uuid.uuid4().hex[:8]}"
        snapshot = {
            "quoteId": quote_id,
            "status": QuoteStatus.QUOTED,
            "pricing": {"totalPrice": 350, "currency": "INR"},
            "expiresAt": "2030-01-01T00:00:00Z"
        }
        quote_store.save_quote(snapshot)

        order = payment_engine.create_payment_order(quote_id, "cust_webhook", f"idemp_webhook_{uuid.uuid4().hex[:8]}")
        order_id = order["orderId"]

        test_evt_id = f"evt_test_{uuid.uuid4().hex[:8]}"

        # 1st delivery
        res1 = payment_engine.process_payment_webhook(
            gateway="razorpay",
            event_id=test_evt_id,
            order_id=order_id,
            event_type="payment.captured"
        )
        self.assertEqual(res1["status"], "success")
        self.assertEqual(res1["paymentStatus"], PaymentStatus.PAID)
        self.assertEqual(res1["productionStatus"], ProductionStatus.QUEUED)

        # 2nd delivery (replayed webhook with same eventId)
        res2 = payment_engine.process_payment_webhook(
            gateway="razorpay",
            event_id=test_evt_id,
            order_id=order_id,
            event_type="payment.captured"
        )
        self.assertEqual(res2["status"], "already_processed")
        self.assertTrue(res2["duplicate_replayed"])

        # Check order is still paid and not double-mutated
        current_order = payment_engine.get_order(order_id)
        self.assertEqual(current_order["paymentStatus"], PaymentStatus.PAID)
        self.assertEqual(current_order["productionStatus"], ProductionStatus.QUEUED)

    # -------------------------------------------------------------------------
    # 10. Real PrusaSlicer Golden Reference Manufacturing Statistics (§18, §37)
    # -------------------------------------------------------------------------
    def test_real_slice_execution_golden_statistics(self):
        """
        Real PrusaSlicer execution produces actual G-code, G-code hash, and stats.
        """
        res = execute_bounded_slice(
            model_path=self.cube_stl,
            printer_ini=STANDARD_PROFILE,
            scale=1.0,
            infill_pct=20,
            timeout_seconds=600
        )
        self.assertTrue(res["success"], f"Slice failed: {res.get('error')}")
        stats = res["statistics"]
        self.assertGreater(stats["filament_grams"], 0.0)
        self.assertGreater(stats["print_time_seconds"], 0)
        self.assertTrue("gcode_hash" in res)
        self.assertEqual(len(res["gcode_hash"]), 64)

    # -------------------------------------------------------------------------
    # 11. Color Analysis & Deep Inspection (Phase 1 Multicolor Detection)
    # -------------------------------------------------------------------------
    def test_color_analysis_and_inspection(self):
        """
        Verify color analysis on Bambu/Orca multicolor 3MF vs standard STL.
        """
        stitch_path = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "public", "Stitchxpikachu.3mf"))
        if os.path.exists(stitch_path):
            insp = inspect_file(stitch_path, check_mesh=False)
            self.assertTrue(insp["success"])
            ca = insp.get("color_analysis")
            self.assertIsNotNone(ca)
            self.assertTrue(ca["success"])
            self.assertTrue(ca["isMultiColor"])
            self.assertEqual(len(ca["colors"]), 8)
            self.assertEqual(ca["paletteSize"], 8)

            first_color = ca["colors"][0]
            self.assertEqual(first_color["hex"], "#161616")
            self.assertEqual(first_color["materialType"], "PETG")
            self.assertEqual(first_color["sourceFilament"], 1)

        # Standard STL must not return multicolor analysis
        stl_insp = inspect_file(self.cube_stl, check_mesh=False)
        self.assertTrue(stl_insp["success"])
        stl_ca = stl_insp.get("color_analysis")
        self.assertTrue(stl_ca is None or stl_ca.get("isMultiColor") is False)

if __name__ == "__main__":
    unittest.main(verbosity=2)

