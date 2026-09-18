"""
Shilp Studio Slicing Service — Authoritative Production Engine
FastAPI service exposing:
- POST /api/slice/jobs          : Single authoritative asynchronous slicing queue with client idempotencyKey & quote dedup
- GET  /api/slice/jobs/{job_id} : Job status polling & immutable quote retrieval
- GET  /api/quotes/{quote_id}   : Immutable quote snapshot fetch
- POST /api/quotes/{quote_id}/accept : Customer quote acceptance transition
- POST /api/orders/payment      : Server-enforced payment order creation (ignores client-supplied price)
- POST /api/webhooks/payment    : Webhook delivery processing with eventId idempotency
- GET  /api/admin/manual-review : Manual review queue for failed/ambiguous/STEP/non-manifold uploads
- GET  /api/health              : Health check & engine status
"""

import os
import uuid
import time
import json
import shutil
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.file_inspector import inspect_file, ModelClassification
from app.mesh_validator import validate_mesh, MeshRepairStatus
from app.archive_handler import inspect_and_extract_archive, ArchiveSecurityError
from app.slice_core import (
    find_prusaslicer_executable,
    get_model_info,
    read_profile_envelope,
    get_effective_model_dimensions,
)
from app.slice_worker import execute_bounded_slice, compute_file_sha256
from app.pricing_engine import calculate_authoritative_quote, compute_job_config_hash, compute_production_profile_hash
from app.slicer_router import decide_route, SlicerRoute, RouteReasonCode
from app.slicer_adapters.bambu_adapter import execute_bambu_slice, find_bambu_resource_file
from app.quote_store import quote_store, QuoteStatus, PaymentStatus, ProductionStatus
from app.payment_engine import payment_engine
from app.slicer_result_validator import validate_slicer_result
from app.printer_eligibility import (
    resolve_eligible_production_printer,
    filter_valid_profiles,
    EligibilityReasonCode,
)

class JobIdFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, "job_id"):
            record.job_id = "system"
        return True

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [jobId=%(job_id)s] %(message)s"
)
logger = logging.getLogger("shilp_studio")
logger.addFilter(JobIdFilter())

_debug_log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slicer_debug.log")
_fh = logging.FileHandler(_debug_log_path, encoding="utf-8")
_fh.setLevel(logging.INFO)
_fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] [jobId=%(job_id)s] %(message)s"))
_fh.addFilter(JobIdFilter())
logger.addHandler(_fh)


app = FastAPI(title="Shilp Studio Slicing Service", version="3.0.0")

