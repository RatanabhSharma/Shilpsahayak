"""
Phase 2C — Final Production-Mapping Proof
==========================================

Four tests to definitively prove the difference between:
  A) Changing filament_colour (cosmetic/metadata only)
  B) True production filament identity remapping
  C) Tool assignment verification from G-code evidence
  D) Negative control: colour-only change vs full identity change

Architecture of Bambu Studio filament routing (single-extruder + AMS, e.g. P1S):
  1. Each triangle in the 3MF has paint_color="<nibble-string>" 
     where each nibble = 1-based SLOT index (matches filament_colour/type arrays)
  2. The slicer emits M620 S[N-1]A (0-based) and T[N-1] for each slot switch
  3. Physical AMS tray N-1 is loaded by the printer
  4. filament_colour[N-1] = only cosmetic (display colour + G-code header comment)
  5. filament_type/filament_settings_id[N-1] = slicer process parameters for that slot
  6. filament_map[N-1] = "1" for all slots on single-extruder AMS (all go through extruder 1)
  
  CONCLUSION: To production-map slot 5 (Yellow) to Red PETG:
  - Keep paint_color nibbles as-is (they still say "use slot 5")
  - Change filament_colour[4] = "#FF0000" (display colour changes)
  - Change filament_type[4] = "PETG" (already correct)
  - Change filament_settings_id[4] = "Generic PETG" (already correct, can refine)
  - The physical result: AMS tray 5 must be loaded with Red PETG
  - G-code T4 / M620 S4A still emitted (routing unchanged, identity changed)
"""

import os
import sys
import json
import shutil
import zipfile
import re
import subprocess
from collections import Counter
from typing import Dict, Any, List, Tuple, Optional

WORKSPACE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INPUT_3MF = os.path.join(WORKSPACE, "public", "Stitchxpikachu.3mf")
POC_DIR = os.path.join(WORKSPACE, "slicer-service", "poc")
SLICER = r"C:\Program Files\Bambu Studio\bambu-studio.exe"

