"""
Shilp Studio Slicing Service (Phase 2B Complete)
FastAPI service exposing:
- POST /slice             : Standardized async job submission (file upload or R2 fileKey)
- POST /api/slice/jobs    : File upload async queue
- GET  /api/slice/jobs/{id}: Job status polling (queued -> processing -> completed | failed)
- POST /api/slice/sync    : Direct synchronous slicing
- GET  /api/health        : Health check & engine status
"""

import os
import uuid
import time
import shutil
import requests
import threading
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from file_inspector import inspect_file, ModelClassification
from slice_core import run_slice_test, find_prusaslicer_executable, get_model_info
from pricing_engine import calculate_authoritative_quote

app = FastAPI(title="Shilp Studio Slicing Service", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/api/health")
def health_check():
    slicer_exe = find_prusaslicer_executable()
    return {
        "status": "healthy",
        "slicer_engine": "PrusaSlicer",
        "slicer_version": "2.9.0",
        "slicer_available": bool(slicer_exe),
        "slicer_path": slicer_exe,
        "profiles_configured": os.path.exists(os.path.join(PROFILES_DIR, "bambu_production_standard.ini"))
    }

def process_slicing_job(job_id: str, file_path: str, params: Dict[str, Any]):
    JOBS[job_id]["status"] = JobStatus.PROCESSING
    JOBS[job_id]["stage_message"] = "Calculating print paths and material usage..."

    try:
        # 1. Deep model intelligence check
        insp = inspect_file(file_path)
        if not insp.get("success"):
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = insp.get("error", "File inspection failed.")
            JOBS[job_id]["error_code"] = "INSPECTION_FAILED"
            JOBS[job_id]["can_retry"] = False
            JOBS[job_id]["workshop_review_available"] = True
            return

        if not insp.get("can_slice"):
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = insp.get("message", "File cannot be processed by slicing engine.")
            JOBS[job_id]["error_code"] = "UNSUPPORTED_PRE_SLICED_FILE" if insp.get("classification") == ModelClassification.SLICED_FILE else "UNSLICEABLE_FILE"
            JOBS[job_id]["classification"] = insp.get("classification")
            JOBS[job_id]["can_retry"] = bool(insp.get("can_retry", False))
            JOBS[job_id]["workshop_review_available"] = True
            return

        # 2. Extract dimensions and check build volume envelope
        dims = get_model_info(file_path)
        scale = params.get("scaleFactor", 1.0)
        if scale != 1.0 and dims:
            dims["x"] = round(dims.get("x", 0) * scale, 2)
            dims["y"] = round(dims.get("y", 0) * scale, 2)
            dims["z"] = round(dims.get("z", 0) * scale, 2)

        max_envelope = {"x": 256.0, "y": 256.0, "z": 256.0}
        if dims and (dims.get("x", 0) > max_envelope["x"] or dims.get("y", 0) > max_envelope["y"] or dims.get("z", 0) > max_envelope["z"]):
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = f"Model dimensions ({dims.get('x')} × {dims.get('y')} × {dims.get('z')} mm) exceed maximum workshop printer build envelope (256 × 256 × 256 mm). Scale down or submit for engineer quote review to orient or split parts."
            JOBS[job_id]["error_code"] = "EXCEEDS_BUILD_VOLUME"
            JOBS[job_id]["dimensions"] = dims
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return

        # 3. Select profile based on quality preset
        profile_path = resolve_profile_path(params.get("qualityProfile", "standard"))

        # 4. Execute headless slicer with workshop production profile
        slice_res = run_slice_test(
            model_path=file_path,
            printer_ini=profile_path,
            scale=scale,
            infill_pct=params.get("infillPercent", 20),
            support_mode=params.get("supportMode", "auto")
        )

        if not slice_res.get("success"):
            err_msg = slice_res.get("error", "Slicer execution failed.")
            is_volume_err = "exceeds the maximum build volume" in err_msg.lower() or "exceeds" in err_msg.lower()
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = err_msg
            JOBS[job_id]["error_code"] = "EXCEEDS_BUILD_VOLUME" if is_volume_err else "SLICER_EXECUTION_ERROR"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return

        stats = slice_res.get("statistics", {})
        dims = slice_res.get("dimensions", {})
        filament_grams = stats.get("filament_grams", 0.0)
        print_time_hours = stats.get("print_time_hours", 0.0)

        # 4. Authoritative Pricing Engine
        quote = calculate_authoritative_quote(
            filament_grams=filament_grams,
            print_time_hours=print_time_hours,
            material_key=params.get("material", "pla"),
            quantity=params.get("quantity", 1),
            packaging_included=params.get("packagingIncluded", False),
            dimensions=dims
        )

        JOBS[job_id]["status"] = JobStatus.COMPLETED
        JOBS[job_id]["stage_message"] = "Estimate ready"
        JOBS[job_id]["result"] = {
            "status": "completed",
            "model_intelligence": insp,
            "dimensions": dims,
            "statistics": stats,
            "quote": quote,
            "slicerVersion": "2.9.0",
            "profileVersion": "2026-09-07-v1",
            "profileApplied": os.path.basename(profile_path),
            "gcode_reference": slice_res.get("gcode_reference", "gcode_generated")
        }

    except Exception as e:
        JOBS[job_id]["status"] = JobStatus.FAILED
        JOBS[job_id]["error"] = str(e)
        JOBS[job_id]["error_code"] = "INTERNAL_PROCESSING_ERROR"
        JOBS[job_id]["can_retry"] = True
        JOBS[job_id]["workshop_review_available"] = True

class SliceApiRequest(BaseModel):
    fileKey: Optional[str] = None
    fileType: Optional[str] = None
    material: str = "pla"
    quality: str = "standard"
    strength: str = "balanced"
    support: str = "auto"
    scale: float = 1.0
    quantity: int = 1
    packagingIncluded: bool = False

@app.post("/slice")
def submit_slice_request_by_key(
    req: SliceApiRequest,
    background_tasks: BackgroundTasks
):
    """
    Standardized Phase 2B endpoint accepting fileKey from R2 storage or local uploads.
    """
    if not req.fileKey:
        raise HTTPException(status_code=400, detail="fileKey is required.")

    job_id = str(uuid.uuid4())
    ext = f".{req.fileType.lower()}" if req.fileType else ".stl"
    saved_filename = f"{job_id}{ext}"
    saved_path = os.path.join(STORAGE_DIR, saved_filename)

    # Download from R2 if it's an R2 key
    download_url = f"{R2_WORKER_URL}/file?key={req.fileKey}"
    try:
        r = requests.get(download_url, timeout=30)
        if r.status_code == 200:
            with open(saved_path, "wb") as f:
                f.write(r.content)
        else:
            raise Exception(f"R2 worker returned HTTP {r.status_code}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to retrieve file from storage: {str(e)}")

    infill_map = {"light": 15, "balanced": 25, "strong": 50}
    infill_pct = infill_map.get(req.strength.lower(), 25)

    params = {
        "material": req.material,
        "qualityProfile": req.quality,
        "infillPercent": infill_pct,
        "scaleFactor": req.scale,
        "quantity": req.quantity,
        "supportMode": req.support,
        "packagingIncluded": req.packagingIncluded
    }

    JOBS[job_id] = {
        "id": job_id,
        "fileKey": req.fileKey,
        "status": JobStatus.QUEUED,
        "stage_message": "Preparing model...",
        "createdAt": time.time(),
        "params": params
    }

    background_tasks.add_task(process_slicing_job, job_id, saved_path, params)

    return {
        "jobId": job_id,
        "status": JobStatus.QUEUED,
        "stage_message": "Preparing model..."
    }

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
    packagingIncluded: bool = Form(False)
):
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
        "quantity": quantity,
        "supportMode": supportMode,
        "packagingIncluded": packagingIncluded
    }

    JOBS[job_id] = {
        "id": job_id,
        "fileName": file.filename,
        "status": JobStatus.QUEUED,
        "stage_message": "Preparing model...",
        "createdAt": time.time(),
        "params": params
    }

    background_tasks.add_task(process_slicing_job, job_id, saved_path, params)

    return {
        "jobId": job_id,
        "status": JobStatus.QUEUED,
        "stage_message": "Preparing model..."
    }

