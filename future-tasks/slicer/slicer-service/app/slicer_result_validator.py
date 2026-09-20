"""
Shilp Studio Slicer Result Validator
====================================

Authoritative validation gate between slicer adapters and the pricing engine.
Enforces that ONLY physically feasible, internally consistent, and provenance-verified
slicer statistics can generate an authoritative customer quote.

Guiding Principle: "A wrong quote is worse than no quote."

Capabilities:
- Dynamic channel scaling: works uniformly for N = 1, 3, 8, 20, 50, 100+ colors.
- Component breakdown verification: model, support, purge, tower when reported.
- Unknown != Zero: does not hallucinate or enforce missing sub-components.
- Provenance & association: ensures result belongs to current job and model hash.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Union

from app.universal_slice_result import UniversalSliceResult


@dataclass
class ValidationResult:
    is_valid: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)


def validate_slicer_result(
    result: Union[UniversalSliceResult, Dict[str, Any]],
    expected_model_hash: Optional[str] = None,
    expected_job_id: Optional[str] = None,
    route: str = "single_material",
    active_envelope: Optional[Dict[str, float]] = None,
) -> ValidationResult:
    """
    Validates a sliced result before authoritative quote generation.
    Returns ValidationResult(is_valid=True) if and only if all checks pass.
    """
    # 1. Normalize input into UniversalSliceResult
    if isinstance(result, dict):
        try:
            norm_res = UniversalSliceResult.from_dict(
                result,
                model_hash=expected_model_hash or "",
                job_id=expected_job_id or "",
            )
        except Exception as exc:
            return ValidationResult(
                is_valid=False,
                error_code="RESULT_NORMALIZATION_FAILED",
                error_message=f"Failed to normalize slicer result into universal schema: {str(exc)}",
            )
    elif isinstance(result, UniversalSliceResult):
        norm_res = result
    else:
        return ValidationResult(
            is_valid=False,
            error_code="INVALID_RESULT_TYPE",
            error_message=f"Expected UniversalSliceResult or dict, got {type(result).__name__}",
        )

    # 2. Check execution success
    if not norm_res.success:
        return ValidationResult(
            is_valid=False,
            error_code=norm_res.errorCode or "SLICER_EXECUTION_FAILED",
            error_message=norm_res.error or "Slicer reported execution failure",
            details={"adapter": norm_res.adapter},
        )

    # 3. Provenance & Version Verification
    if not norm_res.adapter or not str(norm_res.adapter).strip():
        return ValidationResult(
            is_valid=False,
            error_code="MISSING_PROVENANCE",
            error_message="Slicer adapter name is missing from result",
        )

    if not norm_res.slicerVersion or not str(norm_res.slicerVersion).strip():
        return ValidationResult(
            is_valid=False,
            error_code="MISSING_PROVENANCE",
            error_message="Slicer version is missing from result",
        )

    # 4. Durable Artifact Reference
    art = norm_res.artifact
    has_artifact = bool(
        (art.gcodeReference and art.gcodeReference.strip())
        or (art.gcodeHash and art.gcodeHash.strip())
        or (art.resultReference and art.resultReference.strip())
    )
    if not has_artifact:
        return ValidationResult(
            is_valid=False,
            error_code="MISSING_ARTIFACT_REFERENCE",
            error_message="No durable slice artifact or reference recorded for auditability",
        )

    # 5. Model Hash & Job Association
    if expected_model_hash and str(expected_model_hash).strip():
        if not norm_res.modelHash or not str(norm_res.modelHash).strip():
            return ValidationResult(
                is_valid=False,
                error_code="MODEL_HASH_MISMATCH",
                error_message="Slice result does not contain a modelHash",
            )
        if norm_res.modelHash.lower().strip() != expected_model_hash.lower().strip():
            return ValidationResult(
                is_valid=False,
                error_code="MODEL_HASH_MISMATCH",
                error_message=(
                    f"Sliced model hash ({norm_res.modelHash}) does not match expected "
                    f"job model hash ({expected_model_hash})"
                ),
            )

    if expected_job_id and str(expected_job_id).strip():
        if norm_res.jobId and norm_res.jobId.strip() != expected_job_id.strip():
            return ValidationResult(
                is_valid=False,
                error_code="JOB_ID_MISMATCH",
                error_message=f"Sliced jobId ({norm_res.jobId}) does not match expected jobId ({expected_job_id})",
            )

    # 6. Dimensions Validity
    dx, dy, dz = norm_res.dimensions.x, norm_res.dimensions.y, norm_res.dimensions.z
    if not (math.isfinite(dx) and math.isfinite(dy) and math.isfinite(dz)):
        return ValidationResult(
            is_valid=False,
            error_code="INVALID_DIMENSIONS",
            error_message=f"Model dimensions must be finite numbers: x={dx}, y={dy}, z={dz}",
        )
    if dx <= 0.0 or dy <= 0.0 or dz <= 0.0:
        return ValidationResult(
            is_valid=False,
            error_code="INVALID_DIMENSIONS",
            error_message=f"Model dimensions must be strictly positive: x={dx}, y={dy}, z={dz}",
        )

    # Check physical build volume envelope if provided
    env = norm_res.activeEnvelope or active_envelope
    if env and isinstance(env, dict):
        ex = env.get("x", 0.0)
        ey = env.get("y", 0.0)
        ez = env.get("z", 0.0)
        if ex > 0 and ey > 0 and ez > 0:
            margin = 0.5  # 0.5mm tolerance
            if dx > (ex + margin) or dy > (ey + margin) or dz > (ez + margin):
                return ValidationResult(
                    is_valid=False,
                    error_code="DIMENSIONS_EXCEED_BUILD_VOLUME",
                    error_message=(
                        f"Model dimensions ({dx:.1f}x{dy:.1f}x{dz:.1f}mm) exceed "
                        f"printer envelope ({ex:.1f}x{ey:.1f}x{ez:.1f}mm)"
                    ),
                )

    # 7. Print Time Validity
    pt = norm_res.printTimeSeconds
    if not math.isfinite(pt) or pt <= 0:
        return ValidationResult(
            is_valid=False,
            error_code="INVALID_PRINT_TIME",
            error_message=f"Print time must be a strictly positive integer, got {pt}",
        )

    # 8. Tool Change Count Validity
    tc = norm_res.toolChangeCount
    if not isinstance(tc, int) or tc < 0:
        return ValidationResult(
            is_valid=False,
            error_code="INVALID_TOOL_CHANGE_COUNT",
            error_message=f"Tool change count must be an integer >= 0, got {tc}",
        )

    is_single_mat = (
        route in ("single_material", "single_colour", "single")
        or norm_res.adapter == "prusaslicer"
    )
    if is_single_mat and tc > 0:
        return ValidationResult(
            is_valid=False,
            error_code="INVALID_TOOL_CHANGE_COUNT",
            error_message=f"Single-material route requires 0 tool changes, got {tc}",
        )

    # 9. Total Filament Validity
    tot_g = norm_res.filamentGrams
    if not math.isfinite(tot_g) or tot_g <= 0.0:
        return ValidationResult(
            is_valid=False,
            error_code="MISSING_AUTHORITATIVE_STATISTICS",
            error_message=f"Total filament weight must be a positive number of grams, got {tot_g}",
        )

    # 10. Per-Filament Records & Internal Consistency
    per_fil = norm_res.perFilament
    if not per_fil or len(per_fil) == 0:
        return ValidationResult(
            is_valid=False,
            error_code="MISSING_PER_FILAMENT_STATISTICS",
            error_message="Result contains no per-filament records",
        )

    sum_per_fil = 0.0
    all_models_present = True
    sum_models = 0.0

    for idx, f in enumerate(per_fil):
        channel_id = f.filamentIndex
        fg = f.totalGrams
        if not math.isfinite(fg) or fg < 0.0:
            return ValidationResult(
                is_valid=False,
                error_code="INCONSISTENT_FILAMENT_STATISTICS",
                error_message=f"Channel #{channel_id} totalGrams must be >= 0.0, got {fg}",
            )
        sum_per_fil += fg

        # If modelGrams is reported for this channel
        if f.modelGrams is not None:
            mg = f.modelGrams
            if not math.isfinite(mg) or mg < 0.0:
                return ValidationResult(
                    is_valid=False,
                    error_code="INCONSISTENT_FILAMENT_STATISTICS",
                    error_message=f"Channel #{channel_id} modelGrams must be >= 0.0, got {mg}",
                )
            # Model material cannot exceed total material for this channel
            if fg < (mg - 0.05):
                return ValidationResult(
                    is_valid=False,
                    error_code="INCONSISTENT_FILAMENT_STATISTICS",
                    error_message=(
                        f"Channel #{channel_id} totalGrams ({fg:.2f}g) cannot be less than "
                        f"modelGrams ({mg:.2f}g)"
                    ),
                )
            sum_models += mg
        else:
            all_models_present = False

        # If support, purge, or tower are reported, ensure non-negative
        for comp_name, comp_val in [
            ("supportGrams", f.supportGrams),
            ("purgeGrams", f.purgeGrams),
            ("towerGrams", f.towerGrams),
        ]:
            if comp_val is not None:
                if not math.isfinite(comp_val) or comp_val < 0.0:
                    return ValidationResult(
                        is_valid=False,
                        error_code="INCONSISTENT_FILAMENT_STATISTICS",
                        error_message=f"Channel #{channel_id} {comp_name} must be >= 0.0, got {comp_val}",
                    )

        # If all 4 components are explicitly reported for this channel, they must sum to total
        if (
            f.modelGrams is not None
            and f.supportGrams is not None
            and f.purgeGrams is not None
            and f.towerGrams is not None
        ):
            c_sum = f.modelGrams + f.supportGrams + f.purgeGrams + f.towerGrams
            c_tol = max(0.1, 0.01 * fg)
            if abs(fg - c_sum) > c_tol:
                return ValidationResult(
                    is_valid=False,
                    error_code="INCONSISTENT_FILAMENT_STATISTICS",
                    error_message=(
                        f"Channel #{channel_id} components (model={f.modelGrams}g, support={f.supportGrams}g, "
                        f"purge={f.purgeGrams}g, tower={f.towerGrams}g) sum to {c_sum:.2f}g, but total is {fg:.2f}g"
                    ),
                )

    # Total across all channels must equal total filament weight
    tol_tot = max(0.15, 0.005 * tot_g)
    if abs(sum_per_fil - tot_g) > tol_tot:
        return ValidationResult(
            is_valid=False,
            error_code="INCONSISTENT_TOTAL_FILAMENT",
            error_message=(
                f"Sum of per-filament records ({sum_per_fil:.2f}g) does not match "
                f"reported total filament ({tot_g:.2f}g)"
            ),
        )

    # If modelFilamentGrams is reported at top level
    if norm_res.modelFilamentGrams is not None:
        mfg = norm_res.modelFilamentGrams
        if not math.isfinite(mfg) or mfg < 0.0 or mfg > (tot_g + 0.05):
            return ValidationResult(
                is_valid=False,
                error_code="INCONSISTENT_MODEL_FILAMENT",
                error_message=f"Overall modelFilamentGrams ({mfg}g) is invalid or exceeds total ({tot_g}g)",
            )
        if all_models_present:
            tol_mod = max(0.15, 0.005 * mfg)
            if abs(sum_models - mfg) > tol_mod:
                return ValidationResult(
                    is_valid=False,
                    error_code="INCONSISTENT_MODEL_FILAMENT",
                    error_message=(
                        f"Sum of channel modelGrams ({sum_models:.2f}g) does not match "
                        f"reported modelFilamentGrams ({mfg:.2f}g)"
                    ),
                )

    # If all 4 overall components are reported by the slicer, verify their sum
    if (
        norm_res.modelFilamentGrams is not None
        and norm_res.supportFilamentGrams is not None
        and norm_res.purgeFilamentGrams is not None
        and norm_res.towerFilamentGrams is not None
    ):
        overall_c_sum = (
            norm_res.modelFilamentGrams
            + norm_res.supportFilamentGrams
            + norm_res.purgeFilamentGrams
            + norm_res.towerFilamentGrams
        )
        tol_overall = max(0.2, 0.01 * tot_g)
        if abs(tot_g - overall_c_sum) > tol_overall:
            return ValidationResult(
                is_valid=False,
                error_code="INCONSISTENT_COMPONENT_TOTALS",
                error_message=(
                    f"Overall slicer components (model={norm_res.modelFilamentGrams}g, "
                    f"support={norm_res.supportFilamentGrams}g, purge={norm_res.purgeFilamentGrams}g, "
                    f"tower={norm_res.towerFilamentGrams}g) sum to {overall_c_sum:.2f}g, but total is {tot_g:.2f}g"
                ),
            )

    # All checks passed!
    return ValidationResult(
        is_valid=True,
        details={
            "adapter": norm_res.adapter,
            "slicerVersion": norm_res.slicerVersion,
            "channelCount": len(per_fil),
            "filamentGrams": round(tot_g, 2),
            "printTimeSeconds": pt,
            "toolChangeCount": tc,
            "dimensions": norm_res.dimensions.to_dict(),
            "hasArtifactReference": True,
            "hasModelHashVerified": bool(expected_model_hash),
        },
    )

