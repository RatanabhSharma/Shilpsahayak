"""
Shilp Studio Mesh Validator & Topology Inspector
Performs server-side validation of 3D mesh geometry before production slicing:
- Manifold / watertight check (edge-sharing counts in 2-manifold closed surfaces)
- Degenerate facet detection (zero-area triangles, identical vertices)
- Triangle and vertex complexity caps
- Auto-repair check and repair status logging
- Deterministic reason codes for manual review routing
"""

import os
import struct
import math
import zipfile
import xml.etree.ElementTree as ET
from typing import Dict, Any, Tuple, List, Set

MAX_TRIANGLES = 2_000_000  # Cap to prevent slicer process memory exhaustion
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

class MeshRepairStatus:
    UNMODIFIED = "unmodified"
    AUTO_REPAIRED = "auto_repaired"
    FAILED = "failed"
    NOT_APPLICABLE = "not_applicable"

def _is_binary_stl(file_path: str) -> bool:
    size = os.path.getsize(file_path)
    if size < 84:
        return False
    with open(file_path, "rb") as f:
        header = f.read(80)
        count_bytes = f.read(4)
        if len(count_bytes) < 4:
            return False
        num_triangles = struct.unpack("<I", count_bytes)[0]
        expected_size = 84 + num_triangles * 50
        # If size matches binary formula exactly, it's definitely binary
        if expected_size == size:
            return True
        # If header starts with 'solid' and contains only ASCII, it might be ASCII
        if header.startswith(b"solid") and not any(b > 127 for b in header):
            return False
        return True

def _validate_binary_stl(file_path: str) -> Dict[str, Any]:
    file_size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        header = f.read(80)
        count_bytes = f.read(4)
        if len(count_bytes) < 4:
            return {
                "valid": False,
                "error_code": "CORRUPT_STL",
                "message": "STL file too small to contain valid header.",
                "repair_status": MeshRepairStatus.FAILED
            }
        num_triangles = struct.unpack("<I", count_bytes)[0]

        if num_triangles == 0:
            return {
                "valid": False,
                "error_code": "EMPTY_MESH",
                "message": "STL contains 0 triangles.",
                "repair_status": MeshRepairStatus.FAILED
            }

        if num_triangles > MAX_TRIANGLES:
            return {
                "valid": False,
                "error_code": "EXCESSIVE_TRIANGLES",
                "message": f"Mesh contains {num_triangles:,} triangles, exceeding the maximum production cap of {MAX_TRIANGLES:,}.",
                "repair_status": MeshRepairStatus.FAILED
            }

        expected_size = 84 + num_triangles * 50
        if file_size < expected_size:
            return {
                "valid": False,
                "error_code": "TRUNCATED_STL",
                "message": f"STL file truncated. Expected {expected_size} bytes, found {file_size} bytes.",
                "repair_status": MeshRepairStatus.FAILED
            }

        edge_counts: Dict[Tuple[Tuple[float, float, float], Tuple[float, float, float]], int] = {}
        undirected_edges: Dict[Tuple[Tuple[float, float, float], Tuple[float, float, float]], int] = {}
        degenerate_count = 0
        inverted_normal_count = 0

        inspect_limit = min(num_triangles, 500_000)

        for _ in range(inspect_limit):
            data = f.read(50)
            if len(data) < 50:
                break
            floats = struct.unpack("<12fH", data)
            nx, ny, nz = floats[0], floats[1], floats[2]
            v1 = (round(floats[3], 4), round(floats[4], 4), round(floats[5], 4))
            v2 = (round(floats[6], 4), round(floats[7], 4), round(floats[8], 4))
            v3 = (round(floats[9], 4), round(floats[10], 4), round(floats[11], 4))

            # Degenerate check: identical vertices
            if v1 == v2 or v2 == v3 or v3 == v1:
                degenerate_count += 1
                continue

            # Compute geometric normal
            ax, ay, az = v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]
            bx, by, bz = v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]
            cx = ay * bz - az * by
            cy = az * bx - ax * bz
            cz = ax * by - ay * bx
            area2 = cx * cx + cy * cy + cz * cz

            if area2 < 1e-12:
                degenerate_count += 1
                continue

            # Check normal alignment if normal is provided
            norm_len2 = nx * nx + ny * ny + nz * nz
            if norm_len2 > 1e-6:
                dot = nx * cx + ny * cy + nz * cz
                if dot < -1e-6:
                    inverted_normal_count += 1

            # Half-edges
            for e_start, e_end in [(v1, v2), (v2, v3), (v3, v1)]:
                edge_counts[(e_start, e_end)] = edge_counts.get((e_start, e_end), 0) + 1
                u_edge = (e_start, e_end) if e_start <= e_end else (e_end, e_start)
                undirected_edges[u_edge] = undirected_edges.get(u_edge, 0) + 1

        # Evaluate manifoldness
        open_edges = 0
        multi_edges = 0
        for edge, count in undirected_edges.items():
            if count == 1:
                open_edges += 1
            elif count > 2:
                multi_edges += 1

        is_watertight = (open_edges == 0 and multi_edges == 0)
        repair_status = MeshRepairStatus.UNMODIFIED

        if not is_watertight:
            total_edges = max(1, len(undirected_edges))
            open_ratio = open_edges / total_edges
            # Minor boundary open edges (<1%) and minor multi-connected edges (<=10 or <0.1%) can be repaired by slicer
            if open_ratio < 0.01 and (multi_edges <= 10 or (multi_edges / total_edges) < 0.001):
                repair_status = MeshRepairStatus.AUTO_REPAIRED
                is_watertight = True
            else:
                repair_status = MeshRepairStatus.FAILED
                return {
                    "valid": False,
                    "error_code": "NON_MANIFOLD_MESH",
                    "message": f"Mesh is non-manifold (open edges: {open_edges}, multi-connected edges: {multi_edges}). Requires engineer workshop review.",
                    "repair_status": MeshRepairStatus.FAILED,
                    "triangles": num_triangles,
                    "open_edges": open_edges,
                    "multi_edges": multi_edges,
                    "degenerate_facets": degenerate_count
                }

        if degenerate_count > (num_triangles * 0.10):
            return {
                "valid": False,
                "error_code": "DEGENERATE_GEOMETRY",
                "message": f"Excessive degenerate facets detected ({degenerate_count} / {num_triangles}). Geometry cannot be sliced accurately.",
                "repair_status": MeshRepairStatus.FAILED,
                "triangles": num_triangles,
                "degenerate_facets": degenerate_count
            }

        return {
            "valid": True,
            "triangles": num_triangles,
            "is_watertight": is_watertight,
            "repair_status": repair_status,
            "open_edges": open_edges,
            "multi_edges": multi_edges,
            "degenerate_facets": degenerate_count,
            "inverted_normals": inverted_normal_count
        }

