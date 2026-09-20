import os
import sys
import json
import time
import requests

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STITCH_FILE = os.path.join(BASE_DIR, "public", "Stitchxpikachu.3mf")
if not os.path.exists(STITCH_FILE):
    # fallback to find one in storage
    alt_file = os.path.join(BASE_DIR, "slicer-service", "app", "storage", "015d7611-4262-4dc0-afc5-1306fd211b86_Stitchxpikachu.3mf")
    if os.path.exists(alt_file):
        STITCH_FILE = alt_file

print(f"Using model file: {STITCH_FILE} (exists: {os.path.exists(STITCH_FILE)})")

PROFILES = [
    {
        "id": "BAMBU-A1-MINI-01",
        "manufacturer": "Bambu Lab",
        "model": "Bambu Lab A1 mini",
        "displayName": "Bambu Lab A1 mini",
        "printerProfileFile": "bambu_production_0.4.ini",
        "enabled": True,
        "defaultForProduction": True,
        "slicerAdapter": "bambu_studio_cli",
        "slicerName": "Bambu Studio",
        "slicerVersion": "02.08.02.61",
        "slicerSettingsId": "GM020",
        "printerSettingsId": "Bambu Lab A1 mini 0.4 nozzle",
        "processSettingsId": "0.20mm Standard @BBL A1M",
        "materialProfileIds": ["Generic PLA @BBL A1M"],
        "machineProfileFile": "Bambu Lab A1 mini 0.4 nozzle.json",
        "processProfileFile": "0.20mm Standard @BBL A1M.json",
        "buildVolumeX": 180,
        "buildVolumeY": 180,
        "buildVolumeZ": 180,
        "nozzleDiameter": 0.4,
        "extruderCount": 1,
        "supportsMulticolor": True,
        "machineParameters": {"printerStructure": "i3", "printerVariant": "0.4"},
        "defaultLayerHeight": 0.2,
        "defaultInfill": 20,
        "defaultSupportMode": "auto",
        "toolpathDefaults": {"arrange": 0},
        "profileVersion": "1.0",
    },
    {
        "id": "BAMBU-A1-01",
        "manufacturer": "Bambu Lab",
        "model": "A1",
        "displayName": "Bambu Lab A1",
        "printerProfileFile": "bambu_a1_0.4.ini",
        "enabled": True,
        "defaultForProduction": False,
        "slicerAdapter": "bambu_studio_cli",
        "slicerName": "Bambu Studio",
        "slicerVersion": "02.08.02.61",
        "slicerSettingsId": "GM020",
        "printerSettingsId": "Bambu Lab A1 0.4 nozzle",
        "processSettingsId": "0.20mm Standard @BBL A1",
        "materialProfileIds": ["Generic PLA @BBL A1M"],
        "machineProfileFile": "Bambu Lab A1 0.4 nozzle.json",
        "processProfileFile": "0.20mm Standard @BBL A1.json",
        "buildVolumeX": 256,
        "buildVolumeY": 256,
        "buildVolumeZ": 256,
        "nozzleDiameter": 0.4,
        "extruderCount": 1,
        "supportsMulticolor": True,
        "machineParameters": {},
        "defaultLayerHeight": 0.2,
        "defaultInfill": 20,
        "defaultSupportMode": "auto",
        "toolpathDefaults": {"arrange": 0},
        "profileVersion": "Bambu Studio machine profile GM020",
    },
]

PRICING_CONFIG = {
    "printerCost": 25000.0,
    "printerLifespanHours": 5000.0,
    "printerPowerWatts": 100.0,
    "electricityRatePerKwh": 8.0,
    "failureBufferPercent": 10.0,
    "labourRatePerHour": 200.0,
    "finishingMinutes": 5.0,
    "baseServiceFee": 30.0,
    "minimumOrderValue": 149.0,
    "markupMultiplier": 2.2,
    "gstEnabled": True,
    "gstRate": 18.0,
    "packagingPrice": 20.0,
}

MATERIALS = {
    "pla": {"pricePerGram": 4.5, "density": 1.24},
    "petg": {"pricePerGram": 5.5, "density": 1.27},
}

