import zipfile, os, subprocess, tempfile, re

slicer = os.path.abspath('slicer-service/poc/bin/PrusaSlicer-2.9.0/prusa-slicer-console.exe')
src_3mf = os.path.abspath('scratch/test_models/Spiderman_urban.3mf')

with tempfile.TemporaryDirectory() as td:
    dst_3mf = os.path.join(td, 'scaled.3mf')
    with zipfile.ZipFile(src_3mf, 'r') as zin, zipfile.ZipFile(dst_3mf, 'w') as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename.lower().endswith('3dmodel.model'):
                text = content.decode('utf-8')
                def repl(m):
                    parts = m.group(1).split()
                    if len(parts) == 12:
                        parts[0] = str(float(parts[0]) * 1.0)
                        parts[4] = str(float(parts[4]) * 1.5)
                        parts[8] = str(float(parts[8]) * 0.8)
                        return f'transform="{" ".join(parts)}"'
                    return m.group(0)
                text = re.sub(r'transform="([^"]+)"', repl, text)
                zout.writestr(item, text.encode('utf-8'))
            else:
                zout.writestr(item, content)
    
    res = subprocess.run([slicer, '--info', dst_3mf], capture_output=True, text=True)
    print(res.stdout)

