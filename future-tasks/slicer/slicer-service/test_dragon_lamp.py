import uuid
import time
import json
import logging
import app.main

app.main.resolve_production_printer_profile = lambda x: dict(x)

from app.main import process_slicing_job, JOBS, quote_store
from app.main import JobIdFilter

logger = logging.getLogger()
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s [%(levelname)s] [jobId=%(job_id)s] %(message)s')
handler = logging.StreamHandler()
handler.setFormatter(formatter)
handler.addFilter(JobIdFilter())
logger.addHandler(handler)

saved_path = r"D:\Shilp buss\Supabase\New folder\Shilpsahayak\slicer-service\app\storage\feab0661-dfd4-4e79-8e2c-1f85943dd198_Dragon_Lamp_Update_03-29-2026.3mf"

pricing_config = {
    "currency": "INR",
    "bufferPercent": 20,
    "failureRatePercent": 5,
    "marginPercent": 30,
    "packagingFlatRate": 50,
    "taxRatePercent": 18
}

materials = {
    "pla": {
        "costPerKg": 1000,
        "density": 1.24
    },
    "petg": {
        "costPerKg": 1200,
        "density": 1.27
    }
}

profiles = [
    {
        "id": "BAMBU-A1-MINI-01",
        "displayName": "Bambu Lab A1 Mini",
        "slicerAdapter": "bambu_studio_cli",
        "machineProfileFile": "Bambu Lab A1 mini 0.4 nozzle.json",
        "processProfileFile": "0.20mm Standard @BBL A1M.json",
        "materialProfileIds": ["Generic PLA @BBL A1M"],
        "filamentProfileFiles": ["Generic PLA @BBL A1M.json"],
        "buildVolumeX": 180,
        "buildVolumeY": 180,
        "buildVolumeZ": 180,
        "usableBuildVolumeX": 165,
        "usableBuildVolumeY": 165,
        "usableBuildVolumeZ": 180,
        "printerCost": 25000,
        "printerPowerWatts": 100,
        "printerLifespanHours": 10000,
        "enabled": True,
        "supportsMulticolor": True,
        "defaultInfill": 15
    },
    {
        "id": "BAMBU-A1-01",
        "displayName": "Bambu Lab A1",
        "slicerAdapter": "bambu_studio_cli",
        "machineProfileFile": "Bambu Lab A1 0.4 nozzle.json",
        "processProfileFile": "0.20mm Standard @BBL A1.json",
        "materialProfileIds": ["Generic PLA @BBL A1"],
        "filamentProfileFiles": ["Generic PLA @BBL A1.json"],
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
        "usableBuildVolumeX": 241,
        "usableBuildVolumeY": 241,
        "usableBuildVolumeZ": 256,
        "printerCost": 35000,
        "printerPowerWatts": 150,
        "printerLifespanHours": 10000,
        "enabled": True,
        "supportsMulticolor": True,
        "defaultInfill": 15
    }
]

job_id = str(uuid.uuid4())

params = {
    "material": "pla",
    "qualityProfile": "standard",
    "infillPercent": 15,
    "scaleFactor": 1.0,
    "scaleX": 1.0,
    "scaleY": 1.0,
    "scaleZ": 1.0,
    "requestedDimensions": {},
    "quantity": 1,
    "supportMode": "auto",
    "packagingIncluded": False,
    "pricingConfig": pricing_config,
    "materials": materials,
    "quantityDiscounts": [],
    "productionPrinterProfiles": profiles,
    "pricingVersion": "v1",
    "forceReslice": True
}

JOBS[job_id] = {
    "id": job_id,
    "fileName": "Dragon_Lamp_Update_03-29-2026.3mf",
    "status": "QUEUED",
    "stage_message": "Starting...",
    "createdAt": time.time(),
    "params": params,
    "idempotencyKey": None
}

process_slicing_job(job_id, saved_path, params)

job_res = JOBS[job_id]
print("\n--- FINAL JOB STATUS ---")
print("Status:", job_res.get("status"))
print("Error:", job_res.get("error"))
print("Error Code:", job_res.get("error_code"))

result = job_res.get("result", {})
if result:
    print("\n--- QUOTE INFO ---")
    slice_data = result.get("slice", {})
    plates = slice_data.get("plates", [])
    
    print(f"Plate Count: {slice_data.get('plateCount') or len(plates)}")
    print(f"Total Filament (g): {slice_data.get('filamentGrams')}")
    print(f"Total Print Time (s): {slice_data.get('printTimeSeconds')}")
    
    quote_data = result.get("quote", {})
    print(f"Final Quote: {quote_data.get('currency')} {quote_data.get('totalPrice')}")
    
    print("\n--- PER-PLATE DETAILS ---")
    for i, p in enumerate(plates):
        print(f"Plate {i+1}:")
        print(f"  Dimensions: {p.get('dimensions')}")
        print(f"  Selected Printer: {p.get('selected_printer', {}).get('id')}")
        print(f"  Filament: {p.get('filament_grams')} g")
        print(f"  Print Time: {p.get('print_time_hours')} hours")

