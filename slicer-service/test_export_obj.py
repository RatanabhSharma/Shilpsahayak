import os
import sys
import subprocess
import tempfile
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_export_from_obj():
    slicer_exe = find_bambustudio_executable()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        dummy_obj = os.path.join(temp_dir, "dummy.obj")
        with open(dummy_obj, "w") as f:
            f.write("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n")
            
        machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        filament_profile = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")
        
        settings = f"{machine_profile};{process_profile}"
        filaments = f"{filament_profile}"
        
        template_3mf = os.path.join(temp_dir, "template.3mf")
        cmd_export = [
            slicer_exe,
            "--export-3mf", template_3mf,
            "--load-settings", settings,
            "--load-filaments", filaments,
            dummy_obj
        ]
        
        print("Exporting template 3MF from OBJ...")
        proc = subprocess.run(cmd_export, capture_output=True, text=True, timeout=120)
        
        print(f"Return code: {proc.returncode}")
        print(f"Template 3MF created: {os.path.exists(template_3mf)}")

if __name__ == '__main__':
    test_export_from_obj()

