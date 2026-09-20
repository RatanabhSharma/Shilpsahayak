import os
import sys
import zipfile
import tempfile
import subprocess
from app.slicer_adapters.bambu_adapter import find_bambustudio_executable, find_bambu_resource_file

def build_valid_generic_3mf():
    slicer_exe = find_bambustudio_executable()
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    with tempfile.TemporaryDirectory() as temp_dir:
        generic_3mf = os.path.join(temp_dir, "generic.3mf")
        
        with zipfile.ZipFile(target_3mf, "r") as zin:
            with zipfile.ZipFile(generic_3mf, "w", compression=zipfile.ZIP_DEFLATED) as zout:
                # 1. 3D/3dmodel.model
                zout.writestr("3D/3dmodel.model", zin.read("3D/3dmodel.model"))
                
                # Copy other 3D items if any (e.g. 3D/Objects/object_1.model)
                for item in zin.infolist():
                    if item.filename.startswith("3D/") and item.filename != "3D/3dmodel.model":
                        zout.writestr(item.filename, zin.read(item.filename))
                
                # 2. _rels/.rels
                rels_content = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>"""
                zout.writestr("_rels/.rels", rels_content)
                
                # 3. [Content_Types].xml
                types_content = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>"""
                zout.writestr("[Content_Types].xml", types_content)
        
        print("Created strictly valid generic 3MF.")
        
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
            generic_3mf
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
    build_valid_generic_3mf()

