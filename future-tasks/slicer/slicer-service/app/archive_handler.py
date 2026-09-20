"""
Shilp Studio Archive Handler (ZIP Hardening)
Implements:
- Zip-Slip Protection: Rejects entries attempting path traversal outside extraction directory
- Zip-Bomb Protection: Validates uncompressed size and entry count before writing to disk
- Isolated per-job temporary workspace
- Model & dependency identification (STL, OBJ + MTL + textures, 3MF)
"""

import os
import zipfile
import shutil
from typing import Dict, Any, List, Optional, Tuple

MAX_ZIP_ENTRIES = 500
MAX_DECOMPRESSED_SIZE_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_SINGLE_FILE_SIZE_BYTES = 100 * 1024 * 1024   # 100 MB

SUPPORTED_MODEL_EXTENSIONS = {".stl", ".obj", ".3mf"}
SUPPORTED_ASSET_EXTENSIONS = {".mtl", ".png", ".jpg", ".jpeg", ".bmp", ".tga", ".webp"}

class ArchiveSecurityError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message

def inspect_and_extract_archive(
    zip_path: str,
    target_dir: str
) -> Dict[str, Any]:
    """
    Safely inspects and extracts a ZIP archive into target_dir with strict Zip-Slip
    and Zip-Bomb verification.

    Returns metadata including extracted models, primary model path, and dependencies.
    """
    if not os.path.exists(zip_path):
        raise ArchiveSecurityError("FILE_NOT_FOUND", f"Archive not found: {zip_path}")

    if not zipfile.is_zipfile(zip_path):
        raise ArchiveSecurityError("INVALID_ZIP", "File is not a valid ZIP archive.")

    target_dir_abs = os.path.abspath(target_dir)
    os.makedirs(target_dir_abs, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        infolist = zf.infolist()

        # 1. Zip-Bomb Entry Count Protection
        if len(infolist) > MAX_ZIP_ENTRIES:
            raise ArchiveSecurityError(
                "ZIP_BOMB_ENTRY_LIMIT",
                f"Archive contains {len(infolist)} entries, exceeding safety cap of {MAX_ZIP_ENTRIES}."
            )

        # 2. Zip-Bomb Total Size Protection (before extraction)
        total_uncompressed = 0
        for info in infolist:
            total_uncompressed += info.file_size
            if info.file_size > MAX_SINGLE_FILE_SIZE_BYTES:
                raise ArchiveSecurityError(
                    "ZIP_ENTRY_TOO_LARGE",
                    f"Archive entry '{info.filename}' is {info.file_size / (1024*1024):.1f} MB, exceeding 100 MB limit."
                )

        if total_uncompressed > MAX_DECOMPRESSED_SIZE_BYTES:
            raise ArchiveSecurityError(
                "ZIP_BOMB_SIZE_LIMIT",
                f"Total uncompressed size ({total_uncompressed / (1024*1024):.1f} MB) exceeds safety cap of 200 MB."
            )

        # 3. Zip-Slip Path Traversal Protection (before extraction)
        for info in infolist:
            member_name = info.filename
            # Normalize target path
            dest_path = os.path.abspath(os.path.join(target_dir_abs, member_name))
            # Must start with target_dir_abs
            try:
                common = os.path.commonpath([target_dir_abs, dest_path])
                if common != target_dir_abs:
                    raise ArchiveSecurityError(
                        "ZIP_SLIP_ATTACK_DETECTED",
                        f"Archive entry '{member_name}' attempts directory traversal outside destination."
                    )
            except ValueError:
                raise ArchiveSecurityError(
                    "ZIP_SLIP_ATTACK_DETECTED",
                    f"Archive entry '{member_name}' attempts drive or path traversal."
                )

        # 4. Safe Extraction
        for info in infolist:
            # Skip directories or safely extract
            if info.is_dir():
                os.makedirs(os.path.abspath(os.path.join(target_dir_abs, info.filename)), exist_ok=True)
                continue

            dest_path = os.path.abspath(os.path.join(target_dir_abs, info.filename))
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            with zf.open(info) as src, open(dest_path, "wb") as dst:
                shutil.copyfileobj(src, dst)

    # 5. Discover extracted models and assets
    discovered_models: List[str] = []
    discovered_assets: List[str] = []

    for root, _, files in os.walk(target_dir_abs):
        for f in files:
            full_path = os.path.join(root, f)
            ext = os.path.splitext(f)[1].lower()
            if ext in SUPPORTED_MODEL_EXTENSIONS:
                discovered_models.append(full_path)
            elif ext in SUPPORTED_ASSET_EXTENSIONS:
                discovered_assets.append(full_path)

    if not discovered_models:
        raise ArchiveSecurityError(
            "NO_MODELS_IN_ARCHIVE",
            "Archive extracted successfully, but no valid 3D model (STL, OBJ, or 3MF) was found."
        )

    # Pick primary model: preferential order 3MF > STL > OBJ
    primary_model = None
    for ext_pref in [".3mf", ".stl", ".obj"]:
        for m in discovered_models:
            if m.lower().endswith(ext_pref):
                primary_model = m
                break
        if primary_model:
            break

    if not primary_model:
        primary_model = discovered_models[0]

    return {
        "success": True,
        "extracted_dir": target_dir_abs,
        "primary_model": primary_model,
        "all_models": discovered_models,
        "assets": discovered_assets,
        "total_models": len(discovered_models),
        "is_multi_object": len(discovered_models) > 1
    }

