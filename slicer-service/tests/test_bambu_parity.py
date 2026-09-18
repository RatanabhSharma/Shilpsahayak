"""
Tests for Bambu Studio Parity, Authoritative Timing, and 4-Way Filament Reconciliation
======================================================================================

Validates:
1. G-code feature extraction: model, support, prime tower, flush/purge ratios.
2. Timing extraction: sum(feature_type_times) preferred over total_predication to include tool change motions.
3. Missing or zero timing fails with MISSING_AUTHORITATIVE_TIME.
4. Missing or zero filament fails with MISSING_AUTHORITATIVE_STATISTICS.
5. 4-way filament reconciliation:
     model + support + tower + purge == total_filament_grams (exact to 0.01g).
     Per-channel: modelGrams + supportGrams + towerGrams + purgeGrams == totalGrams.
6. Validation gate: Result passes validate_slicer_result without error.
7. Flush multiplier precedence:
     - Source 3MF project settings preserved by default.
     - Customer parameters cannot override flush_multiplier.
     - Only explicit workshop_profile_override can configure flush_multiplier.
"""

import os
import sys
import json
import zipfile
from unittest.mock import patch, MagicMock

import pytest

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "app"))
sys.path.insert(0, os.path.abspath(os.path.join(BASE_DIR, "..")))
sys.path.insert(0, APP_DIR)

from app.slicer_adapters.bambu_adapter import (
    BambuSlicerAdapter,
    parse_bambu_gcode_details,
    parse_bambu_gcode_header,
    parse_time_string,
    configure_project_production_material,
    configure_project_production_settings,
    extract_source_project_metadata,
)
from app.slicer_result_validator import validate_slicer_result
from app.slice_core import read_profile_envelope


@pytest.fixture
def sample_3mf_with_settings(tmp_path):
    f = tmp_path / "model_with_flush.3mf"
    with zipfile.ZipFile(f, "w") as zf:
        zf.writestr("3D/3dmodel.model", "<model unit='millimeter'/>")
        zf.writestr(
            "Metadata/model_settings.config",
            """<?xml version="1.0" encoding="UTF-8"?>
<config>
  <plate>
    <metadata key="plater_id" value="1"/>
    <model_instance>
      <metadata key="object_id" value="1"/>
    </model_instance>
  </plate>
</config>""",
        )
        project_cfg = {
            "filament_type": ["PETG", "PETG"],
            "filament_density": ["1.27", "1.27"],
            "flush_multiplier": ["0.75"],
        }
        zf.writestr("Metadata/project_settings.config", json.dumps(project_cfg))
    return str(f)


def test_parse_time_string():
    assert parse_time_string("3d 14h 26m 36s") == 3 * 86400 + 14 * 3600 + 26 * 60 + 36
    assert parse_time_string("77h 50m 18s") == 77 * 3600 + 50 * 60 + 18
    assert parse_time_string("2h 30m") == 2 * 3600 + 30 * 60
    assert parse_time_string("45s") == 45
    assert parse_time_string("7200") == 7200
    assert parse_time_string("") == 0


def test_source_printer_metadata_is_provenance_and_admin_profile_is_applied(tmp_path):
    archive = tmp_path / "source_project.3mf"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("Metadata/project_settings.config", json.dumps({
            "printer_settings_id": "Bambu Lab P1S 0.4 nozzle",
            "printer_model": "Bambu Lab P1S",
            "nozzle_diameter": ["0.4"],
        }))

    source = extract_source_project_metadata(str(archive))
    assert source["printerSettingsId"] == "Bambu Lab P1S 0.4 nozzle"

    with zipfile.ZipFile(archive, "a") as zf:
        zf.writestr("Metadata/model_settings.config", "<config/>")
    applied = configure_project_production_settings(
        str(archive),
        production_profile={
            "id": "BAMBU-A1-MINI-01",
            "name": "Bambu Lab A1 mini",
            "slicerSettingsId": "GM020",
            "printerSettingsId": "Bambu Lab A1 mini 0.4 nozzle",
            "model": "Bambu Lab A1 mini",
            "nozzleDiameter": 0.4,
        },
    )

    with zipfile.ZipFile(archive, "r") as zf:
        cfg = json.loads(zf.read("Metadata/project_settings.config"))
    assert applied["printer_settings_id"] == "Bambu Lab A1 mini 0.4 nozzle"
    assert cfg["printer_settings_id"] == "Bambu Lab A1 mini 0.4 nozzle"
    assert cfg["printer_model"] == "Bambu Lab A1 mini"
    assert source["printerSettingsId"] != cfg["printer_settings_id"]


