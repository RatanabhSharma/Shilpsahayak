"""
Decode Bambu paint_color encoding and understand filament routing.
Bambu uses a hybrid compact encoding where each nibble represents a node
in an octree-subdivision of triangles. The color selection rules are:
  - 0x0 = no paint (use object default)
  - 0x1..0xE = filament index (1-based, matching filament_colour palette slot)
  - 0xF = "split further" marker (more nibbles follow for finer subdivision)
"""
import zipfile, re
from collections import Counter

# --- Step 1: Count all paint_color codes ---
counts = Counter()
with zipfile.ZipFile("public/Stitchxpikachu.3mf", "r") as z:
    with z.open("3D/Objects/object_1.model") as m:
        buf = b""
        while True:
            chunk = m.read(2 * 1024 * 1024)
            if not chunk:
                break
            buf += chunk
            for match in re.finditer(rb'paint_color="([^"]+)"', buf):
                code = match.group(1).decode("ascii")
                counts[code] += 1
            buf = buf[-200:]

print("All unique paint_color codes and triangle counts:")
for code, cnt in counts.most_common(25):
    print(f"  {code!r}: {cnt} triangles")

print()
print("--- Simple 1-2 char codes (leaf node assignments) ---")
simple = {k: v for k, v in counts.items() if 1 <= len(k) <= 2}
for code in sorted(simple.keys()):
    nib = int(code[0], 16)
    # In Bambu's encoding: 0=unassigned, 1-8=filament slot 1-8, F=split
    slot = nib  # direct: nibble value IS the 1-based slot (0=unassigned)
    suffix = ""
    if len(code) == 2:
        nib2 = int(code[1], 16)
        suffix = f" + continuation nibble {nib2}"
    print(f"  Code {code!r}: nibble={nib}, 1-based slot={slot}, count={simple[code]}{suffix}")

print()
print("--- Filament slot usage summary (from leaf paint codes) ---")
slot_counts = Counter()
for code, cnt in counts.items():
    # First nibble = top-level slot assignment
    nib = int(code[0], 16)
    if nib <= 8:  # valid slot (not 'F'=split marker)
        slot_counts[nib] += cnt
print("Slot distribution (slot 0=unassigned/default):")
for slot in sorted(slot_counts):
    print(f"  Slot {slot} (filament_{slot}): {slot_counts[slot]} triangles")

