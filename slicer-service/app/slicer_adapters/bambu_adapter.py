"""
Shilp Studio Bambu Studio CLI Multicolor Slicer Adapter
========================================================

Authoritative production adapter for multicolor / multimaterial 3MF models.
Interacts with Bambu Studio CLI (or compatible OrcaSlicer CLI) to produce
genuine multicolor sliced toolpaths, tool change metrics, per-filament material
usage, and accurate print duration.

Responsibilities:
1. Safely copy the uploaded 3MF model into an isolated temporary workspace.
2. Determine printable plates from the project metadata.
3. Invoke the local Bambu Studio CLI executable with calibrated timeouts.
4. Parse authoritative result.json and generated plate G-code.
5. Correlate per-filament usage with detected production colors and materials.
6. Provide structured production output for the authoritative pricing engine.
7. Safely clean up all temporary directories and artifacts.
8. Never expose workshop-internal AMS physical slot details to customer quotes.
"""

from __future__ import annotations

import os
import re
import sys
import json
import logging
import shutil
import hashlib
import zipfile
import tempfile
import subprocess
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional, Tuple

from app.universal_slice_result import (
    UniversalSliceResult,
    PerFilamentStats,
    SliceDimensions,
    SliceArtifact,
    PlateResult,
)
from app.compiled_profiles import get_or_compile_bambu_machine_profile

logger = logging.getLogger("bambu_adapter")


def find_bambustudio_executable() -> Optional[str]:
    """Locate Bambu Studio or Orca Slicer CLI executable."""
    env_path = os.environ.get("BAMBUSTUDIO_PATH") or os.environ.get("BAMBU_STUDIO_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    candidate_paths = [
        r"C:\Program Files\Bambu Studio\bambu-studio.exe",
        r"C:\Program Files (x86)\Bambu Studio\bambu-studio.exe",
        r"C:\Program Files\OrcaSlicer\orca-slicer.exe",
        r"C:\Program Files (x86)\OrcaSlicer\orca-slicer.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Bambu Studio\bambu-studio.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\OrcaSlicer\orca-slicer.exe"),
    ]

    for p in candidate_paths:
        if os.path.exists(p):
            return p

    for name in ["bambu-studio.exe", "bambu-studio", "orca-slicer.exe", "orca-slicer"]:
        which = shutil.which(name)
        if which:
            return which

    return None


def find_bambu_resource_file(resource_group: str, filename: Optional[str]) -> Optional[str]:
    """Find a shipped Bambu machine/process definition without inventing identifiers."""
    if not filename:
        return None
    if os.path.isfile(filename):
        return os.path.abspath(filename)
    roots = []
    executable = find_bambustudio_executable()
    if executable:
        roots.append(os.path.join(os.path.dirname(executable), "resources", "profiles", "BBL"))
    configured_root = os.environ.get("BAMBUSTUDIO_PROFILE_DIR")
    if configured_root:
        roots.append(configured_root)
    for root in roots:
        candidate = os.path.join(root, resource_group, filename)
        if os.path.isfile(candidate):
            return candidate
    return None


def get_bambu_version(slicer_exe: Optional[str]) -> str:
    """Extract version from Bambu Studio / OrcaSlicer executable or return fallback."""
    if not slicer_exe or not os.path.exists(slicer_exe):
        return "02.08.02.61"

    if sys.platform == "win32":
        try:
            cmd = f'(Get-Item -LiteralPath "{slicer_exe}").VersionInfo.FileVersion'
            out = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command", cmd],
                text=True,
                timeout=5
            ).strip()
            if out:
                return out
        except Exception:
            pass

    return "02.08.02.61"


def determine_printable_plates(model_path: str) -> List[int]:
    """
    Inspect 3MF project metadata (model_settings.config) to identify printable plates.
    Returns list of 1-based plate IDs that contain printable model instances.
    Defaults to [1] if no plate metadata exists or file is not an archive.
    """
    if not os.path.exists(model_path) or not zipfile.is_zipfile(model_path):
        return [1]

    try:
        with zipfile.ZipFile(model_path, "r") as zf:
            namelist = [n.lower() for n in zf.namelist()]
            cfg_name = next(
                (n for n in zf.namelist() if n.lower().endswith("model_settings.config")),
                None
            )
            if not cfg_name:
                return [1]

            xml_data = zf.read(cfg_name)
            root = ET.fromstring(xml_data)

            printable_plates: List[int] = []
            for plate in root.iter("plate"):
                plater_id_str = None
                for meta in plate.iter("metadata"):
                    if meta.attrib.get("key") == "plater_id":
                        plater_id_str = meta.attrib.get("value")
                        break

                has_instances = any(True for _ in plate.iter("model_instance"))
                if has_instances and plater_id_str:
                    try:
                        printable_plates.append(int(plater_id_str))
                    except ValueError:
                        pass

            return printable_plates or [1]
    except Exception:
        return [1]


DEFAULT_MATERIAL_DENSITIES: Dict[str, float] = {
    "PLA": 1.24,
    "PETG": 1.27,
    "TPU": 1.21,
    "ABS": 1.04,
    "RESIN": 1.15,
    "WOOD PLA": 1.28,
    "SILK PLA": 1.24,
}