@app.get("/api/slice/jobs/{job_id}")
def get_slice_job_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@app.post("/api/slice/sync")
async def slice_sync(
    file: UploadFile = File(...),
    material: str = Form("pla"),
    qualityProfile: str = Form("standard"),
    infillPercent: int = Form(20),
    scaleFactor: float = Form(1.0),
    quantity: int = Form(1),
    supportMode: str = Form("auto"),
    packagingIncluded: bool = Form(False)
):
    temp_id = str(uuid.uuid4())
    saved_filename = f"sync_{temp_id}_{file.filename}"
    saved_path = os.path.join(STORAGE_DIR, saved_filename)

    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        insp = inspect_file(saved_path)
        if not insp.get("can_slice"):
            return {
                "status": "failed",
                "error": insp.get("message", "File cannot be sliced."),
                "error_code": "UNSUPPORTED_PRE_SLICED_FILE" if insp.get("classification") == ModelClassification.SLICED_FILE else "UNSLICEABLE_FILE",
                "classification": insp.get("classification"),
                "can_retry": bool(insp.get("can_retry", False)),
                "workshop_review_available": True
            }

        dims = get_model_info(saved_path)
        if scaleFactor != 1.0 and dims:
            dims["x"] = round(dims.get("x", 0) * scaleFactor, 2)
            dims["y"] = round(dims.get("y", 0) * scaleFactor, 2)
            dims["z"] = round(dims.get("z", 0) * scaleFactor, 2)

        max_envelope = {"x": 256.0, "y": 256.0, "z": 256.0}
        if dims and (dims.get("x", 0) > max_envelope["x"] or dims.get("y", 0) > max_envelope["y"] or dims.get("z", 0) > max_envelope["z"]):
            return {
                "status": "failed",
                "error": f"Model dimensions ({dims.get('x')} × {dims.get('y')} × {dims.get('z')} mm) exceed maximum workshop printer build envelope (256 × 256 × 256 mm). Scale down or submit for engineer quote review to orient or split parts.",
                "error_code": "EXCEEDS_BUILD_VOLUME",
                "dimensions": dims,
                "can_retry": True,
                "workshop_review_available": True
            }

        profile_path = resolve_profile_path(qualityProfile)

        slice_res = run_slice_test(
            model_path=saved_path,
            printer_ini=profile_path,
            scale=scaleFactor,
            infill_pct=infillPercent,
            support_mode=supportMode
        )

        if not slice_res.get("success"):
            return {
                "status": "failed",
                "error": slice_res.get("error", "Slicer execution failed."),
                "error_code": "SLICER_ERROR",
                "can_retry": True,
                "workshop_review_available": True
            }

        stats = slice_res.get("statistics", {})
        dims = slice_res.get("dimensions", {})
        quote = calculate_authoritative_quote(
            filament_grams=stats.get("filament_grams", 0.0),
            print_time_hours=stats.get("print_time_hours", 0.0),
            material_key=material,
            quantity=quantity,
            packaging_included=packagingIncluded,
            dimensions=dims
        )

        return {
            "status": "completed",
            "model_intelligence": insp,
            "dimensions": dims,
            "statistics": stats,
            "quote": quote,
            "slicerVersion": "2.9.0",
            "profileVersion": "2026-09-07-v1",
            "profileApplied": os.path.basename(profile_path),
            "gcode_reference": slice_res.get("gcode_reference", "gcode_generated")
        }
    finally:
        if os.path.exists(saved_path):
            try:
                os.remove(saved_path)
            except Exception:
                pass
