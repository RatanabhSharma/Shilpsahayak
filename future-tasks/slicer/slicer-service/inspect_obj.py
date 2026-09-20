import os
import tempfile
import sys
import subprocess

# Insert app path to import from it
sys.path.insert(0, r'D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service')

from app.slicer_adapters.convert_3mf import extract_3mf_plates
from app.slicer_adapters.bambu_adapter import find_bambu_resource_file

temp_dir = tempfile.mkdtemp(prefix="dragon_inspect_")
mf_path = r"D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service\app\storage\feab0661-dfd4-4e79-8e2c-1f85943dd198_Dragon_Lamp_Update_03-29-2026.3mf"

print(f"Extracting to {temp_dir}...")
plates = extract_3mf_plates(mf_path, temp_dir)

slicer_exe = r"C:\Program Files\Bambu Studio\bambu-studio.exe"
machine_path = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
process_path = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
filament_path = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")

for p in plates:
    plate_id = p['plate_id']
    obj_path = p['extracted_obj_path']
    print(f"\n--- Plate {plate_id} ---")
    print(f"Dimensions: {p['dimensions']}")
    print(f"Path: {obj_path}")
    
    with open(obj_path, 'r') as f:
        lines = f.readlines()
        v = [l for l in lines if l.startswith('v ')]
        faces = [l for l in lines if l.startswith('f ')]
        print(f"Vertices: {len(v)}")
        print(f"Faces: {len(faces)}")
        if len(v) < 10 or len(faces) < 10:
            print("Content:")
            print("".join(lines[:20]))
            
    # Try slicing it!
    out_dir = os.path.join(temp_dir, f"out_{plate_id}")
    os.makedirs(out_dir, exist_ok=True)
    cmd = [
        slicer_exe,
        "--slice", "0",
        "--arrange", "1",
        "--ensure-on-bed",
        "--outputdir", out_dir,
        "--export-slicedata", out_dir,
    ]
    if machine_path: cmd.extend(["--load-settings", machine_path])
    if process_path: cmd.extend(["--load-settings", process_path])
    if filament_path: cmd.extend(["--load-filaments", filament_path])
    cmd.append(obj_path)
    
    print(f"Executing: {' '.join(cmd)}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print(f"Exit code: {res.returncode}")
    if res.returncode != 0:
        print(f"Stderr:\n{res.stderr}")
        print(f"Stdout:\n{res.stdout}")
