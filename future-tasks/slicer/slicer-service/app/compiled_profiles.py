"""
Shilp Studio — Bambu Studio Machine Profile Compiler
=====================================================

Bambu Studio machine definition JSON files (e.g. 'Bambu Lab A1 0.4 nozzle.json')
use an "include" array referencing template JSON files:
    "include": [
        "Bambu Lab A1 0.4 nozzle template change_filament_gcode",
        "Bambu Lab A1 0.4 nozzle template machine_start_gcode",
        "Bambu Lab A1 0.4 nozzle template machine_end_gcode",
        ...
    ]

Bambu Studio GUI compiles and inlines these templates when authoring projects.
However, when Bambu Studio CLI is invoked via:
    --load-settings "<path>/Bambu Lab A1 0.4 nozzle.json"
the CLI parser does NOT recursively expand template includes.
As a result, 'change_filament_gcode' is left empty, eliminating all purge extrusion
during multi-material tool changes and skewing filament usage and print time.

This module resolves and inlines all template includes into a fully-compiled machine
JSON file, ensuring the Bambu Studio CLI executes authoritative toolpaths with full
purge and start/end macros.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional, Dict, Any

logger = logging.getLogger("shilp_studio.compiled_profiles")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMPILED_DIR = os.path.join(BASE_DIR, "profiles", "compiled")
os.makedirs(COMPILED_DIR, exist_ok=True)


def get_or_compile_bambu_machine_profile(
    raw_machine_path: Optional[str],
    force_recompile: bool = False
) -> Optional[str]:
    """
    Given an uncompiled or raw Bambu Studio machine profile path, inline all template
    includes and return the path to the fully-compiled JSON profile.

    If the profile contains no 'include' array, the original path is returned.
    """
    if not raw_machine_path or not os.path.isfile(raw_machine_path):
        return None

    filename = os.path.basename(raw_machine_path)
    compiled_path = os.path.join(COMPILED_DIR, filename)

    # Check if compiled cache is newer than source file
    if (
        not force_recompile
        and os.path.isfile(compiled_path)
        and os.path.getmtime(compiled_path) >= os.path.getmtime(raw_machine_path)
    ):
        return compiled_path

    try:
        with open(raw_machine_path, "r", encoding="utf-8") as f:
            data: Dict[str, Any] = json.load(f)

        includes = data.get("include")
        if not isinstance(includes, list) or not includes:
            # No template includes needed
            return raw_machine_path

        resource_dir = os.path.dirname(raw_machine_path)
        compiled_data = dict(data)

        for template_name in includes:
            template_file = os.path.join(resource_dir, f"{template_name}.json")
            if not os.path.isfile(template_file):
                # Search case-insensitively if needed
                candidate = next(
                    (
                        os.path.join(resource_dir, fn)
                        for fn in os.listdir(resource_dir)
                        if fn.lower() == f"{template_name.lower()}.json"
                    ),
                    None
                )
                if candidate and os.path.isfile(candidate):
                    template_file = candidate

            if os.path.isfile(template_file):
                try:
                    with open(template_file, "r", encoding="utf-8") as tf:
                        template_data = json.load(tf)
                        for k, v in template_data.items():
                            if k not in ("name", "instantiation"):
                                compiled_data[k] = v
                except Exception as te:
                    logger.warning(
                        f"Failed to merge template '{template_name}': {te}",
                        extra={"job_id": "profile_compiler"}
                    )

        with open(compiled_path, "w", encoding="utf-8") as out_f:
            json.dump(compiled_data, out_f, indent=2)

        has_change_gcode = bool(compiled_data.get("change_filament_gcode"))
        logger.info(
            f"Successfully compiled Bambu machine profile '{filename}' "
            f"(inlined {len(includes)} template(s), change_filament_gcode present: {has_change_gcode})",
            extra={"job_id": "profile_compiler"}
        )
        return compiled_path

    except Exception as e:
        logger.error(
            f"Failed to compile Bambu machine profile '{raw_machine_path}': {e}",
            extra={"job_id": "profile_compiler"}
        )
        return raw_machine_path