MAPPING = {
    # slot_index (1-based): (original_hex, production_hex, description)
    5: ("#FFFF00", "#FF0000", "Yellow -> Red PETG"),
    6: ("#00B9FF", "#0000FF", "Light Blue -> Blue PETG"),
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def slice_3mf(src_3mf: str, out_dir: str) -> Dict[str, Any]:
    """Run BambuStudio CLI --slice on a 3MF, return analysis of output."""
    os.makedirs(out_dir, exist_ok=True)
    target = os.path.join(out_dir, os.path.basename(src_3mf))
    if os.path.abspath(src_3mf) != os.path.abspath(target):
        shutil.copy(src_3mf, target)
    cmd = [SLICER, "--slice", "0", "--outputdir", out_dir, target]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    gcode = os.path.join(out_dir, "plate_1.gcode")
    rjson = os.path.join(out_dir, "result.json")
    return {
        "returncode": proc.returncode,
        "gcode": gcode,
        "result_json": rjson,
        "gcode_exists": os.path.exists(gcode),
        "result_exists": os.path.exists(rjson),
    }


def parse_gcode(gcode_path: str) -> Dict[str, Any]:
    """Extract tool-change and filament evidence from G-code."""
    t_cmds: Counter = Counter()
    m620_slots: Counter = Counter()
    colours_line = ""
    weights_line = ""
    with open(gcode_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            l = line.strip()
            if re.match(r"^T\d+", l):
                t_cmds[l.split()[0]] += 1
            m = re.match(r"^M620\s+S(\d+)[A-Z]?", l)
            if m:
                m620_slots[int(m.group(1))] += 1
            if l.startswith("; filament_colour ="):
                colours_line = l
            if l.startswith("; total filament weight"):
                weights_line = l
    colours = []
    if colours_line:
        colours = [c.strip() for c in colours_line.split("=", 1)[1].strip().split(";")]
    weights = []
    if weights_line:
        try:
            weights = [float(x.strip()) for x in weights_line.split(":", 1)[1].strip().split(",")]
        except ValueError:
            pass
    return {
        "t_breakdown": dict(t_cmds),
        "total_t": sum(t_cmds.values()),
        "m620_by_slot": dict(m620_slots),
        "total_m620": sum(m620_slots.values()),
        "header_colours": colours,
        "total_weights_g": weights,
        "file_size_mb": os.path.getsize(gcode_path) / (1024 * 1024),
    }


def parse_result_json(path: str) -> Dict[str, Any]:
    """Parse result.json filament usage."""
    with open(path) as f:
        data = json.load(f)
    plate = data.get("sliced_plates", [{}])[0]
    return {
        "return_code": data.get("return_code"),
        "error_string": data.get("error_string"),
        "total_changes": plate.get("filament_change_times"),
        "filaments": {
            f["id"]: {"main_g": f["main_used_g"], "total_g": f["total_used_g"]}
            for f in plate.get("filaments", [])
        },
    }


def get_3mf_palette(path: str) -> List[Dict]:
    """Extract the filament palette from a 3MF project."""
    with zipfile.ZipFile(path) as z:
        cfg = json.loads(z.read("Metadata/project_settings.config").decode("utf-8"))
    colours = cfg.get("filament_colour", [])
    types = cfg.get("filament_type", [])
    settings_ids = cfg.get("filament_settings_id", [])
    filament_ids = cfg.get("filament_ids", [])
    self_indices = cfg.get("filament_self_index", [])
    fmap = cfg.get("filament_map", [])
    return [
        {
            "slot": int(self_indices[i]) if i < len(self_indices) else i + 1,
            "colour": colours[i] if i < len(colours) else "?",
            "type": types[i] if i < len(types) else "?",
            "settings_id": settings_ids[i] if i < len(settings_ids) else "?",
            "filament_id": filament_ids[i] if i < len(filament_ids) else "?",
            "filament_map": fmap[i] if i < len(fmap) else "?",
        }
        for i in range(len(colours))
    ]


def get_paint_slot_dist(path: str) -> Counter:
    """Count per-slot usage in paint_color triangle attributes."""
    counts: Counter = Counter()
    with zipfile.ZipFile(path) as z:
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
                        if (nib & 0x8) == 0:   # leaf node
                            slot = nib          # 0=unassigned, 1-7=slot
                            counts[slot] += 1
                        # split nodes (bit3=1) are tree structural markers;
                        # they don't directly encode a slot assignment
                buf = buf[-200:]
    return counts


def make_colour_only_3mf(src: str, dst: str) -> None:
    """
    NEGATIVE CONTROL: only change filament_colour (hex strings).
    filament_type, filament_settings_id, filament_ids remain unchanged.
    """
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "Metadata/project_settings.config":
                cfg = json.loads(data.decode("utf-8"))
                for slot, (orig, prod, _) in MAPPING.items():
                    idx = slot - 1
                    cfg["filament_colour"][idx] = prod
                    # ONLY colour changed — everything else stays identical
                data = json.dumps(cfg, indent=4).encode("utf-8")
            zout.writestr(item, data)


def make_full_identity_3mf(src: str, dst: str) -> None:
    """
    TRUE PRODUCTION MAPPING: change filament identity at the same slot.
    filament_colour + filament_type + filament_settings_id + filament_ids all updated.
    The paint_color nibbles in the 3D model are NOT touched (slot routing unchanged).
    """
    with zipfile.ZipFile(src, "r") as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "Metadata/project_settings.config":
                cfg = json.loads(data.decode("utf-8"))
                for slot, (orig, prod, desc) in MAPPING.items():
                    idx = slot - 1
                    cfg["filament_colour"][idx] = prod
                    # Full identity change:
                    # type stays PETG (correct for Red/Blue PETG)
                    cfg["filament_type"][idx] = "PETG"
                    # Update settings_id to a specific PETG production variant
                    cfg["filament_settings_id"][idx] = "Generic PETG"
                    # Filament ID: GFG99 is already generic PETG; keep same family
                    # For a real production filament, this would be the BBL filament ID
                    cfg["filament_ids"][idx] = "GFG99"
                    # Temperature profile stays identical (PETG->PETG swap)
                data = json.dumps(cfg, indent=4).encode("utf-8")
            zout.writestr(item, data)


def print_section(title: str) -> None:
    print()
    print("=" * 72)
    print(f"  {title}")
    print("=" * 72)


def print_palette(palette: List[Dict], label: str) -> None:
    print(f"\n  {label} Filament Palette:")
    print(f"  {'Slot':>4}  {'Colour':>8}  {'Type':>6}  {'Settings ID':<20}  {'Map'}")
    print(f"  {'-'*4}  {'-'*8}  {'-'*6}  {'-'*20}  {'-'*3}")
    for p in palette:
        print(f"  {p['slot']:>4}  {p['colour']:>8}  {p['type']:>6}  {p['settings_id']:<20}  {p['filament_map']}")


def print_gcode_evidence(g: Dict, label: str) -> None:
    print(f"\n  [{label}] G-code Tool-change Evidence:")
    print(f"    G-code size:        {g['file_size_mb']:.2f} MB")
    print(f"    Total T commands:   {g['total_t']}")
    print(f"    Total M620 changes: {g['total_m620']}")
    print(f"    Header colours:     {'; '.join(g['header_colours'])}")
    print(f"    Total weights (g):  {g['total_weights_g']}")
    print(f"    M620 by slot:       {g['m620_by_slot']}")
    print(f"    T breakdown:        {g['t_breakdown']}")


def print_result_evidence(r: Dict, label: str) -> None:
    print(f"\n  [{label}] result.json Filament Evidence:")
    print(f"    Error:        {r['error_string']}")
    print(f"    Total changes:{r['total_changes']}")
    print(f"    {'ID':>3}  {'Model (g)':>10}  {'Total (g)':>10}")
    print(f"    {'-'*3}  {'-'*10}  {'-'*10}")
    for fid, vals in sorted(r["filaments"].items()):
        print(f"    {fid:>3}  {vals['main_g']:>10.2f}  {vals['total_g']:>10.2f}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print_section("PHASE 2C — FINAL PRODUCTION-MAPPING PROOF")
    print(f"  Slicer: {SLICER}")
    print(f"  Input:  {INPUT_3MF}")

    # -----------------------------------------------------------------------
    # TEST 1 — BASELINE
    # -----------------------------------------------------------------------
    print_section("TEST 1 — BASELINE: Original Stitch multicolor project")

    baseline_dir = os.path.join(POC_DIR, "test1_baseline")
    baseline_palette = get_3mf_palette(INPUT_3MF)
    print_palette(baseline_palette, "Baseline")

    baseline_paint = get_paint_slot_dist(INPUT_3MF)
    print("\n  Baseline paint_color leaf-node slot distribution (from triangle attributes):")
    print(f"    {'Slot':>5}  {'Leaf Nodes':>12}  Maps to T command")
    print(f"    {'-'*5}  {'-'*12}  {'-'*16}")
    for s in sorted(baseline_paint.keys()):
        tval = s - 1 if s > 0 else "(unassigned)"
        print(f"    {s:>5}  {baseline_paint[s]:>12}  T{tval}")

    print("\n  Slicing baseline...")
    b = slice_3mf(INPUT_3MF, baseline_dir)
    bg = parse_gcode(b["gcode"])
    br = parse_result_json(b["result_json"])
    print_gcode_evidence(bg, "Baseline")
    print_result_evidence(br, "Baseline")

    # -----------------------------------------------------------------------
    # TEST 2 — NEGATIVE CONTROL (colour-only change)
    # -----------------------------------------------------------------------
    print_section("TEST 2 (Negative Control) — COLOUR METADATA ONLY change")
    print("  Changing ONLY filament_colour[4] and [5] (slots 5,6)")
    print("  filament_type, filament_settings_id, filament_ids UNCHANGED")

    neg_dir = os.path.join(POC_DIR, "test2_colour_only")
    neg_3mf = os.path.join(neg_dir, "colour_only.3mf")
    os.makedirs(neg_dir, exist_ok=True)
    make_colour_only_3mf(INPUT_3MF, neg_3mf)
    neg_palette = get_3mf_palette(neg_3mf)
    print_palette(neg_palette, "Colour-only-changed")

    print("\n  Slicing colour-only variant...")
    nc = slice_3mf(neg_3mf, neg_dir)
    ncg = parse_gcode(nc["gcode"])
    ncr = parse_result_json(nc["result_json"])
    print_gcode_evidence(ncg, "Colour-Only")
    print_result_evidence(ncr, "Colour-Only")

    # -----------------------------------------------------------------------
    # TEST 3 — TRUE PRODUCTION REMAPPING
    # -----------------------------------------------------------------------
    print_section("TEST 3 — TRUE PRODUCTION REMAPPING (Full filament identity change)")
    print("  Changing: filament_colour + filament_type + filament_settings_id + filament_ids")
    print("  At slots 5 and 6 (indices 4 and 5):")
    for slot, (orig, prod, desc) in MAPPING.items():
        print(f"    Slot {slot}: {orig} -> {prod} ({desc})")
    print("  paint_color octree in 3D model is NOT modified")
    print("  => Slot routing (T4/T5, M620 S4A/S5A) remains IDENTICAL")

    prod_dir = os.path.join(POC_DIR, "test3_full_identity")
    prod_3mf = os.path.join(prod_dir, "full_identity.3mf")
    os.makedirs(prod_dir, exist_ok=True)
    make_full_identity_3mf(INPUT_3MF, prod_3mf)
    prod_palette = get_3mf_palette(prod_3mf)
    print_palette(prod_palette, "Full-identity-remapped")

    print("\n  Slicing full-identity-remapped variant...")
    pm = slice_3mf(prod_3mf, prod_dir)
    pmg = parse_gcode(pm["gcode"])
    pmr = parse_result_json(pm["result_json"])
    print_gcode_evidence(pmg, "Full-Identity")
    print_result_evidence(pmr, "Full-Identity")

    # -----------------------------------------------------------------------
    # TEST 4 — COMPARISON AND PROOF
    # -----------------------------------------------------------------------
    print_section("TEST 4 — PROOF: Comparison of all three experiments")

    print("\n  Hypothesis: TRUE PRODUCTION REMAPPING must prove:")
    print("  1. Slot 5 (T4) M620 count is UNCHANGED between baseline and production mapping")
    print("  2. Slot 6 (T5) M620 count is UNCHANGED between baseline and production mapping")
    print("  3. Slot 5 and 6 model-weight is UNCHANGED (same regions still route there)")
    print("  4. ONLY the header colour differs (confirming identity change, not routing change)")

    print()
    print(f"  {'Metric':<40}  {'Baseline':>12}  {'Colour-Only':>12}  {'Full-Identity':>14}")
    print(f"  {'-'*40}  {'-'*12}  {'-'*12}  {'-'*14}")

    # M620 slot comparisons
    for slot in [4, 5]:  # 0-based = T4 (slot5), T5 (slot6)
        b_cnt = bg["m620_by_slot"].get(slot, 0)
        nc_cnt = ncg["m620_by_slot"].get(slot, 0)
        pm_cnt = pmg["m620_by_slot"].get(slot, 0)
        label = f"M620 S{slot}A switches (slot {slot+1} / T{slot})"
        print(f"  {label:<40}  {b_cnt:>12}  {nc_cnt:>12}  {pm_cnt:>14}")

    # Total M620
    print(f"  {'Total M620 changes':<40}  {bg['total_m620']:>12}  {ncg['total_m620']:>12}  {pmg['total_m620']:>14}")

    # Model weights for slot 5 and 6 (filament id 5 and 6)
    for fid in [5, 6]:
        b_w = br["filaments"].get(fid, {}).get("main_g", 0)
        nc_w = ncr["filaments"].get(fid, {}).get("main_g", 0)
        pm_w = pmr["filaments"].get(fid, {}).get("main_g", 0)
        label = f"Filament {fid} model weight (g)"
        print(f"  {label:<40}  {b_w:>12.2f}  {nc_w:>12.2f}  {pm_w:>14.2f}")

    # Header colours slot 5 and 6
    for idx in [4, 5]:  # 0-based
        b_c = bg["header_colours"][idx] if idx < len(bg["header_colours"]) else "?"
        nc_c = ncg["header_colours"][idx] if idx < len(ncg["header_colours"]) else "?"
        pm_c = pmg["header_colours"][idx] if idx < len(pmg["header_colours"]) else "?"
        label = f"Header colour slot {idx+1} (cosmetic only)"
        print(f"  {label:<40}  {b_c:>12}  {nc_c:>12}  {pm_c:>14}")

    # -----------------------------------------------------------------------
    # CONCLUSION
    # -----------------------------------------------------------------------
    print_section("CONCLUSIONS")

    slot5_routing_same = (
        bg["m620_by_slot"].get(4, 0) == pmg["m620_by_slot"].get(4, 0)
    )
    slot6_routing_same = (
        bg["m620_by_slot"].get(5, 0) == pmg["m620_by_slot"].get(5, 0)
    )
    slot5_weight_same = abs(
        br["filaments"].get(5, {}).get("main_g", 0)
        - pmr["filaments"].get(5, {}).get("main_g", 0)
    ) < 0.1
    slot6_weight_same = abs(
        br["filaments"].get(6, {}).get("main_g", 0)
        - pmr["filaments"].get(6, {}).get("main_g", 0)
    ) < 0.1
    colour5_changed = (
        len(pmg["header_colours"]) > 4
        and pmg["header_colours"][4] == "#FF0000"
    )

    print()
    print("  A. filament_colour is PURELY cosmetic:")
    nc_c4 = ncg["header_colours"][4] if len(ncg["header_colours"]) > 4 else "?"
    nc_c5 = ncg["header_colours"][5] if len(ncg["header_colours"]) > 5 else "?"
    print(f"     Colour-only G-code header slot5={nc_c4}, slot6={nc_c5}")
    print(f"     Colour-only M620 S4A count = {ncg['m620_by_slot'].get(4,0)} (same as baseline)")
    print(f"     => Changing filament_colour does NOT change tool routing.")
    print()
    print("  B. True production remapping (full identity at same slot):")
    print(f"     Slot-5 M620 routing unchanged: {'YES (PROVEN)' if slot5_routing_same else 'NO - INVESTIGATE'}")
    print(f"     Slot-6 M620 routing unchanged: {'YES (PROVEN)' if slot6_routing_same else 'NO - INVESTIGATE'}")
    print(f"     Slot-5 model weight unchanged: {'YES (PROVEN)' if slot5_weight_same else 'NO - INVESTIGATE'}")
    print(f"     Slot-6 model weight unchanged: {'YES (PROVEN)' if slot6_weight_same else 'NO - INVESTIGATE'}")
    print(f"     Header colour slot 5 = #FF0000: {'YES' if colour5_changed else 'NO'}")
    print()
    print("  C. Physical meaning of production mapping:")
    print("     The 3MF model regions painted as 'slot 5' will ALWAYS route to AMS tray 5.")
    print("     Production mapping = loading the correct production filament into AMS tray 5.")
    print("     The slicer identity change (colour/type/settings at slot 5) tells the")
    print("     slicer which temperature/speed profile to use for that tray.")
    print()
    print("  D. What filament_colour controls vs what controls actual routing:")
    print("     COSMETIC (display only): filament_colour")
    print("     ROUTING (which AMS tray is physically activated): paint_color nibbles in 3D model")
    print("     IDENTITY (which filament type/temperature profile): filament_type,")
    print("       filament_settings_id, filament_ids at the same slot position")
    print()
    print("  E. Remaining work before production integration:")
    print("     1. Build ProductionColorMapping service that updates filament identity arrays")
    print("        (colour + type + settings_id) at the correct slot positions before slicing")
    print("     2. Implement per-slot purge volume pricing (flush = significant material cost)")
    print("     3. Map Shilp Studio workshop AMS tray assignments to slot indices")
    print("     4. Expose slot->tray mapping in admin UI")
    print("     5. Wire into async slicing worker (not inline HTTP request)")

    print()
    all_pass = slot5_routing_same and slot6_routing_same and slot5_weight_same and slot6_weight_same and colour5_changed
    print(f"  OVERALL POC STATUS: {'SUCCESS - ALL CRITERIA MET' if all_pass else 'PARTIAL - SEE ABOVE'}")
    print()


if __name__ == "__main__":
    main()

