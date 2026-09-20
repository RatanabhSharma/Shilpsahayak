"""
Unit and Integration Tests for Bambu Studio Multicolor Slicer Adapter
=====================================================================

Tests:
1. Slicer not found handling
2. Model file not found handling
3. Successful Bambu slice with mocked CLI execution, result.json, and G-code parsing
4. CLI timeout handling with process tree cleanup
5. CLI non-zero exit code error handling
6. result.json error_string error handling
7. Printable plate discovery from 3MF metadata
8. End-to-end integration: Multicolor route in main.py invokes Bambu adapter
9. End-to-end integration: Single-material route in main.py still invokes PrusaSlicer
"""

import os
import sys
import json
import tempfile
import zipfile
import subprocess
from unittest.mock import patch, MagicMock

import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "app"))
sys.path.insert(0, os.path.abspath(os.path.join(BASE_DIR, "..")))
sys.path.insert(0, APP_DIR)

from app.slicer_adapters.bambu_adapter import (
    BambuSlicerAdapter,
    execute_bambu_slice,
    find_bambustudio_executable,
    determine_printable_plates,
    parse_bambu_result_json,
    parse_bambu_gcode_header,
)
from app.main import process_slicing_job, JOBS, JobStatus
from app.quote_store import quote_store
from app.slicer_router import SlicerRoute


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def dummy_3mf(tmp_path):
    f = tmp_path / "test_model.3mf"
    with zipfile.ZipFile(f, "w") as zf:
        zf.writestr("3D/3dmodel.model", "<model unit='millimeter'/>")
        zf.writestr(
            "Metadata/model_settings.config",
            """<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1"/>
    <model_instance>
      <metadata key="object_id" value="2"/>
    </model_instance>
  </plate>
</config>""",
        )
    return str(f)


@pytest.fixture
def pricing_params():
    return {
        "material": "petg",
        "qualityProfile": "standard",
        "infillPercent": 20,
        "scaleFactor": 1.0,
        "quantity": 1,
        "supportMode": "auto",
        "packagingIncluded": False,
        "pricingConfig": {
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
            "packagingPrice": 20.0,
        },
        "materials": {
            "petg": {"pricePerGram": 5.5, "density": 1.27},
            "pla": {"pricePerGram": 4.5, "density": 1.24},
        },
        "productionPrinterProfile": {
            "id": "BAMBU-A1-MINI-01",
            "manufacturer": "Bambu Lab",
            "model": "A1 mini",
            "displayName": "Bambu Lab A1 mini",
            "printerProfileFile": "bambu_a1_mini_0.4.ini",
            "slicerAdapter": "bambu_studio_cli",
            "slicerName": "Bambu Studio",
            "slicerVersion": "02.08.02.61",
            "slicerSettingsId": "GM020",
            "printerSettingsId": "Bambu Lab A1 mini 0.4 nozzle",
            "machineProfileFile": "Bambu Lab A1 mini 0.4 nozzle.json",
            "processProfileFile": "0.20mm Standard @BBL A1M.json",
            "processSettingsId": "0.20mm Standard @BBL A1M",
            "materialProfileIds": ["Generic PLA @BBL A1M"],
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
            "enabled": True,
        },
    }


# ---------------------------------------------------------------------------
# Test 1: Slicer executable not found
# ---------------------------------------------------------------------------

def test_bambu_adapter_not_found(tmp_path):
    f = tmp_path / "sample.3mf"
    f.write_text("fake 3mf content")
    adapter = BambuSlicerAdapter(executable_path="/nonexistent/bambu-studio.exe")
    res = adapter.slice(str(f))
    assert res["success"] is False
    assert res["error_code"] == "SLICER_NOT_FOUND"
    assert res["adapter"] == "bambu_studio_cli"


# ---------------------------------------------------------------------------
# Test 2: Model file not found
# ---------------------------------------------------------------------------

def test_bambu_adapter_model_not_found(tmp_path):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)
    res = adapter.slice(str(tmp_path / "nonexistent.3mf"))
    assert res["success"] is False
    assert res["error_code"] == "MODEL_FILE_NOT_FOUND"
    assert res["adapter"] == "bambu_studio_cli"


# ---------------------------------------------------------------------------
# Test 3: Successful Bambu slice (Mocked subprocess)
# ---------------------------------------------------------------------------

