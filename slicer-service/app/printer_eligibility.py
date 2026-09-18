"""
Shilp Studio — Production Printer Eligibility Resolver
=======================================================

Implements the internal printer-selection logic required by Shilp's production
workflow.  The customer NEVER selects a printer; this module does it
automatically using only the admin-configured ProductionPrinterProfile list.

Public API
----------
    resolve_eligible_production_printer(profiles, model_dimensions, requires_multicolor)
        -> EligibilityResult

Design rules
------------
- No if/elif per printer model name (no ``if printer == "A1 mini"`` etc.)
- Works purely via ProductionPrinterProfile fields (buildVolumeX/Y/Z,
  supportsMulticolor, enabled, defaultForProduction).
- Adding a new printer in Admin requires zero code changes here.
- Deterministic: profiles are sorted before evaluation so output is independent
  of the Firestore list order.
- Disabled profiles are completely invisible to the resolver.
- Source-project metadata from uploaded 3MF/ZIP files is NEVER consulted here.
  The only authoritative inputs are the Admin profiles and the model geometry.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger("shilp_studio.printer_eligibility")


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class PrinterEligibilityCheck:
    """Per-profile eligibility verdict with human-readable detail."""
    profile_id: str
    profile_display_name: str
    eligible: bool
    failure_reason: Optional[str] = None
    # Build-envelope comparison (mm)
    build_volume: Dict[str, float] = field(default_factory=dict)
    model_dimensions: Dict[str, float] = field(default_factory=dict)


@dataclass
class EligibilityResult:
    """
    Outcome of the automatic printer-selection pass.

    Attributes
    ----------
    eligible:
        True when at least one enabled printer can produce the job.
    selected_profile:
        The automatically chosen printer profile dict (subset of the admin
        profile, ``profilePath`` excluded for serialisation safety).
        None when ``eligible`` is False.
    reason:
        Human-readable explanation for logging / internal tooling.
        NEVER exposed directly to the customer.
    reason_code:
        Machine-readable code for error handling in main.py.
    candidates_evaluated:
        Total number of *enabled* profiles that were inspected.
    checks:
        Per-profile eligibility detail for diagnostics.
    """
    eligible: bool
    selected_profile: Optional[Dict[str, Any]]
    reason: str
    reason_code: str
    candidates_evaluated: int
    checks: List[PrinterEligibilityCheck] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Reason codes
# ---------------------------------------------------------------------------

class EligibilityReasonCode:
    SELECTED                       = "PRINTER_SELECTED"
    NO_ENABLED_PROFILES            = "NO_ENABLED_PRODUCTION_PRINTERS"
    NO_FIT_WITHIN_BUILD_VOLUME     = "NO_PRINTER_FITS_MODEL_DIMENSIONS"
    NO_MULTICOLOR_CAPABILITY       = "NO_PRINTER_SUPPORTS_MULTICOLOR"
    NO_ELIGIBLE_PRODUCTION_PRINTER = "NO_ELIGIBLE_PRODUCTION_PRINTER"


# ---------------------------------------------------------------------------
# Core resolver
# ---------------------------------------------------------------------------

def resolve_eligible_production_printer(
    profiles: List[Dict[str, Any]],
    model_dimensions: Dict[str, float],
    requires_multicolor: bool,
) -> EligibilityResult:
    """
    Automatically select an eligible production printer from the admin list.

    Parameters
    ----------
    profiles:
        All admin-configured ProductionPrinterProfile dicts received from
        the frontend (may include disabled ones — they are filtered out).
    model_dimensions:
        Model bounding box in mm: ``{"x": float, "y": float, "z": float}``.
        May be empty/partial when the slicer cannot parse dimensions; in that
        case the volume check is skipped (fail-open so the slicer can report
        its own error).
    requires_multicolor:
        True when the slicer router determined MULTICOLOR route is needed.

    Returns
    -------
    EligibilityResult
    """
    if not isinstance(profiles, list):
        return EligibilityResult(
            eligible=False,
            selected_profile=None,
            reason="No production printer profiles list provided.",
            reason_code=EligibilityReasonCode.NO_ENABLED_PROFILES,
            candidates_evaluated=0,
        )

    # Step 1 — filter to enabled profiles only
    enabled = [p for p in profiles if isinstance(p, dict) and p.get("enabled")]

    if not enabled:
        return EligibilityResult(
            eligible=False,
            selected_profile=None,
            reason="No enabled production printer profiles are configured in Admin.",
            reason_code=EligibilityReasonCode.NO_ENABLED_PROFILES,
            candidates_evaluated=0,
        )

    # Step 2 — deterministic ordering
    # Primary: defaultForProduction=True first; secondary: id ascending.
    enabled_sorted = sorted(
        enabled,
        key=lambda p: (not bool(p.get("defaultForProduction")), str(p.get("id", ""))),
    )

    sorted_ids = [str(p.get("id", "")) for p in enabled_sorted]
    logger.info(
        "Printer eligibility: evaluating %d candidate profile(s) in priority order: %s",
        len(enabled_sorted),
        sorted_ids,
        extra={"job_id": "eligibility"},
    )

    # Step 3 — per-profile eligibility checks
    checks: List[PrinterEligibilityCheck] = []
    eligible_candidates: List[Dict[str, Any]] = []

    mdx = float(model_dimensions.get("x", 0) or 0)
    mdy = float(model_dimensions.get("y", 0) or 0)
    mdz = float(model_dimensions.get("z", 0) or 0)
    has_valid_dims = mdx > 0 or mdy > 0 or mdz > 0

    for profile in enabled_sorted:
        pid = str(profile.get("id", ""))
        pname = str(profile.get("displayName", pid))
        bvx = float(profile.get("buildVolumeX") or (profile.get("buildVolume") or {}).get("x") or 0)
        bvy = float(profile.get("buildVolumeY") or (profile.get("buildVolume") or {}).get("y") or 0)
        bvz = float(profile.get("buildVolumeZ") or (profile.get("buildVolume") or {}).get("z") or 0)

        check = PrinterEligibilityCheck(
            profile_id=pid,
            profile_display_name=pname,
            eligible=True,
            build_volume={"x": bvx, "y": bvy, "z": bvz},
            model_dimensions={"x": mdx, "y": mdy, "z": mdz},
        )

        # Check 3a — build-volume fit (only when we have valid dimensions)
        if has_valid_dims and bvx > 0 and bvy > 0 and bvz > 0:
            if mdx > bvx or mdy > bvy or mdz > bvz:
                check.eligible = False
                check.failure_reason = (
                    f"Model {mdx:.1f}×{mdy:.1f}×{mdz:.1f} mm exceeds "
                    f"build volume {bvx:.0f}×{bvy:.0f}×{bvz:.0f} mm."
                )
                checks.append(check)
                logger.debug(
                    "Printer %s ineligible (build volume): %s",
                    pid,
                    check.failure_reason,
                    extra={"job_id": "eligibility"},
                )
                continue

        # Check 3b — multicolor capability
        if requires_multicolor and not bool(profile.get("supportsMulticolor")):
            check.eligible = False
            check.failure_reason = (
                f"Printer profile '{pname}' does not support multicolor slicing "
                f"(supportsMulticolor=False)."
            )
            checks.append(check)
            logger.debug(
                "Printer %s ineligible (no multicolor): %s",
                pid,
                check.failure_reason,
                extra={"job_id": "eligibility"},
            )
            continue

        # Passed all checks
        checks.append(check)
        eligible_candidates.append(profile)
        logger.debug("Printer %s is eligible.", pid, extra={"job_id": "eligibility"})

    # Step 4 — pick the winner
    if not eligible_candidates:
        # Determine a precise failure reason code
        all_failed_volume = any(
            c.failure_reason and "build volume" in c.failure_reason
            for c in checks
            if not c.eligible
        )
        all_failed_multicolor = any(
            c.failure_reason and "multicolor" in c.failure_reason
            for c in checks
            if not c.eligible
        )

        if all_failed_multicolor and not all_failed_volume:
            code = EligibilityReasonCode.NO_MULTICOLOR_CAPABILITY
            reason = (
                "No enabled production printer supports multicolor slicing "
                "for this job. The job requires multicolor capability."
            )
        elif all_failed_volume:
            code = EligibilityReasonCode.NO_FIT_WITHIN_BUILD_VOLUME
            reason = (
                f"Model dimensions ({mdx:.1f}×{mdy:.1f}×{mdz:.1f} mm) exceed "
                f"the build volume of every enabled production printer."
            )
        else:
            code = EligibilityReasonCode.NO_ELIGIBLE_PRODUCTION_PRINTER
            reason = "No enabled production printer is eligible for this job."

        logger.warning(
            "Printer eligibility: no eligible printer found. code=%s, %d candidates evaluated.",
            code,
            len(enabled_sorted),
            extra={"job_id": "eligibility"},
        )
        return EligibilityResult(
            eligible=False,
            selected_profile=None,
            reason=reason,
            reason_code=code,
            candidates_evaluated=len(enabled_sorted),
            checks=checks,
        )

    # The first candidate after sorting is the winner:
    # - defaultForProduction=True comes first (stable sort).
    # - Among ties, alphabetical by id.
    winner = eligible_candidates[0]
    winner_id = str(winner.get("id", ""))
    winner_name = str(winner.get("displayName", winner_id))

    logger.info(
        "Printer eligibility: selected '%s' (%s). %d/%d candidates eligible.",
        winner_name,
        winner_id,
        len(eligible_candidates),
        len(enabled_sorted),
        extra={"job_id": "eligibility"},
    )

    # Preserve winner dictionary with all settings, ensuring buildVolumeX/Y/Z are present
    selected = dict(winner)
    wbvx = float(selected.get("buildVolumeX") or (selected.get("buildVolume") or {}).get("x") or 0)
    wbvy = float(selected.get("buildVolumeY") or (selected.get("buildVolume") or {}).get("y") or 0)
    wbvz = float(selected.get("buildVolumeZ") or (selected.get("buildVolume") or {}).get("z") or 0)
    if "buildVolumeX" not in selected and wbvx > 0:
        selected["buildVolumeX"] = wbvx
    if "buildVolumeY" not in selected and wbvy > 0:
        selected["buildVolumeY"] = wbvy
    if "buildVolumeZ" not in selected and wbvz > 0:
        selected["buildVolumeZ"] = wbvz

    return EligibilityResult(
        eligible=True,
        selected_profile=selected,
        reason=f"Automatically selected production printer: '{winner_name}' ({winner_id}).",
        reason_code=EligibilityReasonCode.SELECTED,
        candidates_evaluated=len(enabled_sorted),
        checks=checks,
    )


# ---------------------------------------------------------------------------
# Convenience helper used by main.py to validate individual profiles
# before passing them to resolve_eligible_production_printer
# ---------------------------------------------------------------------------

def filter_valid_profiles(
    raw_profiles: List[Dict[str, Any]],
    validate_fn,          # callable: profile_dict -> Optional[dict]
) -> List[Dict[str, Any]]:
    """
    Apply the existing single-profile validation function to each item in the
    list and return only the profiles that pass validation.

    The ``validate_fn`` signature matches ``resolve_production_printer_profile``
    from ``main.py``.  This keeps the validation logic in one place while
    allowing the eligibility resolver to receive a clean, validated list.
    """
    valid = []
    for raw in raw_profiles:
        if not isinstance(raw, dict):
            continue
        result = validate_fn(raw)
        if result is not None:
            valid.append(result)
    return valid

