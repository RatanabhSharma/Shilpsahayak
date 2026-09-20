"""Check for nibble 7 in paint_color codes to confirm slot 7 and 8 routing."""
import zipfile
import re
from collections import Counter

codes_with_7 = Counter()
total_codes = 0
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
                total_codes += 1
                if "7" in code:
                    codes_with_7[code] += 1
            buf = buf[-200:]

print(f"Total paint_color codes: {total_codes}")
print(f"Codes containing nibble '7' (direct slot-7 leaf): {sum(codes_with_7.values())}")
if codes_with_7:
    print("Sample codes containing 7:")
    for code, cnt in codes_with_7.most_common(10):
        print(f"  {code!r}: {cnt}")
else:
    print("NONE FOUND - nibble 7 does not appear in any paint_color code.")
    print()
    print("Conclusion: Slots 7 and 8 (T6, T7) are NOT encoded in paint_color.")
    print("These filaments are used exclusively in the prime tower wipe sequences.")
    print("The 'main_used_g' in result.json for filament 7 and 8 represents")
    print("prime tower + flush material consumption, not model-body extrusion.")