def test_successful_bambu_slice_mocked(dummy_3mf):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    fake_result_data = {
        "return_code": 0,
        "error_string": "Success.",
        "sliced_plates": [
            {
                "id": 1,
                "total_predication": 7200.0,  # 2 hours
                "filament_change_times": 42,
                "objects": [
                    {
                        "bbox": {
                            "width": 100.0,
                            "depth": 80.0,
                            "height": 120.0,
                            "x": 0.0,
                            "y": 0.0,
                            "z": 0.0,
                        }
                    }
                ],
                "filaments": [
                    {
                        "id": 1,
                        "filament_id": "GFG99",
                        "main_used_g": 25.5,
                        "total_used_g": 50.0,
                    },
                    {
                        "id": 2,
                        "filament_id": "GFG99",
                        "main_used_g": 30.0,
                        "total_used_g": 60.0,
                    },
                ],
            }
        ],
    }

    def fake_popen(cmd, *args, **kwargs):
        # Extract the outputdir passed in the command
        out_dir = cmd[cmd.index("--outputdir") + 1]
        # Write mock result.json
        with open(os.path.join(out_dir, "result.json"), "w") as rf:
            json.dump(fake_result_data, rf)
        # Write mock plate_1.gcode
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as gf:
            gf.write("; filament_colour = #FF0000; #0000FF\n")
            gf.write("; total filament weight [g] : 50.0, 60.0\n")
            gf.write("; total filament length [mm] : 16000.0, 19200.0\n")
            gf.write("M620 S0A\nT0\nM620 S1A\nT1\n")

        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate.return_value = ("Slice completed successfully", "")
        return mock_proc

    color_analysis = {
        "colors": [
            {"sourceFilament": 1, "hex": "#FF0000", "materialType": "PETG"},
            {"sourceFilament": 2, "hex": "#0000FF", "materialType": "PETG"},
        ]
    }

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(dummy_3mf, color_analysis=color_analysis)

    assert res["success"] is True
    assert res["adapter"] == "bambu_studio_cli"
    assert res["production_verification_status"] == "verified"
    assert res["dimensions"] == {"x": 100.0, "y": 80.0, "z": 120.0}
    assert res["tool_change_count"] == 42

    stats = res["statistics"]
    assert stats["filament_grams"] == 110.0  # 50 + 60
    assert stats["print_time_seconds"] == 7200
    assert stats["print_time_hours"] == 2.0
    assert len(stats["per_filament"]) == 2

    # Verify customer-facing data separates color from material
    f1 = stats["per_filament"][0]
    assert f1["filamentIndex"] == 1
    assert f1["color"] == "#FF0000"
    assert f1["materialType"] == "PETG"
    assert f1["modelGrams"] == 25.5
    assert f1["totalGrams"] == 50.0
    assert f1["purgeGrams"] == 24.5

    f2 = stats["per_filament"][1]
    assert f2["filamentIndex"] == 2
    assert f2["color"] == "#0000FF"
    assert f2["materialType"] == "PETG"
    assert f2["modelGrams"] == 30.0
    assert f2["totalGrams"] == 60.0
    assert f2["purgeGrams"] == 30.0

    assert len(res["gcode_hash"]) == 64
    assert res["gcode_reference"].startswith("gcode_sha256_")


def test_bambu_adapter_production_material_override_pla(dummy_3mf):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    fake_result_data = {
        "return_code": 0,
        "error_string": "Success.",
        "sliced_plates": [
            {
                "id": 1,
                "total_predication": 3600.0,
                "filament_change_times": 10,
                "objects": [],
                "filaments": [
                    {"id": 1, "main_used_g": 10.0, "total_used_g": 20.0},
                    {"id": 2, "main_used_g": 15.0, "total_used_g": 25.0},
                ],
            }
        ],
    }

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as rf:
            json.dump(fake_result_data, rf)
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as gf:
            gf.write("M620 S0A\nT0\n")
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate.return_value = ("Success", "")
        return mock_proc

    # color_analysis detected PETG in original 3MF, but customer selected PLA
    color_analysis = {
        "colors": [
            {"sourceFilament": 1, "hex": "#FF0000", "materialType": "PETG"},
            {"sourceFilament": 2, "hex": "#0000FF", "materialType": "PETG"},
        ]
    }
    prod_params = {"material": "pla"}

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(dummy_3mf, production_params=prod_params, color_analysis=color_analysis)

    stats = res["statistics"]
    # All filaments must reflect customer's selected production material PLA
    for f in stats["per_filament"]:
        assert f["materialType"] == "PLA"


