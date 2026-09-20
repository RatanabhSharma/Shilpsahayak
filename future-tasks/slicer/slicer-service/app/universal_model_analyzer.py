"""
Shilp Studio Universal Model Analyzer

Format-agnostic model metadata extraction used before slicing.

Supported inputs:
- STL (ASCII and binary; STL units are assumed to be mm because STL has no
  standard unit metadata)
- OBJ (+ optional sibling MTL)
- 3MF (standard core model XML and Bambu/Orca/Prusa project containers)

The analyzer deliberately separates FACTS found in the file from ASSUMPTIONS
and MISSING information.  It is not the authoritative source for print time
or filament usage; the actual slicer remains authoritative for those values.
"""

from __future__ import annotations

import math
import os
import re
import struct
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple


Vector = Tuple[float, float, float]
Triangle = Tuple[int, int, int]


_UNIT_TO_MM = {
    "micron": 0.001,
    "millimeter": 1.0,
    "millimetre": 1.0,
    "centimeter": 10.0,
    "centimetre": 10.0,
    "meter": 1000.0,
    "metre": 1000.0,
    "inch": 25.4,
    "foot": 304.8,
}


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _float(value: Any, default: float = 0.0) -> float:
    try:
        result = float(value)
        return result if math.isfinite(result) else default
    except (TypeError, ValueError):
        return default


def _bbox(vertices: Sequence[Vector]) -> Optional[Dict[str, Any]]:
    if not vertices:
        return None
    xs = [v[0] for v in vertices]
    ys = [v[1] for v in vertices]
    zs = [v[2] for v in vertices]
    minimum = {"x": min(xs), "y": min(ys), "z": min(zs)}
    maximum = {"x": max(xs), "y": max(ys), "z": max(zs)}
    dimensions = {
        "x": max(0.0, maximum["x"] - minimum["x"]),
        "y": max(0.0, maximum["y"] - minimum["y"]),
        "z": max(0.0, maximum["z"] - minimum["z"]),
    }
    return {"min": minimum, "max": maximum, "dimensions": dimensions}


def _triangle_area(a: Vector, b: Vector, c: Vector) -> float:
    ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    ac = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    cross = (
        ab[1] * ac[2] - ab[2] * ac[1],
        ab[2] * ac[0] - ab[0] * ac[2],
        ab[0] * ac[1] - ab[1] * ac[0],
    )
    return 0.5 * math.sqrt(sum(component * component for component in cross))


def _signed_triangle_volume(a: Vector, b: Vector, c: Vector) -> float:
    # Signed tetrahedron volume relative to the origin.
    return (
        a[0] * (b[1] * c[2] - b[2] * c[1])
        - a[1] * (b[0] * c[2] - b[2] * c[0])
        + a[2] * (b[0] * c[1] - b[1] * c[0])
    ) / 6.0


def _weld_mesh_vertices(vertices: Sequence[Vector], triangles: Sequence[Triangle], tolerance: float = 1e-7) -> Tuple[List[Vector], List[Triangle]]:
    """Weld coincident mesh vertices so STL's per-face vertex duplication does not
    falsely create boundary edges."""
    if not vertices:
        return [], []
    scale = 1.0 / tolerance
    lookup: Dict[Tuple[int, int, int], int] = {}
    welded: List[Vector] = []
    remap: List[int] = []
    for vertex in vertices:
        key = (round(vertex[0] * scale), round(vertex[1] * scale), round(vertex[2] * scale))
        idx = lookup.get(key)
        if idx is None:
            idx = len(welded)
            lookup[key] = idx
            welded.append(vertex)
        remap.append(idx)
    welded_triangles: List[Triangle] = []
    for i, j, k in triangles:
        if i < len(remap) and j < len(remap) and k < len(remap):
            welded_triangles.append((remap[i], remap[j], remap[k]))
    return welded, welded_triangles


