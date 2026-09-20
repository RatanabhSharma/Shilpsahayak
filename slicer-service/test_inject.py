import os
import sys
import zipfile
import tempfile
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def test_inject_model():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a dummy STL
        dummy_stl = os.path.join(temp_dir, "dummy.stl")
        with open(dummy_stl, "w") as f:
            f.write("solid dummy\n  facet normal 0 0 0\n    outer loop\n      vertex 0 0 0\n      vertex 1 0 0\n      vertex 0 1 0\n    endloop\n  endfacet\nendsolid dummy\n")
            
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
            dummy_stl
        ]
        
        print("Exporting template 3MF...")
        subprocess.run(cmd_export, capture_output=True, text=True, timeout=120)
        
        print(f"Template 3MF created: {os.path.exists(template_3mf)}")
        
        injected_3mf = os.path.join(temp_dir, "injected.3mf")
        
        # Inject Spiderman 3D/3dmodel.model into template_3mf
        with zipfile.ZipFile(template_3mf, "r") as zin:
            with zipfile.ZipFile(target_3mf, "r") as zsrc:
                with zipfile.ZipFile(injected_3mf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                    for item in zin.infolist():
                        if not item.filename.startswith("3D/"):
                            zout.writestr(item.filename, zin.read(item.filename))
                    
                    for item in zsrc.infolist():
                        if item.filename.startswith("3D/"):
                            zout.writestr(item.filename, zsrc.read(item.filename))
                            
        print("Injected 3MF created. Now slicing WITHOUT load-settings...")
        
        temp_output = os.path.join(temp_dir, "output")
        cmd_slice = [
            slicer_exe,
            "--slice", "1",
            "--arrange", "1",
            "--ensure-on-bed",
            "--outputdir", temp_output,
            "--export-slicedata", temp_output,
            injected_3mf
        ]
        
        print(f"Command: {' '.join(cmd_slice)}")
        try:
            proc = subprocess.run(cmd_slice, capture_output=True, text=True, timeout=120)
            print(f"Return Code: {proc.returncode}")
            if proc.returncode != 0:
                print(f"STDERR: {proc.stderr[-500:]}")
            else:
                print(f"STDOUT: {proc.stdout[-500:]}")
                print(f"Output files: {os.listdir(temp_output)}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == '__main__':
    test_inject_model()

