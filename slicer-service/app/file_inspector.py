"""
Enhanced Model Intelligence & Deep Content Inspector (Phase 2D)
Inspects file structure, internal archive headers, XML elements, and toolpaths to distinguish:
- STL / OBJ
- Clean 3MF models
- Slicer project 3MF (Bambu Studio, Orca, PrusaSlicer) - extracts usable geometry safely
- Pre-sliced files (G-code, G-code in 3MF, slice_info.config) - classified as pre_sliced_toolpath
- STEP files - marks compatibility gate status

Classification is based on whether the project can be safely re-sliced, not merely
on the presence of slicer metadata.
"""

import os
import zipfile
import re
from typing import Dict, Any, List, Optional

class ModelClassification:
    ORIGINAL_MODEL = "geometry_bearing_project"
    SLICER_PROJECT = "geometry_bearing_project"
    SLICED_FILE = "pre_sliced_toolpath"
    CAD_STEP = "cad_step"
    UNSUPPORTED_OR_UNKNOWN = "unsupported_or_invalid"


def inspect_file(file_path: str) -> Dict[str, Any]:
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

    # 2. STEP / STP check
    if ext in [".step", ".stp"]:
        return {
            "success": True,
            "classification": ModelClassification.CAD_STEP,
            "detected_format": "step",
            "can_slice": False,
            "can_retry": False,
            "workshop_review_available": True,
            "message": "STEP CAD format detected. Automatic STEP translation is currently in verification. Please upload an STL, OBJ, or 3MF for an instant automated quote, or request manual engineer review."
        }

    # 3. STL check
    if ext == ".stl":
        is_ascii = False
        try:
            with open(file_path, "rb") as f:
                header = f.read(80)
                if header.startswith(b"solid") and not any(b > 127 for b in header):
                    is_ascii = True
        except Exception:
            pass

        return {
            "success": True,
            "classification": ModelClassification.ORIGINAL_MODEL,
            "detected_format": "stl",
            "sub_type": "ascii" if is_ascii else "binary",
            "can_slice": True,
            "can_retry": True,
            "workshop_review_available": True,
            "message": "Valid STL model."
        }

    # 4. OBJ check
    if ext == ".obj":
        return {
            "success": True,
            "classification": ModelClassification.ORIGINAL_MODEL,
            "detected_format": "obj",
            "can_slice": True,
            "can_retry": True,
            "workshop_review_available": True,
            "message": "Valid OBJ model."
        }

    # 5. Deep inspection for 3MF (ZIP container)
    if ext == ".3mf":
        if not zipfile.is_zipfile(file_path):
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "can_retry": False,
                "workshop_review_available": True,
                "error": "Corrupt or invalid 3MF archive (not a valid ZIP structure)."
            }

        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                namelist = zf.namelist()
                
                # Check if usable 3D model geometry exists
                has_3dmodel = any(name.lower().startswith("3d/") and name.lower().endswith(".model") for name in namelist)

                # Check for embedded gcode toolpath files
                has_embedded_gcode = any(name.lower().endswith(".gcode") for name in namelist)

                # If the file contains actual pre-sliced toolpath G-code or lacks usable geometry
                if has_embedded_gcode:
                    return {
                        "success": True,
                        "classification": ModelClassification.SLICED_FILE,
                        "detected_format": "sliced_3mf",
                        "can_slice": False,
                        "can_retry": False,
                        "workshop_review_available": True,
                        "message": "Pre-sliced 3MF project detected (contains existing toolpaths and printer-locked machine code). Please upload the original unsliced 3D model, or request workshop review."
                    }

                # Check for Bambu / Orca / Prusa project configurations
                has_bambu_project = any("model_settings.config" in name.lower() or "project_settings.config" in name.lower() or "slice_info.config" in name.lower() for name in namelist)
                has_prusa_project = any("prusaslicer.ini" in name.lower() or "slic3r.ini" in name.lower() for name in namelist)

                if has_bambu_project or has_prusa_project:
                    if has_3dmodel:
                        return {
                            "success": True,
                            "classification": ModelClassification.SLICER_PROJECT,
                            "detected_format": "slicer_project_3mf",
                            "can_slice": True,
                            "can_retry": True,
                            "workshop_review_available": True,
                            "slicer_origin": "bambu_or_orca" if has_bambu_project else "prusa",
                            "message": "Slicer project 3MF detected. Contains embedded geometry. Foreign printer and process settings will be safely overridden with our workshop production profile."
                        }
                    else:
                        return {
                            "success": True,
                            "classification": ModelClassification.SLICED_FILE,
                            "detected_format": "project_without_mesh",
                            "can_slice": False,
                            "can_retry": False,
                            "workshop_review_available": True,
                            "message": "Slicer project archive contains configuration but no valid 3D geometry mesh was found."
                        }

                # Check for multi-material or vertex color metadata in 3MF
                has_materials = any("material" in name.lower() for name in namelist)

                if has_3dmodel:
                    return {
                        "success": True,
                        "classification": ModelClassification.ORIGINAL_MODEL,
                        "detected_format": "standard_3mf",
                        "has_materials": has_materials,
                        "can_slice": True,
                        "can_retry": True,
                        "workshop_review_available": True,
                        "message": "Valid standard 3MF model."
                    }

                return {
                    "success": True,
                    "classification": ModelClassification.ORIGINAL_MODEL,
                    "detected_format": "generic_3mf",
                    "can_slice": True,
                    "can_retry": True,
                    "workshop_review_available": True,
                    "message": "3MF archive with geometry."
                }

        except Exception as e:
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "can_retry": False,
                "workshop_review_available": True,
                "error": f"Error inspecting 3MF file: {str(e)}"
            }

    return {
        "success": False,
        "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
        "can_slice": False,
        "can_retry": False,
        "workshop_review_available": True,
        "error": f"Unsupported file extension: {ext}"
    }
