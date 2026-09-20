import os

with open('app/slicer_adapters/bambu_adapter.py', 'r') as f:
    c = f.read()

old_cond = 'if p["multi_color_lost"] and route == "multicolor":'
new_cond = 'if p["multi_color_lost"]:'

if old_cond in c:
    c = c.replace(old_cond, new_cond)
    print("Patched bambu_adapter.py")
else:
    print("WARNING: Condition not found in bambu_adapter.py")

with open('app/slicer_adapters/bambu_adapter.py', 'w') as f:
    f.write(c)