# ---------------------------------------------------------------------------
# Test 4: CLI Timeout handling
# ---------------------------------------------------------------------------

def test_bambu_adapter_cli_timeout_handled_safely(dummy_3mf):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    def fake_popen(*args, **kwargs):
        mock_proc = MagicMock()
        mock_proc.communicate.side_effect = subprocess.TimeoutExpired(cmd=["bambu"], timeout=10)
        return mock_proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(dummy_3mf, timeout_seconds=10)

    assert res["success"] is False
    assert res["error_code"] == "SLICER_TIMEOUT"
    assert res["adapter"] == "bambu_studio_cli"
    assert "timed out" in res["error"]


# ---------------------------------------------------------------------------
# Test 5: CLI non-zero exit code
# ---------------------------------------------------------------------------

def test_bambu_adapter_cli_nonzero_exit_handled_safely(dummy_3mf):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    def fake_popen(*args, **kwargs):
        mock_proc = MagicMock()
        mock_proc.returncode = 1
        mock_proc.communicate.return_value = ("", "Error: Bed collision detected")
        return mock_proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(dummy_3mf)

    assert res["success"] is False
    assert res["error_code"] == "SLICER_EXECUTION_ERROR"
    assert res["adapter"] == "bambu_studio_cli"
    assert "Bed collision detected" in res["error"]


# ---------------------------------------------------------------------------
# Test 6: result.json error_string handling
# ---------------------------------------------------------------------------

def test_bambu_adapter_result_json_error(dummy_3mf):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as rf:
            json.dump({"return_code": -1, "error_string": "Object out of bounds"}, rf)
        mock_proc = MagicMock()
        mock_proc.returncode = 0
        mock_proc.communicate.return_value = ("", "")
        return mock_proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(dummy_3mf)

    assert res["success"] is False
    assert res["error_code"] == "SLICER_EXECUTION_ERROR"
    assert "Object out of bounds" in res["error"]


# ---------------------------------------------------------------------------
# Test 7: Determine printable plates from 3MF
# ---------------------------------------------------------------------------

def test_determine_printable_plates(tmp_path):
    f = tmp_path / "multiplate.3mf"
    with zipfile.ZipFile(f, "w") as zf:
        zf.writestr(
            "Metadata/model_settings.config",
            """<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1"/>
    <model_instance><metadata key="object_id" value="1"/></model_instance>
  </plate>
  <plate>
    <metadata key="plater_id" value="2"/>
    <model_instance><metadata key="object_id" value="2"/></model_instance>
  </plate>
  <plate>
    <metadata key="plater_id" value="3"/>
    <!-- No model instances here -->
  </plate>
</config>""",
        )

    plates = determine_printable_plates(str(f))
    assert plates == [1, 2]


# ---------------------------------------------------------------------------
# Test 8: End-to-end integration: Multicolor route in main.py invokes Bambu adapter
# ---------------------------------------------------------------------------

