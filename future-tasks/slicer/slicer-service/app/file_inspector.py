"""
Shilp Studio Model Intelligence & Deep Content Inspector
Inspects file structure, internal archive headers, XML elements, and mesh topology:
- STL: Watertightness, manifoldness, auto-repair check
- OBJ + MTL: Geometry and texture relationships
- 3MF: Standard 3MF, Bambu Studio / Orca / Prusa project 3MF, multi-plate / multi-object detection
- Sliced files (G-code, G-code in 3MF): Classified as pre_sliced_toolpath
- ZIP archives: Hardened Zip-Slip / Zip-Bomb validation and model discovery
- CAD STEP / STP: Routed to manual review
"""

import os
import zipfile
import re
from typing import Dict, Any, List, Optional

from app.mesh_validator import validate_mesh, MeshRepairStatus
from app.archive_handler import inspect_and_extract_archive, ArchiveSecurityError
from app.color_parser import parse_3mf_colors
from app.universal_model_analyzer import analyze_model

class ModelClassification:
    ORIGINAL_MODEL = "geometry_bearing_project"
    SLICER_PROJECT = "geometry_bearing_project"
    SLICED_FILE = "pre_sliced_toolpath"
    CAD_STEP = "cad_step"
    ARCHIVE_CONTAINER = "archive_container"
    UNSUPPORTED_OR_UNKNOWN = "unsupported_or_invalid"

def _attach_model_analysis(result: Dict[str, Any], file_path: str) -> Dict[str, Any]:
    """Attach normalized, format-independent model intelligence to inspection results."""
    try:
        analysis = analyze_model(file_path)
        result["model_analysis"] = analysis
        if analysis.get("success"):
            result["analysis_version"] = analysis.get("analysisVersion")
            result["analysis_capabilities"] = analysis.get("capabilities", {})
            result["analysis_processing"] = analysis.get("processing", {})
    except Exception as exc:
        result["model_analysis"] = {"success": False, "error": f"Universal model analysis unavailable: {exc}"}
    return result

