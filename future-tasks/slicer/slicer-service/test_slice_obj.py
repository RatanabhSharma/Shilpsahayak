import os
import sys
import subprocess
import tempfile
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_slice_obj():
    slicer_exe = find_bambustudio_executable()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        dummy_obj = os.path.join(temp_dir, "dummy.obj")
        with open(dummy_obj, "w") as f:
            f.write("v 0 0 0\nv 10 0 0\nv 0 10 0\nv 0 0 10\nf 1 2 3\nf 1 3 4\nf 1 4 2\nf 2 4 3\n")
            
        machine_profile = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
        process_profile = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
        filament_profile = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")
        
        settings = f"{machine_profile};{process_profile}"
        filaments = f"{filament_profile}"
        
        out_dir = os.path.join(temp_dir, "out")
        cmd_slice = [
            slicer_exe,
            "--slice", "1",
            "--arrange", "1",
            "--ensure-on-bed",
            "--load-settings", settings,
            "--load-filaments", filaments,
            "--outputdir", out_dir,
            "--export-slicedata", out_dir,
            dummy_obj
        ]
        
        print("Slicing OBJ...")
        proc = subprocess.run(cmd_slice, capture_output=True, text=True, timeout=120)
        
        print(f"Return code: {proc.returncode}")
        print(f"STDOUT: {proc.stdout}")
        print(f"STDERR: {proc.stderr}")

if __name__ == '__main__':
    test_slice_obj()