def submit_job(file_path):
    with open(file_path, "rb") as f:
        files = {"file": (os.path.basename(file_path), f, "application/octet-stream")}
        data = {
            "material": "pla",
            "qualityProfile": "standard",
            "infillPercent": "20",
            "quantity": "1",
            "supportMode": "auto",
            "packagingIncluded": "false",
            "pricingConfigJson": json.dumps(PRICING_CONFIG),
            "materialsJson": json.dumps(MATERIALS),
            "productionPrinterProfilesJson": json.dumps(PROFILES),
        }
        resp = requests.post("http://127.0.0.1:8000/api/slice/jobs", files=files, data=data)
    assert resp.status_code == 200, f"Submit failed: {resp.text}"
    return resp.json()["jobId"]

def poll_job(job_id, timeout=180):
    start = time.time()
    while time.time() - start < timeout:
        resp = requests.get(f"http://127.0.0.1:8000/api/slice/jobs/{job_id}")
        assert resp.status_code == 200, f"Poll failed: {resp.text}"
        data = resp.json()
        status = data.get("status")
        stage = data.get("stage_message")
        print(f"[{time.time()-start:.1f}s] status={status}, stage={stage}")
        if status in ("completed", "failed"):
            return data
        time.sleep(2)
    raise TimeoutError(f"Job {job_id} timed out after {timeout}s")

def get_job_log_lines(job_id):
    log_path = os.path.join(BASE_DIR, "slicer-service", "app", "slicer_debug.log")
    if not os.path.exists(log_path):
        return []
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        return [line.strip() for line in f if f"jobId={job_id}" in line or f"[{job_id}]" in line]

print("\n--- Submitting First Real Browser Job (Must execute fresh slice, NOT serve stale cache) ---")
job1_id = submit_job(STITCH_FILE)
print(f"Submitted job 1: {job1_id}")
result1 = poll_job(job1_id)

print(f"\nJob 1 Status: {result1.get('status')}")
if result1.get("status") == "failed":
    print(f"Error: {result1.get('error')}")
    sys.exit(1)

res1_data = result1.get("result", {})
quote1 = res1_data.get("pricing", {})
slice1 = res1_data.get("slice", {})
stats1 = slice1.get("statistics", {})
prod1 = res1_data.get("production", {})

print(f"Selected Printer: {prod1.get('printerProfile')} ({prod1.get('printerId')})")
print(f"Quote ID: {result1.get('quoteId')}")
print(f"Filament Grams: {slice1.get('filamentGrams')} g")
print(f"Print Time Hours: {stats1.get('print_time_hours')} h ({slice1.get('rawTimeString')})")
print(f"Total Price: INR {quote1.get('totalPrice')}")

job1_logs = get_job_log_lines(job1_id)
print(f"\nJob 1 Logs ({len(job1_logs)} lines):")
for l in job1_logs:
    print("  ", l)

# Assertions for Job 1
assert not any("Serving quote from active dedup cache" in l for l in job1_logs), \
    "ERROR: Job 1 served quote from active dedup cache! Expected fresh slice execution."
assert any("Executing multicolor slicing via Bambu Studio CLI adapter" in l for l in job1_logs), \
    "ERROR: Job 1 did not invoke Bambu Studio CLI!"
assert prod1.get("printerId") == "BAMBU-A1-01", \
    f"ERROR: Expected BAMBU-A1-01, got {prod1.get('printerId')}"
assert slice1.get("filamentGrams") > 900.0, \
    f"ERROR: Expected > 900g, got {slice1.get('filamentGrams')}g"

print("\n>>> SUCCESS: Job 1 executed full fresh Bambu Studio CLI slice for A1! <<<")

print("\n--- Submitting Second Job with Same Configuration (Should serve the newly generated A1 quote from cache) ---")
job2_id = submit_job(STITCH_FILE)
print(f"Submitted job 2: {job2_id}")
result2 = poll_job(job2_id)

print(f"\nJob 2 Status: {result2.get('status')}")
print(f"Job 2 Quote ID: {result2.get('quoteId')}")
job2_logs = get_job_log_lines(job2_id)
print(f"\nJob 2 Logs ({len(job2_logs)} lines):")
for l in job2_logs:
    print("  ", l)

assert any("Serving quote from active dedup cache" in l for l in job2_logs), \
    "ERROR: Job 2 did not serve quote from active dedup cache!"
assert result2.get("quoteId") == result1.get("quoteId"), \
    f"ERROR: Job 2 returned quote {result2.get('quoteId')}, expected {result1.get('quoteId')}"

print("\n>>> ALL CHECKS PASSED: Cache identity and invalidation verified end-to-end! <<<")
