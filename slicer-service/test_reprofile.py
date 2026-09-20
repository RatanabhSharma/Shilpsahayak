import os
import sys
import shutil
import zipfile
import tempfile
import json
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_full_reprofile():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        reprofiled_3mf = os.path.join(temp_dir, "reprofiled.3mf")
        
        machine_profile_path = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile_path = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        
        with open(machine_profile_path, "r", encoding="utf-8") as f:
            machine_cfg = json.load(f)
        with open(process_profile_path, "r", encoding="utf-8") as f:
            process_cfg = json.load(f)
            
        # Combine settings
        new_settings = {}
        new_settings.update(machine_cfg)
        new_settings.update(process_cfg)
        
        with zipfile.ZipFile(target_3mf, "r") as zin:
            with zipfile.ZipFile(reprofiled_3mf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                for item in zin.infolist():
                    content = zin.read(item.filename)
                    if item.filename == "Metadata/project_settings.config":
                        cfg = json.loads(content.decode("utf-8"))
                        # Overwrite all keys that exist in our production profiles
                        for k, v in new_settings.items():
                            # Bambu studio JSON profiles sometimes have complex inheritance.
                            # But we'll just inject them directly.
                            if k not in ["type", "name", "from", "inherits", "version", "setting_id"]:
                                cfg[k] = v
                                
                        # Fix up filament array to match length of existing
                        if "filament_settings_id" in cfg:
                            n = len(cfg["filament_settings_id"])
                            cfg["filament_settings_id"] = ["Generic PLA @BBL A1M"] * n
                            
                        cfg["printer_model"] = "Bambu Lab A1 mini"
                        cfg["printer_settings_id"] = "Bambu Lab A1 mini 0.4 nozzle"
                        cfg["nozzle_diameter"] = ["0.4"]
                        
                        content = json.dumps(cfg, indent=2).encode("utf-8")
                    zout.writestr(item.filename, content)
        
        temp_output = os.path.join(temp_dir, "output")
        cmd = [
            slicer_exe,
            "--slice", "1",
            "--arrange", "1",
            "--ensure-on-bed",
            "--outputdir", temp_output,
            "--export-slicedata", temp_output,
            reprofiled_3mf
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
    test_full_reprofile()

