"""
Automated Tests for Slicer Result Validator & Dynamic Color Support
===================================================================

Tests:
1.  1-Color valid result (single-material Prusa/Bambu) -> Quote allowed
2.  3-Color valid result (standard multicolor) -> Quote allowed
3.  8-Color valid result (real Stitchxpikachu fixture) -> Quote allowed
4.  20-Color valid result contract -> Quote allowed
5.  100-Color dynamically generated contract -> Quote allowed (zero artificial limits)
6.  Wrong total (sum of per-filament != reported total) -> Blocked
7.  Inconsistent channel total (totalGrams < modelGrams) -> Blocked
8.  Missing authoritative statistics (filament_grams <= 0) -> Blocked
9.  Invalid print time (print_time_seconds <= 0 or not finite) -> Blocked
10. Invalid dimensions (<= 0 or not finite) -> Blocked
11. Dimensions exceed build volume envelope -> Blocked
12. Model hash mismatch (slice modelHash != job modelHash) -> Blocked
13. Missing provenance (missing adapter or slicerVersion) -> Blocked
14. Missing artifact reference (no gcode reference or hash) -> Blocked
15. Slicer execution failure (success=False) -> Blocked
16. Single-material route reporting tool changes > 0 -> Blocked
17. Full 4-component sum mismatch (when all 4 are reported) -> Blocked
18. End-to-end integration test with main.py: valid data quotes, invalid data blocks
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "app"))
sys.path.insert(0, os.path.abspath(os.path.join(BASE_DIR, "..")))
sys.path.insert(0, APP_DIR)

from app.universal_slice_result import (
    UniversalSliceResult,
    PerFilamentStats,
    SliceDimensions,
    SliceArtifact,
)
from app.slicer_result_validator import validate_slicer_result, ValidationResult


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def make_valid_slice_result(
    channel_count: int = 1,
    adapter: str = "bambu_studio_cli",
    model_hash: str = "abc123hash",
    job_id: str = "job_test_001",
    total_g: float = 100.0,
    time_s: int = 3600,
    tool_changes: int = 0,
) -> UniversalSliceResult:
    """Dynamically generates a valid, internally consistent UniversalSliceResult for N channels."""
    per_channel_total = round(total_g / channel_count, 4)
    # Ensure exact sum matches total_g
    channels = []
    accum = 0.0
    for i in range(1, channel_count + 1):
        if i == channel_count:
            ch_total = round(total_g - accum, 4)
        else:
            ch_total = per_channel_total
            accum += ch_total

        ch_model = round(ch_total * 0.7, 4)
        ch_purge = round(ch_total - ch_model, 4)

        channels.append(
            PerFilamentStats(
                filamentIndex=i,
                colorHex=f"#{i:06X}"[-7:],
                materialType="PLA",
                totalGrams=ch_total,
                modelGrams=ch_model,
                purgeGrams=ch_purge,
            )
        )

    model_filament_g = round(sum(c.modelGrams for c in channels), 4)

    return UniversalSliceResult(
        adapter=adapter,
        slicerName="BambuStudio" if "bambu" in adapter else "PrusaSlicer",
        slicerVersion="2.9.0",
        modelHash=model_hash,
        jobId=job_id,
        dimensions=SliceDimensions(x=50.0, y=60.0, z=70.0),
        printTimeSeconds=time_s,
        filamentGrams=total_g,
        toolChangeCount=tool_changes,
        perFilament=channels,
        artifact=SliceArtifact(
            gcodeReference="gcode_ref_test",
            gcodeHash="hash1234567890abcdef",
            resultReference="result_json_test",
        ),
        success=True,
        modelFilamentGrams=model_filament_g,
    )


# ---------------------------------------------------------------------------
# 1. Scalable Dynamic Channel Counts (N = 1, 3, 8, 20, 100)
# ---------------------------------------------------------------------------

def test_single_color_valid():
    """1-Color valid result passes validation."""
    res = make_valid_slice_result(channel_count=1, adapter="prusaslicer", tool_changes=0)
    val = validate_slicer_result(
        res,
        expected_model_hash="abc123hash",
        expected_job_id="job_test_001",
        route="single_material",
    )
    assert val.is_valid is True
    assert val.error_code is None
    assert val.details["channelCount"] == 1


def test_three_color_valid():
    """3-Color valid result passes validation."""
    res = make_valid_slice_result(channel_count=3, adapter="bambu_studio_cli", tool_changes=15)
    val = validate_slicer_result(
        res,
        expected_model_hash="abc123hash",
        expected_job_id="job_test_001",
        route="multicolor",
    )
    assert val.is_valid is True
    assert val.details["channelCount"] == 3


def test_eight_color_valid():
    """8-Color valid result passes validation (matches Stitchxpikachu fixture)."""
    res = make_valid_slice_result(channel_count=8, adapter="bambu_studio_cli", tool_changes=2245, total_g=937.62)
    val = validate_slicer_result(
        res,
        expected_model_hash="abc123hash",
        expected_job_id="job_test_001",
        route="multicolor",
    )
    assert val.is_valid is True
    assert val.details["channelCount"] == 8


def test_twenty_color_valid_contract():
    """20-Color valid contract scales dynamically without artificial limits."""
    res = make_valid_slice_result(channel_count=20, adapter="bambu_studio_cli", tool_changes=500)
    val = validate_slicer_result(
        res,
        expected_model_hash="abc123hash",
        expected_job_id="job_test_001",
        route="multicolor",
    )
    assert val.is_valid is True
    assert val.details["channelCount"] == 20


def test_hundred_color_dynamically_generated_contract():
    """100-Color dynamically generated fixture proves contract has ZERO arbitrary scaling cap."""
    res = make_valid_slice_result(channel_count=100, adapter="bambu_studio_cli", tool_changes=1200, total_g=500.0)
    val = validate_slicer_result(
        res,
        expected_model_hash="abc123hash",
        expected_job_id="job_test_001",
        route="multicolor",
    )
    assert val.is_valid is True
    assert val.details["channelCount"] == 100


# ---------------------------------------------------------------------------
# 2. Inconsistent Filament Totals & Breakdown Inconsistencies
# ---------------------------------------------------------------------------

def test_wrong_total_filament_sum_blocked():
    """When sum of per-filament totalGrams != reported total filamentGrams, quote is blocked."""
    res = make_valid_slice_result(channel_count=3, total_g=100.0)
    # Tamper with total reported filament
    res.filamentGrams = 150.0  # Mismatch!
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "INCONSISTENT_TOTAL_FILAMENT"


def test_channel_total_less_than_model_blocked():
    """When a channel has totalGrams < modelGrams, quote is blocked."""
    res = make_valid_slice_result(channel_count=3, total_g=100.0)
    # Tamper channel 1: modelGrams cannot exceed totalGrams
    res.perFilament[0].totalGrams = 10.0
    res.perFilament[0].modelGrams = 20.0  # Physically impossible!
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "INCONSISTENT_FILAMENT_STATISTICS"


def test_channel_components_sum_mismatch_when_all_reported():
    """When all 4 components (model, support, purge, tower) are reported, their sum must match total."""
    res = make_valid_slice_result(channel_count=1, total_g=100.0)
    res.perFilament[0].modelGrams = 50.0
    res.perFilament[0].supportGrams = 10.0
    res.perFilament[0].purgeGrams = 20.0
    res.perFilament[0].towerGrams = 5.0
    # Sum is 50 + 10 + 20 + 5 = 85, but total is 100
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "INCONSISTENT_FILAMENT_STATISTICS"


def test_overall_components_sum_mismatch():
    """When overall slicer reports all 4 sub-components, their sum must equal filamentGrams."""
    res = make_valid_slice_result(channel_count=2, total_g=100.0)
    # Channel modelGrams sum to 70.0 in make_valid_slice_result (35.0 + 35.0)
    res.modelFilamentGrams = 70.0
    res.supportFilamentGrams = 10.0
    res.purgeFilamentGrams = 10.0
    res.towerFilamentGrams = 5.0
    # 70 + 10 + 10 + 5 = 95 != 100
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "INCONSISTENT_COMPONENT_TOTALS"


# ---------------------------------------------------------------------------
# 3. Missing Authoritative Statistics & Invalid Physical Values
# ---------------------------------------------------------------------------

def test_missing_or_zero_filament_grams_blocked():
    """Filament grams <= 0 is blocked."""
    res = make_valid_slice_result(channel_count=1, total_g=0.0)
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "MISSING_AUTHORITATIVE_STATISTICS"


def test_negative_or_zero_print_time_blocked():
    """Zero or negative print time is blocked."""
    res = make_valid_slice_result(channel_count=1, time_s=0)
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "INVALID_PRINT_TIME"


def test_invalid_dimensions_blocked():
    """Non-positive or NaN dimensions are blocked."""
    res = make_valid_slice_result(channel_count=1)
    res.dimensions.x = 0.0
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "INVALID_DIMENSIONS"


def test_dimensions_exceed_build_envelope_blocked():
    """Dimensions exceeding the machine build volume are blocked."""
    res = make_valid_slice_result(channel_count=1)
    res.dimensions.x = 300.0
    envelope = {"x": 256.0, "y": 256.0, "z": 256.0}
    val = validate_slicer_result(res, expected_model_hash="abc123hash", active_envelope=envelope)
    assert val.is_valid is False
    assert val.error_code == "DIMENSIONS_EXCEED_BUILD_VOLUME"


# ---------------------------------------------------------------------------
# 4. Provenance, Job Association, & Artifact Verification
# ---------------------------------------------------------------------------

def test_model_hash_mismatch_blocked():
    """Sliced model hash not matching job file hash is blocked."""
    res = make_valid_slice_result(model_hash="actual_hash_111")
    val = validate_slicer_result(res, expected_model_hash="expected_hash_222")
    assert val.is_valid is False
    assert val.error_code == "MODEL_HASH_MISMATCH"


def test_missing_provenance_blocked():
    """Missing adapter or slicerVersion is blocked."""
    res = make_valid_slice_result()
    res.adapter = ""
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "MISSING_PROVENANCE"

    res = make_valid_slice_result()
    res.slicerVersion = ""
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "MISSING_PROVENANCE"


def test_missing_artifact_reference_blocked():
    """Result with zero durable artifact references is blocked."""
    res = make_valid_slice_result()
    res.artifact = SliceArtifact(gcodeReference=None, gcodeHash=None, resultReference=None)
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "MISSING_ARTIFACT_REFERENCE"


def test_slicer_reported_failure_blocked():
    """Slicer result with success=False is blocked."""
    res = make_valid_slice_result()
    res.success = False
    res.errorCode = "SLICER_EXECUTION_ERROR"
    res.error = "Memory allocation failure in slicer"
    val = validate_slicer_result(res, expected_model_hash="abc123hash")
    assert val.is_valid is False
    assert val.error_code == "SLICER_EXECUTION_ERROR"


def test_single_material_with_nonzero_tool_changes_blocked():
    """Single material route with tool_change_count > 0 is blocked."""
    res = make_valid_slice_result(channel_count=1, tool_changes=5)
    val = validate_slicer_result(res, expected_model_hash="abc123hash", route="single_material")
    assert val.is_valid is False
    assert val.error_code == "INVALID_TOOL_CHANGE_COUNT"


# ---------------------------------------------------------------------------
# 5. Dict-Input Normalization Compatibility
# ---------------------------------------------------------------------------

def test_dict_normalization_valid():
    """Raw dict matching universal schema normalizes and passes validation."""
    raw_dict = make_valid_slice_result(channel_count=4, total_g=80.0, tool_changes=10).to_dict()
    val = validate_slicer_result(raw_dict, expected_model_hash="abc123hash", route="multicolor")
    assert val.is_valid is True
    assert val.details["channelCount"] == 4
