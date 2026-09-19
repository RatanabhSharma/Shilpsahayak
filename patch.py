with open("slicer-service/app/main.py", "r") as f:
    content = f.read()

old_logic = """        active_envelope = read_profile_envelope(production_profile.get("profilePath", ""))
        # If active_envelope is missing x, y, or z, populate from authoritative buildVolumeX/Y/Z
        bvx = production_profile.get("buildVolumeX")
        bvy = production_profile.get("buildVolumeY")
        bvz = production_profile.get("buildVolumeZ")
        if not active_envelope or not all(k in active_envelope for k in ("x", "y", "z")):
            if (
                isinstance(bvx, (int, float)) and bvx > 0
                and isinstance(bvy, (int, float)) and bvy > 0
                and isinstance(bvz, (int, float)) and bvz > 0
            ):
                active_envelope = {
                    "x": float(active_envelope.get("x") or bvx),
                    "y": float(active_envelope.get("y") or bvy),
                    "z": float(active_envelope.get("z") or bvz),
                }"""

new_logic = """        # Populate active_envelope from authoritative buildVolumeX/Y/Z in the DB
        bvx = production_profile.get("buildVolumeX")
        bvy = production_profile.get("buildVolumeY")
        bvz = production_profile.get("buildVolumeZ")
        
        if (
            isinstance(bvx, (int, float)) and bvx > 0
            and isinstance(bvy, (int, float)) and bvy > 0
            and isinstance(bvz, (int, float)) and bvz > 0
        ):
            active_envelope = {
                "x": float(bvx),
                "y": float(bvy),
                "z": float(bvz),
            }
        else:
            active_envelope = read_profile_envelope(production_profile.get("profilePath", ""))
            if not active_envelope or not all(k in active_envelope for k in ("x", "y", "z")):
                active_envelope = {"x": 256.0, "y": 256.0, "z": 256.0}"""

if old_logic in content:
    with open("slicer-service/app/main.py", "w") as f:
        f.write(content.replace(old_logic, new_logic))
    print("Patched successfully!")
else:
    print("Could not find old logic!")
