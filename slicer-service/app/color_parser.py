"""
Shilp Studio — 3MF Color / Material Parser (Phase 1 of the AMS multi-material plan)

Given any 3MF (plain, or a Bambu Studio / OrcaSlicer project export), returns a
normalized description of which filament colours/materials the model actually
uses, without relying on image/screenshot analysis.

This intentionally mirrors the logic already proven working on the frontend in
src/services/model/bambu3mfParser.ts (the paint_color subdivision-tree decoder
and the project_settings.config palette reader), so the backend's idea of
"what colours does this model use" matches what the customer already sees in
the 3D viewer. Do not let this module's decoding drift from that file without
updating both.

Reads, in order:
  Metadata/project_settings.config  -> filament_colour / filament_type / filament_density
  Metadata/model_settings.config    -> per-object default extruder ("<object id>.<extruder>")
  3D/Objects/*.model, 3D/3dmodel.model -> per-triangle paint_color overrides

Public entry point: parse_3mf_colors(file_path) -> dict
"""

import json
import re
import zipfile
from typing import Any, Dict, List, Optional, Set

# ── file readers ──────────────────────────────────────────────────────────


def _read(zf: zipfile.ZipFile, name: str) -> str:
    return zf.read(name).decode("utf-8", errors="replace")


def _find(namelist: List[str], predicate) -> Optional[str]:
    for n in namelist:
        if predicate(n.lower()):
            return n
    return None


# ── filament palette (Metadata/project_settings.config) ────────────────────


def extract_filament_palette(zf: zipfile.ZipFile, namelist: List[str]) -> Dict[str, List]:
    """Reads the project's filament palette: parallel arrays of hex colour,
    material type, density, and profile names, indexed by 0-based AMS slot."""
    proj_entry = _find(namelist, lambda n: "project_settings.config" in n)
    if not proj_entry:
        return {"colours": [], "types": [], "densities": [], "settings_ids": [], "vendors": []}

    text = _read(zf, proj_entry)
    colours: List[str] = []
    types: List[str] = []
    densities: List[str] = []
    settings_ids: List[str] = []
    vendors: List[str] = []
    try:
        data = json.loads(text)
        raw_colours = data.get("filament_colour") or []
        colours = [c for c in raw_colours if isinstance(c, str) and re.match(r"^#[0-9A-Fa-f]{6}$", c)]
        types = data.get("filament_type") or []
        densities = data.get("filament_density") or []
        settings_ids = data.get("filament_settings_id") or []
        vendors = data.get("filament_vendor") or []
    except (json.JSONDecodeError, TypeError, AttributeError):
        # Not valid JSON (or not the shape we expect) — fall back to scanning for raw hex codes.
        colours = list(dict.fromkeys(re.findall(r"#[0-9A-Fa-f]{6}", text)))

    return {
        "colours": colours,
        "types": types,
        "densities": densities,
        "settings_ids": settings_ids,
        "vendors": vendors,
    }


# ── per-object default extruder (Metadata/model_settings.config) ──────────

_OBJECT_RE = re.compile(r'<object\s+id="([^"]+)">([\s\S]*?)</object>')
_EXTRUDER_RE = re.compile(r'key="extruder"\s+value="(\d+)"')


def extract_object_extruders(zf: zipfile.ZipFile, namelist: List[str]) -> Dict[str, int]:
    """Returns {object_id: 1-based extruder index} as explicitly assigned in the project.
    Kept in the output for later phases (per-object AMS assignment UI); Phase 1 also
    uses the first entry as a reasonable global default extruder."""
    settings_entry = _find(namelist, lambda n: "model_settings.config" in n)
    if not settings_entry:
        return {}

    xml = _read(zf, settings_entry)
    result: Dict[str, int] = {}
    for m in _OBJECT_RE.finditer(xml):
        oid, body = m.group(1), m.group(2)
        ext_m = _EXTRUDER_RE.search(body)
        if ext_m:
            result[oid] = int(ext_m.group(1))
    return result