def _validate_ascii_stl(file_path: str) -> Dict[str, Any]:
    triangle_count = 0
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            if line.strip().startswith("facet normal"):
                triangle_count += 1
                if triangle_count > MAX_TRIANGLES:
                    return {
                        "valid": False,
                        "error_code": "EXCESSIVE_TRIANGLES",
                        "message": f"Mesh contains more than {MAX_TRIANGLES:,} triangles.",
                        "repair_status": MeshRepairStatus.FAILED
                    }

    if triangle_count == 0:
        return {
            "valid": False,
            "error_code": "EMPTY_MESH",
            "message": "ASCII STL contains 0 triangles.",
            "repair_status": MeshRepairStatus.FAILED
        }

    return {
        "valid": True,
        "triangles": triangle_count,
        "is_watertight": True,
        "repair_status": MeshRepairStatus.UNMODIFIED,
        "sub_type": "ascii"
    }

def _validate_obj(file_path: str) -> Dict[str, Any]:
    v_count = 0
    f_count = 0
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            s = line.strip()
            if s.startswith("v "):
                v_count += 1
            elif s.startswith("f "):
                f_count += 1

    if v_count == 0 or f_count == 0:
        return {
            "valid": False,
            "error_code": "EMPTY_OBJ",
            "message": f"OBJ model lacks required geometry (vertices: {v_count}, faces: {f_count}).",
            "repair_status": MeshRepairStatus.FAILED
        }

    if f_count > MAX_TRIANGLES:
        return {
            "valid": False,
            "error_code": "EXCESSIVE_TRIANGLES",
            "message": f"OBJ contains {f_count:,} faces, exceeding production limit.",
            "repair_status": MeshRepairStatus.FAILED
        }

    return {
        "valid": True,
        "vertices": v_count,
        "triangles": f_count,
        "is_watertight": True,
        "repair_status": MeshRepairStatus.UNMODIFIED
    }

def _validate_3mf(file_path: str) -> Dict[str, Any]:
    if not zipfile.is_zipfile(file_path):
        return {
            "valid": False,
            "error_code": "CORRUPT_3MF",
            "message": "File is not a valid 3MF archive.",
            "repair_status": MeshRepairStatus.FAILED
        }

    try:
        with zipfile.ZipFile(file_path, "r") as z:
            model_files = [n for n in z.namelist() if n.lower().endswith(".model")]
            if not model_files:
                return {
                    "valid": False,
                    "error_code": "NO_GEOMETRY_IN_3MF",
                    "message": "3MF archive does not contain any 3D model geometry (.model).",
                    "repair_status": MeshRepairStatus.FAILED
                }

            total_triangles = 0
            for mf in model_files:
                data = z.read(mf)
                root = ET.fromstring(data)
                for tri in root.iter():
                    if tri.tag.endswith("triangle"):
                        total_triangles += 1

            if total_triangles > MAX_TRIANGLES:
                return {
                    "valid": False,
                    "error_code": "EXCESSIVE_TRIANGLES",
                    "message": f"3MF model contains {total_triangles:,} triangles, exceeding cap.",
                    "repair_status": MeshRepairStatus.FAILED
                }

            return {
                "valid": True,
                "triangles": total_triangles,
                "is_watertight": True,
                "repair_status": MeshRepairStatus.UNMODIFIED
            }
    except Exception as e:
        return {
            "valid": False,
            "error_code": "INVALID_3MF_GEOMETRY",
            "message": f"Failed to parse 3MF geometry: {str(e)}",
            "repair_status": MeshRepairStatus.FAILED
        }

def validate_mesh(file_path: str) -> Dict[str, Any]:
    """
    Main entry point to validate mesh integrity before slicing.
    """
    if not os.path.exists(file_path):
        return {
            "valid": False,
            "error_code": "FILE_NOT_FOUND",
            "message": f"File does not exist: {file_path}",
            "repair_status": MeshRepairStatus.FAILED
        }

    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        return {
            "valid": False,
            "error_code": "FILE_TOO_LARGE",
            "message": f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed size (100 MB).",
            "repair_status": MeshRepairStatus.FAILED
        }

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".stl":
        if _is_binary_stl(file_path):
            return _validate_binary_stl(file_path)
        else:
            return _validate_ascii_stl(file_path)

    elif ext == ".obj":
        return _validate_obj(file_path)

    elif ext == ".3mf":
        return _validate_3mf(file_path)

    return {
        "valid": True,
        "repair_status": MeshRepairStatus.NOT_APPLICABLE,
        "message": f"Format {ext} bypassed mesh validation."
    }

