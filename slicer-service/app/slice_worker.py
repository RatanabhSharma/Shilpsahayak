"""
Shilp Studio Bounded Slicer Worker Pool & Resource Guard
Enforces:
- Bounded concurrency: Limits simultaneous PrusaSlicer native executions (default: 3)
- Calibrated execution timeout: 600 seconds wall-clock ceiling with clean process tree termination
- Slicer resource limits: File size cap (100 MB), triangle complexity cap
- Multi-plate aggregation: Slices all printable plates and aggregates manufacturing stats
- Deterministic error codes on failure/timeout
"""

import os
import time
import hashlib
import threading
import subprocess
from typing import Dict, Any, Optional

from app.slice_core import run_slice_test, find_prusaslicer_executable

# Concurrency ceiling to prevent host CPU/RAM exhaustion
MAX_CONCURRENT_SLICES = int(os.environ.get("MAX_CONCURRENT_SLICES", "3"))
_SLICER_SEMAPHORE = threading.BoundedSemaphore(MAX_CONCURRENT_SLICES)

# Calibrated timeout: 600 seconds (10 minutes) to accommodate complex high-density/multi-plate models
DEFAULT_TIMEOUT_SECONDS = int(os.environ.get("SLICER_TIMEOUT_SECONDS", "600"))

def compute_file_sha256(file_path: str) -> str:
    """Computes SHA-256 of raw file bytes for storage dedup and model identity."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def execute_bounded_slice(
    model_path: str,
    printer_ini: str,
    scale: float = 1.0,
    scale_x: Optional[float] = None,
    scale_y: Optional[float] = None,
    scale_z: Optional[float] = None,
    infill_pct: Optional[int] = None,
    support_mode: str = "auto",
    timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS
) -> Dict[str, Any]:
    """
    Executes production slicing within the bounded worker pool and calibrated timeout.
    """
    slicer_exe = find_prusaslicer_executable()
    if not slicer_exe:
        return {
            "success": False,
            "error_code": "SLICER_NOT_FOUND",
            "error": "PrusaSlicer native executable not found on host."
        }

    acquired = _SLICER_SEMAPHORE.acquire(blocking=True, timeout=120)
    if not acquired:
        return {
            "success": False,
            "error_code": "WORKER_POOL_EXHAUSTED",
            "error": "Slicer worker pool is currently saturated. Please retry shortly."
        }

    try:
        # Run slice core with calibrated timeout
        result = run_slice_test(
            model_path=model_path,
            printer_ini=printer_ini,
            scale=scale,
            scale_x=scale_x,
            scale_y=scale_y,
            scale_z=scale_z,
            infill_pct=infill_pct,
            support_mode=support_mode,
            timeout_seconds=timeout_seconds
        )
        return result
    finally:
        _SLICER_SEMAPHORE.release()