def inspect_file(file_path: str, check_mesh: bool = True) -> Dict[str, Any]:
    """
    Deep content inspection with mesh topology and format validation.
    """
    if not os.path.exists(file_path):
        return {
            "success": False,
            "error": f"File not found: {file_path}",
            "can_slice": False,
            "can_retry": False,
            "workshop_review_available": True
        }

    file_name = os.path.basename(file_path)
    ext = os.path.splitext(file_name)[1].lower()
    size_bytes = os.path.getsize(file_path)

    # 1. Plain G-Code check
    if ext in [".gcode", ".gco", ".g"]:
        return {
            "success": True,
            "classification": ModelClassification.SLICED_FILE,
            "detected_format": "gcode",
            "can_slice": False,
            "can_retry": False,
            "workshop_review_available": True,
            "message": "This file is pre-sliced G-code machine instructions. Slicing engines require original 3D geometry (STL, OBJ, or 3MF) to calculate toolpaths and quotes."
        }

    # 2. STEP / STP CAD format check -> Manual workshop review
    if ext in [".step", ".stp"]:
        return {
            "success": True,
            "classification": ModelClassification.CAD_STEP,
            "detected_format": "step",
            "can_slice": False,
            "can_retry": False,
            "workshop_review_available": True,
            "error_code": "MANUAL_REVIEW_STEP",
            "message": "STEP CAD format detected. Automatic STEP slicing is disabled for production fidelity. Routed to workshop engineer review for manual preparation."
        }

    # 3. ZIP Archive check
    if ext == ".zip":
        try:
            # We inspect without permanently extracting by checking entries safely
            with zipfile.ZipFile(file_path, "r") as zf:
                infolist = zf.infolist()
                if len(infolist) > 500:
                    return {
                        "success": False,
                        "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                        "can_slice": False,
                        "error_code": "ZIP_BOMB_ENTRY_LIMIT",
                        "workshop_review_available": True,
                        "message": "Archive exceeds safety limit of 500 entries."
                    }

                total_sz = sum(i.file_size for i in infolist)
                if total_sz > 200 * 1024 * 1024:
                    return {
                        "success": False,
                        "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                        "can_slice": False,
                        "error_code": "ZIP_BOMB_SIZE_LIMIT",
                        "workshop_review_available": True,
                        "message": f"Archive uncompressed size ({total_sz / (1024*1024):.1f} MB) exceeds 200 MB limit."
                    }

                # Check for zip-slip
                for i in infolist:
                    normalized = os.path.normpath(i.filename)
                    if normalized.startswith("..") or os.path.isabs(normalized):
                        return {
                            "success": False,
                            "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                            "can_slice": False,
                            "error_code": "ZIP_SLIP_ATTACK_DETECTED",
                            "workshop_review_available": True,
                            "message": "Archive contains invalid relative path traversal entries."
                        }

                model_entries = [i.filename for i in infolist if os.path.splitext(i.filename)[1].lower() in [".stl", ".obj", ".3mf"]]
                if not model_entries:
                    return {
                        "success": False,
                        "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                        "can_slice": False,
                        "error_code": "NO_MODELS_IN_ARCHIVE",
                        "workshop_review_available": True,
                        "message": "ZIP archive does not contain recognized 3D model files (STL, OBJ, 3MF)."
                    }

                return {
                    "success": True,
                    "classification": ModelClassification.ARCHIVE_CONTAINER,
                    "detected_format": "zip_archive",
                    "can_slice": True,
                    "can_retry": True,
                    "workshop_review_available": True,
                    "contained_models": model_entries,
                    "is_multi_object": len(model_entries) > 1,
                    "message": f"Valid ZIP archive containing {len(model_entries)} model(s)."
                }
        except zipfile.BadZipFile:
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "error_code": "CORRUPT_ARCHIVE",
                "workshop_review_available": True,
                "message": "Corrupt or invalid ZIP archive."
            }

    # 4. STL check (with mesh validation)
    if ext == ".stl":
        is_ascii = False
        try:
            with open(file_path, "rb") as f:
                header = f.read(80)
                if header.startswith(b"solid") and not any(b > 127 for b in header):
                    is_ascii = True
        except Exception:
            pass

        mesh_res = validate_mesh(file_path) if check_mesh else {"valid": True, "repair_status": MeshRepairStatus.UNMODIFIED}
        if not mesh_res.get("valid"):
            return {
                "success": False,
                "classification": ModelClassification.ORIGINAL_MODEL,
                "detected_format": "stl",
                "sub_type": "ascii" if is_ascii else "binary",
                "can_slice": False,
                "error_code": mesh_res.get("error_code", "INVALID_MESH"),
                "mesh_repair_status": mesh_res.get("repair_status", MeshRepairStatus.FAILED),
                "workshop_review_available": True,
                "message": mesh_res.get("message", "STL failed mesh validity check.")
            }

        return _attach_model_analysis({
            "success": True,
            "classification": ModelClassification.ORIGINAL_MODEL,
            "detected_format": "stl",
            "sub_type": "ascii" if is_ascii else "binary",
            "can_slice": True,
            "can_retry": True,
            "mesh_repair_status": mesh_res.get("repair_status", MeshRepairStatus.UNMODIFIED),
            "mesh_details": mesh_res,
            "workshop_review_available": True,
            "message": "Valid STL model."
        }, file_path)

    # 5. OBJ check (with mesh validation)
    if ext == ".obj":
        mesh_res = validate_mesh(file_path) if check_mesh else {"valid": True, "repair_status": MeshRepairStatus.UNMODIFIED}
        if not mesh_res.get("valid"):
            return {
                "success": False,
                "classification": ModelClassification.ORIGINAL_MODEL,
                "detected_format": "obj",
                "can_slice": False,
                "error_code": mesh_res.get("error_code", "INVALID_MESH"),
                "mesh_repair_status": mesh_res.get("repair_status", MeshRepairStatus.FAILED),
                "workshop_review_available": True,
                "message": mesh_res.get("message", "OBJ failed mesh validity check.")
            }

        return _attach_model_analysis({
            "success": True,
            "classification": ModelClassification.ORIGINAL_MODEL,
            "detected_format": "obj",
            "can_slice": True,
            "can_retry": True,
            "mesh_repair_status": mesh_res.get("repair_status", MeshRepairStatus.UNMODIFIED),
            "mesh_details": mesh_res,
            "workshop_review_available": True,
            "message": "Valid OBJ model."
        }, file_path)

    # 6. Deep inspection for 3MF (ZIP container)
    if ext == ".3mf":
        if not zipfile.is_zipfile(file_path):
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "can_retry": False,
                "workshop_review_available": True,
                "error_code": "CORRUPT_3MF",
                "error": "Corrupt or invalid 3MF archive (not a valid ZIP structure)."
            }

        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                namelist = zf.namelist()

                has_3dmodel = any(name.lower().startswith("3d/") and name.lower().endswith(".model") for name in namelist) or any(name.lower().endswith(".model") for name in namelist)
                has_embedded_gcode = any(name.lower().endswith(".gcode") for name in namelist)

                if has_embedded_gcode:
                    return {
                        "success": True,
                        "classification": ModelClassification.SLICED_FILE,
                        "detected_format": "sliced_3mf",
                        "can_slice": False,
                        "can_retry": False,
                        "workshop_review_available": True,
                        "error_code": "UNSUPPORTED_PRE_SLICED_FILE",
                        "message": "Pre-sliced 3MF project detected (contains existing toolpaths). Please upload the original unsliced 3D model, or request workshop review."
                    }

                # Multi-plate detection: Bambu/Orca plates or multiple .model / plate configs
                plate_configs = [n for n in namelist if "plate_" in n.lower() or "slice_info.config" in n.lower()]
                has_multiple_plates = len([n for n in namelist if "plate_" in n.lower()]) > 1

                has_bambu_project = any("model_settings.config" in name.lower() or "project_settings.config" in name.lower() or "slice_info.config" in name.lower() for name in namelist)
                has_prusa_project = any("prusaslicer.ini" in name.lower() or "slic3r.ini" in name.lower() for name in namelist)

                # Validate mesh
                mesh_res = validate_mesh(file_path) if check_mesh else {"valid": True, "repair_status": MeshRepairStatus.UNMODIFIED}
                if not mesh_res.get("valid"):
                    return {
                        "success": False,
                        "classification": ModelClassification.ORIGINAL_MODEL,
                        "detected_format": "3mf",
                        "can_slice": False,
                        "error_code": mesh_res.get("error_code", "INVALID_3MF_GEOMETRY"),
                        "mesh_repair_status": mesh_res.get("repair_status", MeshRepairStatus.FAILED),
                        "workshop_review_available": True,
                        "message": mesh_res.get("message", "3MF failed geometry check.")
                    }

                if has_bambu_project or has_prusa_project:
                    # Phase 1: Analyze Bambu/Orca color and material assignments.
                    # This is metadata only at this stage; it does not alter slicing.
                    color_analysis = None
                    if has_bambu_project:
                        try:
                            color_analysis = parse_3mf_colors(file_path)
                        except Exception as exc:
                            color_analysis = {
                                "success": False,
                                "isMultiColor": False,
                                "colors": [],
                                "error": f"Color analysis failed: {exc}",
                            }

                    if has_3dmodel:
                        return _attach_model_analysis({
                            "success": True,
                            "classification": ModelClassification.SLICER_PROJECT,
                            "detected_format": "slicer_project_3mf",
                            "can_slice": True,
                            "can_retry": True,
                            "workshop_review_available": True,
                            "slicer_origin": "bambu_or_orca" if has_bambu_project else "prusa",
                            "is_multi_plate": has_multiple_plates,
                            "mesh_repair_status": mesh_res.get(
                                "repair_status",
                                MeshRepairStatus.UNMODIFIED
                            ),
                            "color_analysis": color_analysis,
                            "message": "Slicer project 3MF detected. Contains embedded geometry. Foreign printer and process settings will be safely overridden with Shilp production profile."
                        }, file_path)
                    else:
                        return {
                            "success": True,
                            "classification": ModelClassification.SLICED_FILE,
                            "detected_format": "project_without_mesh",
                            "can_slice": False,
                            "can_retry": False,
                            "workshop_review_available": True,
                            "error_code": "PROJECT_WITHOUT_MESH",
                            "message": "Slicer project archive contains configuration but no valid 3D geometry mesh was found."
                        }

                if has_3dmodel:
                    return _attach_model_analysis({
                        "success": True,
                        "classification": ModelClassification.ORIGINAL_MODEL,
                        "detected_format": "standard_3mf",
                        "can_slice": True,
                        "can_retry": True,
                        "is_multi_plate": has_multiple_plates,
                        "mesh_repair_status": mesh_res.get("repair_status", MeshRepairStatus.UNMODIFIED),
                        "workshop_review_available": True,
                        "message": "Valid standard 3MF model."
                    }, file_path)

        except Exception as e:
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "can_retry": False,
                "workshop_review_available": True,
                "error_code": "INSPECTION_ERROR",
                "error": f"Error inspecting 3MF file: {str(e)}"
            }

    return {
        "success": False,
        "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
        "can_slice": False,
        "can_retry": False,
        "workshop_review_available": True,
        "error_code": "UNSUPPORTED_FORMAT",
        "error": f"Unsupported file extension: {ext}"
    }
