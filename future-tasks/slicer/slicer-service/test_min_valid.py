import os
import sys
import shutil
import zipfile
import tempfile
import json
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_minimal_valid():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        minimal_3mf = os.path.join(temp_dir, "minimal.3mf")
        
        machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        
        with open(machine_profile, "r", encoding="utf-8") as f:
            machine_cfg = json.load(f)
            
        with open(process_profile, "r", encoding="utf-8") as f:
            process_cfg = json.load(f)
            
        cfg = {}
        cfg.update(machine_cfg)
        cfg.update(process_cfg)
        cfg["printer_model"] = "Bambu Lab A1 mini"
        cfg["printer_settings_id"] = "Bambu Lab A1 mini 0.4 nozzle"
        
        with zipfile.ZipFile(target_3mf, "r") as zin:
            with zipfile.ZipFile(minimal_3mf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    if not item.filename.startswith("Metadata/"):
                        zout.writestr(item.filename, zin.read(item.filename))
                        
                zout.writestr("Metadata/project_settings.config", json.dumps(cfg).encode("utf-8"))
                
                # Bambu Studio needs plate_1.json?
                # A minimal plate_1.json
                plate = {
                    "bed_type": "supertack_plate",
                    "version": 2
                }
                zout.writestr("Metadata/plate_1.json", json.dumps(plate).encode("utf-8"))
                
                # slice_info.config
                zout.writestr("Metadata/slice_info.config", json.dumps({"plate_info": [{"index": 1}]}).encode("utf-8"))
        
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
            minimal_3mf
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
    test_minimal_valid()