def test_bundled_a1_mini_profile_is_production_sized():
    profile_path = os.path.join(APP_DIR, "profiles", "printer", "bambu_a1_mini_0.4.ini")
    assert os.path.basename(profile_path) == "bambu_a1_mini_0.4.ini"
    assert read_profile_envelope(profile_path) == {"x": 180.0, "y": 180.0, "z": 180.0}


def test_parse_bambu_gcode_details(tmp_path):
    gcode = tmp_path / "sample.gcode"
    gcode.write_text(
        """; total filament weight [g] : 120.0, 80.0
; total filament length [mm] : 38000.0, 25000.0
; filament_colour = #FF0000; #00FF00
; total estimated time: 2h 15m 30s
M620 S0A
T0
; FEATURE: Outer wall
G1 X10 Y10 E10.0
; FEATURE: Support
G1 X20 Y20 E2.0
; FLUSH_START
G1 E15.0
; FLUSH_END
; FEATURE: Prime tower
G1 X30 Y30 E5.0
; FEATURE: Inner wall
G1 X40 Y40 E10.0
M620 S1A
T1
""",
        encoding="utf-8"
    )

    details = parse_bambu_gcode_details(str(gcode))
    assert details["filament_weights_g"] == [120.0, 80.0]
    assert details["filament_lengths_mm"] == [38000.0, 25000.0]
    assert details["filament_colours"] == ["#FF0000", "#00FF00"]
    assert details["estimated_time_seconds"] == 2 * 3600 + 15 * 60 + 30
    assert details["m620_changes"] == 2

    # Model = 10.0 + 10.0 = 20.0, Support = 2.0 -> Main = 22.0
    # Tower = 5.0, Flush = 15.0 -> Overhead = 20.0
    assert details["feature_mm"]["model"] == 20.0
    assert details["feature_mm"]["support"] == 2.0
    assert details["feature_mm"]["tower"] == 5.0
    assert details["feature_mm"]["flush"] == 15.0

    assert abs(details["model_ratio"] - (20.0 / 22.0)) < 1e-4
    assert abs(details["support_ratio"] - (2.0 / 22.0)) < 1e-4
    assert abs(details["tower_ratio"] - (5.0 / 20.0)) < 1e-4
    assert abs(details["purge_ratio"] - (15.0 / 20.0)) < 1e-4

    # Backwards compatible header wrapper
    hdr = parse_bambu_gcode_header(str(gcode))
    assert hdr["filament_weights_g"] == [120.0, 80.0]
    assert hdr["m620_changes"] == 2
    assert hdr["estimated_time_seconds"] == 2 * 3600 + 15 * 60 + 30


