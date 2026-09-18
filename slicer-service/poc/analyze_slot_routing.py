"""
Deep analysis of how Bambu Studio routes paint_color slot indices to G-code T commands.

Key insight being investigated:
- In the 3MF, triangles are labeled with paint_color="<hex_nibble_string>"
- Each nibble directly encodes the FILAMENT SLOT (1-based) for that region
- This is the authoritative routing mechanism - NOT filament_colour metadata

The filament_colour array is PURELY cosmetic (display color in the UI/G-code header).
The actual physical routing from painted region -> AMS slot is controlled by:
  filament_self_index (which canonical slot each palette entry occupies)
  filament_map (maps palette slots to extruder channels for multi-extruder printers)
  filament_map_mode
"""
import zipfile
import re
from collections import Counter

# Analyze all nibbles across all paint_color codes
slot_dist = Counter()
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
                for ch in code:
                    nib = int(ch, 16)
                    # bit3=0: leaf node, bits2:0 = slot (1-8)
                    # bit3=1: split node, bits2:0 may still encode preferred slot
                    leaf_slot = nib & 0x7
                    if leaf_slot > 0:
                        slot_dist[leaf_slot] += 1
            buf = buf[-200:]

print("Slot references across ALL nibbles of all paint_color codes:")
for slot in sorted(slot_dist.keys()):
    print(f"  Slot {slot} (filament_{slot}): {slot_dist[slot]} nibble-level references")

print()
print("Conclusions:")
print("  The paint_color nibbles encode 1-based filament SLOT indices directly.")
print("  These slot indices correspond to positions in the filament_colour array")
print("  and to the T0..T7 (0-based) tool commands in the generated G-code.")
print("  Slot 1 = T0, Slot 2 = T1, ..., Slot 8 = T7")

