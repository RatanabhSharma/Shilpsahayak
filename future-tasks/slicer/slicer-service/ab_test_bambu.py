import os
import sys
import shutil
import tempfile
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_bambu_combinations():
    slicer_exe = find_bambustudio_executable()
    if not slicer_exe:
        print("Bambu Studio not found.")
        return
        
    # Find the Spiderman 3MF somewhere in the project or temp dirs
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
            
    if not target_3mf:
        print("Spiderman_urban.3mf not found.")
        return
        
    print(f"Testing with 3MF: {target_3mf}")
    
    # Get A1 Mini Profiles
    machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
    process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
    filament_profile = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")
    
    settings = f"{machine_profile};{process_profile}"
    filaments = f"{filament_profile}"
    
    tests = [
        ("B. Untouched + --load-settings", ["--load-settings", settings]),
        ("C. Untouched + --load-filaments", ["--load-filaments", filaments]),
        ("D. Untouched + --arrange 1", ["--arrange", "1"]),
        ("E. Untouched + --ensure-on-bed", ["--ensure-on-bed"]),
        ("F. Untouched + --load-settings + --arrange + --ensure-on-bed", ["--load-settings", settings, "--arrange", "1", "--ensure-on-bed"]),
        ("A. Untouched direct slice", []),
    ]
    
    for name, args in tests:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_output = os.path.join(temp_dir, "output")
            
            cmd = [
                slicer_exe,
                "--slice", "1",
                "--outputdir", temp_output,
                "--export-slicedata", temp_output
            ] + args + [target_3mf]
            
            print(f"\n--- {name} ---")
            print(f"Command: {' '.join(cmd)}")
            
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                print(f"Return Code: {proc.returncode}")
                if proc.returncode != 0:
                    print(f"STDERR: {proc.stderr[-500:]}")
            except Exception as e:
                print(f"Exception: {e}")

if __name__ == '__main__':
    test_bambu_combinations()
