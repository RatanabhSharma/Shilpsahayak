"""
Tests for the Slicer Router / Adapter Selection Layer.

Covers:
  1.  STL                  → single_material (PrusaSlicer)
  2.  Ordinary OBJ         → single_material (PrusaSlicer)
  3.  Standard 3MF         → single_material (no multicolor capability)
  4.  Bambu/Orca multicolor 3MF → multicolor (bambu_studio_cli)
  5.  Unsupported / gcode  → manual_review
  6.  Pre-sliced 3MF       → manual_review (MANUAL_PRE_SLICED)
  7.  Non-manifold model   → manual_review (analyzer flag)
  8.  OBJ with multi-material → manual_review (no CLI support yet)
  9.  allow_multicolor=False forces single_material even for Bambu
  10. Route decision keys are always present

These tests use fabricated inspection dicts — no real slicer is invoked.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.slicer_router import decide_route, SlicerRoute, RouteReasonCode


# ---------------------------------------------------------------------------
# Helpers – build minimal inspection dicts
# ---------------------------------------------------------------------------

def _stl_insp(**kwargs):
    base = {
        "success": True,
        "detected_format": "stl",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "single_material", "reason": "STL", "requiresManualReview": False},
        },
    }
    base.update(kwargs)
    return base


def _obj_insp(**kwargs):
    base = {
        "success": True,
        "detected_format": "obj",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "single_material", "reason": "OBJ", "requiresManualReview": False},
        },
    }
    base.update(kwargs)
    return base


def _standard_3mf_insp(**kwargs):
    base = {
        "success": True,
        "detected_format": "standard_3mf",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "single_material", "reason": "No multicolor", "requiresManualReview": False},
        },
    }
    base.update(kwargs)
    return base


def _bambu_multicolor_insp(**kwargs):
    """Simulates the output of inspect_file() for Stitchxpikachu.3mf."""
    base = {
        "success": True,
        "detected_format": "slicer_project_3mf",
        "can_slice": True,
        "slicer_origin": "bambu_or_orca",
        "color_analysis": {
            "success": True,
            "isMultiColor": True,
            "paletteSize": 8,
            "colors": [
                {"hex": "#161616", "sourceFilament": 1, "materialType": "PETG"},
                {"hex": "#FFFFFF", "sourceFilament": 2, "materialType": "PETG"},
            ],
        },
        "model_analysis": {
            "success": True,
            "project": {"slicerOrigin": "bambu_or_orca"},
            "processing": {"recommendedRoute": "multicolor_capable", "reason": "8 filaments", "requiresManualReview": False},
        },
    }
    base.update(kwargs)
    return base


def _gcode_insp(**kwargs):
    base = {
        "success": True,
        "detected_format": "gcode",
        "can_slice": False,
        "error_code": "UNSUPPORTED_PRE_SLICED_FILE",
        "message": "Pre-sliced G-code.",
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": None,
    }
    base.update(kwargs)
    return base


def _presliced_3mf_insp(**kwargs):
    base = {
        "success": True,
        "detected_format": "sliced_3mf",
        "can_slice": False,
        "error_code": "UNSUPPORTED_PRE_SLICED_FILE",
        "message": "Pre-sliced 3MF.",
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": None,
    }
    base.update(kwargs)
    return base


def _nonmanifold_stl_insp(**kwargs):
    """STL that passes file inspection but analyzer flags as non-manifold."""
    base = {
        "success": True,
        "detected_format": "stl",
        "can_slice": True,          # inspector says OK
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {
                "recommendedRoute": "single_material",
                "reason": "Mesh is not a clean closed manifold; slicing may need repair.",
                "requiresManualReview": True,
            },
        },
    }
    base.update(kwargs)
    return base


def _obj_multimaterial_insp(**kwargs):
    """OBJ with multiple material assignments — analyzer flags multicolor."""
    base = {
        "success": True,
        "detected_format": "obj",
        "can_slice": True,
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": {
            "success": True,
            "processing": {"recommendedRoute": "multicolor_capable", "reason": "Multiple MTL materials", "requiresManualReview": False},
        },
    }
    base.update(kwargs)
    return base


def _unsupported_insp(**kwargs):
    base = {
        "success": False,
        "detected_format": "step",
        "can_slice": False,
        "error_code": "MANUAL_REVIEW_STEP",
        "message": "STEP file.",
        "slicer_origin": "",
        "color_analysis": None,
        "model_analysis": None,
    }
    base.update(kwargs)
    return base


# ---------------------------------------------------------------------------
# TEST 1 – STL → single_material
# ---------------------------------------------------------------------------

def test_stl_routes_to_single_material():
    result = decide_route(_stl_insp())
    assert result["route"] == SlicerRoute.SINGLE_MATERIAL
    assert result["reason_code"] == RouteReasonCode.SINGLE_MATERIAL_STL
    assert result["adapter"] == "prusaslicer"


# ---------------------------------------------------------------------------
# TEST 2 – Ordinary OBJ → single_material
# ---------------------------------------------------------------------------

def test_obj_single_material_routes_to_prusaslicer():
    result = decide_route(_obj_insp())
    assert result["route"] == SlicerRoute.SINGLE_MATERIAL
    assert result["reason_code"] == RouteReasonCode.SINGLE_MATERIAL_OBJ
    assert result["adapter"] == "prusaslicer"


# ---------------------------------------------------------------------------
# TEST 3 – Standard 3MF (no multicolor) → single_material
# ---------------------------------------------------------------------------

def test_standard_3mf_no_multicolor_routes_to_single_material():
    result = decide_route(_standard_3mf_insp())
    assert result["route"] == SlicerRoute.SINGLE_MATERIAL
    assert result["reason_code"] == RouteReasonCode.SINGLE_MATERIAL_3MF
    assert result["adapter"] == "prusaslicer"


# ---------------------------------------------------------------------------
# TEST 4 – Bambu/Orca multicolor 3MF → multicolor adapter
# ---------------------------------------------------------------------------

def test_bambu_multicolor_3mf_routes_to_multicolor():
    result = decide_route(_bambu_multicolor_insp())
    assert result["route"] == SlicerRoute.MULTICOLOR
    assert result["reason_code"] == RouteReasonCode.MULTICOLOR_BAMBU_ORCA
    assert result["adapter"] == "bambu_studio_cli"
    # color_analysis must be passed through
    assert result["color_analysis"]["isMultiColor"] is True
    assert result["color_analysis"]["paletteSize"] == 8


# ---------------------------------------------------------------------------
# TEST 5 – Plain G-code → manual_review
# ---------------------------------------------------------------------------

def test_gcode_routes_to_manual_review():
    result = decide_route(_gcode_insp())
    assert result["route"] == SlicerRoute.MANUAL_REVIEW
    assert result["reason_code"] == RouteReasonCode.MANUAL_PRE_SLICED
    assert result["adapter"] == "none"


# ---------------------------------------------------------------------------
# TEST 6 – Pre-sliced 3MF → manual_review
# ---------------------------------------------------------------------------

def test_presliced_3mf_routes_to_manual_review():
    result = decide_route(_presliced_3mf_insp())
    assert result["route"] == SlicerRoute.MANUAL_REVIEW
    assert result["reason_code"] == RouteReasonCode.MANUAL_PRE_SLICED
    assert result["adapter"] == "none"


# ---------------------------------------------------------------------------
# TEST 7 – Non-manifold STL (analyzer flag) → manual_review
# ---------------------------------------------------------------------------

def test_nonmanifold_stl_routes_to_manual_review():
    result = decide_route(_nonmanifold_stl_insp())
    assert result["route"] == SlicerRoute.MANUAL_REVIEW
    assert result["reason_code"] == RouteReasonCode.MANUAL_NON_MANIFOLD
    assert result["adapter"] == "none"


# ---------------------------------------------------------------------------
# TEST 8 – OBJ with multi-material → manual_review (no CLI support yet)
# ---------------------------------------------------------------------------

def test_obj_multimaterial_routes_to_manual_review():
    result = decide_route(_obj_multimaterial_insp())
    assert result["route"] == SlicerRoute.MANUAL_REVIEW
    assert result["reason_code"] == RouteReasonCode.MANUAL_AMBIGUOUS_PROJECT
    assert result["adapter"] == "none"


# ---------------------------------------------------------------------------
# TEST 9 – allow_multicolor=False forces single_material for Bambu 3MF
# ---------------------------------------------------------------------------

def test_allow_multicolor_false_forces_single_material():
    result = decide_route(_bambu_multicolor_insp(), allow_multicolor=False)
    assert result["route"] == SlicerRoute.SINGLE_MATERIAL
    assert result["adapter"] == "prusaslicer"


# ---------------------------------------------------------------------------
# TEST 10 – Unsupported format (STEP) → manual_review
# ---------------------------------------------------------------------------

def test_unsupported_format_routes_to_manual_review():
    result = decide_route(_unsupported_insp())
    assert result["route"] == SlicerRoute.MANUAL_REVIEW
    assert result["adapter"] == "none"


# ---------------------------------------------------------------------------
# TEST 11 – Result always has required keys
# ---------------------------------------------------------------------------

def test_route_result_always_has_required_keys():
    for insp in [
        _stl_insp(),
        _obj_insp(),
        _standard_3mf_insp(),
        _bambu_multicolor_insp(),
        _gcode_insp(),
        _unsupported_insp(),
    ]:
        result = decide_route(insp)
        for key in ("route", "reason_code", "reason", "adapter"):
            assert key in result, f"Key '{key}' missing from route result for {insp['detected_format']}"


# ---------------------------------------------------------------------------
# TEST 12 – Bambu 3MF without confirmed multicolor → single_material
# ---------------------------------------------------------------------------

def test_bambu_3mf_no_multicolor_routes_to_single_material():
    """A Bambu/Orca project 3MF where color_analysis shows isMultiColor=False."""
    insp = {
        "success": True,
        "detected_format": "slicer_project_3mf",
        "can_slice": True,
        "slicer_origin": "bambu_or_orca",
        "color_analysis": {
            "success": True,
            "isMultiColor": False,
            "paletteSize": 1,
            "colors": [{"hex": "#FF0000", "sourceFilament": 1}],
        },
        "model_analysis": {
            "success": True,
            "project": {"slicerOrigin": "bambu_or_orca"},
            "processing": {"recommendedRoute": "single_material", "reason": "1 filament", "requiresManualReview": False},
        },
    }
    result = decide_route(insp)
    assert result["route"] == SlicerRoute.SINGLE_MATERIAL
    assert result["adapter"] == "prusaslicer"