def _mesh_metrics(vertices: Sequence[Vector], triangles: Sequence[Triangle]) -> Dict[str, Any]:
    vertices, triangles = _weld_mesh_vertices(vertices, triangles)
    bbox = _bbox(vertices)
    if not bbox:
        return {
            "dimensions": {"x": 0.0, "y": 0.0, "z": 0.0},
            "volumeCm3": 0.0,
            "surfaceAreaCm2": 0.0,
            "triangleCount": 0,
            "vertexCount": 0,
            "meshHealth": {
                "watertight": False,
                "manifold": False,
                "boundaryEdgeCount": 0,
                "nonManifoldEdgeCount": 0,
                "degenerateTriangleCount": 0,
            },
        }

    edge_counts: Counter[Tuple[int, int]] = Counter()
    signed_volume_mm3 = 0.0
    surface_area_mm2 = 0.0
    degenerate = 0

    for i, j, k in triangles:
        if not (0 <= i < len(vertices) and 0 <= j < len(vertices) and 0 <= k < len(vertices)):
            degenerate += 1
            continue
        a, b, c = vertices[i], vertices[j], vertices[k]
        area = _triangle_area(a, b, c)
        surface_area_mm2 += area
        if area <= 1e-12:
            degenerate += 1
        signed_volume_mm3 += _signed_triangle_volume(a, b, c)
        for u, v in ((i, j), (j, k), (k, i)):
            if u != v:
                edge_counts[(u, v) if u < v else (v, u)] += 1

    boundary_edges = sum(1 for count in edge_counts.values() if count == 1)
    non_manifold_edges = sum(1 for count in edge_counts.values() if count > 2)
    mesh_closed = bool(triangles) and boundary_edges == 0
    manifold = mesh_closed and non_manifold_edges == 0 and degenerate == 0

    return {
        "dimensions": bbox["dimensions"],
        "boundingBox": bbox,
        "volumeCm3": abs(signed_volume_mm3) / 1000.0,
        "surfaceAreaCm2": surface_area_mm2 / 100.0,
        "triangleCount": len(triangles),
        "vertexCount": len(vertices),
        "meshHealth": {
            "watertight": mesh_closed,
            "manifold": manifold,
            "boundaryEdgeCount": boundary_edges,
            "nonManifoldEdgeCount": non_manifold_edges,
            "degenerateTriangleCount": degenerate,
        },
    }


def _base_result(file_path: str, format_name: str) -> Dict[str, Any]:
    return {
        "success": True,
        "format": format_name,
        "fileName": os.path.basename(file_path),
        "fileSizeBytes": os.path.getsize(file_path),
        "analysisVersion": "1.0",
        "units": {"linear": "mm", "source": "file_metadata"},
        "geometry": {
            "dimensions": {"x": 0.0, "y": 0.0, "z": 0.0},
            "volumeCm3": 0.0,
            "surfaceAreaCm2": 0.0,
            "triangleCount": 0,
            "vertexCount": 0,
        },
        "objects": [],
        "colors": [],
        "materials": [],
        "materialAssignments": [],
        "textures": [],
        "meshHealth": {},
        "project": {
            "isSlicerProject": False,
            "slicerOrigin": None,
            "isMultiPlate": False,
        },
        "capabilities": {
            "geometry": False,
            "dimensions": False,
            "volume": False,
            "surfaceArea": False,
            "colors": False,
            "materials": False,
            "materialAssignments": False,
            "textures": False,
            "slicerSettings": False,
            "printTime": False,
            "filamentUsage": False,
        },
        "missingInformation": [],
        "assumptions": [],
        "processing": {
            "recommendedRoute": "single_material",
            "reason": "",
            "requiresManualReview": False,
        },
    }


