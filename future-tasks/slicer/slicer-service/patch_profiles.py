import os

with open('app/main.py', 'r') as f:
    c = f.read()

old_call = """            slice_res = execute_bambu_slice(
                model_path=active_slice_file,
                timeout_seconds=600,
                production_params=params,
                color_analysis=color_analysis,
            )"""

new_call = """            slice_res = execute_bambu_slice(
                model_path=active_slice_file,
                timeout_seconds=600,
                production_params=params,
                production_profiles=validated_profiles,
                color_analysis=color_analysis,
            )"""

if old_call in c:
    c = c.replace(old_call, new_call)
    print("Patched main.py")
else:
    print("WARNING: Call not found in main.py")

with open('app/main.py', 'w') as f:
    f.write(c)

