"""
Model Intelligence & File Classifier (Phase 2A)
Deep inspection of file structure and internal headers/metadata to accurately distinguish:
- Original 3D models (STL, OBJ, standard 3MF)
- Slicer projects (Bambu/Orca/Prusa project files)
- Sliced files (G-code, sliced 3MF projects containing toolpaths/slices)
- CAD files (STEP/STP)
"""

import os
import zipfile
from typing import Dict, Any

class ModelClassification:
    ORIGINAL_MODEL = "original_model"
    SLICER_PROJECT = "slicer_project"
    SLICED_FILE = "sliced_file"
    CAD_STEP = "cad_step"
    UNSUPPORTED_OR_UNKNOWN = "unsupported_or_unknown"

def inspect_file(file_path: str) -> Dict[str, Any]:
    if not os.path.exists(file_path):
        return {
            "success": False,
            "error": f"File not found: {file_path}"
        }

    file_name = os.path.basename(file_path)
    ext = os.path.splitext(file_name)[1].lower()

    # 1. Plain G-Code check
    if ext in [".gcode", ".gco", ".g"]:
        return {
            "success": True,
            "classification": ModelClassification.SLICED_FILE,
            "detected_format": "gcode",
            "can_slice": False,
            "message": "File is pre-sliced G-code. Automatic re-slicing cannot be performed. Please upload the original 3D model."
        }

    # 2. STEP / STP check
    if ext in [".step", ".stp"]:
        return {
            "success": True,
            "classification": ModelClassification.CAD_STEP,
            "detected_format": "step",
            "can_slice": False,
            "message": "STEP format detected. STEP compatibility gate is currently in progress."
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
            "message": "Valid STL model."
        }

    # 4. OBJ check
    if ext == ".obj":
        return {
            "success": True,
            "classification": ModelClassification.ORIGINAL_MODEL,
            "detected_format": "obj",
            "can_slice": True,
            "message": "Valid OBJ model."
        }

    # 5. Deep inspection for 3MF (ZIP container)
    if ext == ".3mf":
        if not zipfile.is_zipfile(file_path):
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "error": "Corrupt or invalid 3MF archive (not a valid ZIP structure)."
            }

        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                namelist = zf.namelist()
                
                # Check for sliced toolpaths or slice_info
                has_slice_info = any("slice_info.config" in name.lower() for name in namelist)
                has_embedded_gcode = any(name.lower().endswith(".gcode") for name in namelist)
                
                if has_slice_info or has_embedded_gcode:
                    return {
                        "success": True,
                        "classification": ModelClassification.SLICED_FILE,
                        "detected_format": "sliced_3mf",
                        "can_slice": False,
                        "message": "Pre-sliced 3MF file detected. Please upload the original unsliced 3D model."
                    }

                # Check for Bambu / Orca / Prusa project configurations
                has_bambu_project = any("model_settings.config" in name.lower() or "project_settings.config" in name.lower() for name in namelist)
                has_prusa_project = any("prusaslicer.ini" in name.lower() or "slic3r.ini" in name.lower() for name in namelist)

                if has_bambu_project or has_prusa_project:
                    return {
                        "success": True,
                        "classification": ModelClassification.SLICER_PROJECT,
                        "detected_format": "slicer_project_3mf",
                        "can_slice": True,
                        "slicer_origin": "bambu_or_orca" if has_bambu_project else "prusa",
                        "message": "Slicer project 3MF detected. Contains embedded geometry and custom printer/process parameters."
                    }

                # Standard clean 3MF
                has_3dmodel = any("3d/3dmodel.model" in name.lower() for name in namelist)
                if has_3dmodel:
                    return {
                        "success": True,
                        "classification": ModelClassification.ORIGINAL_MODEL,
                        "detected_format": "standard_3mf",
                        "can_slice": True,
                        "message": "Standard 3MF model."
                    }

                return {
                    "success": True,
                    "classification": ModelClassification.ORIGINAL_MODEL,
                    "detected_format": "generic_3mf",
                    "can_slice": True,
                    "message": "3MF archive with geometry."
                }

        except Exception as e:
            return {
                "success": False,
                "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
                "can_slice": False,
                "error": f"Error inspecting 3MF file: {str(e)}"
            }

    return {
        "success": False,
        "classification": ModelClassification.UNSUPPORTED_OR_UNKNOWN,
        "can_slice": False,
        "error": f"Unsupported file extension: {ext}"
    }

if __name__ == "__main__":
    import sys, json
    if len(sys.argv) > 1:
        print(json.dumps(inspect_file(sys.argv[1]), indent=2))
    else:
        print("Usage: python file_inspector.py <path_to_model>")
