"""Count all hex nibble characters in paint_color attributes."""
import zipfile
import re
from collections import Counter

nibble_counts = Counter()
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
                    nibble_counts[ch] += 1
            buf = buf[-200:]

print("All nibble character frequencies in paint_color attributes:")
for ch in sorted(nibble_counts.keys()):
    val = int(ch, 16)
    is_split = (val & 8) != 0
    slot = val & 7
    tag = "SPLIT" if is_split else f"LEAF -> slot {slot}"
    print(f"  Nibble {ch} (hex={val}): {nibble_counts[ch]:>8} occurrences  [{tag}]")