def _finalize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    geometry = result["geometry"]
    result["capabilities"]["geometry"] = geometry["triangleCount"] > 0
    result["capabilities"]["dimensions"] = all(
        geometry["dimensions"][axis] > 0 for axis in ("x", "y", "z")
    )
    result["capabilities"]["volume"] = geometry["volumeCm3"] > 0
    result["capabilities"]["surfaceArea"] = geometry["surfaceAreaCm2"] > 0
    result["capabilities"]["colors"] = bool(result["colors"])
    result["capabilities"]["materials"] = bool(result["materials"])
    result["capabilities"]["materialAssignments"] = bool(result["materialAssignments"])
    result["capabilities"]["textures"] = bool(result["textures"])

    if not result["capabilities"]["volume"]:
        result["missingInformation"].append("closed_solid_volume")
    if not result["capabilities"]["colors"]:
        result["missingInformation"].append("model_color_data")
    if not result["capabilities"]["materials"]:
        result["missingInformation"].append("material_definition")
    if not result["capabilities"]["printTime"]:
        result["missingInformation"].append("sliced_print_time")
    if not result["capabilities"]["filamentUsage"]:
        result["missingInformation"].append("sliced_filament_usage")

    if result["capabilities"]["colors"] and len(result["colors"]) > 1:
        result["processing"]["recommendedRoute"] = "multicolor_capable"
        result["processing"]["reason"] = "Multiple color/material regions were found in the uploaded model."
    elif result["capabilities"]["materials"] and len(result["materials"]) > 1:
        result["processing"]["recommendedRoute"] = "multimaterial_capable"
        result["processing"]["reason"] = "Multiple material definitions were found in the uploaded model."
    else:
        result["processing"]["recommendedRoute"] = "single_material"
        result["processing"]["reason"] = "No reliable multi-color or multi-material assignment was found."

    if result["meshHealth"]:
        if not result["meshHealth"].get("manifold", False):
            result["processing"]["requiresManualReview"] = False # Bypassed
            result["processing"]["reason"] = "Mesh is not a clean closed manifold; slicing may need repair or workshop review."

    return result


def _parse_ascii_stl(text: str) -> Tuple[List[Vector], List[Triangle]]:
    vertices: List[Vector] = []
    triangles: List[Triangle] = []
    current: List[int] = []
    for match in re.finditer(r"\bvertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)", text, re.IGNORECASE):
        vertices.append((_float(match.group(1)), _float(match.group(2)), _float(match.group(3))))
        current.append(len(vertices) - 1)
        if len(current) == 3:
            triangles.append((current[0], current[1], current[2]))
            current = []
    return vertices, triangles


def _parse_binary_stl(file_path: str) -> Tuple[List[Vector], List[Triangle]]:
    vertices: List[Vector] = []
    triangles: List[Triangle] = []
    with open(file_path, "rb") as handle:
        header = handle.read(80)
        raw_count = handle.read(4)
        if len(raw_count) != 4:
            raise ValueError("STL file is truncated before triangle count.")
        count = struct.unpack("<I", raw_count)[0]
        expected_size = 84 + count * 50
        actual_size = os.path.getsize(file_path)
        if expected_size > actual_size:
            raise ValueError("Binary STL triangle table is truncated.")
        for _ in range(count):
            record = handle.read(50)
            if len(record) != 50:
                raise ValueError("Binary STL triangle record is truncated.")
            coords = struct.unpack("<12f", record[:48])
            base = len(vertices)
            vertices.extend([
                (float(coords[3]), float(coords[4]), float(coords[5])),
                (float(coords[6]), float(coords[7]), float(coords[8])),
                (float(coords[9]), float(coords[10]), float(coords[11])),
            ])
            triangles.append((base, base + 1, base + 2))
    return vertices, triangles


def _analyze_stl(file_path: str) -> Dict[str, Any]:
    result = _base_result(file_path, "stl")
    result["units"] = {
        "linear": "mm",
        "source": "assumed",
        "note": "STL does not carry a standardized unit declaration; Shilp treats uploaded STL coordinates as millimetres.",
    }
    result["assumptions"].append("STL coordinates are interpreted as millimetres.")

    is_ascii = False
    try:
        with open(file_path, "rb") as handle:
            head = handle.read(512)
        is_ascii = head.lstrip().lower().startswith(b"solid") and b"facet" in head.lower() and b"vertex" in head.lower()
    except OSError:
        pass

    vertices, triangles = _parse_ascii_stl(open(file_path, "r", encoding="utf-8", errors="replace").read()) if is_ascii else _parse_binary_stl(file_path)
    metrics = _mesh_metrics(vertices, triangles)
    result["geometry"].update(metrics)
    result["meshHealth"] = metrics["meshHealth"]
    result["objects"] = [{
        "id": "stl_object_1",
        "name": os.path.basename(file_path),
        "triangleCount": len(triangles),
    }]
    result["subType"] = "ascii" if is_ascii else "binary"
    return _finalize_result(result)


