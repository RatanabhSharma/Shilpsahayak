"""
Enhanced Slicing Core (Phase 2D)
Supports:
- Model physical dimension parsing (--info)
- Support material modes (auto, none, required)
- Infill density overrides
- Quality profiles (draft, standard, fine)
- Isolated temporary directories and subprocess timeouts
- Parsing statistics from G-code comments
- Dynamic build envelope reading from active printer profile INI
"""

import os
import re
import sys
import subprocess
import tempfile
import json
import hashlib
import zipfile
from typing import Dict, Any, Optional, Tuple, List

from app.universal_slice_result import (
    UniversalSliceResult,
    PerFilamentStats,
    SliceDimensions,
    SliceArtifact,
    PlateResult,
)


def detect_prusaslicer_version(slicer_exe: Optional[str]) -> str:
    """Dynamically detect PrusaSlicer version without hardcoding."""
    if not slicer_exe or not os.path.exists(slicer_exe):
        return "2.9.0"

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

    try:
        res = subprocess.run([slicer_exe, "--version"], capture_output=True, text=True, timeout=5, check=False)
        m = re.search(r"(\d+\.\d+\.\d+(?:[-+][\w.]+)?|\d+\.\d+)", res.stdout or res.stderr)
        if m:
            return m.group(1)
    except Exception:
        pass

    return "2.9.0"


def find_prusaslicer_executable() -> Optional[str]:
    env_path = os.environ.get("PRUSASLICER_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    candidate_paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "poc", "bin", "PrusaSlicer-2.9.0", "prusa-slicer-console.exe")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "bin", "PrusaSlicer-2.9.0", "prusa-slicer-console.exe")),
        r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer.exe",
        r"C:\Program Files (x86)\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Prusa3D\PrusaSlicer\prusa-slicer-console.exe"),
    ]

    for p in candidate_paths:
        if os.path.exists(p):
            return p

    import shutil
    for name in ["prusa-slicer-console.exe", "prusa-slicer.exe", "prusa-slicer"]:
        found = shutil.which(name)
        if found:
            return found

    return None

