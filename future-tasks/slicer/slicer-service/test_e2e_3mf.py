import os
import json
from app.slicer_adapters.bambu_adapter import execute_bambu_slice

def test_backend_slice():
    target_3mf = r"D:\Shilp buss\firebase\final\Shilpsahayak-main\Shilpsahayak-main\scratch\test_models\Spiderman_urban.3mf"
    
    production_params = {
        "job_id": "test-3mf-generic",
        "productionPrinterProfile": {
            "machineProfileFile": "Bambu Lab A1 mini 0.4 nozzle.json",
            "processProfileFile": "0.20mm Standard @BBL A1M.json",
            "materialProfileIds": ["Generic PLA @BBL A1M"],
            "buildVolumeX": 180,
            "buildVolumeY": 180,
            "buildVolumeZ": 180,
            "id": "BAMBU-A1-MINI"
        },
        "material": "PLA",
        "infillPercent": 15,
        "supportMode": "none"
    }
    
    print("Testing execute_bambu_slice directly...")
    result = execute_bambu_slice(target_3mf, production_params=production_params)
    
    print("Result Success:", result.get("success"))
    print("Error Code:", result.get("error_code"))
    print("Log / Error:", result.get("error"))
    
if __name__ == '__main__':
    test_backend_slice()

