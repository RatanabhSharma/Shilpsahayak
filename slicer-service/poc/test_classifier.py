import os
import json
from file_inspector import inspect_file

test_dir = r"test_models"
models = ["cube_20mm.stl", "cube_20mm.obj", "standard_cube.3mf", "bambu_project.3mf", "sliced_project.3mf", "sample.gcode"]

for m in models:
    p = os.path.join(test_dir, m)
    r = inspect_file(p)
    print(f"[{m}] -> class: {r.get('classification')} | format: {r.get('detected_format')} | can_slice: {r.get('can_slice')}")
