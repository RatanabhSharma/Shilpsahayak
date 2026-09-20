import os
import sys
import shutil
import zipfile
import tempfile
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_strip_metadata():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        stripped_3mf = os.path.join(temp_dir, "stripped.3mf")
        
        # Strip metadata
        with zipfile.ZipFile(target_3mf, "r") as zin:
            with zipfile.ZipFile(stripped_3mf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    if not item.filename.startswith("Metadata/"):
                        zout.writestr(item.filename, zin.read(item.filename))
        
        print("Created stripped 3MF.")
        
        # Get A1 Mini Profiles
        machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        filament_profile = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")
        
        settings = f"{machine_profile};{process_profile}"
        filaments = f"{filament_profile}"
        
        temp_output = os.path.join(temp_dir, "output")
        cmd = [
            slicer_exe,
            "--slice", "1",
            "--arrange", "1",
            "--ensure-on-bed",
            "--load-settings", settings,
            "--load-filaments", filaments,
            "--outputdir", temp_output,
            "--export-slicedata", temp_output,
            stripped_3mf
        ]
        
        print(f"Command: {' '.join(cmd)}")
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            print(f"Return Code: {proc.returncode}")
            if proc.returncode != 0:
                print(f"STDERR: {proc.stderr[-500:]}")
            else:
                print(f"STDOUT: {proc.stdout[-500:]}")
                print(f"Output files: {os.listdir(temp_output)}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == '__main__':
    test_strip_metadata()

