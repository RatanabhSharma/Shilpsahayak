import os
import sys
import tempfile
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_export_then_slice():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        
        # Get A1 Mini Profiles
        machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        filament_profile = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")
        
        settings = f"{machine_profile};{process_profile}"
        filaments = f"{filament_profile}"
        
        temp_output = os.path.join(temp_dir, "exported.3mf")
        cmd_export = [
            slicer_exe,
            "--export-3mf", temp_output,
            "--load-settings", settings,
            "--load-filaments", filaments,
            target_3mf
        ]
        
        print("Exporting...")
        subprocess.run(cmd_export, capture_output=True, text=True, timeout=120)
        
        print(f"Exported file exists: {os.path.exists(temp_output)}")
        
        temp_slice = os.path.join(temp_dir, "slice_out")
        cmd_slice = [
            slicer_exe,
            "--slice", "1",
            "--arrange", "1",
            "--ensure-on-bed",
            "--outputdir", temp_slice,
            "--export-slicedata", temp_slice,
            temp_output
        ]
        
        print(f"Command: {' '.join(cmd_slice)}")
        try:
            proc = subprocess.run(cmd_slice, capture_output=True, text=True, timeout=120)
            print(f"Return Code: {proc.returncode}")
            if proc.returncode != 0:
                print(f"STDERR: {proc.stderr[-500:]}")
            else:
                print(f"STDOUT: {proc.stdout[-500:]}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == '__main__':
    test_export_then_slice()

