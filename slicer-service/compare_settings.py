import os, sys, json, subprocess, zipfile
from app.slicer_adapters.bambu_adapter import (
    find_bambustudio_executable,
    find_bambu_resource_file,
    parse_bambu_gcode_details,
    parse_bambu_result_json,
    execute_bambu_slice,
)
from app.file_inspector import inspect_file

model_path = os.path.abspath(r'app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf')

# 1. Read 3MF Embedded Project Settings
with zipfile.ZipFile(model_path, 'r') as z:
    pcfg = json.loads(z.read('Metadata/project_settings.config').decode('utf-8', errors='ignore'))

# 2. Inspect Shilp A1 Machine Profile & Process Profile
a1_machine_path = find_bambu_resource_file('machine', 'Bambu Lab A1 0.4 nozzle.json')
a1_process_path = find_bambu_resource_file('process', '0.20mm Standard @BBL A1.json')

with open(a1_machine_path, 'r') as f:
    a1_mach = json.load(f)

with open(a1_process_path, 'r') as f:
    a1_proc = json.load(f)

# 3. Read compiled A1 machine profile (with includes)
bbl_dir = os.path.dirname(a1_machine_path)
a1_mach_compiled = dict(a1_mach)
for inc in a1_mach.get('include', []):
    inc_file = os.path.join(bbl_dir, inc + '.json')
    if os.path.exists(inc_file):
        with open(inc_file, 'r') as inf:
            inc_d = json.load(inf)
            for k, v in inc_d.items():
                if k not in ('name', 'instantiation'):
                    a1_mach_compiled[k] = v

settings_to_compare = [
    'printer_model', 'printer_settings_id', 'nozzle_diameter', 'layer_height',
    'initial_layer_print_height', 'sparse_infill_density', 'sparse_infill_pattern',
    'wall_loops', 'enable_support', 'support_type', 'prime_tower', 'prime_tower_width',
    'prime_tower_brim_width', 'wipe_tower', 'flush_multiplier', 'flushing_multiplier',
    'filament_type', 'filament_density', 'filament_cost', 'change_filament_gcode',
    'machine_start_gcode', 'machine_end_gcode', 'default_acceleration', 'travel_speed'
]

print('=== SETTINGS COMPARISON ===')
comparison = {}
for s in settings_to_compare:
    val_3mf = pcfg.get(s)
    if s == 'change_filament_gcode':
        val_3mf = f'Present (len={len(val_3mf)})' if val_3mf else 'None'
    elif s in ('machine_start_gcode', 'machine_end_gcode'):
        val_3mf = f'Present (len={len(val_3mf)})' if val_3mf else 'None'
    
    val_proc = a1_proc.get(s)
    val_mach_raw = a1_mach.get(s)
    if s == 'change_filament_gcode':
        val_mach_raw = f'Present (len={len(val_mach_raw)})' if val_mach_raw else 'Missing (in include template)'
        val_mach_comp = f'Present (len={len(a1_mach_compiled.get(s, ""))})' if a1_mach_compiled.get(s) else 'None'
    else:
        val_mach_comp = a1_mach_compiled.get(s)

    comparison[s] = {
        '3MF_Embedded': val_3mf,
        'A1_Process_JSON': val_proc,
        'A1_Machine_Raw_JSON': val_mach_raw,
        'A1_Machine_Compiled': val_mach_comp
    }

print(json.dumps(comparison, indent=2))

# Save comparison report
with open(r'../scratch/settings_comparison.json', 'w') as outf:
    json.dump(comparison, outf, indent=2)