def configure_project_production_material(
    archive_path: str,
    target_material: str,
    materials_config: Optional[Dict[str, Dict[str, float]]] = None,
    workshop_profile_override: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Updates the 3MF project settings to ensure that Bambu Studio CLI slices
    the project using the customer's selected production material (e.g. PLA),
    preventing foreign or stale project material presets (e.g. PETG) from overriding
    customer intent, while strictly preserving all original color assignments.

    Flush multiplier precedence:
    1. Preserves source project's native flush configuration by default.
    2. Applies workshop_profile_override ONLY when explicitly configured by workshop/admin.
    3. Never exposes or accepts customer-controlled flush multiplier.

    Returns the normalized uppercase material type (e.g. 'PLA').
    """
    mat_upper = (target_material or "PLA").strip().upper()
    if not os.path.exists(archive_path) or not zipfile.is_zipfile(archive_path):
        return mat_upper

    density = DEFAULT_MATERIAL_DENSITIES.get(mat_upper, 1.24)
    if materials_config:
        m_info = materials_config.get(mat_upper.lower())
        if m_info and "density" in m_info:
            try:
                density = float(m_info["density"])
            except (ValueError, TypeError):
                pass

    try:
        with zipfile.ZipFile(archive_path, "r") as zin:
            infolist = zin.infolist()
            contents = {item.filename: zin.read(item.filename) for item in infolist}

        cfg_name = next((fn for fn in contents if fn.lower().endswith("metadata/project_settings.config")), None)
        if not cfg_name:
            return mat_upper

        cfg_text = contents[cfg_name].decode("utf-8")
        cfg = json.loads(cfg_text)

        density_str = str(density)

        if "filament_type" in cfg and isinstance(cfg["filament_type"], list):
            n = len(cfg["filament_type"])
            cfg["filament_type"] = [mat_upper] * n
            if "filament_density" in cfg and isinstance(cfg["filament_density"], list):
                cfg["filament_density"] = [density_str] * n
            if "filament_settings_id" in cfg and isinstance(cfg["filament_settings_id"], list):
                cfg["filament_settings_id"] = [f"Generic {mat_upper}"] * n

        # Workshop/Admin explicit profile override for flush multiplier
        if workshop_profile_override and "flush_multiplier" in workshop_profile_override:
            fm_val = workshop_profile_override["flush_multiplier"]
            if isinstance(fm_val, (int, float)):
                cfg["flush_multiplier"] = [str(fm_val)]
            elif isinstance(fm_val, list):
                cfg["flush_multiplier"] = [str(v) for v in fm_val]
            elif isinstance(fm_val, str):
                cfg["flush_multiplier"] = [fm_val]

        contents[cfg_name] = json.dumps(cfg, indent=2).encode("utf-8")

        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for fn, data in contents.items():
                zout.writestr(fn, data)
    except Exception:
        pass

    return mat_upper


def configure_project_production_settings(
    archive_path: str,
    profile_path: Optional[str] = None,
    printer_profile_path: Optional[str] = None,
    infill_percent: Optional[int] = None,
    support_mode: Optional[str] = None,
    production_profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Apply the resolved Shilp toolpath settings to the isolated 3MF copy."""
    if not os.path.exists(archive_path) or not zipfile.is_zipfile(archive_path):
        return {}

    def read_profile(path: Optional[str]) -> Dict[str, str]:
        values: Dict[str, str] = {}
        if not path or not os.path.exists(path):
            return values
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    if "=" in line and not line.lstrip().startswith("#"):
                        key, value = line.split("=", 1)
                        values[key.strip()] = value.strip()
        except OSError:
            pass
        return values

    try:
        with zipfile.ZipFile(archive_path, "r") as zin:
            infolist = zin.infolist()
            contents = {item.filename: zin.read(item.filename) for item in infolist}

        cfg_name = next((fn for fn in contents if fn.lower().endswith("metadata/project_settings.config")), None)
        if not cfg_name:
            return {}
        cfg = json.loads(contents[cfg_name].decode("utf-8"))
        process_profile = read_profile(profile_path)
        printer_profile = read_profile(printer_profile_path)
        applied: Dict[str, Any] = {}

        for key in ("layer_height", "first_layer_height"):
            if key in process_profile:
                cfg[key] = process_profile[key]
                applied[key] = process_profile[key]

        if infill_percent is not None:
            density = f"{max(0, min(100, int(infill_percent)))}%"
            cfg["fill_density"] = density
            cfg["sparse_infill_density"] = density
            applied["fill_density"] = density
            applied["sparse_infill_density"] = density

        if support_mode in ("none", "auto", "required"):
            enabled = "0" if support_mode == "none" else "1"
            cfg["support_material"] = enabled
            cfg["support_material_auto"] = "1" if support_mode in ("auto", "required") else "0"
            applied["support_material"] = cfg["support_material"]
            applied["support_material_auto"] = cfg["support_material_auto"]

        # A printer_settings_id from a local profile is slicer-instance-specific.
        # Do not overwrite the source Bambu/Orca printer identity with a Shilp
        # profile name that may not exist in that slicer's registry.
        if printer_profile.get("printer_settings_id"):
            applied["printer_profile_requested"] = printer_profile["printer_settings_id"]
            applied["printer_settings_id"] = cfg.get("printer_settings_id")

        if production_profile:
            for key, target_key in (
                ("printerSettingsId", "printer_settings_id"),
                ("model", "printer_model"),
                ("nozzleDiameter", "nozzle_diameter"),
            ):
                value = production_profile.get(key)
                if value is not None:
                    cfg[target_key] = str(value)
                    applied[target_key] = cfg[target_key]

        contents[cfg_name] = json.dumps(cfg, indent=2).encode("utf-8")
        with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for fn, data in contents.items():
                zout.writestr(fn, data)
        return applied
    except Exception:
        return {}

def extract_source_project_metadata(archive_path: str) -> Optional[Dict[str, Any]]:
    """Read embedded printer metadata for provenance only; it never selects production."""
    if not os.path.exists(archive_path) or not zipfile.is_zipfile(archive_path):
        return None
    try:
        with zipfile.ZipFile(archive_path, "r") as zin:
            cfg_name = next((fn for fn in zin.namelist() if fn.lower().endswith("metadata/project_settings.config")), None)
            if not cfg_name:
                return None
            cfg = json.loads(zin.read(cfg_name).decode("utf-8"))
            metadata = {
                "printerSettingsId": cfg.get("printer_settings_id"),
                "printerModel": cfg.get("printer_model"),
                "nozzleDiameter": cfg.get("nozzle_diameter"),
            }
            return {key: value for key, value in metadata.items() if value not in (None, "", [])} or None
    except (OSError, ValueError, json.JSONDecodeError, zipfile.BadZipFile):
        return None


def parse_bambu_result_json(result_path: str) -> Dict[str, Any]:
    """Parse Bambu Studio CLI result.json file."""
    if not os.path.exists(result_path):
        return {}
    try:
        with open(result_path, "r", encoding="utf-8", errors="ignore") as f:
            return json.load(f)
    except Exception:
        return {}


def parse_time_string(time_str: str) -> int:
    """Parse time string like '3d 5h 50m 18s', '77h 50m 18s', or numeric string into seconds."""
    if not time_str or not str(time_str).strip():
        return 0
    s = str(time_str).strip()
    try:
        return int(float(s))
    except ValueError:
        pass

    total = 0
    d_m = re.search(r"(\d+)\s*d", s)
    h_m = re.search(r"(\d+)\s*h", s)
    m_m = re.search(r"(\d+)\s*m", s)
    s_m = re.search(r"(\d+)\s*s", s)
    if d_m:
        total += int(d_m.group(1)) * 86400
    if h_m:
        total += int(h_m.group(1)) * 3600
    if m_m:
        total += int(m_m.group(1)) * 60
    if s_m:
        total += int(s_m.group(1))
    return total


def parse_bambu_gcode_details(gcode_path: str) -> Dict[str, Any]:
    """
    Extract authoritative filament weights, lengths, tool changes, timing,
    and 4-way feature proportions (model, support, tower, flush) from G-code.
    """
    if not os.path.exists(gcode_path):
        return {}

    filament_weights: List[float] = []
    filament_lengths: List[float] = []
    colours: List[str] = []
    estimated_time_s = 0
    tool_changes = 0

    feature_mm = {
        "model": 0.0,
        "support": 0.0,
        "tower": 0.0,
        "flush": 0.0,
        "brim": 0.0,
    }

    curr_cat = "model"
    in_flush = False

    try:
        with open(gcode_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                if not line:
                    continue
                c0 = line[0]
                if c0 == ";":
                    l = line.strip()
                    if l.startswith("; total filament weight [g] :"):
                        parts = l.split(":", 1)[1].strip()
                        try:
                            filament_weights = [float(w.strip()) for w in parts.split(",") if w.strip()]
                        except ValueError:
                            pass
                    elif l.startswith("; total filament length [mm] :"):
                        parts = l.split(":", 1)[1].strip()
                        try:
                            filament_lengths = [float(len_str.strip()) for len_str in parts.split(",") if len_str.strip()]
                        except ValueError:
                            pass
                    elif l.startswith("; filament_colour ="):
                        parts = l.split("=", 1)[1].strip()
                        colours = [c.strip() for c in parts.split(";") if c.strip()]
                    elif "total estimated time:" in l:
                        parts = l.split("total estimated time:", 1)[1].strip()
                        estimated_time_s = parse_time_string(parts)
                    elif "estimated printing time" in l and not estimated_time_s:
                        parts = l.split("=", 1)[1].strip() if "=" in l else l.split(":", 1)[1].strip()
                        estimated_time_s = parse_time_string(parts)
                    elif l.startswith("; FEATURE:"):
                        in_flush = False
                        feat = l[10:].strip().lower()
                        if "support" in feat:
                            curr_cat = "support"
                        elif "prime tower" in feat:
                            curr_cat = "tower"
                        elif "brim" in feat or "skirt" in feat:
                            curr_cat = "brim"
                        else:
                            curr_cat = "model"
                    elif l.startswith("; FLUSH_START"):
                        in_flush = True
                    elif l.startswith("; FLUSH_END"):
                        in_flush = False
                        curr_cat = "tower"
                elif c0 == "M" and line.startswith("M620 "):
                    tool_changes += 1
                elif c0 == "G" and (line.startswith("G1 ") or line.startswith("G2 ") or line.startswith("G3 ")):
                    semi_idx = line.find(";")
                    code_part = line[:semi_idx] if semi_idx != -1 else line
                    idx_e = code_part.find(" E")
                    if idx_e != -1:
                        start = idx_e + 2
                        end = start
                        n_len = len(code_part)
                        while end < n_len and (code_part[end].isdigit() or code_part[end] in ".-"):
                            end += 1
                        try:
                            e_val = float(code_part[start:end])
                            if e_val > 0:
                                if in_flush:
                                    feature_mm["flush"] += e_val
                                else:
                                    feature_mm[curr_cat] += e_val
                        except ValueError:
                            pass
    except Exception:
        pass

    main_mm = feature_mm["model"] + feature_mm["support"]
    if main_mm > 0:
        model_ratio = feature_mm["model"] / main_mm
        support_ratio = feature_mm["support"] / main_mm
    else:
        model_ratio = 1.0
        support_ratio = 0.0

    overhead_mm = feature_mm["tower"] + feature_mm["flush"] + feature_mm["brim"]
    if overhead_mm > 0:
        tower_ratio = feature_mm["tower"] / overhead_mm
        purge_ratio = (feature_mm["flush"] + feature_mm["brim"]) / overhead_mm
    else:
        tower_ratio = 0.0
        purge_ratio = 1.0

    return {
        "filament_weights_g": filament_weights,
        "filament_lengths_mm": filament_lengths,
        "filament_colours": colours,
        "estimated_time_seconds": estimated_time_s,
        "m620_changes": tool_changes,
        "feature_mm": feature_mm,
        "model_ratio": model_ratio,
        "support_ratio": support_ratio,
        "tower_ratio": tower_ratio,
        "purge_ratio": purge_ratio,
    }


def parse_bambu_gcode_header(gcode_path: str) -> Dict[str, Any]:
    """Extract filament weights, lengths, and tool changes from G-code comments."""
    details = parse_bambu_gcode_details(gcode_path)
    return {
        "filament_weights_g": details.get("filament_weights_g", []),
        "filament_lengths_mm": details.get("filament_lengths_mm", []),
        "filament_colours": details.get("filament_colours", []),
        "m620_changes": details.get("m620_changes", 0),
        "estimated_time_seconds": details.get("estimated_time_seconds", 0),
        "model_ratio": details.get("model_ratio", 1.0),
        "support_ratio": details.get("support_ratio", 0.0),
        "tower_ratio": details.get("tower_ratio", 0.0),
        "purge_ratio": details.get("purge_ratio", 1.0),
    }


class BambuSlicerAdapter:
    """
    Encapsulated adapter for invoking Bambu Studio CLI to slice multicolor models.
    """

    def __init__(self, executable_path: Optional[str] = None):
        self._executable_path = executable_path or find_bambustudio_executable()

    @property
    def is_available(self) -> bool:
        return bool(self._executable_path and os.path.exists(self._executable_path))

    @property
    def executable_path(self) -> Optional[str]:
        return self._executable_path

    def slice(
        self,
        model_path: str,
        timeout_seconds: int = 600,
        plate_index: Optional[int] = None,
        production_params: Optional[Dict[str, Any]] = None,
        color_analysis: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Execute Bambu Studio CLI slicing on the given model.

        Parameters
        ----------
        model_path:
            Path to the source 3MF model file.
        timeout_seconds:
            Subprocess timeout ceiling in seconds.
        plate_index:
            Optional plate index (0 = slice all printable plates, or 1, 2, ...).
            If None, defaults to 0 (all plates).
        production_params:
            Dictionary of production options (material, quality, etc.).
        color_analysis:
            Output from color_parser / inspect_file for correlating filament
            indices with human-readable colors and materials.

        Returns
        -------
        Structured slicing result conforming to Shilp Studio production requirements.
        """
        slicer_exe = self._executable_path or find_bambustudio_executable()
        if not slicer_exe or not os.path.exists(slicer_exe):
            return {
                "success": False,
                "error_code": "SLICER_NOT_FOUND",
                "error": "Bambu Studio CLI executable not found on host.",
                "adapter": "bambu_studio_cli",
            }

        if not os.path.exists(model_path):
            return {
                "success": False,
                "error_code": "MODEL_FILE_NOT_FOUND",
                "error": f"Model file not found: {model_path}",
                "adapter": "bambu_studio_cli",
            }

        # Calculate authoritative model hash for provenance verification
        model_hash = ""
        try:
            with open(model_path, "rb") as mf:
                model_hash = hashlib.sha256(mf.read()).hexdigest()
        except Exception:
            pass

        job_id = (production_params or {}).get("job_id") or (production_params or {}).get("jobId") or ""

        # Resolve printable plates
        printable_plates = determine_printable_plates(model_path)
        target_plate = 0 if plate_index is None else plate_index

        slicer_ver = get_bambu_version(slicer_exe)
        requested_envelope = (production_params or {}).get("active_envelope")
        active_envelope = requested_envelope if isinstance(requested_envelope, dict) else {
            "x": 256.0,
            "y": 256.0,
            "z": 256.0,
        }

        chosen_material = production_params.get("material") if production_params else None
        materials_cfg = production_params.get("materials") if production_params else None
        workshop_override = production_params.get("workshop_profile_override") if production_params else None

        with tempfile.TemporaryDirectory() as temp_dir:
            safe_basename = os.path.basename(model_path)
            working_copy = os.path.join(temp_dir, safe_basename)
            shutil.copy2(model_path, working_copy)
            source_project = extract_source_project_metadata(working_copy)

            target_material = None
            if chosen_material:
                target_material = configure_project_production_material(
                    archive_path=working_copy,
                    target_material=chosen_material,
                    materials_config=materials_cfg,
                    workshop_profile_override=workshop_override,
                )

            applied_settings = configure_project_production_settings(
                archive_path=working_copy,
                profile_path=(production_params or {}).get("profile_path"),
                printer_profile_path=(production_params or {}).get("printer_profile_path"),
                infill_percent=(production_params or {}).get("infillPercent"),
                support_mode=(production_params or {}).get("supportMode"),
                production_profile=(production_params or {}).get("productionPrinterProfile"),
            )

            prod_profile = (production_params or {}).get("productionPrinterProfile") or {}
            machine_file = prod_profile.get("machineProfileFile")
            raw_machine_path = find_bambu_resource_file("machine", machine_file)
            compiled_machine_path = get_or_compile_bambu_machine_profile(raw_machine_path) if raw_machine_path else None
            machine_settings_path = compiled_machine_path or raw_machine_path

            process_file = prod_profile.get("processProfileFile")
            process_settings_path = find_bambu_resource_file("process", process_file)

            settings_to_load = [p for p in (machine_settings_path, process_settings_path) if p]

            cmd = [
                slicer_exe,
                "--load-settings",
                ";".join(settings_to_load),
                "--slice", str(target_plate),
                "--outputdir", temp_dir,
                working_copy,
            ]

            machine_file = (production_params or {}).get("productionPrinterProfile", {}).get("machineProfileFile", "unknown")
            logger.info(
                f"Bambu Studio CLI invocation: slicing model '{safe_basename}' "
                f"with machine '{machine_file}', plate {target_plate}, "
                f"target envelope {active_envelope.get('x')}×{active_envelope.get('y')}×{active_envelope.get('z')} mm",
                extra={"job_id": job_id or "bambu"},
            )

            proc = None
            try:
                proc = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                stdout, stderr = proc.communicate(timeout=timeout_seconds)
            except subprocess.TimeoutExpired:
                if proc:
                    try:
                        if sys.platform == "win32":
                            subprocess.run(
                                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                                check=False,
                                capture_output=True
                            )
                        else:
                            proc.kill()
                    except Exception:
                        pass
                return {
                    "success": False,
                    "error_code": "SLICER_TIMEOUT",
                    "error": f"Bambu Studio slicing timed out after {timeout_seconds} seconds.",
                    "adapter": "bambu_studio_cli",
                }
            except Exception as exc:
                return {
                    "success": False,
                    "error_code": "SLICER_EXECUTION_ERROR",
                    "error": f"Bambu Studio invocation error: {str(exc)}",
                    "adapter": "bambu_studio_cli",
                }

            if proc.returncode != 0:
                err_msg = (stderr or "").strip() or (stdout or "").strip() or f"CLI returned code {proc.returncode}"
                return {
                    "success": False,
                    "error_code": "SLICER_EXECUTION_ERROR",
                    "error": f"Bambu Studio error: {err_msg}",
                    "stdout": stdout,
                    "stderr": stderr,
                    "returncode": proc.returncode,
                    "adapter": "bambu_studio_cli",
                }

            # Locate result.json and generated gcode files
            result_json_path = os.path.join(temp_dir, "result.json")
            result_data = parse_bambu_result_json(result_json_path)

            if result_data and result_data.get("return_code", 0) != 0:
                err_string = result_data.get("error_string", "Unknown slicing error")
                return {
                    "success": False,
                    "error_code": "SLICER_EXECUTION_ERROR",
                    "error": f"Bambu Studio slicing error: {err_string}",
                    "adapter": "bambu_studio_cli",
                }

            # Find all G-code files
            gcode_files = [
                os.path.join(temp_dir, f)
                for f in os.listdir(temp_dir)
                if f.lower().endswith(".gcode")
            ]

            if not gcode_files and not result_data:
                return {
                    "success": False,
                    "error_code": "SLICER_NO_OUTPUT",
                    "error": "Bambu Studio completed but generated no G-code or result metadata.",
                    "adapter": "bambu_studio_cli",
                }

            # Hash all generated G-code files and parse their details
            combined_hash = hashlib.sha256()
            gcode_details_map: Dict[str, Dict[str, Any]] = {}
            for gf in sorted(gcode_files):
                gcode_details_map[gf] = parse_bambu_gcode_details(gf)
                with open(gf, "rb") as f_in:
                    while chunk := f_in.read(65536):
                        combined_hash.update(chunk)
            gcode_hash = combined_hash.hexdigest()
            gcode_ref = f"gcode_sha256_{gcode_hash[:16]}" if gcode_hash else ""

            def get_plate_gcode_details(plate_id: Any) -> Dict[str, Any]:
                pid_str = str(plate_id)
                for gf, det in gcode_details_map.items():
                    base = os.path.basename(gf).lower()
                    if f"plate_{pid_str}." in base or f"plate{pid_str}." in base:
                        return det
                if gcode_details_map:
                    return next(iter(gcode_details_map.values()))
                return {}

            # Extract statistics from result.json where available
            sliced_plates = result_data.get("sliced_plates", [])
            total_filament_grams = 0.0
            total_filament_mm = 0.0
            total_print_time_seconds = 0
            total_tool_changes = 0
            dims = {"x": 0.0, "y": 0.0, "z": 0.0}
            result_filament_total_available = False
            result_time_available = False
            plate_records: List[Dict[str, Any]] = []
            diagnostics: Dict[str, Any] = {
                "feature_type_times": {},
                "time_cross_checks": [],
                "filament_cross_checks": [],
            }

            # Build color lookup map from color_analysis: {1: {...}, 2: {...}}
            color_map: Dict[int, Dict[str, Any]] = {}
            if color_analysis and color_analysis.get("colors"):
                for entry in color_analysis["colors"]:
                    sf = entry.get("sourceFilament")
                    if sf is not None:
                        color_map[sf] = entry

            per_filament: List[Dict[str, Any]] = []

            if sliced_plates:
                for plate in sliced_plates:
                    pid = plate.get("id", 1)
                    plate_dims = {"x": 0.0, "y": 0.0, "z": 0.0}
                    plate_filament_total = 0.0
                    plate_model_total = 0.0
                    plate_support_total = 0.0
                    plate_tower_total = 0.0
                    plate_purge_total = 0.0
                    plate_filaments: List[Dict[str, Any]] = []

                    # total_predication is the slicer's aggregate duration. Feature
                    # categories are diagnostic and are not guaranteed additive.
                    ft_times = plate.get("feature_type_times")
                    if isinstance(ft_times, dict):
                        diagnostics["feature_type_times"][str(pid)] = ft_times

                    result_time = float(plate.get("total_predication", 0.0) or 0.0)
                    gcode_info = get_plate_gcode_details(pid)
                    gcode_time = float(gcode_info.get("estimated_time_seconds", 0) or 0)
                    if result_time > 0.0:
                        result_time_available = True
                        total_print_time_seconds += int(round(result_time))
                        if gcode_time > 0.0:
                            relative_delta = abs(result_time - gcode_time) / result_time
                            diagnostics["time_cross_checks"].append({
                                "plateId": pid,
                                "resultSeconds": result_time,
                                "gcodeSeconds": gcode_time,
                                "relativeDelta": round(relative_delta, 6),
                                "materiallyDifferent": relative_delta > 0.01,
                            })
                    elif gcode_time > 0.0:
                        total_print_time_seconds += int(round(gcode_time))

                    total_tool_changes += int(plate.get("filament_change_times", 0))

                    # Bounding box & dimensions
                    for obj in plate.get("objects", []):
                        bbox = obj.get("bbox", {})
                        w = round(float(bbox.get("width", 0.0)), 2)
                        d = round(float(bbox.get("depth", 0.0)), 2)
                        h = round(float(bbox.get("height", 0.0)), 2)
                        dims["x"] = max(dims["x"], w)
                        dims["y"] = max(dims["y"], d)
                        dims["z"] = max(dims["z"], h)
                        plate_dims["x"] = max(plate_dims["x"], w)
                        plate_dims["y"] = max(plate_dims["y"], d)
                        plate_dims["z"] = max(plate_dims["z"], h)

                    # G-code feature proportions are derived breakdown data only.
                    m_ratio = gcode_info.get("model_ratio", 1.0)
                    s_ratio = gcode_info.get("support_ratio", 0.0)
                    t_ratio = gcode_info.get("tower_ratio", 0.0)
                    p_ratio = gcode_info.get("purge_ratio", 1.0)

                    # Filaments
                    for fila in plate.get("filaments", []):
                        fid = fila.get("id")
                        c_info = color_map.get(fid, {})
                        main_g_raw = float(fila.get("main_used_g", 0.0) or 0.0)
                        total_g_raw = float(fila.get("total_used_g", 0.0) or 0.0)
                        main_g = round(main_g_raw, 2)
                        tot_g = round(total_g_raw, 2)
                        if total_g_raw > 0.0:
                            result_filament_total_available = True
                            total_filament_grams += total_g_raw
                            plate_filament_total += total_g_raw
                        diff_g = max(0.0, round(tot_g - main_g, 2))

                        # Partition main_used_g between model and support
                        if (m_ratio + s_ratio) > 0.0 and s_ratio > 0.0:
                            c_model_g = round(main_g * (m_ratio / (m_ratio + s_ratio)), 2)
                            c_support_g = round(main_g - c_model_g, 2)
                        else:
                            c_model_g = main_g
                            c_support_g = 0.0

                        # Partition diff_g between prime tower and purge
                        if (t_ratio + p_ratio) > 0.0 and t_ratio > 0.0:
                            c_tower_g = round(diff_g * (t_ratio / (t_ratio + p_ratio)), 2)
                            c_purge_g = round(diff_g - c_tower_g, 2)
                        else:
                            c_tower_g = 0.0
                            c_purge_g = diff_g

                        # Exact centigram reconciliation for channel: model + support + tower + purge == tot_g
                        c_sum = round(c_model_g + c_support_g + c_tower_g + c_purge_g, 2)
                        c_diff = round(tot_g - c_sum, 2)
                        if c_diff != 0.0:
                            c_purge_g = round(c_purge_g + c_diff, 2)

                        per_mat = target_material if target_material else (c_info.get("materialType") or "PLA")
                        per_filament.append({
                            "filamentIndex": fid,
                            "color": c_info.get("hex") or "unknown",
                            "colorHex": c_info.get("hex") or "unknown",
                            "materialType": per_mat,
                            "totalGrams": tot_g,
                            "modelGrams": c_model_g,
                            "supportGrams": c_support_g,
                            "towerGrams": c_tower_g,
                            "purgeGrams": c_purge_g,
                        })
                        plate_filaments.append(per_filament[-1])
                        plate_model_total += c_model_g
                        plate_support_total += c_support_g
                        plate_tower_total += c_tower_g
                        plate_purge_total += c_purge_g

                    plate_time = result_time if result_time > 0.0 else gcode_time
                    plate_records.append({
                        "plateId": pid,
                        "dimensions": plate_dims,
                        "printTimeSeconds": int(round(plate_time)),
                        "filamentGrams": round(plate_filament_total, 2),
                        "modelFilamentGrams": round(plate_model_total, 2),
                        "supportFilamentGrams": round(plate_support_total, 2),
                        "towerFilamentGrams": round(plate_tower_total, 2),
                        "purgeFilamentGrams": round(plate_purge_total, 2),
                        "toolChangeCount": int(plate.get("filament_change_times", 0)),
                        "perFilament": plate_filaments,
                        "metricSources": {
                            "total_filament": "slicer_result" if any(float(f.get("total_used_g", 0.0) or 0.0) > 0 for f in plate.get("filaments", [])) else "gcode_header",
                            "print_time": "slicer_result" if result_time > 0.0 else "gcode_header",
                            "breakdown": "derived_gcode_ratio",
                        },
                        "rawStatistics": {
                            "total_predication": plate.get("total_predication"),
                            "feature_type_times": ft_times or {},
                        },
                    })

            # Supplementary/fallback extraction from G-code headers if result.json omitted them
            gcode_fallback_total = 0.0
            for gf, det in gcode_details_map.items():
                if not total_filament_mm and det.get("filament_lengths_mm"):
                    total_filament_mm = sum(det["filament_lengths_mm"])
                if det.get("filament_weights_g"):
                    gcode_total = sum(det["filament_weights_g"])
                    if result_filament_total_available:
                        diagnostics["filament_cross_checks"].append({
                            "gcode": gf,
                            "resultGrams": round(total_filament_grams, 6),
                            "gcodeGrams": round(gcode_total, 6),
                            "differenceGrams": round(total_filament_grams - gcode_total, 6),
                        })
                    elif not result_filament_total_available:
                        gcode_fallback_total += gcode_total
                if not total_tool_changes and det.get("m620_changes"):
                    total_tool_changes = det["m620_changes"]
                if not total_print_time_seconds and det.get("estimated_time_seconds"):
                    total_print_time_seconds = det["estimated_time_seconds"]

            if not result_filament_total_available and gcode_fallback_total > 0.0:
                total_filament_grams = gcode_fallback_total

            # Fallback per_filament population if result.json had no filaments
            if not per_filament and gcode_details_map:
                for gf, det in gcode_details_map.items():
                    w_list = det.get("filament_weights_g", [])
                    m_ratio = det.get("model_ratio", 1.0)
                    s_ratio = det.get("support_ratio", 0.0)
                    t_ratio = det.get("tower_ratio", 0.0)
                    p_ratio = det.get("purge_ratio", 1.0)
                    for idx, w in enumerate(w_list, 1):
                        tot_g = round(float(w), 2)
                        c_info = color_map.get(idx, {})
                        main_ratio = m_ratio + s_ratio
                        if main_ratio > 0 and (t_ratio + p_ratio) > 0:
                            main_g = round(tot_g * main_ratio, 2)
                            diff_g = max(0.0, round(tot_g - main_g, 2))
                            c_model_g = round(main_g * (m_ratio / main_ratio), 2)
                            c_support_g = round(main_g - c_model_g, 2)
                            c_tower_g = round(diff_g * (t_ratio / (t_ratio + p_ratio)), 2)
                            c_purge_g = round(diff_g - c_tower_g, 2)
                        else:
                            c_model_g = tot_g
                            c_support_g = 0.0
                            c_tower_g = 0.0
                            c_purge_g = 0.0

                        c_diff = round(tot_g - (c_model_g + c_support_g + c_tower_g + c_purge_g), 2)
                        if c_diff != 0.0:
                            c_purge_g = round(c_purge_g + c_diff, 2)

                        per_mat = target_material if target_material else (c_info.get("materialType") or "PLA")
                        per_filament.append({
                            "filamentIndex": idx,
                            "color": c_info.get("hex") or "unknown",
                            "colorHex": c_info.get("hex") or "unknown",
                            "materialType": per_mat,
                            "totalGrams": tot_g,
                            "modelGrams": c_model_g,
                            "supportGrams": c_support_g,
                            "towerGrams": c_tower_g,
                            "purgeGrams": c_purge_g,
                        })

                if plate_records and per_filament:
                    plate_records[0]["perFilament"] = per_filament
                    plate_records[0]["filamentGrams"] = round(sum(f["totalGrams"] for f in per_filament), 2)
                    plate_records[0]["modelFilamentGrams"] = round(sum(f["modelGrams"] for f in per_filament), 2)
                    plate_records[0]["purgeFilamentGrams"] = round(sum(f["purgeGrams"] for f in per_filament), 2)

            # Check authoritative timing
            if total_print_time_seconds <= 0:
                return {
                    "success": False,
                    "error_code": "MISSING_AUTHORITATIVE_TIME",
                    "error": "Bambu Studio produced missing or non-positive print time.",
                    "adapter": "bambu_studio_cli",
                }

            # Check authoritative material weight
            if total_filament_grams <= 0.0:
                return {
                    "success": False,
                    "error_code": "MISSING_AUTHORITATIVE_STATISTICS",
                    "error": "Bambu Studio produced missing or non-positive filament weight.",
                    "adapter": "bambu_studio_cli",
                }

            total_filament_grams = round(total_filament_grams, 2)
            model_filament_grams = round(sum(f.get("modelGrams", 0.0) for f in per_filament), 2)
            support_filament_grams = round(sum(f.get("supportGrams", 0.0) for f in per_filament), 2)
            tower_filament_grams = round(sum(f.get("towerGrams", 0.0) for f in per_filament), 2)
            purge_filament_grams = round(sum(f.get("purgeGrams", 0.0) for f in per_filament), 2)

            # Top-level reconciliation: model + support + tower + purge == total_filament_grams
            comp_sum = round(model_filament_grams + support_filament_grams + tower_filament_grams + purge_filament_grams, 2)
            top_diff = round(total_filament_grams - comp_sum, 2)
            if top_diff != 0.0:
                purge_filament_grams = round(purge_filament_grams + top_diff, 2)

            print_time_hours = round(total_print_time_seconds / 3600.0, 3)
            print_time_minutes = round(total_print_time_seconds / 60.0, 2)
            hours_part = total_print_time_seconds // 3600
            mins_part = (total_print_time_seconds % 3600) // 60
            secs_part = total_print_time_seconds % 60
            raw_time_str = f"{hours_part}h {mins_part}m {secs_part}s"

            statistics = {
                "filament_grams": total_filament_grams,
                "model_filament_grams": model_filament_grams,
                "support_filament_grams": support_filament_grams,
                "tower_filament_grams": tower_filament_grams,
                "purge_filament_grams": purge_filament_grams,
                "filament_mm": round(total_filament_mm, 2) if total_filament_mm else 0.0,
                "print_time_seconds": total_print_time_seconds,
                "print_time_minutes": print_time_minutes,
                "print_time_hours": print_time_hours,
                "raw_time_string": raw_time_str,
                "plate_count": len(sliced_plates) or len(gcode_files) or 1,
                "tool_change_count": total_tool_changes,
                "per_filament": per_filament,
                "production_verification_status": "verified",
                "metric_sources": {
                    "total_filament": "slicer_result" if result_filament_total_available else "gcode_header",
                    "print_time": "slicer_result" if result_time_available else "gcode_header",
                    "model_filament": "derived_gcode_ratio",
                    "support_filament": "derived_gcode_ratio",
                    "tower_filament": "derived_gcode_ratio",
                    "purge_filament": "derived_gcode_ratio",
                },
                "diagnostics": diagnostics,
                "applied_settings": applied_settings,
                "feature_mm": get_plate_gcode_details(1).get("feature_mm") or {},
            }

            per_fil_objs = [
                PerFilamentStats(
                    filamentIndex=f["filamentIndex"],
                    totalGrams=f["totalGrams"],
                    colorHex=f.get("colorHex"),
                    materialType=f.get("materialType"),
                    modelGrams=f.get("modelGrams"),
                    supportGrams=f.get("supportGrams"),
                    towerGrams=f.get("towerGrams"),
                    purgeGrams=f.get("purgeGrams"),
                )
                for f in per_filament
            ]

            artifact_obj = SliceArtifact(
                gcodeReference=gcode_ref,
                gcodeHash=gcode_hash,
                resultReference=f"result_json_{gcode_hash[:12]}" if gcode_hash else "bambu_cli_result",
            )

            universal_res = UniversalSliceResult(
                adapter="bambu_studio_cli",
                slicerName="BambuStudio",
                slicerVersion=slicer_ver,
                modelHash=model_hash,
                jobId=job_id,
                dimensions=SliceDimensions(x=dims["x"], y=dims["y"], z=dims["z"]),
                printTimeSeconds=total_print_time_seconds,
                filamentGrams=total_filament_grams,
                toolChangeCount=total_tool_changes,
                perFilament=per_fil_objs,
                artifact=artifact_obj,
                success=True,
                modelFilamentGrams=model_filament_grams,
                supportFilamentGrams=support_filament_grams,
                towerFilamentGrams=tower_filament_grams,
                purgeFilamentGrams=purge_filament_grams,
                filamentMm=round(total_filament_mm, 2) if total_filament_mm else None,
                plateCount=len(sliced_plates) or len(gcode_files) or 1,
                activeEnvelope=active_envelope,
                rawStatistics=statistics,
                plates=[PlateResult.from_dict(p) for p in plate_records],
                metricSources=statistics["metric_sources"],
                diagnostics=diagnostics,
            )

            res_dict = universal_res.to_dict()
            res_dict["model_path"] = model_path
            res_dict["source_project"] = source_project
            return res_dict


# Default global adapter instance
_default_adapter = BambuSlicerAdapter()


def execute_bambu_slice(
    model_path: str,
    timeout_seconds: int = 600,
    plate_index: Optional[int] = None,
    production_params: Optional[Dict[str, Any]] = None,
    color_analysis: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Convenience function calling the default BambuSlicerAdapter instance."""
    return _default_adapter.slice(
        model_path=model_path,
        timeout_seconds=timeout_seconds,
        plate_index=plate_index,
        production_params=production_params,
        color_analysis=color_analysis,
    )

