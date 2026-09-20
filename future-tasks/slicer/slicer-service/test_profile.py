from app.printer_eligibility import resolve_eligible_production_printer
from app.slice_core import read_profile_envelope
production_profiles = [{'id': 'BAMBU-A1-MINI-01', 'printerProfileFile': 'bambu_production_0.4.ini', 'buildVolumeX': 180, 'buildVolumeY': 180, 'buildVolumeZ': 180, 'enabled': True, 'defaultForProduction': True, 'supportsMulticolor': True, 'slicerAdapter': 'bambu_studio_cli'}]
dims = {'x': 141.8, 'y': 66.3, 'z': 93.4}
production_profile = resolve_eligible_production_printer(production_profiles, dims, True).selected_profile
print("Selected:", production_profile)
active_envelope = read_profile_envelope("")
bvx = production_profile.get("buildVolumeX")
bvy = production_profile.get("buildVolumeY")
bvz = production_profile.get("buildVolumeZ")
if not active_envelope or not all(k in active_envelope for k in ("x", "y", "z")):
    active_envelope = {
        "x": float(active_envelope.get("x") or bvx),
        "y": float(active_envelope.get("y") or bvy),
        "z": float(active_envelope.get("z") or bvz),
    }
print("Active envelope:", active_envelope)