# ── paint_color subdivision-tree decode ────────────────────────────────────
# Bambu/Orca encode per-triangle multi-colour painting as a nibble-packed,
# right-to-left recursive subdivision tree. See bambu3mfParser.ts for the
# original, more heavily-commented version of this algorithm.


class _Reader:
    __slots__ = ("s", "pos")

    def __init__(self, s: str):
        self.s = s
        self.pos = 0


def _leaf(state: int) -> Dict[str, Any]:
    return {"children": None, "uniform": state, "state": state, "split_sides": 0}


def _decode_node(reader: _Reader) -> Dict[str, Any]:
    if reader.pos >= len(reader.s):
        return _leaf(0)

    ch = reader.s[reader.pos]
    reader.pos += 1
    try:
        nibble = int(ch, 16)
    except ValueError:
        return _leaf(0)

    split_sides = nibble & 3
    upper = (nibble >> 2) & 3

    # Leaf node
    if split_sides == 0:
        if upper < 3:
            return _leaf(upper)  # 0 = inherit default extruder, 1/2 = extruder 1/2
        # Extended state: accumulate extension nibbles
        ext_state = 0
        while reader.pos < len(reader.s):
            ext_ch = reader.s[reader.pos]
            reader.pos += 1
            try:
                ext = int(ext_ch, 16)
            except ValueError:
                return _leaf(0)
            if ext == 0xF:
                ext_state += 15
            else:
                ext_state += ext
                break
        return _leaf(3 + ext_state)

    # Split node: children serialized in reverse order
    num_children = split_sides + 1
    children: List[Optional[Dict[str, Any]]] = [None] * num_children
    for i in range(num_children - 1, -1, -1):
        children[i] = _decode_node(reader)

    uniform = children[0]["uniform"]
    for i in range(1, num_children):
        if children[i]["uniform"] != uniform:
            uniform = None
            break

    return {"children": children, "uniform": uniform, "state": 0, "split_sides": split_sides}


def _decode_paint_tree(hex_str: str) -> Optional[Dict[str, Any]]:
    if not hex_str:
        return None
    return _decode_node(_Reader(hex_str[::-1]))


_SPLIT_WEIGHTS = {1: [0.5, 0.5], 2: [0.25, 0.25, 0.5], 3: [0.25, 0.25, 0.25, 0.25]}


def _dominant_state(node: Dict[str, Any]) -> int:
    """Area-weighted dominant extruder state of a paint subdivision tree."""
    if node["uniform"] is not None:
        return node["uniform"]

    areas: Dict[int, float] = {}

    def walk(n: Dict[str, Any], weight: float) -> None:
        if n["uniform"] is not None or n["children"] is None:
            s = n["uniform"] if n["uniform"] is not None else n["state"]
            areas[s] = areas.get(s, 0) + weight
            return
        weights = _SPLIT_WEIGHTS.get(n["split_sides"], [0.25] * len(n["children"]))
        for i, child in enumerate(n["children"]):
            w = weights[i] if i < len(weights) else 0.25
            walk(child, weight * w)

    walk(node, 1.0)

    best_state, best_area = 0, -1.0
    for state, area in areas.items():
        if area > best_area:
            best_state, best_area = state, area
    return best_state


# ── scan geometry files for used extruder slots ────────────────────────────

_TRIANGLE_RE = re.compile(r'<triangle\s+v1="\d+"\s+v2="\d+"\s+v3="\d+"([^/]*)/>')
_PAINT_RE = re.compile(r'paint_color="([^"]+)"')


def _used_slots_in_model_xml(xml_text: str, default_extruder: int) -> Set[int]:
    """1-based filament slot indices actually used by triangles in this model file.
    Returns an empty set if the file has no <triangle> elements at all (e.g. a
    component-only root file that just references other object files)."""
    used: Set[int] = set()
    found_triangle = False
    for tm in _TRIANGLE_RE.finditer(xml_text):
        found_triangle = True
        attrs = tm.group(1)
        pm = _PAINT_RE.search(attrs)
        if pm:
            tree = _decode_paint_tree(pm.group(1))
            state = _dominant_state(tree) if tree else 0
            used.add(state if state > 0 else default_extruder)
        else:
            used.add(default_extruder)
    return used if found_triangle else set()


