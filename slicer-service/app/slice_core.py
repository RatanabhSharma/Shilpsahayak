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
from typing import Dict, Any, Optional

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
    support_mode: str = "auto"
) -> Dict[str, Any]:
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

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=180,
                check=False
            )

            if res.returncode != 0:
                err_msg = res.stderr.strip() or res.stdout.strip() or f"Slicer exited with code {res.returncode}"
                return {
                    "success": False,
                    "error": f"PrusaSlicer error: {err_msg}",
                    "stderr": res.stderr.strip(),
                    "stdout": res.stdout.strip()
                }

            if not os.path.exists(output_gcode):
                return {
                    "success": False,
                    "error": "Slicer returned exit code 0 but no output G-code was produced.",
                    "stderr": res.stderr.strip()
                }

            stats = parse_gcode_statistics(output_gcode)

            return {
                "success": True,
                "slicer_executable": slicer_exe,
                "model_path": model_path,
                "dimensions": dims,
                "statistics": stats,
                "active_envelope": active_envelope,
                "gcode_reference": f"gcode_sha_{abs(hash(output_gcode)) % 1000000}"
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Slicing process timed out after 180 seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution error: {str(e)}"
            }
