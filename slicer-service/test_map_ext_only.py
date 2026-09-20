import os
import sys
import shutil
import zipfile
import tempfile
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_map_extruder_only():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        mapped_3mf = os.path.join(temp_dir, "mapped.3mf")
        
        with zipfile.ZipFile(target_3mf, "r") as zin:
            with zipfile.ZipFile(mapped_3mf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename == "Metadata/model_settings.config":
                        content_str = content.decode("utf-8")
                        content_str = content_str.replace('key="extruder" value="2"', 'key="extruder" value="1"')
                        content = content_str.encode("utf-8")
                    
                    zout.writestr(item.filename, content)
        
        machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        filament_profile = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")
        
        settings = f"{machine_profile};{process_profile}"
        # Let's provide 3 filaments just in case to satisfy the array lengths in project_settings
        filaments = f"{filament_profile};{filament_profile};{filament_profile}"
        
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
            mapped_3mf
        ]
        
        print(f"Command: {' '.join(cmd)}")
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            print(f"Return Code: {proc.returncode}")
            if proc.returncode != 0:
                print(f"STDERR: {proc.stderr[-500:]}")
            else:
                print(f"STDOUT: {proc.stdout[-500:]}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == '__main__':
    test_map_extruder_only()