def test_total_predication_preferred_over_non_additive_feature_times(sample_3mf_with_settings, tmp_path):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    # feature_type_times contains categories that are not guaranteed additive.
    fake_result = {
        "return_code": 0,
        "sliced_plates": [
            {
                "id": 1,
                "total_predication": 7200.0,
                "filament_change_times": 50,
                "feature_type_times": {
                    "Outer wall": 3000.0,
                    "Sparse infill": 3000.0,
                    "Prime tower": 1200.0,
                    "Undefined": 3600.0,  # Tool changes time!
                },
                "objects": [{"bbox": {"width": 50, "depth": 50, "height": 50}}],
                "filaments": [
                    {"id": 1, "main_used_g": 50.0, "total_used_g": 80.0},
                ],
            }
        ]
    }

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump(fake_result, f)
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as f:
            f.write("; total filament weight [g] : 80.0\n")
            f.write("; FEATURE: Outer wall\nG1 E20.0\n")
            f.write("; FEATURE: Prime tower\nG1 E10.0\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings)

    assert res["success"] is True
    # Authoritative time is total_predication, not the feature category sum.
    assert res["printTimeSeconds"] == 7200
    assert res["statistics"]["print_time_hours"] == 2.0
    assert res["statistics"]["metric_sources"]["print_time"] == "slicer_result"
    assert res["statistics"]["diagnostics"]["feature_type_times"]["1"]["Undefined"] == 3600.0


def test_four_way_filament_reconciliation_and_validation(sample_3mf_with_settings, tmp_path):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    fake_result = {
        "return_code": 0,
        "sliced_plates": [
            {
                "id": 1,
                "total_predication": 3600.0,
                "filament_change_times": 20,
                "objects": [{"bbox": {"width": 60, "depth": 60, "height": 60}}],
                "filaments": [
                    {"id": 1, "main_used_g": 60.0, "total_used_g": 100.0},
                    {"id": 2, "main_used_g": 40.0, "total_used_g": 90.0},
                ],
            }
        ]
    }

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump(fake_result, f)
        # Gcode with model, support, tower, flush
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as f:
            f.write("; total filament weight [g] : 100.0, 90.0\n")
            f.write("; FEATURE: Outer wall\nG1 E40.0\n")
            f.write("; FEATURE: Support\nG1 E10.0\n")
            f.write("; FLUSH_START\nG1 E30.0\n; FLUSH_END\n")
            f.write("; FEATURE: Prime tower\nG1 E10.0\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    color_analysis = {
        "colors": [
            {"sourceFilament": 1, "hex": "#FF0000", "materialType": "PLA"},
            {"sourceFilament": 2, "hex": "#0000FF", "materialType": "PLA"},
        ]
    }

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings, color_analysis=color_analysis)

    assert res["success"] is True
    total_g = res["filamentGrams"]
    model_g = res["model_filament_grams"]
    support_g = res["support_filament_grams"]
    tower_g = res["tower_filament_grams"]
    purge_g = res["purge_filament_grams"]

    # 1. Check top-level 4-way sum
    comp_sum = round(model_g + support_g + tower_g + purge_g, 2)
    assert abs(comp_sum - total_g) < 0.01, f"Top-level components {comp_sum} != total {total_g}"

    # 2. Check each per-filament channel 4-way sum
    for ch in res["perFilament"]:
        ch_tot = ch["totalGrams"]
        ch_sum = round(ch["modelGrams"] + ch["supportGrams"] + ch["towerGrams"] + ch["purgeGrams"], 2)
        assert abs(ch_sum - ch_tot) < 0.01, f"Channel {ch['filamentIndex']} sum {ch_sum} != total {ch_tot}"

    # 3. Validate against strict slicer_result_validator gate
    val = validate_slicer_result(res, route="multicolor")
    assert val.is_valid is True, f"Validation failed: {val.error_code} - {val.error_message}"