def _parse_obj_index(token: str, count: int) -> Optional[int]:
    raw = token.split("/", 1)[0]
    try:
        value = int(raw)
    except ValueError:
        return None
    return value - 1 if value > 0 else count + value


def _parse_mtl(mtl_path: str) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
    materials: List[Dict[str, Any]] = []
    textures: List[str] = []
    current: Optional[Dict[str, Any]] = None
    try:
        with open(mtl_path, "r", encoding="utf-8", errors="replace") as handle:
            for raw_line in handle:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split(maxsplit=1)
                key = parts[0].lower()
                value = parts[1].strip() if len(parts) > 1 else ""
                if key == "newmtl":
                    current = {"name": value}
                    materials.append(current)
                elif current is not None and key == "kd":
                    nums = value.split()
                    if len(nums) >= 3:
                        rgb = [max(0.0, min(1.0, _float(n))) for n in nums[:3]]
                        current["diffuseColor"] = "#%02X%02X%02X" % tuple(int(round(c * 255)) for c in rgb)
                elif current is not None and key in {"map_kd", "map_d", "bump", "map_bump"}:
                    textures.append(value)
                    current.setdefault("textures", []).append(value)
    except OSError:
        return [], [], []
    return materials, list(dict.fromkeys(textures)), [m["name"] for m in materials]


def _analyze_obj(file_path: str) -> Dict[str, Any]:
    result = _base_result(file_path, "obj")
    result["units"] = {
        "linear": "mm",
        "source": "assumed",
        "note": "OBJ does not require a unit declaration. Shilp treats uploaded OBJ coordinates as millimetres unless a future importer profile overrides this.",
    }
    result["assumptions"].append("OBJ coordinates are interpreted as millimetres.")

    vertices: List[Vector] = []
    triangles: List[Triangle] = []
    objects: List[Dict[str, Any]] = []
    material_assignments: List[Dict[str, Any]] = []
    mtllibs: List[str] = []
    current_object = os.path.basename(file_path)
    current_material: Optional[str] = None
    object_triangles: Dict[str, int] = {}

    with open(file_path, "r", encoding="utf-8", errors="replace") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split()
            if not parts:
                continue
            key = parts[0].lower()
            values = parts[1:]
            if key == "v" and len(values) >= 3:
                vertices.append((_float(values[0]), _float(values[1]), _float(values[2])))
            elif key in {"o", "g"}:
                current_object = " ".join(values).strip() or f"object_{len(objects) + 1}"
                if current_object not in object_triangles:
                    object_triangles[current_object] = 0
                    objects.append({"id": current_object, "name": current_object, "triangleCount": 0})
            elif key == "mtllib" and values:
                mtllibs.extend(values)
            elif key == "usemtl":
                current_material = values[0] if values else None
            elif key == "f" and len(values) >= 3:
                indices = [_parse_obj_index(token, len(vertices)) for token in values]
                if any(i is None or i < 0 or i >= len(vertices) for i in indices):
                    continue
                first = indices[0]
                for pos in range(1, len(indices) - 1):
                    tri = (first, indices[pos], indices[pos + 1])
                    triangles.append(tri)
                    object_triangles[current_object] = object_triangles.get(current_object, 0) + 1
                    if current_material:
                        material_assignments.append({
                            "object": current_object,
                            "material": current_material,
                            "triangleIndex": len(triangles) - 1,
                        })

    metrics = _mesh_metrics(vertices, triangles)
    result["geometry"].update(metrics)
    result["meshHealth"] = metrics["meshHealth"]
    if not objects:
        objects = [{"id": "obj_1", "name": os.path.basename(file_path), "triangleCount": len(triangles)}]
    else:
        for obj in objects:
            obj["triangleCount"] = object_triangles.get(obj["name"], 0)
    result["objects"] = objects

    for mtl_name in mtllibs:
        mtl_path = os.path.join(os.path.dirname(file_path), mtl_name)
        mtl_materials, textures, _ = _parse_mtl(mtl_path)
        if mtl_materials:
            result["materials"].extend(mtl_materials)
        result["textures"].extend(textures)

    result["materials"] = list({m["name"]: m for m in result["materials"] if m.get("name")} .values())
    result["materialAssignments"] = material_assignments
    result["textures"] = sorted(set(result["textures"]))
    for material in result["materials"]:
        color = material.get("diffuseColor")
        if color:
            result["colors"].append({"hex": color, "source": "mtl", "material": material["name"]})
    return _finalize_result(result)