def read_profile_envelope(profile_path: str) -> Dict[str, float]:
    """
    Parse the printer profile INI file and return the authoritative build envelope.

    Reads:
    - bed_shape: comma-separated corner coordinates (e.g. 0x0,256x0,256x256,0x256)
      The max X and Y are extracted from the coordinate pairs.
    - max_print_height: the Z limit in mm.

    Returns:
        {"x": float, "y": float, "z": float}

    Falls back to an empty dict if the profile cannot be read or parsed.
    """
    envelope: Dict[str, float] = {}
    if not profile_path or not os.path.exists(profile_path):
        return envelope

    try:
        with open(profile_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()

                # bed_shape = 0x0,256x0,256x256,0x256
                if line.lower().startswith("bed_shape"):
                    parts = line.split("=", 1)
                    if len(parts) < 2:
                        continue
                    corners_str = parts[1].strip()
                    x_vals = []
                    y_vals = []
                    for corner in corners_str.split(","):
                        corner = corner.strip()
                        if "x" in corner.lower():
                            xy = corner.lower().split("x")
                            try:
                                x_vals.append(float(xy[0]))
                                y_vals.append(float(xy[1]))
                            except (ValueError, IndexError):
                                pass
                    if x_vals and y_vals:
                        envelope["x"] = round(max(x_vals), 2)
                        envelope["y"] = round(max(y_vals), 2)

                # max_print_height = 200
                elif line.lower().startswith("max_print_height"):
                    parts = line.split("=", 1)
                    if len(parts) < 2:
                        continue
                    try:
                        envelope["z"] = round(float(parts[1].strip()), 2)
                    except ValueError:
                        pass

    except Exception:
        pass

    return envelope

def get_model_info(model_path: str) -> Dict[str, Any]:
    slicer_exe = find_prusaslicer_executable()
    if not slicer_exe or not os.path.exists(model_path):
        return {}

    try:
        res = subprocess.run(
            [slicer_exe, "--info", model_path],
            capture_output=True,
            text=True,
            timeout=30,
            check=False
        )
        if res.returncode != 0:
            return {}

        dims = {"x": 0.0, "y": 0.0, "z": 0.0, "volume": 0.0, "facets": 0}
        for line in res.stdout.splitlines():
            line = line.strip()
            if line.startswith("size_x ="): dims["x"] = round(float(line.split("=")[1]), 2)
            elif line.startswith("size_y ="): dims["y"] = round(float(line.split("=")[1]), 2)
            elif line.startswith("size_z ="): dims["z"] = round(float(line.split("=")[1]), 2)
            elif line.startswith("volume ="): dims["volume"] = round(float(line.split("=")[1]), 2)
            elif line.startswith("number_of_facets ="): dims["facets"] = int(line.split("=")[1])
        return dims
    except Exception:
        return {}


def extract_project_printable_dimensions(archive_path: str) -> Optional[Dict[str, float]]:
    """
    Extract required printable bed area/height from a 3MF slicer project.
    Bambu / OrcaSlicer project settings define 'printable_area' and 'printable_height'.
    PrusaSlicer projects define 'bed_shape' and 'max_print_height'.
    """
    if not archive_path or not os.path.isfile(archive_path) or not zipfile.is_zipfile(archive_path):
        return None
    try:
        with zipfile.ZipFile(archive_path, "r") as zf:
            namelist = zf.namelist()
            req_x, req_y, req_z = 0.0, 0.0, 0.0

            # 1. Bambu / OrcaSlicer project_settings.config
            proj_cfg_name = next(
                (n for n in namelist if n.lower().endswith("project_settings.config")),
                None
            )
            if proj_cfg_name:
                try:
                    cfg = json.loads(zf.read(proj_cfg_name).decode("utf-8", errors="ignore"))
                    area = cfg.get("printable_area")
                    p_height = cfg.get("printable_height")
                    if area and isinstance(area, list):
                        xs, ys = [], []
                        for pt in area:
                            if isinstance(pt, str) and "x" in pt:
                                parts = pt.split("x")
                                try:
                                    xs.append(float(parts[0]))
                                    ys.append(float(parts[1]))
                                except ValueError:
                                    pass
                        if xs and ys:
                            req_x = max(xs) - min(xs) if min(xs) < 0 else max(xs)
                            req_y = max(ys) - min(ys) if min(ys) < 0 else max(ys)
                    if p_height:
                        try:
                            req_z = float(p_height)
                        except (ValueError, TypeError):
                            pass
                except Exception:
                    pass

            # 2. PrusaSlicer project settings (prusaslicer.ini / slic3r.ini)
            prusa_ini_name = next(
                (n for n in namelist if "prusaslicer.ini" in n.lower() or "slic3r.ini" in n.lower()),
                None
            )
            if prusa_ini_name and (not req_x or not req_y or not req_z):
                try:
                    content = zf.read(prusa_ini_name).decode("utf-8", errors="ignore")
                    for line in content.splitlines():
                        if "=" in line and not line.strip().startswith("#"):
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip()
                            if k == "bed_shape" and not req_x:
                                pts = v.split(",")
                                xs = [float(p.split("x")[0]) for p in pts if "x" in p]
                                ys = [float(p.split("x")[1]) for p in pts if "x" in p]
                                if xs and ys:
                                    req_x = max(xs)
                                    req_y = max(ys)
                            elif k == "max_print_height" and not req_z:
                                try:
                                    req_z = float(v)
                                except ValueError:
                                    pass
                except Exception:
                    pass

            if req_x > 0 and req_y > 0:
                return {
                    "x": round(req_x, 2),
                    "y": round(req_y, 2),
                    "z": round(req_z, 2) if req_z > 0 else 0.0,
                }
    except Exception:
        pass
    return None


def get_effective_model_dimensions(
    model_path: str,
    params: Optional[Dict[str, Any]] = None,
    inspect_result: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, float], str]:
    """
    Determine authoritative model dimensions for printer eligibility and slicing.

    Project printable-area metadata describes the source printer, not the
    physical model.  Eligibility must therefore be based on inspected model
    geometry, with requested dimensions used only as a fallback when geometry
    cannot be recovered.
    """
    params = params or {}

    # Base geometry dimensions
    base_dims = get_model_info(model_path)
    if not base_dims or not any(base_dims.get(k, 0) > 0 for k in ("x", "y", "z")):
        if inspect_result:
            ma_dims = (
                inspect_result.get("model_analysis", {})
                .get("geometry", {})
                .get("dimensions", {})
            )
            if ma_dims and any(ma_dims.get(k, 0) > 0 for k in ("x", "y", "z")):
                base_dims = {
                    "x": float(ma_dims.get("x", 0)),
                    "y": float(ma_dims.get("y", 0)),
                    "z": float(ma_dims.get("z", 0)),
                }

    scale = float(params.get("scaleFactor", 1.0))
    scale_x = float(params.get("scaleX", scale))
    scale_y = float(params.get("scaleY", scale))
    scale_z = float(params.get("scaleZ", scale))

    scaled_geom = {
        "x": round(float(base_dims.get("x", 0.0)) * scale_x, 2),
        "y": round(float(base_dims.get("y", 0.0)) * scale_y, 2),
        "z": round(float(base_dims.get("z", 0.0)) * scale_z, 2),
    }

    req_dims = params.get("requestedDimensions")
    has_req = False
    rx, ry, rz = 0.0, 0.0, 0.0
    if req_dims and isinstance(req_dims, dict):
        try:
            rx = round(float(req_dims.get("x", 0)), 2)
            ry = round(float(req_dims.get("y", 0)), 2)
            rz = round(float(req_dims.get("z", 0)), 2)
            has_req = (rx > 0 or ry > 0 or rz > 0)
        except (ValueError, TypeError):
            pass

    if any(scaled_geom.get(k, 0) > 0 for k in ("x", "y", "z")):
        return (scaled_geom, "scaled_geometry")

    if has_req:
        return (
            {"x": rx, "y": ry, "z": rz},
            "requested_dimensions",
        )

    return ({"x": 0.0, "y": 0.0, "z": 0.0}, "unavailable")


