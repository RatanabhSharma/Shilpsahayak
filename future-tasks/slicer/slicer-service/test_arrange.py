import os
import tempfile
import sys
import subprocess
import json

sys.path.insert(0, r'D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service')

from app.slicer_adapters.convert_3mf import extract_3mf_plates
from app.slicer_adapters.bambu_adapter import find_bambu_resource_file

temp_dir = tempfile.mkdtemp(prefix="dragon_inspect_")
mf_path = r"D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service\app\storage\feab0661-dfd4-4e79-8e2c-1f85943dd198_Dragon_Lamp_Update_03-29-2026.3mf"

plates = extract_3mf_plates(mf_path, temp_dir)

slicer_exe = r"C:\Program Files\Bambu Studio\bambu-studio.exe"
machine_path = find_bambu_resource_file("machine", "Bambu Lab A1 mini 0.4 nozzle.json")
process_path = find_bambu_resource_file("process", "0.20mm Standard @BBL A1M.json")
filament_path = find_bambu_resource_file("filament", "Generic PLA @BBL A1M.json")

plate2 = next(p for p in plates if p['plate_id'] == 2)
obj_path = plate2['extracted_obj_path']

out_dir = os.path.join(temp_dir, "out_2_no_arrange")
os.makedirs(out_dir, exist_ok=True)
cmd = [
    slicer_exe,
    "--slice", "0",
    "--ensure-on-bed",
    "--outputdir", out_dir,
    "--export-slicedata", out_dir,
    "--load-settings", machine_path,
    "--load-settings", process_path,
    "--load-filaments", filament_path,
    obj_path
]

print("Executing WITHOUT --arrange 1")
res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print(f"Exit code: {res.returncode}")

out_dir2 = os.path.join(temp_dir, "out_2_arrange")
os.makedirs(out_dir2, exist_ok=True)
cmd_arrange = cmd.copy()
cmd_arrange.insert(3, "--arrange")
cmd_arrange.insert(4, "1")
cmd_arrange[7] = out_dir2
cmd_arrange[9] = out_dir2

print("Executing WITH --arrange 1")
res_arrange = subprocess.run(cmd_arrange, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print(f"Exit code: {res_arrange.returncode}")

