import os
import subprocess
import shlex

stl_path = r"D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service\app\storage\73477af9-bfeb-4d82-890f-04aa04431a73_3dbenchy.stl"
bambu_exe = r"C:\Program Files\Bambu Studio\bambu-studio.exe"
resource_dir = r"C:\Program Files\Bambu Studio\resources\profiles\BBL"

machine_json = os.path.join(resource_dir, "machine", "Bambu Lab A1 0.4 nozzle.json")
process_json = os.path.join(resource_dir, "process", "0.20mm Standard @BBL A1.json")
filament_json = os.path.join(resource_dir, "filament", "Generic PLA @BBL A1.json")

print("1. Bambu Studio CLI on Benchy STL (export-gcode)")
temp_dir = "out_slicedata"
cmd_stl = [
    bambu_exe, 
    "--export-gcode", "benchy_bambu.gcode",
    "--load-settings", f"{machine_json};{process_json}",
    "--load-filaments", filament_json,
    stl_path
]
print("CMD:", shlex.join(cmd_stl))
proc = subprocess.run(cmd_stl, capture_output=True, text=True)
print("Return Code:", proc.returncode)
print("STDOUT:", proc.stdout)
print("STDERR:", proc.stderr)