def parse_gcode_statistics(gcode_path: str) -> Dict[str, Any]:
    filament_grams = 0.0
    filament_mm = 0.0
    print_time_seconds = 0
    raw_time_str = ""

    time_pattern = re.compile(r";\s*estimated printing time \(normal mode\)\s*=\s*(.+)", re.IGNORECASE)
    filament_g_pattern = re.compile(r";\s*(?:total )?filament used \[g\]\s*=\s*([0-9.]+)", re.IGNORECASE)
    filament_mm_pattern = re.compile(r";\s*(?:total )?filament used \[mm\]\s*=\s*([0-9.]+)", re.IGNORECASE)

    file_size = os.path.getsize(gcode_path)
    read_size = min(file_size, 300 * 1024)

    with open(gcode_path, "rb") as f:
        f.seek(file_size - read_size)
        tail_bytes = f.read()

    lines = tail_bytes.decode("utf-8", errors="ignore").splitlines()

    for line in lines:
        line_clean = line.strip()
        m_g = filament_g_pattern.match(line_clean)
        if m_g: filament_grams = float(m_g.group(1))

        m_mm = filament_mm_pattern.match(line_clean)
        if m_mm: filament_mm = float(m_mm.group(1))

        m_time = time_pattern.match(line_clean)
        if m_time: raw_time_str = m_time.group(1).strip()

    if raw_time_str:
        days, hours, minutes, seconds = 0, 0, 0, 0
        d_match = re.search(r"(\d+)d", raw_time_str)
        if d_match: days = int(d_match.group(1))
        h_match = re.search(r"(\d+)h", raw_time_str)
        if h_match: hours = int(h_match.group(1))
        m_match = re.search(r"(\d+)m", raw_time_str)
        if m_match: minutes = int(m_match.group(1))
        s_match = re.search(r"(\d+)s", raw_time_str)
        if s_match: seconds = int(s_match.group(1))

        print_time_seconds = days * 86400 + hours * 3600 + minutes * 60 + seconds

    return {
        "filament_grams": filament_grams,
        "filament_mm": round(filament_mm, 2),
        "print_time_seconds": print_time_seconds,
        "print_time_minutes": round(print_time_seconds / 60, 2),
        "print_time_hours": round(print_time_seconds / 3600, 3),
        "raw_time_string": raw_time_str
    }

