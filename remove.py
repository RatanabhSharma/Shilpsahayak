import os

with open("frontend/src/pages/admin/Settings.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "const updateNestedBank" in line:
        skip = True
    
    if skip and "};" in line and "bankAccountDetails:" not in line and "..." not in line and "setForm" not in line and "updateNestedBank" not in line:
        skip = False
        continue
    
    if skip:
        continue
        
    if "{/* Bank Account Details for B2B Clients */}" in line:
        skip = True
        
    if skip and "UTIB0000123" in line:
        # We need to skip a few more lines to close the divs
        skip_more = 5 # skip the input, div, div, div, div
        continue
        
    if skip and 'skip_more' in locals() and skip_more > 0:
        skip_more -= 1
        if skip_more == 0:
            skip = False
        continue
        
    if not skip:
        new_lines.append(line)

with open("frontend/src/pages/admin/Settings.tsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Removed bank details via python")