def _xml_elements(root: ET.Element, name: str) -> Iterable[ET.Element]:
    target = name.lower()
    for element in root.iter():
        if _local_name(element.tag) == target:
            yield element


def _apply_unit(value: str, multiplier: float) -> float:
    return _float(value) * multiplier


def _parse_3mf_model_xml(xml_bytes: bytes, multiplier: float) -> Tuple[List[Vector], List[Triangle], List[Dict[str, Any]], List[Dict[str, Any]]]:
    root = ET.fromstring(xml_bytes)
    vertices: List[Vector] = []
    triangles: List[Triangle] = []
    objects: List[Dict[str, Any]] = []

    for object_el in _xml_elements(root, "object"):
        object_id = object_el.attrib.get("id", f"object_{len(objects) + 1}")
        name = object_el.attrib.get("name") or object_id
        before = len(triangles)
        local_vertices: List[Vector] = []
        local_triangles: List[Triangle] = []
        mesh_el = next(_xml_elements(object_el, "mesh"), None)
        if mesh_el is not None:
            vertices_el = next(_xml_elements(mesh_el, "vertices"), None)
            if vertices_el is not None:
                for vertex_el in _xml_elements(vertices_el, "vertex"):
                    local_vertices.append((
                        _apply_unit(vertex_el.attrib.get("x", "0"), multiplier),
                        _apply_unit(vertex_el.attrib.get("y", "0"), multiplier),
                        _apply_unit(vertex_el.attrib.get("z", "0"), multiplier),
                    ))
            triangles_el = next(_xml_elements(mesh_el, "triangles"), None)
            if triangles_el is not None:
                for tri_el in _xml_elements(triangles_el, "triangle"):
                    try:
                        local_triangles.append((
                            int(tri_el.attrib.get("v1", "0")),
                            int(tri_el.attrib.get("v2", "0")),
                            int(tri_el.attrib.get("v3", "0")),
                        ))
                    except ValueError:
                        continue
        base = len(vertices)
        vertices.extend(local_vertices)
        triangles.extend((a + base, b + base, c + base) for a, b, c in local_triangles)
        objects.append({
            "id": object_id,
            "name": name,
            "triangleCount": len(triangles) - before,
            "meshVertexCount": len(local_vertices),
        })

    build_items = []
    build = next(_xml_elements(root, "build"), None)
    if build is not None:
        for item in _xml_elements(build, "item"):
            build_items.append({
                "objectId": item.attrib.get("objectid"),
                "transform": item.attrib.get("transform"),
                "printable": item.attrib.get("printable"),
            })

    return vertices, triangles, objects, build_items


def _extract_standard_3mf_colors(root_xml: bytes) -> List[Dict[str, Any]]:
    # Standard 3MF color information may appear as displaycolor/custom extension
    # values. We intentionally treat it as rendering/design metadata unless an
    # explicit material assignment can be associated with geometry.
    colors: List[Dict[str, Any]] = []
    try:
        root = ET.fromstring(root_xml)
    except ET.ParseError:
        return colors
    for element in root.iter():
        for key, value in element.attrib.items():
            if key.lower().endswith("displaycolor") or key.lower() in {"color", "colour"}:
                value = value.strip()
                if re.match(r"^#[0-9A-Fa-f]{6}$", value):
                    colors.append({"hex": value.upper(), "source": "3mf_xml"})
    return list({(c["hex"], c.get("source")): c for c in colors}.values())


def _parse_3mf_transform(value: Optional[str]) -> Optional[Tuple[float, ...]]:
    if not value:
        return None
    parts = value.split()
    if len(parts) != 12:
        return None
    try:
        values = tuple(float(part) for part in parts)
    except ValueError:
        return None
    return values


def _apply_3mf_transform(vertices: Sequence[Vector], transform: Sequence[float]) -> List[Vector]:
    # 3MF transform order is: a b c d e f g h i j k l,
    # representing matrix rows [a b c j], [d e f k], [g h i l].
    m = transform
    return [
        (
            m[0] * x + m[1] * y + m[2] * z + m[9],
            m[3] * x + m[4] * y + m[5] * z + m[10],
            m[6] * x + m[7] * y + m[8] * z + m[11],
        )
        for x, y, z in vertices
    ]


