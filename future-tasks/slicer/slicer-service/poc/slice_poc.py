"""
PrusaSlicer CLI Standalone Proof of Concept Runner & Parser (Phase 2A)
Runs headless slicing, parses filament & time metadata, and asserts exit criteria.
"""

import os
import re
import sys
import subprocess
import tempfile
import json
from typing import Dict, Any, Optional

def find_prusaslicer_executable() -> Optional[str]:
    # 1. Environment variable override
    env_path = os.environ.get("PRUSASLICER_PATH")
    if env_path and os.path.exists(env_path):
        return env_path

    # 2. Standard Windows installation paths
    candidate_paths = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), 'bin', 'PrusaSlicer-2.9.0', 'prusa-slicer-console.exe')),
        r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer.exe",
        r"C:\Program Files (x86)\Prusa3D\PrusaSlicer\prusa-slicer-console.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Prusa3D\PrusaSlicer\prusa-slicer-console.exe"),
    ]

    for p in candidate_paths:
        if os.path.exists(p):
            return p

    # 3. Check PATH
    import shutil
    for name in ["prusa-slicer-console.exe", "prusa-slicer.exe", "prusa-slicer"]:
        found = shutil.which(name)
        if found:
            return found

    return None

def parse_gcode_statistics(gcode_path: str) -> Dict[str, Any]:
    """
    Parses PrusaSlicer trailing metadata comments from generated G-code.
    Example markers:
    ; filament used [mm] = 4123.50
    ; filament used [cm3] = 9.91
    ; filament used [g] = 12.39
    ; filament cost = 0.00
    ; total filament used [g] = 12.39
    ; estimated printing time (normal mode) = 1h 34m 12s
    """
    filament_grams = 0.0
    filament_mm = 0.0
    print_time_seconds = 0
    raw_time_str = ""

    time_pattern = re.compile(r";\s*estimated printing time \(normal mode\)\s*=\s*(.+)", re.IGNORECASE)
    filament_g_pattern = re.compile(r";\s*(?:total )?filament used \[g\]\s*=\s*([0-9.]+)", re.IGNORECASE)
    filament_mm_pattern = re.compile(r";\s*(?:total )?filament used \[mm\]\s*=\s*([0-9.]+)", re.IGNORECASE)

    # G-code comments are usually written at the end of the file by PrusaSlicer
    # Read the last 200KB of the file
    file_size = os.path.getsize(gcode_path)
    read_size = min(file_size, 200 * 1024)

    with open(gcode_path, "rb") as f:
        f.seek(file_size - read_size)
        tail_bytes = f.read()

    lines = tail_bytes.decode("utf-8", errors="ignore").splitlines()

    for line in lines:
        line_clean = line.strip()
        
        # Filament grams
        m_g = filament_g_pattern.match(line_clean)
        if m_g:
            filament_grams = float(m_g.group(1))

        # Filament mm
        m_mm = filament_mm_pattern.match(line_clean)
        if m_mm:
            filament_mm = float(m_mm.group(1))

        # Print time
        m_time = time_pattern.match(line_clean)
        if m_time:
            raw_time_str = m_time.group(1).strip()

    # Convert raw_time_str e.g. "1h 34m 12s", "45m 10s", "30s", "1d 2h 5m"
    if raw_time_str:
        days = 0
        hours = 0
        minutes = 0
        seconds = 0

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
        "filament_mm": filament_mm,
        "print_time_seconds": print_time_seconds,
        "print_time_minutes": round(print_time_seconds / 60, 2),
        "print_time_hours": round(print_time_seconds / 3600, 3),
        "raw_time_string": raw_time_str
    }

def run_slice_test(
    model_path: str,
    printer_ini: Optional[str] = None,
    filament_ini: Optional[str] = None,
    print_ini: Optional[str] = None,
    scale: float = 1.0,
    infill_pct: Optional[int] = None
) -> Dict[str, Any]:
    slicer_exe = find_prusaslicer_executable()
    if not slicer_exe:
        return {
            "success": False,
            "error": "PrusaSlicer console executable not found on system. Please set PRUSASLICER_PATH or install PrusaSlicer."
        }

    if not os.path.exists(model_path):
        return {
            "success": False,
            "error": f"Model file not found: {model_path}"
        }

    with tempfile.TemporaryDirectory() as temp_dir:
        output_gcode = os.path.join(temp_dir, "output.gcode")

        cmd = [
            slicer_exe,
            "--export-gcode",
            "--output", output_gcode,
            model_path
        ]

        if printer_ini and os.path.exists(printer_ini):
            cmd.extend(["--load", printer_ini])
        if filament_ini and os.path.exists(filament_ini):
            cmd.extend(["--load", filament_ini])
        if print_ini and os.path.exists(print_ini):
            cmd.extend(["--load", print_ini])

        if scale != 1.0:
            cmd.extend(["--scale", str(scale)])

        if infill_pct is not None:
            cmd.extend(["--fill-density", f"{infill_pct}%"])

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300,
                check=False
            )

            if res.returncode != 0:
                return {
                    "success": False,
                    "error": f"Slicing failed with exit code {res.returncode}",
                    "stderr": res.stderr.strip(),
                    "stdout": res.stdout.strip()
                }

            if not os.path.exists(output_gcode):
                return {
                    "success": False,
                    "error": "Slicer returned exit code 0 but no output.gcode was produced.",
                    "stderr": res.stderr.strip()
                }

            stats = parse_gcode_statistics(output_gcode)

            return {
                "success": True,
                "slicer_executable": slicer_exe,
                "model_path": model_path,
                "statistics": stats,
                "stdout_summary": res.stdout.strip()[-500:] if res.stdout else ""
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Slicing timed out after 300 seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution error: {str(e)}"
            }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        model = sys.argv[1]
        print(f"Running slicing test for: {model}")
        res = run_slice_test(model)
        print(json.dumps(res, indent=2))
    else:
        print("Usage: python slice_poc.py <path_to_model>")