# ── public entry point ──────────────────────────────────────────────────────


def parse_3mf_colors(file_path: str) -> Dict[str, Any]:
    """
    Parses a 3MF file and returns normalized colour/material data:

      {
        "success": True,
        "isMultiColor": bool,
        "colors": [
          {"index": 1, "hex": "#161616", "materialType": "PLA", "sourceFilament": 1, "density": 1.24},
          ...
        ],
        "objectExtruders": {"2": 2, ...},  # raw per-object map, for the Phase 3 AMS-assignment UI
        "paletteSize": 8                    # total filament slots defined in the project (may exceed used colours)
      }

    For a plain, single-colour 3MF (no Bambu/Orca project_settings.config palette
    at all) this returns isMultiColor=False with a single placeholder colour, since
    there is no AMS palette to report against.
    """
    if not zipfile.is_zipfile(file_path):
        return {
            "success": False,
            "error": "Not a valid 3MF/ZIP archive.",
            "isMultiColor": False,
            "colors": [],
        }

    try:
        with zipfile.ZipFile(file_path, "r") as zf:
            namelist = zf.namelist()

            palette = extract_filament_palette(zf, namelist)
            colours, types, densities = palette["colours"], palette["types"], palette["densities"]
            settings_ids, vendors = palette.get("settings_ids", []), palette.get("vendors", [])

            if not colours:
                return {
                    "success": True,
                    "isMultiColor": False,
                    "colors": [{"index": 1, "hex": "#FFFFFF"}],
                    "objectExtruders": {},
                    "paletteSize": 0,
                }

            object_extruders = extract_object_extruders(zf, namelist)
            default_extruder = next(iter(object_extruders.values()), 1)

            geometry_entries = [
                n
                for n in namelist
                if n.lower().endswith(".model")
                and (n.lower().startswith("3d/objects/") or n.lower().endswith("3dmodel.model"))
            ]

            used_slots: Set[int] = set()
            for entry in geometry_entries:
                try:
                    xml_text = _read(zf, entry)
                except Exception:
                    continue
                used_slots |= _used_slots_in_model_xml(xml_text, default_extruder)

            if not used_slots:
                # No triangle geometry matched directly (e.g. a component-only root
                # file) — fall back to whatever extruders were explicitly assigned.
                used_slots = set(object_extruders.values()) or {1}

            colors_out: List[Dict[str, Any]] = []
            for slot in sorted(used_slots):
                idx = slot - 1
                if idx < 0 or idx >= len(colours):
                    continue
                entry: Dict[str, Any] = {
                    "index": slot,
                    "hex": colours[idx],
                    "sourceFilament": slot,
                }
                if idx < len(types) and types[idx]:
                    entry["materialType"] = types[idx]
                if idx < len(densities):
                    try:
                        entry["density"] = float(densities[idx])
                    except (TypeError, ValueError):
                        pass
                if idx < len(settings_ids) and settings_ids[idx]:
                    entry["materialName"] = settings_ids[idx]
                if idx < len(vendors) and vendors[idx]:
                    entry["vendor"] = vendors[idx]
                colors_out.append(entry)

            if not colors_out:
                colors_out = [{"index": 1, "hex": colours[0]}]

            return {
                "success": True,
                "isMultiColor": len(colors_out) > 1,
                "colors": colors_out,
                "objectExtruders": object_extruders,
                "paletteSize": len(colours),
            }

    except Exception as e:  # noqa: BLE001 — deliberately broad: any parse failure should degrade, not 500
        return {
            "success": False,
            "error": f"Error parsing 3MF colours: {e}",
            "isMultiColor": False,
            "colors": [],
        }


if __name__ == "__main__":
    import sys

    for path in sys.argv[1:]:
        print(f"\n=== {path} ===")
        print(json.dumps(parse_3mf_colors(path), indent=2))
