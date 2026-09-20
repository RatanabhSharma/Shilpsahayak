import os, json, subprocess
from app.slicer_adapters.bambu_adapter import (
    find_bambustudio_executable,
    find_bambu_resource_file,
    parse_bambu_gcode_details,
    parse_bambu_result_json,
    execute_bambu_slice,
)
from app.file_inspector import inspect_file

slicer_exe = find_bambustudio_executable()
model_path = os.path.abspath(r'app/storage/db431ce4-a949-46aa-a4e6-f21461f7c124_Stitchxpikachu.3mf')

# -------------------------------------------------------------
# RUN A: Reference-Equivalent Configuration
# Full compiled Bambu Lab A1 0.4 nozzle machine profile (with all template includes: change_filament_gcode, start/end gcode)
# Preserves the 3MF's embedded multicolor project process settings (flushing matrix, prime tower, supports)
# -------------------------------------------------------------
bbl_dir = r'C:\Program Files\Bambu Studio\resources\profiles\BBL\machine'
with open(os.path.join(bbl_dir, 'Bambu Lab A1 0.4 nozzle.json'), 'r') as f:
    merged_a1 = json.load(f)

for inc in merged_a1.get('include', []):
    inc_file = os.path.join(bbl_dir, inc + '.json')
    if os.path.exists(inc_file):
        with open(inc_file, 'r') as inf:
            inc_d = json.load(inf)
            for k, v in inc_d.items():
                if k not in ('name', 'instantiation'):
                    merged_a1[k] = v

ref_compiled_machine_json = os.path.abspath(r'../scratch/a1_compiled_reference.json')
with open(ref_compiled_machine_json, 'w') as outf:
    json.dump(merged_a1, outf, indent=2)

out_a = os.path.abspath(r'../scratch/run_a_reference')
os.makedirs(out_a, exist_ok=True)
cmd_a = [slicer_exe, '--load-settings', ref_compiled_machine_json, '--slice', '1', '--outputdir', out_a, model_path]

print('Executing RUN A (Reference-equivalent with compiled A1 profile)...')
subprocess.run(cmd_a, capture_output=True, text=True, timeout=600)

res_a_json = parse_bambu_result_json(os.path.join(out_a, 'result.json'))
gcode_a_details = parse_bambu_gcode_details(os.path.join(out_a, 'plate_1.gcode'))

# -------------------------------------------------------------
# RUN B: Current Shilp Production Configuration
# As currently executed by execute_bambu_slice in bambu_adapter.py
# -------------------------------------------------------------
out_b = os.path.abspath(r'../scratch/run_b_current_shilp')
os.makedirs(out_b, exist_ok=True)

insp = inspect_file(model_path, check_mesh=False)
ca = insp.get('color_analysis')

production_profile = {
    'id': 'BAMBU-A1-01',
    'displayName': 'Bambu Lab A1',
    'model': 'A1',
    'printerProfileFile': 'bambu_a1_0.4.ini',
    'machineProfileFile': 'Bambu Lab A1 0.4 nozzle.json',
    'processProfileFile': '0.20mm Standard @BBL A1.json',
    'printerSettingsId': 'Bambu Lab A1 0.4 nozzle',
    'processSettingsId': '0.20mm Standard @BBL A1',
    'slicerSettingsId': 'GM020',
    'buildVolumeX': 256,
    'buildVolumeY': 256,
    'buildVolumeZ': 256,
    'slicerAdapter': 'bambu_studio_cli',
    'profilePath': os.path.abspath('app/profiles/printer/bambu_a1_0.4.ini'),
}

params = {
    'productionPrinterProfile': production_profile,
    'profile_path': os.path.abspath('app/profiles/bambu_production_standard.ini'),
    'printer_profile_path': os.path.abspath('app/profiles/printer/bambu_a1_0.4.ini'),
    'active_envelope': {'x': 256.0, 'y': 256.0, 'z': 256.0},
    'qualityProfile': 'standard',
    'infillPercent': 20,
    'supportMode': 'auto',
    'material': 'pla',
}

print('Executing RUN B (Current Shilp Production Configuration)...')
slice_res_b = execute_bambu_slice(model_path, timeout_seconds=600, production_params=params, color_analysis=ca)

stats_b = slice_res_b.get('statistics', {})

report = {
    'run_a_reference': {
        'total_filament_g': sum(gcode_a_details.get('filament_weights_g') or []),
        'model_main_g': sum(f.get('main_used_g', 0) for f in res_a_json.get('sliced_plates', [{}])[0].get('filaments', [])),
        'tool_changes': res_a_json.get('sliced_plates', [{}])[0].get('filament_change_times', 0),
        'total_time_seconds': res_a_json.get('sliced_plates', [{}])[0].get('total_predication', 0),
        'feature_times': res_a_json.get('sliced_plates', [{}])[0].get('feature_type_times', {}),
        'feature_mm': gcode_a_details.get('feature_mm', {}),
        'filament_weights_per_color': gcode_a_details.get('filament_weights_g', []),
    },
    'run_b_current_shilp': {
        'total_filament_g': stats_b.get('filament_grams', 0),
        'model_main_g': stats_b.get('model_filament_grams', 0),
        'support_g': stats_b.get('support_filament_grams', 0),
        'tower_g': stats_b.get('tower_filament_grams', 0),
        'purge_g': stats_b.get('purge_filament_grams', 0),
        'tool_changes': stats_b.get('tool_change_count', 0),
        'total_time_seconds': stats_b.get('print_time_seconds', 0),
        'raw_time_string': stats_b.get('raw_time_string', ''),
        'feature_times': stats_b.get('raw_statistics', {}).get('feature_type_times', {}),
        'feature_mm': stats_b.get('feature_mm', {}),
    }
}

with open(r'../scratch/controlled_comparison_report.json', 'w') as outf:
    json.dump(report, outf, indent=2)

print('Report generated successfully!')
print(json.dumps(report, indent=2))