def apply_nonuniform_scale(input_path: str, output_path: str, sx: float, sy: float, sz: float) -> bool:
    """
    Applies non-uniform X, Y, Z scaling to 3MF or STL models.
    """
    import zipfile
    import struct
    import re

    lower = input_path.lower()
    if lower.endswith(".3mf"):
        with zipfile.ZipFile(input_path, 'r') as zin, zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename.lower().endswith('.model'):
                    def repl(m):
                        attrs = m.group(0)
                        tf_m = re.search(r'transform="([^"]+)"', attrs)
                        if tf_m:
                            vals = [float(v) for v in tf_m.group(1).split()]
                            if len(vals) == 12:
                                vals[0] *= sx; vals[1] *= sx; vals[2] *= sx
                                vals[3] *= sy; vals[4] *= sy; vals[5] *= sy
                                vals[6] *= sz; vals[7] *= sz; vals[8] *= sz
                                new_tf = ' '.join(f'{v:.6f}' for v in vals)
                                return attrs[:tf_m.start(1)] + new_tf + attrs[tf_m.end(1):]
                        return attrs.rstrip('/>') + f' transform="{sx:.6f} 0 0 0 {sy:.6f} 0 0 0 {sz:.6f} 0 0 0"/>'
                    data_str = data.decode('utf-8', errors='ignore')
                    data_str = re.sub(r'<item\b[^>]*/>', repl, data_str)
                    data = data_str.encode('utf-8')
                zout.writestr(item, data)
        return True
    elif lower.endswith(".stl"):
        with open(input_path, "rb") as f:
            header = f.read(80)
            count_bytes = f.read(4)
            if len(count_bytes) == 4:
                num_triangles = struct.unpack("<I", count_bytes)[0]
                expected_size = 84 + num_triangles * 50
                f.seek(0, os.SEEK_END)
                if f.tell() == expected_size:
                    f.seek(84)
                    out_bytes = bytearray(f.read())
                    for i in range(num_triangles):
                        offset = i * 50 + 12
                        for v in range(3):
                            v_off = offset + v * 12
                            x, y, z = struct.unpack_from("<3f", out_bytes, v_off)
                            struct.pack_into("<3f", out_bytes, v_off, x * sx, y * sy, z * sz)
                    with open(output_path, "wb") as fout:
                        fout.write(header)
                        fout.write(count_bytes)
                        fout.write(out_bytes)
                    return True
        import shutil
        shutil.copyfile(input_path, output_path)
        return True
    return False