def test_multicolor_route_invokes_bambu_adapter_in_main(dummy_3mf, pricing_params):
    job_id = "job_test_multicolor_route_e2e"
    JOBS[job_id] = {
        "id": job_id,
        "fileName": "stitch_model.3mf",
        "status": JobStatus.QUEUED,
        "stage_message": "Queued",
        "params": pricing_params,
    }

    mock_insp = {
        "success": True,
        "detected_format": "slicer_project_3mf",
        "can_slice": True,
        "slicer_origin": "bambu_or_orca",
        "color_analysis": {
            "success": True,
            "isMultiColor": True,
            "paletteSize": 2,
            "colors": [
                {"sourceFilament": 1, "hex": "#FF0000", "materialType": "PETG"},
                {"sourceFilament": 2, "hex": "#0000FF", "materialType": "PETG"},
            ],
        },
        "model_analysis": {
            "success": True,
            "project": {"slicerOrigin": "bambu_or_orca"},
            "processing": {"recommendedRoute": "multicolor_capable", "requiresManualReview": False},
        },
    }

    mock_bambu_slice_res = {
        "success": True,
        "adapter": "bambu_studio_cli",
        "slicer_version": "02.08.02.61",
        "dimensions": {"x": 50.0, "y": 60.0, "z": 70.0},
        "active_envelope": {"x": 256.0, "y": 256.0, "z": 256.0},
        "statistics": {
            "filament_grams": 75.0,
            "filament_mm": 24000.0,
            "print_time_seconds": 3600,
            "print_time_minutes": 60.0,
            "print_time_hours": 1.0,
            "raw_time_string": "1h 0m 0s",
            "plate_count": 1,
            "tool_change_count": 30,
            "per_filament": [
                {
                    "filamentIndex": 1,
                    "color": "#FF0000",
                    "materialType": "PETG",
                    "modelGrams": 20.0,
                    "totalGrams": 40.0,
                    "purgeGrams": 20.0,
                },
                {
                    "filamentIndex": 2,
                    "color": "#0000FF",
                    "materialType": "PETG",
                    "modelGrams": 15.0,
                    "totalGrams": 35.0,
                    "purgeGrams": 20.0,
                },
            ],
            "production_verification_status": "verified",
        },
        "gcode_hash": "a" * 64,
        "gcode_reference": "gcode_sha256_" + "a" * 16,
        "production_verification_status": "verified",
    }

    with patch("app.main.inspect_file", return_value=mock_insp), \
         patch("app.main.quote_store.find_active_quote_by_config_hash", return_value=None), \
         patch("app.main.execute_bambu_slice", return_value=mock_bambu_slice_res) as mock_bambu_call, \
         patch("app.main.execute_bounded_slice") as mock_prusa_call:

        process_slicing_job(job_id, dummy_3mf, pricing_params)

        # Bambu adapter must have been invoked
        assert mock_bambu_call.called
        # PrusaSlicer must NOT have been invoked
        assert not mock_prusa_call.called

        assert JOBS[job_id]["status"] == JobStatus.COMPLETED
        assert JOBS[job_id]["multicolor_detected"] is True

        res = JOBS[job_id]["result"]
        assert res["production"]["colourMode"] == "multicolour"
        assert res["production"]["slicerAdapter"] == "bambu_studio_cli"
        assert res["slice"]["adapter"] == "bambu_studio_cli"
        assert res["slice"]["slicerVersion"] == "02.08.02.61"
        assert res["slice"]["statistics"]["filament_grams"] == 75.0
        assert res["pricing"]["totalPrice"] > 0


# ---------------------------------------------------------------------------
# Test 9: Single-material route still uses PrusaSlicer
# ---------------------------------------------------------------------------

def test_single_material_route_uses_prusaslicer_in_main(dummy_3mf, pricing_params):
    pricing_params["productionPrinterProfile"] = dict(pricing_params["productionPrinterProfile"], slicerAdapter="prusaslicer")
    job_id = "job_test_single_mat_route_e2e"
    JOBS[job_id] = {
        "id": job_id,
        "fileName": "cube.stl",
        "status": JobStatus.QUEUED,
        "stage_message": "Queued",
        "params": pricing_params,
    }

    mock_insp = {
        "success": True,
        "detected_format": "stl",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "single_material", "requiresManualReview": False},
        },
    }

    mock_prusa_slice_res = {
        "success": True,
        "dimensions": {"x": 20.0, "y": 20.0, "z": 20.0},
        "active_envelope": {"x": 256.0, "y": 256.0, "z": 200.0},
        "statistics": {
            "filament_grams": 10.0,
            "filament_mm": 3300.0,
            "print_time_seconds": 1800,
            "print_time_hours": 0.5,
            "print_time_minutes": 30.0,
            "raw_time_string": "0h 30m 0s",
            "plate_count": 1,
        },
        "gcode_hash": "b" * 64,
        "gcode_reference": "gcode_sha256_" + "b" * 16,
    }

    with patch("app.main.inspect_file", return_value=mock_insp), \
         patch("app.main.quote_store.find_active_quote_by_config_hash", return_value=None), \
         patch("app.main.execute_bambu_slice") as mock_bambu_call, \
         patch("app.main.execute_bounded_slice", return_value=mock_prusa_slice_res) as mock_prusa_call:

        process_slicing_job(job_id, dummy_3mf, pricing_params)

        # PrusaSlicer must have been invoked
        assert mock_prusa_call.called
        # Bambu adapter must NOT have been invoked
        assert not mock_bambu_call.called

        assert JOBS[job_id]["status"] == JobStatus.COMPLETED
        res = JOBS[job_id]["result"]
        assert res["production"]["colourMode"] == "single_colour"
        assert res["production"]["slicerAdapter"] == "prusaslicer"
        assert res["pricing"]["totalPrice"] > 0