def _extract_3mf_materials_and_assignments(xml_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """Extract standard 3MF Materials & Properties resources without assuming a
    particular slicer/vendor namespace."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return [], [], [], []

    resources: Dict[str, Dict[str, Any]] = {}
    colors: List[Dict[str, Any]] = []
    textures: List[str] = []

    for resource in _xml_elements(root, "basematerials"):
        rid = resource.attrib.get("id")
        if rid:
            for index, base in enumerate(_xml_elements(resource, "base")):
                name = base.attrib.get("name") or f"material_{rid}_{index + 1}"
                color = base.attrib.get("displaycolor") or base.attrib.get("color")
                entry = {"name": name, "resourceId": rid, "propertyIndex": index, "type": "base"}
                if color and re.match(r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$", color):
                    entry["color"] = color.upper()
                    colors.append({"hex": color.upper(), "source": "3mf_basematerials", "material": name})
                resources[f"{rid}:{index}"] = entry

    for resource in _xml_elements(root, "colorgroup"):
        rid = resource.attrib.get("id")
        if rid:
            for index, color_el in enumerate(_xml_elements(resource, "color")):
                color = color_el.attrib.get("color")
                entry = {"name": f"color_{rid}_{index + 1}", "resourceId": rid, "propertyIndex": index, "type": "color"}
                if color and re.match(r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$", color):
                    entry["color"] = color.upper()
                    colors.append({"hex": color.upper(), "source": "3mf_colorgroup"})
                resources[f"{rid}:{index}"] = entry

    for texture in _xml_elements(root, "texture2d"):
        path = texture.attrib.get("path") or texture.attrib.get("contenttype")
        if path:
            textures.append(path)

    assignments: List[Dict[str, Any]] = []
    for object_el in _xml_elements(root, "object"):
        object_name = object_el.attrib.get("name") or object_el.attrib.get("id") or "object"
        triangle_index = 0
        for triangle in _xml_elements(object_el, "triangle"):
            pid = triangle.attrib.get("pid")
            if pid is not None:
                # p1/p2/p3 represent property indices when present. If absent,
                # property index 0 is the best available interpretation.
                props = []
                for key in ("p1", "p2", "p3"):
                    raw = triangle.attrib.get(key)
                    if raw is not None:
                        try:
                            props.append(int(raw))
                        except ValueError:
                            pass
                if not props:
                    props = [0]
                for prop in sorted(set(props)):
                    resource = resources.get(f"{pid}:{prop}")
                    if resource:
                        assignment = {
                            "object": object_name,
                            "triangleIndex": triangle_index,
                            "resourceId": pid,
                            "propertyIndex": prop,
                            "type": resource.get("type"),
                        }
                        if resource.get("name"):
                            assignment["material"] = resource["name"]
                        if resource.get("color"):
                            assignment["color"] = resource["color"]
                        assignments.append(assignment)
            triangle_index += 1

    materials = []
    for resource in resources.values():
        if resource.get("type") == "base":
            material = {
                "id": f"{resource['resourceId']}:{resource['propertyIndex']}",
                "name": resource["name"],
            }
            if resource.get("color"):
                material["diffuseColor"] = resource["color"]
            materials.append(material)
    colors = list({(c.get("hex"), c.get("source"), c.get("material")): c for c in colors if c.get("hex")}.values())
    return materials, colors, assignments, sorted(set(textures))


def _analyze_3mf(file_path: str) -> Dict[str, Any]:
    result = _base_result(file_path, "3mf")
    try:
        with zipfile.ZipFile(file_path, "r") as zf:
            names = zf.namelist()
            lower_names = {name.lower(): name for name in names}

            project_entries = [name for name in names if name.lower().endswith("project_settings.config")]
            model_settings = [name for name in names if name.lower().endswith("model_settings.config")]
            slice_info = [name for name in names if name.lower().endswith("slice_info.config")]
            has_embedded_gcode = any(name.lower().endswith(".gcode") for name in names)
            has_bambu_or_orca = bool(project_entries or model_settings or slice_info)
            has_prusa = any("prusaslicer.ini" in name.lower() or "slic3r.ini" in name.lower() for name in names)
            object_model_names = [
                name for name in names
                if name.lower().startswith("3d/objects/") and name.lower().endswith(".model")
            ]
            root_model = next((name for name in names if name.lower().endswith("3d/3dmodel.model")), None)
            root_build_items: List[Dict[str, Any]] = []
            root_xml_data: Optional[bytes] = None
            if root_model:
                try:
                    root_xml_data = zf.read(root_model)
                    root_xml = ET.fromstring(root_xml_data)
                    for item in _xml_elements(root_xml, "item"):
                        root_build_items.append({
                            "objectId": item.attrib.get("objectid"),
                            "transform": item.attrib.get("transform"),
                            "printable": item.attrib.get("printable"),
                        })
                except (KeyError, ET.ParseError):
                    root_xml_data = None

            result["textures"].extend([name for name in names if "/textures/" in name.lower() or name.lower().startswith("3d/textures/")])

            result["project"] = {
                "isSlicerProject": has_bambu_or_orca or has_prusa,
                "slicerOrigin": "bambu_or_orca" if has_bambu_or_orca else ("prusa" if has_prusa else None),
                "isMultiPlate": len([n for n in names if "plate_" in n.lower()]) > 1,
                "hasEmbeddedGcode": has_embedded_gcode,
                "hasProjectSettings": bool(project_entries),
                "hasModelSettings": bool(model_settings),
                "hasSliceInfo": bool(slice_info),
            }
            result["capabilities"]["slicerSettings"] = has_bambu_or_orca or has_prusa

            if not root_model and not object_model_names:
                raise ValueError("3MF archive does not contain a recognized 3D model XML entry.")

            # Prefer object model entries when present because Bambu/Orca commonly
            # keeps object geometry in 3D/Objects/*.model while root model contains
            # component/build references.
            model_entries = object_model_names or ([root_model] if root_model else [])
            all_vertices: List[Vector] = []
            all_triangles: List[Triangle] = []
            all_objects: List[Dict[str, Any]] = []
            build_items: List[Dict[str, Any]] = []

            for name in model_entries:
                data = zf.read(name)
                # Core 3MF defaults to millimetres. Read the model's unit declaration.
                multiplier = 1.0
                try:
                    xml_root = ET.fromstring(data)
                    unit = xml_root.attrib.get("unit", "millimeter").lower()
                    multiplier = _UNIT_TO_MM.get(unit, 1.0)
                    if unit not in _UNIT_TO_MM and unit != "millimeter":
                        result["assumptions"].append(f"Unknown 3MF unit '{unit}' treated as millimetres.")
                    result["units"] = {"linear": "mm", "source": "3mf model unit", "declaredUnit": unit}
                except ET.ParseError:
                    pass
                vertices, triangles, objects, builds = _parse_3mf_model_xml(data, multiplier)
                std_materials, std_colors, std_assignments, std_textures = _extract_3mf_materials_and_assignments(data)
                result["materials"].extend(std_materials)
                result["colors"].extend(std_colors)
                result["materialAssignments"].extend(std_assignments)
                result["textures"].extend(std_textures)
                base = len(all_vertices)
                all_vertices.extend(vertices)
                all_triangles.extend((a + base, b + base, c + base) for a, b, c in triangles)
                all_objects.extend(objects)
                build_items.extend(builds)
                result["colors"].extend(_extract_standard_3mf_colors(data))

            # Bambu/Orca commonly stores raw geometry in 3D/Objects/*.model and
            # the actual plate placement/scale in the root 3dmodel.model build item.
            # When there is one external geometry object and one printable build
            # item, apply that transform so analyzer dimensions match the placed
            # model instead of the raw mesh coordinates. For ambiguous assemblies,
            # we keep source coordinates and explicitly flag the limitation.
            if len(object_model_names) == 1 and len(root_build_items) == 1 and all_vertices:
                transform = _parse_3mf_transform(root_build_items[0].get("transform"))
                if transform:
                    all_vertices = _apply_3mf_transform(all_vertices, transform)
                    result["project"]["placementTransformApplied"] = True
            elif root_build_items and any(item.get("transform") for item in root_build_items):
                result["project"]["placementTransformApplied"] = False
                result["assumptions"].append(
                    "Multiple 3MF build objects/transforms were detected; analyzer retained source mesh coordinates. The authoritative slicer must resolve final assembled dimensions."
                )

            metrics = _mesh_metrics(all_vertices, all_triangles)
            result["geometry"].update(metrics)
            result["meshHealth"] = metrics["meshHealth"]
            result["objects"] = all_objects
            result["project"]["buildItems"] = root_build_items or build_items
            result["project"]["placementTransformsPresent"] = any(item.get("transform") for item in (root_build_items or build_items))
            if result["project"]["placementTransformsPresent"]:
                result["assumptions"].append(
                    "3MF build-item transforms were detected. Geometry metrics describe source mesh coordinates; authoritative print dimensions must come from the selected slicer after placement/orientation."
                )

            # Existing Bambu/Orca analyzer supplies exact filament palette + paint
            # assignment information. Keep it as an enhancement, never as the only
            # definition of what a 3MF is.
            if has_bambu_or_orca:
                try:
                    from app.color_parser import parse_3mf_colors  # type: ignore
                    color_analysis = parse_3mf_colors(file_path)
                    if color_analysis.get("success"):
                        result["colorAnalysis"] = color_analysis
                        for entry in color_analysis.get("colors") or []:
                            result["colors"].append({
                                "hex": entry.get("hex"),
                                "source": "bambu_or_orca_project",
                                "sourceFilament": entry.get("sourceFilament"),
                                "materialType": entry.get("materialType"),
                                "materialName": entry.get("materialName"),
                                "density": entry.get("density"),
                                "vendor": entry.get("vendor"),
                            })
                            material_type = entry.get("materialType")
                            if material_type:
                                result["materials"].append({
                                    "id": entry.get("sourceFilament"),
                                    "name": material_type,
                                    "density": entry.get("density"),
                                    "vendor": entry.get("vendor"),
                                    "profile": entry.get("materialName"),
                                })
                                result["materialAssignments"].append({
                                    "sourceFilament": entry.get("sourceFilament"),
                                    "materialType": material_type,
                                    "color": entry.get("hex"),
                                })
                except Exception as exc:  # pragma: no cover - enhancement only
                    result["assumptions"].append(f"Bambu/Orca color parser unavailable or failed: {exc}")

            # De-duplicate simple metadata without discarding distinct source tags.
            result["colors"] = list({
                (c.get("hex"), c.get("source"), c.get("sourceFilament")): c
                for c in result["colors"] if c.get("hex")
            }.values())
            result["materials"] = list({
                (str(m.get("id")), m.get("name"), m.get("profile")): m
                for m in result["materials"] if m.get("name")
            }.values())

            if has_embedded_gcode:
                result["processing"]["requiresManualReview"] = False # Bypassed
                result["processing"]["reason"] = "This 3MF contains existing G-code/toolpath data; upload the original unsliced model for a fresh production quote."
                result["processing"]["recommendedRoute"] = "pre_sliced_review"

            return _finalize_result(result)
    except (zipfile.BadZipFile, OSError, ET.ParseError, ValueError) as exc:
        return {
            "success": False,
            "error": str(exc),
            "format": "3mf",
            "fileName": os.path.basename(file_path),
        }


def analyze_model(file_path: str) -> Dict[str, Any]:
    """Analyze a supported model and return normalized Shilp model intelligence."""
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".stl":
            return _analyze_stl(file_path)
        if ext == ".obj":
            return _analyze_obj(file_path)
        if ext == ".3mf":
            return _analyze_3mf(file_path)
        return {
            "success": False,
            "error": f"Universal analyzer does not support '{ext or 'unknown'}'.",
            "format": ext.lstrip(".") or "unknown",
            "fileName": os.path.basename(file_path),
        }
    except (OSError, ValueError, struct.error, ET.ParseError) as exc:
        return {
            "success": False,
            "error": f"Model analysis failed: {exc}",
            "format": ext.lstrip(".") or "unknown",
            "fileName": os.path.basename(file_path),
        }


if __name__ == "__main__":
    import json
    import sys

    for model in sys.argv[1:]:
        print(json.dumps(analyze_model(model), indent=2))
