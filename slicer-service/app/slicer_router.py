"""
Shilp Studio Slicer Router / Adapter Selection Layer
=====================================================

Sits between the Universal Model Analyzer (which classifies the uploaded
model) and the actual slicing engines (PrusaSlicer, Bambu Studio CLI, …).

Decision flow
-------------
1. Inspect the *normalised* model_analysis produced by universal_model_analyzer
   (already attached to the file_inspector result as ``model_analysis``).
2. Also inspect the file_inspector result for slicer_origin / color_analysis.
3. Route to exactly one of:
   - ``single_material``  → existing PrusaSlicer path (default, safe)
   - ``multicolor``       → multicolor-capable adapter (Bambu/Orca CLI, etc.)
   - ``manual_review``    → no automatic slicing; routes to workshop queue

Key guarantees
--------------
- File extension is NEVER the sole routing criterion.
- STL and ordinary OBJ/3MF always route to ``single_material``.
- A Bambu/Orca-style 3MF that the analyzer flags as multicolor_capable
  routes to ``multicolor``.
- Any format/state that cannot be reliably auto-sliced returns
  ``manual_review`` with a clear ``reason_code``.
- The multicolor adapter slot is intentionally modular: swap or extend it
  by providing a different ``SlicerAdapter`` implementation.
- Existing PrusaSlicer single-material path is completely unchanged.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# Public constants – route identifiers
# ---------------------------------------------------------------------------

class SlicerRoute:
    """Canonical route identifiers returned by ``decide_route``."""
    SINGLE_MATERIAL = "single_material"
    MULTICOLOR      = "multicolor"
    MANUAL_REVIEW   = "manual_review"


# ---------------------------------------------------------------------------
# Reason codes – machine-readable explanation for the route decision
# ---------------------------------------------------------------------------

class RouteReasonCode:
    # single_material
    SINGLE_MATERIAL_STL           = "SINGLE_MATERIAL_STL"
    SINGLE_MATERIAL_OBJ           = "SINGLE_MATERIAL_OBJ"
    SINGLE_MATERIAL_3MF           = "SINGLE_MATERIAL_3MF"
    SINGLE_MATERIAL_NO_MULTICOLOR = "SINGLE_MATERIAL_NO_MULTICOLOR"
    # multicolor
    MULTICOLOR_BAMBU_ORCA         = "MULTICOLOR_BAMBU_ORCA"
    # manual_review
    MANUAL_UNSUPPORTED_FORMAT     = "MANUAL_UNSUPPORTED_FORMAT"
    MANUAL_PRE_SLICED             = "MANUAL_PRE_SLICED"
    MANUAL_NON_MANIFOLD           = "MANUAL_NON_MANIFOLD"
    MANUAL_NO_GEOMETRY            = "MANUAL_NO_GEOMETRY"
    MANUAL_AMBIGUOUS_PROJECT      = "MANUAL_AMBIGUOUS_PROJECT"


# ---------------------------------------------------------------------------
# Route decision result
# ---------------------------------------------------------------------------

def _result(
    route: str,
    reason_code: str,
    reason: str,
    adapter: str,
    *,
    color_analysis: Optional[Dict[str, Any]] = None,
    model_analysis: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "route": route,
        "reason_code": reason_code,
        "reason": reason,
        "adapter": adapter,
        "color_analysis": color_analysis,
        "model_analysis": model_analysis,
    }


# ---------------------------------------------------------------------------
# Core routing logic
# ---------------------------------------------------------------------------

def decide_route(
    inspection: Dict[str, Any],
    *,
    allow_multicolor: bool = True,
) -> Dict[str, Any]:
    """
    Given the result of ``file_inspector.inspect_file()``, decide which
    slicing route to use.

    Parameters
    ----------
    inspection:
        The dict returned by ``inspect_file()`` (with ``model_analysis``
        attached by ``_attach_model_analysis``).
    allow_multicolor:
        Feature flag.  Set to False to force all traffic through the
        single-material PrusaSlicer path (useful for A/B testing or
        gradual rollout).

    Returns
    -------
    A routing decision dict with keys:
        route         – one of SlicerRoute.*
        reason_code   – one of RouteReasonCode.*
        reason        – human-readable explanation
        adapter       – which adapter will be used
        color_analysis – pass-through from inspection (may be None)
        model_analysis – pass-through from inspection (may be None)
    """
    fmt         = inspection.get("detected_format", "") or ""
    can_slice   = inspection.get("can_slice", False)
    color_analysis  = inspection.get("color_analysis")
    model_analysis  = inspection.get("model_analysis")
    slicer_origin   = inspection.get("slicer_origin", "")

    # ------------------------------------------------------------------
    # Guard 1 – file cannot be auto-sliced at all
    # ------------------------------------------------------------------
    if not can_slice:
        error_code = inspection.get("error_code", "")
        pre_sliced_codes = {
            "UNSUPPORTED_PRE_SLICED_FILE",
            "PROJECT_WITHOUT_MESH",
        }
        if error_code in pre_sliced_codes or fmt in ("gcode", "sliced_3mf", "project_without_mesh"):
            return _result(
                SlicerRoute.MANUAL_REVIEW,
                RouteReasonCode.MANUAL_PRE_SLICED,
                "Pre-sliced or toolpath-only file detected; original model required.",
                "none",
                color_analysis=color_analysis,
                model_analysis=model_analysis,
            )
        return _result(
            SlicerRoute.MANUAL_REVIEW,
            RouteReasonCode.MANUAL_UNSUPPORTED_FORMAT,
            inspection.get("message") or inspection.get("error") or "File cannot be automatically sliced.",
            "none",
            color_analysis=color_analysis,
            model_analysis=model_analysis,
        )

    # ------------------------------------------------------------------
    # Guard 2 – analyzer says manual review is required (non-manifold etc.)
    # ------------------------------------------------------------------
    processing = {}
    if model_analysis and model_analysis.get("success"):
        processing = model_analysis.get("processing", {})
        if processing.get("requiresManualReview"):
            return _result(
                SlicerRoute.MANUAL_REVIEW,
                RouteReasonCode.MANUAL_NON_MANIFOLD,
                processing.get("reason", "Model requires manual workshop review before slicing."),
                "none",
                color_analysis=color_analysis,
                model_analysis=model_analysis,
            )

    # ------------------------------------------------------------------
    # STL → always single-material PrusaSlicer
    # ------------------------------------------------------------------
    if fmt == "stl":
        return _result(
            SlicerRoute.SINGLE_MATERIAL,
            RouteReasonCode.SINGLE_MATERIAL_STL,
            "STL format: single-material slicing via PrusaSlicer.",
            "prusaslicer",
            color_analysis=color_analysis,
            model_analysis=model_analysis,
        )

    # ------------------------------------------------------------------
    # OBJ → single-material unless analyzer explicitly flags multicolor
    # ------------------------------------------------------------------
    if fmt == "obj":
        if allow_multicolor and _is_multicolor_capable(processing, color_analysis):
            # OBJ with multi-material MTL assignments – currently no CLI
            # supports this natively, so route to manual review.
            return _result(
                SlicerRoute.MANUAL_REVIEW,
                RouteReasonCode.MANUAL_AMBIGUOUS_PROJECT,
                "OBJ with multi-material assignments detected; automatic multicolor slicing is not yet supported for OBJ. Routed to workshop review.",
                "none",
                color_analysis=color_analysis,
                model_analysis=model_analysis,
            )
        return _result(
            SlicerRoute.SINGLE_MATERIAL,
            RouteReasonCode.SINGLE_MATERIAL_OBJ,
            "OBJ format: single-material slicing via PrusaSlicer.",
            "prusaslicer",
            color_analysis=color_analysis,
            model_analysis=model_analysis,
        )

    # ------------------------------------------------------------------
    # 3MF family – deepest routing logic
    # ------------------------------------------------------------------
    if fmt in ("standard_3mf", "slicer_project_3mf"):
        return _route_3mf(
            inspection,
            processing,
            color_analysis,
            model_analysis,
            slicer_origin=slicer_origin,
            allow_multicolor=allow_multicolor,
        )

    # ZIP archive of models – always handled as single-material after extraction
    if fmt == "zip_archive":
        return _result(
            SlicerRoute.SINGLE_MATERIAL,
            RouteReasonCode.SINGLE_MATERIAL_NO_MULTICOLOR,
            "ZIP archive: primary model extracted and sliced via PrusaSlicer.",
            "prusaslicer",
            color_analysis=color_analysis,
            model_analysis=model_analysis,
        )

    # ------------------------------------------------------------------
    # Unknown / unsupported format
    # ------------------------------------------------------------------
    return _result(
        SlicerRoute.MANUAL_REVIEW,
        RouteReasonCode.MANUAL_UNSUPPORTED_FORMAT,
        f"Format '{fmt}' is not supported for automatic slicing. Routed to workshop review.",
        "none",
        color_analysis=color_analysis,
        model_analysis=model_analysis,
    )


def _route_3mf(
    inspection: Dict[str, Any],
    processing: Dict[str, Any],
    color_analysis: Optional[Dict[str, Any]],
    model_analysis: Optional[Dict[str, Any]],
    *,
    slicer_origin: str,
    allow_multicolor: bool,
) -> Dict[str, Any]:
    """3MF-specific routing sub-function."""

    # Is this a Bambu/Orca project AND does it carry confirmed multicolor data?
    is_bambu_orca = (slicer_origin == "bambu_or_orca") or (
        model_analysis
        and model_analysis.get("success")
        and (model_analysis.get("project") or {}).get("slicerOrigin") == "bambu_or_orca"
    )
    has_multicolor = _is_multicolor_capable(processing, color_analysis)

    if allow_multicolor and is_bambu_orca and has_multicolor:
        return {
            "route": SlicerRoute.MULTICOLOR,
            "reason_code": RouteReasonCode.MULTICOLOR_BAMBU_ORCA,
            "reason": (
                f"Bambu/Orca-style multicolor 3MF detected: "
                f"{_multicolor_palette_size(color_analysis)} filament palette with "
                f"per-face paint assignments. Routed to multicolor adapter."
            ),
            "adapter": "bambu_studio_cli",
            "color_analysis": color_analysis,
            "model_analysis": model_analysis,
        }

    # Any 3MF that is NOT a confirmed Bambu/Orca multicolor project → PrusaSlicer
    if is_bambu_orca:
        reason = "Bambu/Orca project 3MF without confirmed multicolor paint data: sliced via PrusaSlicer."
    else:
        reason = "Standard 3MF (non-multicolor): sliced via PrusaSlicer."

    return _result(
        SlicerRoute.SINGLE_MATERIAL,
        RouteReasonCode.SINGLE_MATERIAL_3MF,
        reason,
        "prusaslicer",
        color_analysis=color_analysis,
        model_analysis=model_analysis,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_multicolor_capable(
    processing: Dict[str, Any],
    color_analysis: Optional[Dict[str, Any]],
) -> bool:
    """
    True when the model carries confirmed multicolor / multimaterial data.

    Checks two independent evidence sources:
    1. The analyzer's ``processing.recommendedRoute`` (format-agnostic).
    2. The Bambu/Orca color_analysis ``isMultiColor`` flag (Bambu-specific).
    """
    # Analyzer evidence
    recommended = (processing or {}).get("recommendedRoute", "single_material")
    if recommended in ("multicolor_capable", "multimaterial_capable"):
        return True

    # Bambu/Orca color_analysis evidence
    if color_analysis and color_analysis.get("success") and color_analysis.get("isMultiColor"):
        return True

    return False


def _multicolor_palette_size(color_analysis: Optional[Dict[str, Any]]) -> int:
    if not color_analysis:
        return 0
    return color_analysis.get("paletteSize") or len(color_analysis.get("colors") or [])

