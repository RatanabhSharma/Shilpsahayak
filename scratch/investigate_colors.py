import zipfile, json, os, re

files = [
    'scratch/test_models/Spiderman_urban.3mf',
    'slicer-service/app/storage/015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf'
]

for p in files:
    print('==============================================')
    print('FILE:', p)
    print('==============================================')
    if not os.path.exists(p):
        print('Not found')
        continue
    with zipfile.ZipFile(p, 'r') as z:
        print('Archive members:', len(z.namelist()))
        for name in z.namelist():
            if any(k in name.lower() for k in ['settings', 'slice_info', 'filament', 'plate']):
                print(f'\n--- {name} ---')
                try:
                    data = z.read(name).decode('utf-8', errors='ignore')
                    for line in data.splitlines():
                        if any(term in line.lower() for term in ['colour', 'color', 'extruder', 'filament', 'ams']):
                            print('  ', line.strip()[:140])
                except Exception as e:
                    print('  Error reading:', e)

        # Check for paint_color in 3D models
        for name in z.namelist():
            if name.endswith('.model'):
                data = z.read(name).decode('utf-8', errors='ignore')
                paint_matches = re.findall(r'paint_color="([^"]+)"', data)
                if paint_matches:
                    print(f'\n--- {name} paint_color occurrences: {len(paint_matches)} ---')
                    print('   Sample paint_color values:', paint_matches[:10])
                else:
                    print(f'\n--- {name}: No paint_color found ---')