# Configurable via ALLOWED_ORIGINS (comma-separated). Defaults to "*" to
# preserve existing behavior when unset. Set a real comma-separated origin
# list in production instead of relying on the wildcard default.
_allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "*").strip()
ALLOWED_ORIGINS = (
    ["*"] if _allowed_origins_env == "*"
    else [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage")
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")
os.makedirs(STORAGE_DIR, exist_ok=True)
os.makedirs(PROFILES_DIR, exist_ok=True)

R2_WORKER_URL = os.environ.get("VITE_CLOUDFLARE_WORKER_URL", "http://127.0.0.1:8787")

class JobStatus:
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

JOBS: Dict[str, Dict[str, Any]] = {}

def _safe_json(raw: Optional[str]) -> Optional[Any]:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None

def _materials_list_to_dict(materials_input: Optional[Any]) -> Optional[Dict[str, Dict[str, float]]]:
    if not materials_input:
        return None
    if isinstance(materials_input, dict):
        out = {}
        for k, v in materials_input.items():
            if isinstance(v, dict):
                out[str(k).lower()] = {
                    "pricePerGram": float(v.get("pricePerGram", 0.0)),
                    "density": float(v.get("density", 1.24)),
                }
        return out or None
    if isinstance(materials_input, list):
        out = {}
        for m in materials_input:
            if isinstance(m, dict):
                mid = (m.get("id") or m.get("name") or "").lower()
                if not mid:
                    continue
                out[mid] = {
                    "pricePerGram": float(m.get("pricePerGram", 0.0)),
                    "density": float(m.get("density", 1.24)),
                }
        return out or None
    return None

def resolve_profile_path(quality: str) -> str:
    q = (quality or "").lower()
    if "draft" in q:
        p = os.path.join(PROFILES_DIR, "bambu_production_draft.ini")
    elif "fine" in q:
        p = os.path.join(PROFILES_DIR, "bambu_production_fine.ini")
    else:
        p = os.path.join(PROFILES_DIR, "bambu_production_standard.ini")

    if os.path.exists(p):
        return p
    return os.path.join(PROFILES_DIR, "bambu_production_standard.ini")

def resolve_production_printer_profile(config: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Resolve and validate the admin-selected profile, never upload metadata."""
    if not isinstance(config, dict) or not config.get("enabled"):
        return None
    cfg = dict(config)
    # Support legacy buildVolume object schema {x, y, z} -> buildVolumeX/Y/Z
    bv = cfg.get("buildVolume")
    if isinstance(bv, dict):
        if "buildVolumeX" not in cfg and "x" in bv:
            cfg["buildVolumeX"] = bv["x"]
        if "buildVolumeY" not in cfg and "y" in bv:
            cfg["buildVolumeY"] = bv["y"]
        if "buildVolumeZ" not in cfg and "z" in bv:
            cfg["buildVolumeZ"] = bv["z"]

    required_text = ("id", "manufacturer", "model", "displayName", "slicerAdapter", "slicerName", "slicerVersion", "profileVersion")
    if not all(isinstance(cfg.get(key), str) and cfg[key].strip() for key in required_text):
        return None
    if cfg["slicerAdapter"] not in ("bambu_studio_cli", "prusaslicer"):
        return None
    if not isinstance(cfg.get("materialProfileIds"), list) or not cfg["materialProfileIds"]:
        cfg["materialProfileIds"] = ["Generic PLA @BBL A1M"]
    numeric_limits = ("buildVolumeX", "buildVolumeY", "buildVolumeZ", "nozzleDiameter", "extruderCount", "defaultLayerHeight", "defaultInfill")
    if not all(isinstance(cfg.get(key), (int, float)) and cfg[key] > 0 for key in numeric_limits[:-1]):
        return None
    if not isinstance(cfg.get("defaultInfill"), (int, float)) or not 0 <= cfg["defaultInfill"] <= 100:
        return None
    if not isinstance(cfg.get("supportsMulticolor"), bool) or not isinstance(cfg.get("machineParameters"), dict):
        return None
    profile_file = os.path.basename(str(cfg.get("printerProfileFile", "")))
    if not profile_file or profile_file != str(cfg.get("printerProfileFile")):
        return None
    profile_path = os.path.join(PROFILES_DIR, "printer", profile_file)
    if not os.path.isfile(profile_path):
        return None

    # Authoritative reconciliation from local printer ini profile
    try:
        with open(profile_path, "r", encoding="utf-8", errors="ignore") as inif:
            for line in inif:
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    if k == "machine_settings_file" and not cfg.get("machineProfileFile"):
                        cfg["machineProfileFile"] = v
                    elif k == "process_settings_file" and not cfg.get("processProfileFile"):
                        cfg["processProfileFile"] = v
                    elif k == "printer_settings_id" and not cfg.get("printerSettingsId"):
                        cfg["printerSettingsId"] = v
    except OSError:
        pass

    if not isinstance(cfg.get("printerSettingsId"), str) or not cfg["printerSettingsId"].strip():
        return None
    if cfg["slicerAdapter"] == "bambu_studio_cli":
        if not cfg.get("machineProfileFile") or not cfg.get("processProfileFile"):
            return None
        if not find_bambu_resource_file("machine", cfg["machineProfileFile"]):
            return None
        if not find_bambu_resource_file("process", cfg["processProfileFile"]):
            return None
        if not cfg.get("slicerSettingsId") or not cfg.get("processSettingsId"):
            return None
    profile = dict(cfg)
    profile["printerProfileFile"] = profile_file
    profile["profilePath"] = profile_path
    return profile

def resolve_slicer_adapter(profile: Dict[str, Any]) -> Optional[str]:
    """Resolve only adapters supported by the deployed service."""
    adapter = profile.get("slicerAdapter")
    return adapter if adapter in ("bambu_studio_cli", "prusaslicer") else None

@app.get("/health")
def lightweight_health_check():
    """
    Minimal liveness check for uptime pings (e.g. cron-job.org, Render health
    checks). Deliberately does not touch the slicer binaries, disk, or any
    external service — just confirms the process is up and serving requests.
    """
    return {"status": "ok"}

@app.get("/api/health")
def health_check():
    slicer_exe = find_prusaslicer_executable()
    std_profile = os.path.join(PROFILES_DIR, "bambu_production_standard.ini")
    envelope = read_profile_envelope(std_profile) if os.path.exists(std_profile) else {"x": 256.0, "y": 256.0, "z": 200.0}
    return {
        "status": "healthy"
        
    }

def process_slicing_job(job_id: str, file_path: str, params: Dict[str, Any]):
    extra = {"job_id": job_id}
    logger.info("Starting background slicing job", extra=extra)
    print(f"\n================ [DEBUG] FULL SLICING JOB START ================ \n[DEBUG] Job ID: {job_id}\n[DEBUG] File Path: {file_path}\n[DEBUG] Incoming Params: {params}\n==============================================================\n")
    JOBS[job_id]["status"] = JobStatus.PROCESSING
    JOBS[job_id]["stage_message"] = "Preparing model..."

    try:
        # Step A: File SHA-256 for storage identity and dedup
        file_sha256 = compute_file_sha256(file_path)
        JOBS[job_id]["fileSha256"] = file_sha256

        # Step B: Check for ZIP archives
        active_slice_file = file_path
        cleanup_temp_dir = None
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".zip":
            temp_extract_dir = os.path.join(STORAGE_DIR, f"extracted_{job_id}")
            cleanup_temp_dir = temp_extract_dir
            try:
                archive_res = inspect_and_extract_archive(file_path, temp_extract_dir)
                active_slice_file = archive_res["primary_model"]
                JOBS[job_id]["archiveMetadata"] = archive_res
            except ArchiveSecurityError as ase:
                JOBS[job_id]["status"] = JobStatus.FAILED
                JOBS[job_id]["error"] = ase.message
                JOBS[job_id]["error_code"] = ase.code
                JOBS[job_id]["can_retry"] = False
                JOBS[job_id]["workshop_review_available"] = True
                quote_store.add_manual_review(job_id, ase.code, {"file": file_path, "error": ase.message})
                return

        # Step C: Deep file content inspection
        JOBS[job_id]["stage_message"] = "Analyzing model..."
        insp = inspect_file(active_slice_file, check_mesh=True)
        if not insp.get("success"):
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = insp.get("error", insp.get("message", "File inspection failed."))
            JOBS[job_id]["error_code"] = insp.get("error_code", "INSPECTION_FAILED")
            JOBS[job_id]["mesh_repair_status"] = insp.get("mesh_repair_status", MeshRepairStatus.FAILED)
            JOBS[job_id]["can_retry"] = False
            JOBS[job_id]["workshop_review_available"] = True
            quote_store.add_manual_review(job_id, JOBS[job_id]["error_code"], insp)
            return

        color_analysis = insp.get("color_analysis")
        if color_analysis:
            JOBS[job_id]["color_analysis"] = color_analysis

        # Step D: Slicer Router — decide which adapter handles this model
        JOBS[job_id]["stage_message"] = "Selecting slicer engine..."
        route_decision = decide_route(insp)
        JOBS[job_id]["route_decision"] = route_decision
        route = route_decision["route"]
        logger.info(
            f"Route decision: {route} / {route_decision['reason_code']}",
            extra=extra
        )

        if route == SlicerRoute.MANUAL_REVIEW:
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = route_decision.get("reason", "Model routed to manual workshop review.")
            JOBS[job_id]["error_code"] = route_decision["reason_code"]
            JOBS[job_id]["can_retry"] = False
            JOBS[job_id]["workshop_review_available"] = True
            quote_store.add_manual_review(job_id, route_decision["reason_code"], {
                "file": file_path,
                "reason": route_decision.get("reason"),
                "adapter": route_decision.get("adapter"),
            })
            return

        if route == SlicerRoute.MULTICOLOR:
            JOBS[job_id]["multicolor_detected"] = True
            JOBS[job_id]["color_analysis"] = route_decision.get("color_analysis") or color_analysis

        # Step E: Require live admin pricing configuration
        has_live_config = bool(params.get("pricingConfig") and params.get("materials"))
        if not has_live_config:
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Live pricing configuration unavailable from admin settings."
            JOBS[job_id]["error_code"] = "PRICING_CONFIG_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return

        # Step F: Automatic production printer eligibility resolution
        # ------------------------------------------------------------
        # The backend receives EITHER:
        #   a) productionPrinterProfiles  — full Admin list (preferred path)
        #   b) productionPrinterProfile   — single profile (backward compat)
        #
        # When the list is present the eligibility resolver automatically picks
        # the best eligible printer.  The customer never sees printer names or
        # selection controls — this is entirely an internal Shilp responsibility.
        #
        # Source-project metadata embedded in uploaded 3MF files is NEVER
        # consulted here; it is stored as `sourceProject` in the snapshot only.
        JOBS[job_id]["stage_message"] = "Selecting production printer..."
        profile_path = resolve_profile_path(params.get("qualityProfile", "standard"))
        params["profile_path"] = profile_path

        effective_dims, dim_source = get_effective_model_dimensions(
            active_slice_file,
            params=params,
            inspect_result=insp,
        )

        raw_profiles_list = params.get("productionPrinterProfiles")
        requires_multicolor = (route == SlicerRoute.MULTICOLOR)

        if isinstance(raw_profiles_list, list) and raw_profiles_list:
            raw_profile_ids = [str(p.get("id")) for p in raw_profiles_list if isinstance(p, dict)]
            logger.info(
                f"Received {len(raw_profiles_list)} production printer profile(s) from request: {raw_profile_ids}",
                extra=extra,
            )

            for idx, raw_p in enumerate(raw_profiles_list):
                v_res = resolve_production_printer_profile(raw_p) if isinstance(raw_p, dict) else None
                logger.info(
                    f"DEBUG_TEMPORARY: profile[{idx}] id={raw_p.get('id') if isinstance(raw_p, dict) else None} "
                    f"validated: {bool(v_res)} (detail: {raw_p})",
                    extra=extra,
                )

            # Validate each raw profile using the existing single-profile validator
            validated_profiles = filter_valid_profiles(
                raw_profiles_list,
                resolve_production_printer_profile,
            )
            validated_ids = [str(p.get("id")) for p in validated_profiles if isinstance(p, dict)]
            logger.info(
                f"Validated {len(validated_profiles)}/{len(raw_profiles_list)} production printer profile(s) for eligibility: {validated_ids}",
                extra=extra,
            )

            logger.info(
                f"Effective model dimensions evaluated for printer eligibility: "
                f"{effective_dims.get('x')} × {effective_dims.get('y')} × {effective_dims.get('z')} mm "
                f"(source: {dim_source})",
                extra=extra,
            )

            eligibility = resolve_eligible_production_printer(
                profiles=validated_profiles,
                model_dimensions=effective_dims or {},
                requires_multicolor=requires_multicolor,
            )
            JOBS[job_id]["eligibility"] = {
                "candidatesEvaluated": eligibility.candidates_evaluated,
                "reasonCode": eligibility.reason_code,
                "reason": eligibility.reason,
                "modelDimensions": effective_dims,
            }

            if not eligibility.eligible:
                JOBS[job_id]["status"] = JobStatus.FAILED
                JOBS[job_id]["error"] = (
                    "No enabled production printer is available for this job. "
                    "Routed to workshop for manual review."
                )
                JOBS[job_id]["error_code"] = eligibility.reason_code
                JOBS[job_id]["can_retry"] = True
                JOBS[job_id]["workshop_review_available"] = True
                quote_store.add_manual_review(
                    job_id,
                    eligibility.reason_code,
                    {
                        "reason": eligibility.reason,
                        "model_dimensions": effective_dims,
                        "requires_multicolor": requires_multicolor,
                        "candidates_evaluated": eligibility.candidates_evaluated,
                    },
                )
                return

            production_profile = eligibility.selected_profile
            # Ensure profilePath is present for downstream slicing adapters
            if not production_profile.get("profilePath") and production_profile.get("printerProfileFile"):
                profile_file = os.path.basename(str(production_profile["printerProfileFile"]))
                profile_path = os.path.join(PROFILES_DIR, "printer", profile_file)
                if os.path.isfile(profile_path):
                    production_profile["profilePath"] = profile_path

            logger.info(
                f"Eligibility resolver selected printer: {production_profile['id']}",
                extra=extra,
            )
        else:
            # --- Backward-compatible single-profile path ---
            production_profile = resolve_production_printer_profile(
                params.get("productionPrinterProfile")
            )
            if not production_profile:
                JOBS[job_id]["status"] = JobStatus.FAILED
                JOBS[job_id]["error"] = "Admin production printer profile is unavailable or invalid."
                JOBS[job_id]["error_code"] = "PRODUCTION_PRINTER_CONFIG_UNAVAILABLE"
                JOBS[job_id]["can_retry"] = True
                JOBS[job_id]["workshop_review_available"] = True
                return

        # --- Common path: production_profile is now resolved ---
        params["productionPrinterProfile"] = production_profile
        slicer_adapter = resolve_slicer_adapter(production_profile)
        if not slicer_adapter:
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Selected production slicer adapter is unavailable."
            JOBS[job_id]["error_code"] = "SLICER_ADAPTER_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return
        params["resolvedSlicerAdapter"] = slicer_adapter
        if route == SlicerRoute.MULTICOLOR and not production_profile.get("supportsMulticolor"):
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Selected production printer profile does not support multicolor slicing."
            JOBS[job_id]["error_code"] = "PRODUCTION_PRINTER_CAPABILITY_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return
        if route == SlicerRoute.MULTICOLOR and slicer_adapter != "bambu_studio_cli":
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Selected production slicer adapter cannot slice multicolor jobs."
            JOBS[job_id]["error_code"] = "SLICER_ADAPTER_CAPABILITY_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return
        params["printer_profile_path"] = production_profile.get("profilePath")
        active_envelope = read_profile_envelope(production_profile.get("profilePath", ""))
        # If active_envelope is missing x, y, or z, populate from authoritative buildVolumeX/Y/Z
        bvx = production_profile.get("buildVolumeX")
        bvy = production_profile.get("buildVolumeY")
        bvz = production_profile.get("buildVolumeZ")
        if not active_envelope or not all(k in active_envelope for k in ("x", "y", "z")):
            if (
                isinstance(bvx, (int, float)) and bvx > 0
                and isinstance(bvy, (int, float)) and bvy > 0
                and isinstance(bvz, (int, float)) and bvz > 0
            ):
                active_envelope = {
                    "x": float(active_envelope.get("x") or bvx),
                    "y": float(active_envelope.get("y") or bvy),
                    "z": float(active_envelope.get("z") or bvz),
                }

        params["active_envelope"] = active_envelope
        if not active_envelope or not all(k in active_envelope for k in ("x", "y", "z")):
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Could not read build envelope from active printer profile."
            JOBS[job_id]["error_code"] = "PROFILE_ENVELOPE_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = False
            JOBS[job_id]["workshop_review_available"] = True
            return

        # Step F2: Authoritative scaling and dimension check
        # (This uses the resolved printer's actual envelope from the profile file
        # and guarantees that the dimensions evaluated for eligibility match slicing.)
        scale = float(params.get("scaleFactor", 1.0))
        scale_x = float(params.get("scaleX", scale))
        scale_y = float(params.get("scaleY", scale))
        scale_z = float(params.get("scaleZ", scale))

        dims = dict(effective_dims)
        params["dimensions"] = dims

        if dims and (
            dims.get("x", 0) > active_envelope["x"] or
            dims.get("y", 0) > active_envelope["y"] or
            dims.get("z", 0) > active_envelope["z"]
        ):
            env_str = f"{active_envelope['x']:.0f} × {active_envelope['y']:.0f} × {active_envelope['z']:.0f} mm"
            err = f"Model dimensions ({dims.get('x')} × {dims.get('y')} × {dims.get('z')} mm) exceed build envelope ({env_str})."
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = err
            JOBS[job_id]["error_code"] = "EXCEEDS_BUILD_VOLUME"
            JOBS[job_id]["dimensions"] = dims
            JOBS[job_id]["activeEnvelope"] = active_envelope
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            quote_store.add_manual_review(job_id, "EXCEEDS_BUILD_VOLUME", {"dimensions": dims, "envelope": active_envelope})
            return

        # Step G: Check Job Config Hash Dedup Cache
        JOBS[job_id]["stage_message"] = "Checking cache..."
        infill_val = params.get("infillPercent") if params.get("infillPercent") is not None else production_profile.get("defaultInfill", 20)
        active_color_cfg = color_analysis or params.get("colors") or params.get("amsSlots")

        job_config_hash = compute_job_config_hash(
            file_sha256=file_sha256,
            scale_x=scale_x,
            scale_y=scale_y,
            scale_z=scale_z,
            printer_profile=production_profile["id"],
            material_key=params.get("material", "pla"),
            quality_profile=params.get("qualityProfile", "standard"),
            quantity=params.get("quantity", 1),
            support_mode=params.get("supportMode", "auto"),
            packaging_included=params.get("packagingIncluded", False),
            pricing_version=params.get("pricingVersion"),
            route=route,
            effective_dimensions=dims,
            production_profile=production_profile,
            infill_percent=infill_val,
            color_configuration=active_color_cfg,
            machine_profile_file=production_profile.get("machineProfileFile"),
            process_profile_file=production_profile.get("processProfileFile"),
            pricing_config=params.get("pricingConfig"),
        )
        JOBS[job_id]["jobConfigHash"] = job_config_hash

        force_reslice = bool(
            params.get("forceReslice")
            or params.get("force_reslice")
            or str(params.get("forceReslice", "")).lower() in ("true", "1", "yes")
            or str(params.get("force_reslice", "")).lower() in ("true", "1", "yes")
        )

        if force_reslice:
            logger.info("forceReslice is True: bypassing active dedup cache for fresh slice execution", extra=extra)
            cached_quote = None
        else:
            cached_quote = quote_store.find_active_quote_by_config_hash(job_config_hash)

        if cached_quote:
            # Enforce strict printer identity and valid production metrics:
            cached_printer_id = (
                cached_quote.get("production", {}).get("printerId")
                or cached_quote.get("production", {}).get("printerProfile")
                or cached_quote.get("productionPrinterProfile", {}).get("id")
                or ""
            )
            current_printer_id = production_profile.get("id", "")

            slice_info = cached_quote.get("slice", {})
            stats_info = slice_info.get("statistics", {})
            fg = slice_info.get("filamentGrams") or stats_info.get("filament_grams") or 0.0
            pt = slice_info.get("printTimeSeconds") or stats_info.get("print_time_seconds") or 0

            if cached_printer_id and current_printer_id and cached_printer_id != current_printer_id:
                logger.warning(
                    f"Cache identity mismatch: cached quote {cached_quote.get('quoteId')} was created for "
                    f"printer '{cached_printer_id}' but resolved printer is '{current_printer_id}'. "
                    f"Bypassing cache for fresh slice execution.",
                    extra=extra,
                )
                cached_quote = None
            elif fg <= 0 or pt <= 0:
                logger.warning(
                    f"Cache invalid statistics: cached quote {cached_quote.get('quoteId')} has non-positive "
                    f"slicer statistics (filamentGrams={fg}, printTimeSeconds={pt}). "
                    f"Bypassing cache for fresh slice execution.",
                    extra=extra,
                )
                cached_quote = None
            else:
                logger.info(
                    f"Serving quote from active dedup cache (quoteId={cached_quote.get('quoteId')}, "
                    f"printerId={cached_printer_id}, configHash={job_config_hash[:12]}...)",
                    extra=extra,
                )
                print(f"\n================ [DEBUG] JOB COMPLETED SUCCESSFULLY ================ \n[DEBUG] Final Job State: {JOBS[job_id]}\n==============================================================\n")
                JOBS[job_id]["status"] = JobStatus.COMPLETED
                JOBS[job_id]["stage_message"] = "Estimate ready (cached)"
                JOBS[job_id]["quoteId"] = cached_quote["quoteId"]
                JOBS[job_id]["result"] = cached_quote
                cached_ca = cached_quote.get("color_analysis") or cached_quote.get("colorAnalysis")
                if cached_ca:
                    JOBS[job_id]["color_analysis"] = cached_ca
                return

        # Step H: Execute slicing via routed adapter
        JOBS[job_id]["stage_message"] = "Slicing production toolpath..."
        logger.info(
            f"DEBUG_TEMPORARY: Selected profile ID immediately before slicer invocation: {production_profile.get('id')} "
            f"(displayName={production_profile.get('displayName')}, machineProfileFile={production_profile.get('machineProfileFile')}, "
            f"printerProfileFile={production_profile.get('printerProfileFile')}, adapter={slicer_adapter})",
            extra=extra,
        )
        logger.info(
            f"Authoritative model dimensions sent to slicer adapter ({slicer_adapter}): "
            f"{dims.get('x')} × {dims.get('y')} × {dims.get('z')} mm, "
            f"active envelope: {active_envelope.get('x')} × {active_envelope.get('y')} × {active_envelope.get('z')} mm",
            extra=extra,
        )
        if slicer_adapter == "bambu_studio_cli":
            logger.info("Executing multicolor slicing via Bambu Studio CLI adapter", extra=extra)
            slice_res = execute_bambu_slice(
                model_path=active_slice_file,
                timeout_seconds=600,
                production_params=params,
                color_analysis=color_analysis,
            )
        else:
            logger.info("Executing single-material slicing via PrusaSlicer", extra=extra)
            slice_res = execute_bounded_slice(
                model_path=active_slice_file,
                printer_ini=profile_path,
                scale=scale,
                scale_x=scale_x,
                scale_y=scale_y,
                scale_z=scale_z,
                infill_pct=params.get("infillPercent", 20),
                support_mode=params.get("supportMode", "auto"),
                timeout_seconds=600
            )

        if not slice_res.get("success"):
            err_msg = slice_res.get("error", "Slicer execution failed.")
            err_code = slice_res.get("error_code", "SLICER_EXECUTION_ERROR")
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = err_msg
            JOBS[job_id]["error_code"] = err_code
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            quote_store.add_manual_review(job_id, err_code, {"error": err_msg})
            return

        # Step H.2: Authoritative Slicer Result Validation Gate
        JOBS[job_id]["stage_message"] = "Validating slicer toolpath..."
        route_str = "multicolor" if route == SlicerRoute.MULTICOLOR else "single_material"
        validation = validate_slicer_result(
            result=slice_res,
            expected_model_hash=file_sha256,
            expected_job_id=job_id,
            route=route_str,
            active_envelope=active_envelope,
        )

        if not validation.is_valid:
            logger.warning(
                f"Slicer result validation failed: [{validation.error_code}] {validation.error_message}",
                extra=extra
            )
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = validation.error_message
            JOBS[job_id]["error_code"] = validation.error_code
            JOBS[job_id]["can_retry"] = False
            JOBS[job_id]["workshop_review_available"] = True
            quote_store.add_manual_review(
                job_id,
                validation.error_code or "SLICER_VALIDATION_FAILED",
                {
                    "error": validation.error_message,
                    "validation_details": validation.details,
                    "raw_slice_result": slice_res,
                }
            )
            return

        JOBS[job_id]["stage_message"] = "Calculating material usage..."
        stats = slice_res.get("statistics", {})
        dims = slice_res.get("dimensions", {}) or dims
        active_envelope = slice_res.get("active_envelope") or active_envelope

        filament_grams = stats.get("filament_grams", 0.0)
        filament_mm = stats.get("filament_mm", 0.0)
        print_time_hours = stats.get("print_time_hours", 0.0)

        # Step I: Authoritative Server-Side Pricing Engine
        JOBS[job_id]["stage_message"] = "Calculating production price..."
        quote = calculate_authoritative_quote(
            filament_grams=filament_grams,
            filament_mm=filament_mm,
            print_time_hours=print_time_hours,
            material_key=params.get("material", "pla"),
            quantity=params.get("quantity", 1),
            packaging_included=params.get("packagingIncluded", False),
            dimensions=dims,
            active_envelope=active_envelope,
            config=params.get("pricingConfig"),
            discount_tiers=params.get("quantityDiscounts"),
            materials=params.get("materials"),
            per_filament=stats.get("per_filament")
        )

        # Step J: Build Immutable Quote Snapshot (§11 & Corrections #1, #4, #5)
        quote_id = f"qt_{uuid.uuid4().hex[:12]}"
        now_dt = datetime.now(timezone.utc)
        expires_at = (now_dt + timedelta(hours=24)).isoformat()

        immutable_snapshot = {
            "quoteId": quote_id,
            "jobId": job_id,
            "status": QuoteStatus.QUOTED,
            "fileSha256": file_sha256,
            "jobConfigHash": job_config_hash,
            "meshRepairStatus": insp.get("mesh_repair_status", MeshRepairStatus.UNMODIFIED),
            "createdAt": now_dt.isoformat(),
            "expiresAt": expires_at,
            "pricingVersion": params.get("pricingVersion", "v1"),
            "productionPrinterProfile": {key: value for key, value in production_profile.items() if key != "profilePath"},
            "model": {
                "fileName": JOBS[job_id].get("fileName", "model"),
                "fileSha256": file_sha256,
                "fileKey": JOBS[job_id].get("fileKey"),
                "colorAnalysis": color_analysis,
                "color_analysis": color_analysis
            },
            "audit": {
                "analysis": insp.get("model_analysis"),
                "routeDecision": route_decision,
                "eligibility": JOBS[job_id].get("eligibility"),
                "dimensionSource": dim_source,
                "modelDimensions": dims,
                "meshRepairStatus": insp.get("mesh_repair_status", MeshRepairStatus.UNMODIFIED),
            },
            "production": {
                "printerProfile": production_profile["id"],
                "printerId": production_profile["id"],
                "profileApplied": production_profile["printerProfileFile"],
                "profileVersion": production_profile["profileVersion"],
                "sourceProject": slice_res.get("source_project"),
                "productionPrinter": {key: value for key, value in production_profile.items() if key != "profilePath"},
                "productionProfileHash": compute_production_profile_hash(production_profile),
                "material": params.get("material", "pla"),
                "quality": params.get("qualityProfile", "standard"),
                "infillPercent": infill_val,
                "supportMode": params.get("supportMode", "auto"),
                "quantity": params.get("quantity", 1),
                "packagingIncluded": params.get("packagingIncluded", False),
                "colourMode": "multicolour" if route == SlicerRoute.MULTICOLOR else "single_colour",
                "slicerAdapter": slice_res.get("adapter", "prusaslicer"),
                "activeEnvelope": active_envelope
            },
            "slice": {
                "slicerVersion": slice_res.get("slicer_version") or ("02.08.02.61" if route == SlicerRoute.MULTICOLOR else "2.9.0"),
                "adapter": slice_res.get("adapter", "prusaslicer"),
                "productionVerificationStatus": slice_res.get("production_verification_status", "verified"),
                "gcodeHash": slice_res.get("gcode_hash", ""),
                "gcodeReference": slice_res.get("gcode_reference", ""),
                "dimensions": dims,
                "filamentGrams": filament_grams,
                "filamentMm": filament_mm,
                "printTimeSeconds": stats.get("print_time_seconds", 0),
                "rawTimeString": stats.get("raw_time_string", ""),
                "plateCount": stats.get("plate_count", 1),
                "plates": slice_res.get("plates", []),
                "metricSources": slice_res.get("metricSources", slice_res.get("metric_sources", {})),
                "diagnostics": slice_res.get("diagnostics", {}),
                "statistics": stats,
                "validation": validation.details
            },
            "colorAnalysis": color_analysis,
            "color_analysis": color_analysis,
            "pricing": quote,
            "calculationTrace": quote.get("calculationTrace")
        }

        # Save to persistent quote store
        quote_store.save_quote(immutable_snapshot)

        print(f"\n================ [DEBUG] JOB COMPLETED SUCCESSFULLY ================ \n[DEBUG] Final Job State: {JOBS[job_id]}\n==============================================================\n")
        JOBS[job_id]["status"] = JobStatus.COMPLETED
        JOBS[job_id]["stage_message"] = "Estimate ready"
        JOBS[job_id]["quoteId"] = quote_id
        JOBS[job_id]["result"] = immutable_snapshot

    except Exception as e:
        logger.error(f"Internal processing error: {str(e)}", extra=extra)
        JOBS[job_id]["status"] = JobStatus.FAILED
        JOBS[job_id]["error"] = str(e)
        JOBS[job_id]["error_code"] = "INTERNAL_PROCESSING_ERROR"
        JOBS[job_id]["can_retry"] = True
        JOBS[job_id]["workshop_review_available"] = True
        quote_store.add_manual_review(job_id, "INTERNAL_PROCESSING_ERROR", {"error": str(e)})

    finally:
        if cleanup_temp_dir and os.path.exists(cleanup_temp_dir):
            try:
                shutil.rmtree(cleanup_temp_dir, ignore_errors=True)
            except Exception:
                pass

@app.post("/api/slice/jobs")
async def create_slice_job(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    material: str = Form("pla"),
    qualityProfile: str = Form("standard"),
    infillPercent: int = Form(20),
    scaleFactor: float = Form(1.0),
    quantity: int = Form(1),
    supportMode: str = Form("auto"),
    packagingIncluded: bool = Form(False),
    idempotencyKey: Optional[str] = Form(None),
    pricingConfigJson: Optional[str] = Form(None),
    materialsJson: Optional[str] = Form(None),
    quantityDiscountsJson: Optional[str] = Form(None),
    productionPrinterProfileJson: Optional[str] = Form(None),
    productionPrinterProfilesJson: Optional[str] = Form(None),
    pricingVersion: Optional[str] = Form(None),
    scaleX: Optional[float] = Form(None),
    scaleY: Optional[float] = Form(None),
    scaleZ: Optional[float] = Form(None),
    requestedDimensionsJson: Optional[str] = Form(None),
    forceReslice: bool = Form(False)
):
    """
    Single Authoritative Slicing Endpoint.
    Accepts client-generated idempotencyKey. If replayed, returns the existing job.
    """
    force_reslice_val = bool(
        forceReslice
        or str(forceReslice).lower() in ("true", "1", "yes")
    )

    if idempotencyKey and not force_reslice_val:
        existing_job_id = quote_store.get_job_by_idempotency_key(idempotencyKey)
        if existing_job_id and existing_job_id in JOBS:
            return {
                "jobId": existing_job_id,
                "status": JOBS[existing_job_id]["status"],
                "stage_message": JOBS[existing_job_id].get("stage_message", "Job already queued"),
                "replayed": True
            }

    job_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1]
    saved_filename = f"{job_id}_{file.filename}"
    saved_path = os.path.join(STORAGE_DIR, saved_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    params = {
        "material": material,
        "qualityProfile": qualityProfile,
        "infillPercent": infillPercent,
        "scaleFactor": scaleFactor,
        "scaleX": scaleX if scaleX is not None else scaleFactor,
        "scaleY": scaleY if scaleY is not None else scaleFactor,
        "scaleZ": scaleZ if scaleZ is not None else scaleFactor,
        "requestedDimensions": _safe_json(requestedDimensionsJson),
        "quantity": quantity,
        "supportMode": supportMode,
        "packagingIncluded": packagingIncluded,
        "pricingConfig": _safe_json(pricingConfigJson),
        "materials": _materials_list_to_dict(_safe_json(materialsJson)),
        "quantityDiscounts": _safe_json(quantityDiscountsJson),
        "productionPrinterProfile": _safe_json(productionPrinterProfileJson),
        # Full list — used by the eligibility resolver for automatic selection.
        # When present this takes precedence over the singular field above.
        "productionPrinterProfiles": _safe_json(productionPrinterProfilesJson),
        "pricingVersion": pricingVersion,
        "idempotencyKey": idempotencyKey,
        "forceReslice": force_reslice_val
    }

    logger.info(
        f"DEBUG_TEMPORARY: /api/slice/jobs received productionPrinterProfilesJson: {productionPrinterProfilesJson}",
        extra={"job_id": job_id},
    )

    JOBS[job_id] = {
        "id": job_id,
        "fileName": file.filename,
        "status": JobStatus.QUEUED,
        "stage_message": "Preparing model...",
        "createdAt": time.time(),
        "params": params,
        "idempotencyKey": idempotencyKey
    }

    if idempotencyKey:
        quote_store.record_idempotency(idempotencyKey, job_id)

    background_tasks.add_task(process_slicing_job, job_id, saved_path, params)

    return {
        "jobId": job_id,
        "status": JobStatus.QUEUED,
        "stage_message": "Preparing model...",
        "idempotencyKey": idempotencyKey
    }

@app.get("/api/slice/jobs/{job_id}")
def get_slice_job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/api/inspect")
async def inspect_model(file: UploadFile = File(...)):
    """
    Direct model inspection endpoint.
    Performs fast inspection of 3D models (3MF, STL, OBJ, ZIP)
    and returns content classification and color_analysis metadata.
    """
    temp_id = str(uuid.uuid4())
    saved_filename = f"inspect_{temp_id}_{file.filename}"
    saved_path = os.path.join(STORAGE_DIR, saved_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        insp = inspect_file(saved_path, check_mesh=False)
        return insp
    finally:
        if os.path.exists(saved_path):
            try:
                os.remove(saved_path)
            except Exception:
                pass

@app.get("/api/quotes/{quote_id}")
def get_quote_snapshot(quote_id: str):
    quote = quote_store.get_quote(quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found or expired")
    return quote

@app.post("/api/quotes/{quote_id}/accept")
def accept_quote(quote_id: str):
    try:
        updated = quote_store.transition_quote_status(quote_id, QuoteStatus.ACCEPTED)
        return {"status": "success", "quote": updated}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

class CreatePaymentOrderRequest(BaseModel):
    quoteId: str
    customerId: str
    idempotencyKey: Optional[str] = None
    gateway: str = "mock"
    clientPrice: Optional[float] = None  # Explicitly ignored

@app.post("/api/orders/payment")
def create_payment_order_endpoint(req: CreatePaymentOrderRequest):
    """
    Creates Payment Order referencing the frozen quoteId.
    Ignores any client-supplied price and loads authoritative frozen price server-side.
    """
    try:
        order = payment_engine.create_payment_order(
            quote_id=req.quoteId,
            customer_id=req.customerId,
            idempotency_key=req.idempotencyKey,
            gateway=req.gateway,
            client_supplied_amount=req.clientPrice
        )
        return order
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

class PaymentWebhookPayload(BaseModel):
    gateway: str
    eventId: str
    orderId: str
    eventType: str
    payload: Optional[Dict[str, Any]] = None

@app.post("/api/webhooks/payment")
def payment_webhook_endpoint(event: PaymentWebhookPayload):
    """
    Webhook delivery handler with eventId de-duplication (§12a).
    """
    try:
        res = payment_engine.process_payment_webhook(
            gateway=event.gateway,
            event_id=event.eventId,
            order_id=event.orderId,
            event_type=event.eventType,
            payload=event.payload
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@app.get("/api/admin/manual-review")
def get_manual_review_queue():
    """
    Manual review queue for failed/ambiguous uploads, STEP files, or non-manifold models.
    """
    return {
        "count": len(quote_store.list_manual_reviews()),
        "reviews": quote_store.list_manual_reviews()
    }