def test_force_reslice_bypasses_cache(dummy_3mf, pricing_params):
    """When forceReslice is True, cache lookup is skipped and fresh slicing is executed."""
    job_id = "job_test_force_reslice_bypasses"
    pricing_params_with_force = dict(pricing_params)
    pricing_params_with_force["productionPrinterProfile"] = dict(pricing_params["productionPrinterProfile"], slicerAdapter="prusaslicer")
    pricing_params_with_force["forceReslice"] = True

    JOBS[job_id] = {
        "id": job_id,
        "fileName": "cube.stl",
        "status": JobStatus.QUEUED,
        "stage_message": "Queued",
        "params": pricing_params_with_force,
    }

    mock_insp = {
        "success": True,
        "detected_format": "stl",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "single_material", "requiresManualReview": False},
        },
    }

    mock_prusa_slice_res = {
        "success": True,
        "adapter": "prusaslicer",
        "slicer_version": "2.9.0",
        "dimensions": {"x": 20.0, "y": 20.0, "z": 20.0},
        "active_envelope": {"x": 256.0, "y": 256.0, "z": 200.0},
        "statistics": {
            "filament_grams": 10.0,
            "filament_mm": 3300.0,
            "print_time_seconds": 1800,
            "print_time_hours": 0.5,
            "print_time_minutes": 30.0,
            "raw_time_string": "0h 30m 0s",
            "plate_count": 1,
        },
        "gcode_hash": "b" * 64,
        "gcode_reference": "gcode_sha256_" + "b" * 16,
    }

    with patch("app.main.inspect_file", return_value=mock_insp), \
         patch("app.main.quote_store.find_active_quote_by_config_hash") as mock_cache_find, \
         patch("app.main.execute_bounded_slice", return_value=mock_prusa_slice_res) as mock_prusa_call:

        process_slicing_job(job_id, dummy_3mf, pricing_params_with_force)

        # find_active_quote_by_config_hash MUST NOT have been called
        assert not mock_cache_find.called
        # Fresh slice MUST have been executed
        assert mock_prusa_call.called
        assert JOBS[job_id]["status"] == JobStatus.COMPLETED
        assert JOBS[job_id]["stage_message"] == "Estimate ready"


def test_cache_hit_when_force_reslice_is_false(dummy_3mf, pricing_params):
    """When forceReslice is False and a cached quote exists, dedup cache is served."""
    job_id = "job_test_cache_hit"
    pricing_params_no_force = dict(pricing_params)
    pricing_params_no_force["forceReslice"] = False

    JOBS[job_id] = {
        "id": job_id,
        "fileName": "cube.stl",
        "status": JobStatus.QUEUED,
        "stage_message": "Queued",
        "params": pricing_params_no_force,
    }

    mock_insp = {
        "success": True,
        "detected_format": "stl",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "single_material", "requiresManualReview": False},
        },
    }

    mock_cached_quote = {
        "quoteId": "quote_cached_123",
        "jobId": "job_cached_old",
        "status": "quoted",
        "pricing": {"totalPrice": 250.0},
        "slice": {
            "dimensions": {"x": 20.0, "y": 20.0, "z": 20.0},
            "filamentGrams": 15.0,
            "printTimeSeconds": 1800,
            "statistics": {"filament_grams": 15.0, "print_time_seconds": 1800},
        },
        "production": {
            "printerId": "BAMBU-A1-MINI-01",
        },
    }

    with patch("app.main.inspect_file", return_value=mock_insp), \
         patch("app.main.quote_store.find_active_quote_by_config_hash", return_value=mock_cached_quote) as mock_cache_find, \
         patch("app.main.execute_bounded_slice") as mock_prusa_call:

        process_slicing_job(job_id, dummy_3mf, pricing_params_no_force)

        assert mock_cache_find.called
        assert not mock_prusa_call.called
        assert JOBS[job_id]["status"] == JobStatus.COMPLETED
        assert JOBS[job_id]["stage_message"] == "Estimate ready (cached)"
        assert JOBS[job_id]["quoteId"] == "quote_cached_123"