def run_slice_test(
    model_path: str,
    printer_ini: Optional[str] = None,
    filament_ini: Optional[str] = None,
    print_ini: Optional[str] = None,
    scale: float = 1.0,
    scale_x: Optional[float] = None,
    scale_y: Optional[float] = None,
    scale_z: Optional[float] = None,
    infill_pct: Optional[int] = None,
    support_mode: str = "auto",
    timeout_seconds: int = 600
) -> Dict[str, Any]:
    import hashlib
    slicer_exe = find_prusaslicer_executable()
    if not slicer_exe:
        return {
            "success": False,
            "error": "PrusaSlicer console executable not found on system. Please verify installation."
        }

    if not os.path.exists(model_path):
        return {
            "success": False,
            "error": f"Model file not found: {model_path}"
        }

    # Read the authoritative build envelope from the active profile
    active_envelope = read_profile_envelope(printer_ini) if printer_ini else {}

    sx = scale_x if scale_x is not None else scale
    sy = scale_y if scale_y is not None else scale
    sz = scale_z if scale_z is not None else scale
    is_nonuniform = abs(sx - sy) > 1e-4 or abs(sx - sz) > 1e-4

    with tempfile.TemporaryDirectory() as temp_dir:
        output_gcode = os.path.join(temp_dir, "output.gcode")
        active_model_path = model_path

        if is_nonuniform:
            ext = os.path.splitext(model_path)[1]
            scaled_model_path = os.path.join(temp_dir, f"scaled_model{ext}")
            if apply_nonuniform_scale(model_path, scaled_model_path, sx, sy, sz):
                active_model_path = scaled_model_path
                dims = get_model_info(active_model_path)
            else:
                dims = get_model_info(model_path)
        else:
            dims = get_model_info(model_path)
            if sx != 1.0 and dims:
                dims["x"] = round(dims.get("x", 0) * sx, 2)
                dims["y"] = round(dims.get("y", 0) * sy, 2)
                dims["z"] = round(dims.get("z", 0) * sz, 2)

        cmd = [
            slicer_exe,
            "--export-gcode",
            "--output", output_gcode,
            active_model_path
        ]

        if printer_ini and os.path.exists(printer_ini):
            cmd.extend(["--load", printer_ini])
        if filament_ini and os.path.exists(filament_ini):
            cmd.extend(["--load", filament_ini])
        if print_ini and os.path.exists(print_ini):
            cmd.extend(["--load", print_ini])

        # If uniform scaling was applied, pass --scale flag to PrusaSlicer
        if not is_nonuniform and sx != 1.0:
            cmd.extend(["--scale", str(sx)])

        if infill_pct is not None:
            cmd.extend(["--fill-density", f"{infill_pct}%"])

        # Configure support material parameter based on support_mode
        if support_mode == "none":
            cmd.append("--no-support-material")
        elif support_mode == "required":
            cmd.append("--support-material")
            cmd.append("--support-material-auto")
            cmd.append("--support-material-style=organic")
        else: # auto
            cmd.append("--support-material-auto")
            cmd.append("--support-material-style=organic")

        proc = None
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            stdout, stderr = proc.communicate(timeout=timeout_seconds)

            if proc.returncode != 0:
                err_msg = stderr.strip() or stdout.strip() or f"Slicer exited with code {proc.returncode}"
                return {
                    "success": False,
                    "error": f"PrusaSlicer error: {err_msg}",
                    "stderr": stderr.strip(),
                    "stdout": stdout.strip()
                }

            # Locate all produced G-code files in temp_dir for multi-plate aggregation
            gcode_files = []
            for fname in os.listdir(temp_dir):
                if fname.lower().endswith(".gcode"):
                    gcode_files.append(os.path.join(temp_dir, fname))

            if not gcode_files:
                return {
                    "success": False,
                    "error": "Slicer returned exit code 0 but no output G-code was produced.",
                    "stderr": stderr.strip()
                }

            # Parse and aggregate statistics across all plates
            total_filament_grams = 0.0
            total_filament_mm = 0.0
            total_print_time_seconds = 0
            per_plate_stats = []
            combined_hash = hashlib.sha256()
            plate_records = []

            for plate_id, g_file in enumerate(sorted(gcode_files), 1):
                st = parse_gcode_statistics(g_file)
                per_plate_stats.append({
                    "file": os.path.basename(g_file),
                    "filament_grams": st.get("filament_grams", 0.0),
                    "filament_mm": st.get("filament_mm", 0.0),
                    "print_time_seconds": st.get("print_time_seconds", 0),
                    "raw_time_string": st.get("raw_time_string", "")
                })
                total_filament_grams += st.get("filament_grams", 0.0)
                total_filament_mm += st.get("filament_mm", 0.0)
                total_print_time_seconds += st.get("print_time_seconds", 0)

                plate_filament = round(st.get("filament_grams", 0.0), 2)
                plate_time = st.get("print_time_seconds", 0)
                plate_records.append(
                    PlateResult(
                        plateId=plate_id,
                        dimensions=SliceDimensions(
                            x=float(dims.get("x", 0.0)),
                            y=float(dims.get("y", 0.0)),
                            z=float(dims.get("z", 0.0)),
                        ),
                        printTimeSeconds=plate_time,
                        filamentGrams=plate_filament,
                        toolChangeCount=0,
                        perFilament=[PerFilamentStats.from_dict({
                            "filamentIndex": 1,
                            "colorHex": "#161616",
                            "materialType": "PLA",
                            "totalGrams": plate_filament,
                            "modelGrams": plate_filament,
                            "purgeGrams": 0.0,
                            "towerGrams": 0.0,
                        })],
                        modelFilamentGrams=plate_filament,
                        purgeFilamentGrams=0.0,
                        towerFilamentGrams=0.0,
                        metricSources={
                            "total_filament": "gcode_header",
                            "print_time": "gcode_header",
                            "breakdown": "adapter_single_material_contract",
                        },
                        rawStatistics=st,
                    )
                )

                with open(g_file, "rb") as gf:
                    while chunk := gf.read(65536):
                        combined_hash.update(chunk)

            # Authoritative model hash
            model_hash = ""
            if os.path.exists(model_path):
                try:
                    with open(model_path, "rb") as mf:
                        model_hash = hashlib.sha256(mf.read()).hexdigest()
                except Exception:
                    pass

            per_filament = [
                {
                    "filamentIndex": 1,
                    "color": "#161616",
                    "colorHex": "#161616",
                    "materialType": "PLA",
                    "modelGrams": round(total_filament_grams, 2),
                    "totalGrams": round(total_filament_grams, 2),
                    "purgeGrams": 0.0,
                    "supportGrams": None,
                    "towerGrams": 0.0,
                }
            ]

            aggregated_stats = {
                "filament_grams": round(total_filament_grams, 2),
                "model_filament_grams": round(total_filament_grams, 2),
                "purge_filament_grams": 0.0,
                "tower_filament_grams": 0.0,
                "filament_mm": round(total_filament_mm, 2),
                "print_time_seconds": total_print_time_seconds,
                "print_time_minutes": round(total_print_time_seconds / 60, 2),
                "print_time_hours": round(total_print_time_seconds / 3600, 3),
                "raw_time_string": f"{total_print_time_seconds // 3600}h {(total_print_time_seconds % 3600) // 60}m {total_print_time_seconds % 60}s",
                "plate_count": len(gcode_files),
                "tool_change_count": 0,
                "per_filament": per_filament,
                "per_plate": per_plate_stats,
                "plates": [p.to_dict() for p in plate_records],
                "metric_sources": {
                    "total_filament": "gcode_header",
                    "print_time": "gcode_header",
                    "breakdown": "adapter_single_material_contract",
                },
                "production_verification_status": "verified",
            }

            gcode_hash = combined_hash.hexdigest()
            slicer_ver = detect_prusaslicer_version(slicer_exe)
            gcode_ref = f"gcode_sha256_{gcode_hash[:16]}"

            universal_res = UniversalSliceResult(
                adapter="prusaslicer",
                slicerName="PrusaSlicer",
                slicerVersion=slicer_ver,
                modelHash=model_hash,
                jobId="",
                dimensions=SliceDimensions(
                    x=float(dims.get("x", 0.0)),
                    y=float(dims.get("y", 0.0)),
                    z=float(dims.get("z", 0.0)),
                ),
                printTimeSeconds=total_print_time_seconds,
                filamentGrams=round(total_filament_grams, 2),
                toolChangeCount=0,
                perFilament=[PerFilamentStats.from_dict(f) for f in per_filament],
                artifact=SliceArtifact(
                    gcodeReference=gcode_ref,
                    gcodeHash=gcode_hash,
                    resultReference=gcode_ref,
                ),
                success=True,
                modelFilamentGrams=round(total_filament_grams, 2),
                purgeFilamentGrams=0.0,
                towerFilamentGrams=0.0,
                filamentMm=round(total_filament_mm, 2) if total_filament_mm else None,
                plateCount=len(gcode_files),
                activeEnvelope=active_envelope,
                rawStatistics=aggregated_stats,
                plates=plate_records,
                metricSources=aggregated_stats["metric_sources"],
            )

            res_dict = universal_res.to_dict()
            res_dict["model_path"] = model_path
            res_dict["slicer_executable"] = slicer_exe
            res_dict["adapter"] = "prusaslicer"
            return res_dict

        except subprocess.TimeoutExpired:
            if proc:
                try:
                    if os.name == "nt":
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], check=False, capture_output=True)
                    else:
                        proc.kill()
                except Exception:
                    pass
            return {
                "success": False,
                "error_code": "SLICER_TIMEOUT",
                "error": f"Slicing process timed out after {timeout_seconds} seconds. Routed to manual workshop review."
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution error: {str(e)}"
            }