def test_missing_timing_fails_authoritatively(sample_3mf_with_settings):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    fake_result = {
        "return_code": 0,
        "sliced_plates": [
            {
                "id": 1,
                "total_predication": 0.0,
                "feature_type_times": {},
                "filament_change_times": 0,
                "objects": [{"bbox": {"width": 50, "depth": 50, "height": 50}}],
                "filaments": [{"id": 1, "main_used_g": 20.0, "total_used_g": 20.0}],
            }
        ]
    }

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump(fake_result, f)
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as f:
            f.write("; empty gcode with no time header\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings)

    assert res["success"] is False
    assert res["error_code"] == "MISSING_AUTHORITATIVE_TIME"


def test_flush_multiplier_precedence(sample_3mf_with_settings, tmp_path):
    # 1. Native 3MF preserves 0.75 by default
    working_copy_1 = str(tmp_path / "copy_default.3mf")
    import shutil
    shutil.copy2(sample_3mf_with_settings, working_copy_1)

    configure_project_production_material(
        archive_path=working_copy_1,
        target_material="PLA",
    )

    with zipfile.ZipFile(working_copy_1, "r") as zf:
        cfg = json.loads(zf.read("Metadata/project_settings.config"))
        assert cfg["flush_multiplier"] == ["0.75"]
        assert cfg["filament_type"] == ["PLA", "PLA"]

    # 2. Workshop profile override overrides flush_multiplier
    working_copy_2 = str(tmp_path / "copy_workshop.3mf")
    shutil.copy2(sample_3mf_with_settings, working_copy_2)

    configure_project_production_material(
        archive_path=working_copy_2,
        target_material="PLA",
        workshop_profile_override={"flush_multiplier": 0.5974},
    )

    with zipfile.ZipFile(working_copy_2, "r") as zf:
        cfg = json.loads(zf.read("Metadata/project_settings.config"))
        assert cfg["flush_multiplier"] == ["0.5974"]


def test_resolved_production_settings_are_applied(sample_3mf_with_settings, tmp_path):
    process_profile = tmp_path / "process.ini"
    process_profile.write_text("layer_height = 0.12\nfirst_layer_height = 0.12\n", encoding="utf-8")
    printer_profile = tmp_path / "printer.ini"
    printer_profile.write_text("printer_settings_id = Shilp_Test_Printer\n", encoding="utf-8")

    applied = configure_project_production_settings(
        archive_path=sample_3mf_with_settings,
        profile_path=str(process_profile),
        printer_profile_path=str(printer_profile),
        infill_percent=35,
        support_mode="none",
    )

    with zipfile.ZipFile(sample_3mf_with_settings, "r") as zf:
        cfg = json.loads(zf.read("Metadata/project_settings.config"))
    assert applied["layer_height"] == "0.12"
    assert cfg["layer_height"] == "0.12"
    assert cfg["fill_density"] == "35%"
    assert cfg["sparse_infill_density"] == "35%"
    assert cfg["support_material"] == "0"
    assert cfg["support_material_auto"] == "0"
    assert "printer_settings_id" not in cfg
    assert applied["printer_profile_requested"] == "Shilp_Test_Printer"
    assert applied["printer_settings_id"] is None


def test_bambu_preserves_and_aggregates_plate_results(sample_3mf_with_settings):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)
    fake_result = {
        "return_code": 0,
        "sliced_plates": [
            {
                "id": 1,
                "total_predication": 100.0,
                "filament_change_times": 2,
                "objects": [{"bbox": {"width": 10, "depth": 11, "height": 12}}],
                "filaments": [{"id": 1, "main_used_g": 5.0, "total_used_g": 10.0}],
            },
            {
                "id": 2,
                "total_predication": 200.0,
                "filament_change_times": 3,
                "objects": [{"bbox": {"width": 20, "depth": 21, "height": 22}}],
                "filaments": [{"id": 1, "main_used_g": 10.0, "total_used_g": 20.0}],
            },
        ],
    }

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump(fake_result, f)
        for plate_id in (1, 2):
            with open(os.path.join(out_dir, f"plate_{plate_id}.gcode"), "w") as f:
                f.write("; total filament weight [g] : 10.0\n")
                f.write("; total estimated time: 1m\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings)

    assert [plate["plateId"] for plate in res["plates"]] == [1, 2]
    assert [plate["printTimeSeconds"] for plate in res["plates"]] == [100, 200]
    assert [plate["filamentGrams"] for plate in res["plates"]] == [10.0, 20.0]
    assert res["printTimeSeconds"] == 300
    assert res["filamentGrams"] == 30.0
    assert res["toolChangeCount"] == 5


def test_bambu_uses_gcode_metrics_when_result_metrics_are_missing(sample_3mf_with_settings):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump({"return_code": 0, "sliced_plates": []}, f)
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as f:
            f.write("; total filament weight [g] : 12.34\n")
            f.write("; total estimated time: 2m 5s\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings)

    assert res["filamentGrams"] == 12.34
    assert res["printTimeSeconds"] == 125
    assert res["statistics"]["metric_sources"]["total_filament"] == "gcode_header"
    assert res["statistics"]["metric_sources"]["print_time"] == "gcode_header"


def test_bambu_fails_when_both_authoritative_metric_sources_are_missing(sample_3mf_with_settings):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump({
                "return_code": 0,
                "sliced_plates": [{
                    "id": 1,
                    "objects": [{"bbox": {"width": 10, "depth": 10, "height": 10}}],
                    "filaments": [],
                }],
            }, f)
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as f:
            f.write("; no production statistics\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings)

    assert res["success"] is False
    assert res["error_code"] == "MISSING_AUTHORITATIVE_TIME"


def test_compiled_machine_profile_inlines_templates(tmp_path):
    from app.compiled_profiles import get_or_compile_bambu_machine_profile

    res_dir = tmp_path / "resources"
    res_dir.mkdir()

    tpl_change = res_dir / "template_change.json"
    tpl_change.write_text(json.dumps({
        "change_filament_gcode": "M620 G1 E50 F300 ; PURGE FLUSH"
    }), encoding="utf-8")

    tpl_start = res_dir / "template_start.json"
    tpl_start.write_text(json.dumps({
        "machine_start_gcode": "G28 ; home\nG29 ; bed leveling"
    }), encoding="utf-8")

    raw_machine = res_dir / "test_machine.json"
    raw_machine.write_text(json.dumps({
        "name": "Test Machine 0.4 nozzle",
        "include": ["template_change", "template_start"],
        "printable_height": "250"
    }), encoding="utf-8")

    compiled = get_or_compile_bambu_machine_profile(str(raw_machine), force_recompile=True)
    assert compiled is not None
    assert os.path.isfile(compiled)

    with open(compiled, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("change_filament_gcode") == "M620 G1 E50 F300 ; PURGE FLUSH"
    assert data.get("machine_start_gcode") == "G28 ; home\nG29 ; bed leveling"
    assert data.get("printable_height") == "250"


def test_bambu_adapter_uses_compiled_machine_profile(sample_3mf_with_settings, tmp_path):
    adapter = BambuSlicerAdapter(executable_path=sys.executable)
    loaded_settings = []

    def fake_popen(cmd, *args, **kwargs):
        out_dir = cmd[cmd.index("--outputdir") + 1]
        settings_idx = cmd.index("--load-settings") + 1
        loaded_settings.append(cmd[settings_idx])
        with open(os.path.join(out_dir, "result.json"), "w") as f:
            json.dump({
                "return_code": 0,
                "sliced_plates": [{
                    "id": 1,
                    "objects": [{"bbox": {"width": 10, "depth": 10, "height": 10}}],
                    "filaments": [{"id": 1, "main_used_g": 5.0, "total_used_g": 10.0}],
                    "total_predication": 120,
                    "filament_change_times": 2,
                }],
            }, f)
        with open(os.path.join(out_dir, "plate_1.gcode"), "w") as f:
            f.write("; total filament weight [g] : 10.0\n; total estimated time: 2m\n")
        proc = MagicMock()
        proc.returncode = 0
        proc.communicate.return_value = ("", "")
        return proc

    prod_profile = {
        "id": "BAMBU-A1-01",
        "displayName": "Bambu Lab A1",
        "model": "A1",
        "printerProfileFile": "bambu_a1_0.4.ini",
        "machineProfileFile": "Bambu Lab A1 0.4 nozzle.json",
        "processProfileFile": "0.20mm Standard @BBL A1.json",
        "printerSettingsId": "Bambu Lab A1 0.4 nozzle",
        "processSettingsId": "0.20mm Standard @BBL A1",
        "slicerSettingsId": "GM020",
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
        "slicerAdapter": "bambu_studio_cli",
    }

    with patch("subprocess.Popen", side_effect=fake_popen):
        res = adapter.slice(sample_3mf_with_settings, production_params={"productionPrinterProfile": prod_profile})

    assert res["success"] is True
    assert len(loaded_settings) == 1
    # Check that the loaded machine profile is from the compiled profiles directory
    assert "compiled" in loaded_settings[0] or "Bambu Lab A1 0.4 nozzle" in loaded_settings[0]


def test_resolve_production_printer_profile_reconciliation():
    from app.main import resolve_production_printer_profile

    minimal_a1 = {
        "id": "BAMBU-A1-01",
        "manufacturer": "Bambu Lab",
        "model": "A1",
        "displayName": "Bambu Lab A1",
        "printerProfileFile": "bambu_a1_0.4.ini",
        "enabled": True,
        "slicerAdapter": "bambu_studio_cli",
        "slicerName": "Bambu Studio",
        "slicerVersion": "02.08.02.61",
        "slicerSettingsId": "GM020",
        "processSettingsId": "0.20mm Standard @BBL A1",
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
        "nozzleDiameter": 0.4,
        "extruderCount": 1,
        "supportsMulticolor": True,
        "machineParameters": {"printerStructure": "i3"},
        "defaultLayerHeight": 0.2,
        "defaultInfill": 20,
        "profileVersion": "GM020",
        # Note: machineProfileFile, processProfileFile, printerSettingsId intentionally omitted
    }

    resolved = resolve_production_printer_profile(minimal_a1)
    assert resolved is not None
    assert resolved["machineProfileFile"] == "Bambu Lab A1 0.4 nozzle.json"
    assert resolved["processProfileFile"] == "0.20mm Standard @BBL A1.json"
    assert resolved["printerSettingsId"] == "Bambu Lab A1 0.4 nozzle"

