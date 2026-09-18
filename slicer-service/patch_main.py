import sys

with open('app/main.py', 'r') as f:
    content = f.read()

# 1. Imports
if 'from app.firebase_setup import' not in content:
    content = content.replace(
        'from app.printer_eligibility import (',
        'from app.firebase_setup import get_pricing_config, get_public_pricing_config\nfrom app.printer_eligibility import ('
    )

# 2. Step E override
old_step_e = """        # Step E: Require live admin pricing configuration
        has_live_config = bool(params.get("pricingConfig") and params.get("materials"))
        if not has_live_config:
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Live pricing configuration unavailable from admin settings."
            JOBS[job_id]["error_code"] = "PRICING_CONFIG_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return"""

new_step_e = """        # Step E: Fetch live admin pricing configuration securely
        live_config = get_pricing_config()
        if not live_config:
            JOBS[job_id]["status"] = JobStatus.FAILED
            JOBS[job_id]["error"] = "Live pricing configuration unavailable from admin settings."
            JOBS[job_id]["error_code"] = "PRICING_CONFIG_UNAVAILABLE"
            JOBS[job_id]["can_retry"] = True
            JOBS[job_id]["workshop_review_available"] = True
            return
            
        params["pricingConfig"] = live_config.get("pricingConfig")
        params["materials"] = _materials_list_to_dict(live_config.get("materials"))
        params["quantityDiscounts"] = live_config.get("quantityDiscounts")
        params["productionPrinterProfiles"] = live_config.get("productionPrinterProfiles", [])
        params["productionPrinterProfile"] = live_config.get("productionPrinterProfile", {})"""

if old_step_e in content:
    content = content.replace(old_step_e, new_step_e)
else:
    print("Warning: old_step_e not found")

# 3. Add endpoints at the end of the file
new_endpoints = """
@app.get("/api/pricing/config")
def get_public_pricing_endpoint():
    config = get_public_pricing_config()
    return config

class EstimateRequest(BaseModel):
    volumeCm3: float
    materialId: str
    quality: str = "standard"
    infillPercent: int = 20
    quantity: int = 1
    packagingIncluded: bool = False

@app.post("/api/pricing/estimate")
def get_instant_estimate(req: EstimateRequest):
    live_config = get_pricing_config()
    if not live_config:
        raise HTTPException(status_code=500, detail="Pricing config unavailable")
        
    materials = _materials_list_to_dict(live_config.get("materials"))
    mat_cfg = materials.get(req.materialId.lower()) if materials else None
    density = mat_cfg.get("density", 1.24) if mat_cfg else 1.24
    
    # Heuristic: 15% walls, the rest is infill
    solid_fraction = 0.15 + (0.85 * (req.infillPercent / 100.0))
    est_grams = req.volumeCm3 * density * solid_fraction
    
    # Heuristic print time: 15g per hour + 12min warmup
    est_hours = (est_grams / 15.0) + 0.2
    
    quote = calculate_authoritative_quote(
        filament_grams=est_grams,
        filament_mm=0.0,
        print_time_hours=est_hours,
        material_key=req.materialId,
        quantity=req.quantity,
        packaging_included=req.packagingIncluded,
        dimensions={"x": 0, "y": 0, "z": 0},
        active_envelope={"x": 256, "y": 256, "z": 200},
        config=live_config.get("pricingConfig"),
        discount_tiers=live_config.get("quantityDiscounts"),
        materials=live_config.get("materials"),
        per_filament=None
    )
    
    return {
        "estimatedGrams": est_grams,
        "estimatedHours": est_hours,
        "quote": quote
    }

class RecalculateRequest(BaseModel):
    quantity: int
    packagingIncluded: bool

@app.post("/api/quotes/{quote_id}/recalculate")
def recalculate_quote(quote_id: str, req: RecalculateRequest):
    quote = quote_store.get_quote(quote_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    slice_info = quote.get("slice", {})
    prod_info = quote.get("production", {})
    
    filament_grams = slice_info.get("filamentGrams", 0.0)
    filament_mm = slice_info.get("filamentMm", 0.0)
    print_time_hours = slice_info.get("printTimeSeconds", 0.0) / 3600.0
    
    live_config = get_pricing_config()
    if not live_config:
        raise HTTPException(status_code=500, detail="Pricing config unavailable")
        
    new_price = calculate_authoritative_quote(
        filament_grams=filament_grams,
        filament_mm=filament_mm,
        print_time_hours=print_time_hours,
        material_key=prod_info.get("material", "pla"),
        quantity=req.quantity,
        packaging_included=req.packagingIncluded,
        dimensions=slice_info.get("dimensions", {}),
        active_envelope=prod_info.get("activeEnvelope", {}),
        config=live_config.get("pricingConfig"),
        discount_tiers=live_config.get("quantityDiscounts"),
        materials=live_config.get("materials"),
        per_filament=None
    )
    
    # Update quote snapshot
    quote["pricing"] = new_price
    quote["production"]["quantity"] = req.quantity
    quote["production"]["packagingIncluded"] = req.packagingIncluded
    
    # Save the updated quote so the DB has it
    quote_store.save_quote(quote)
    
    return quote
"""

if '@app.get("/api/pricing/config")' not in content:
    content += new_endpoints

with open('app/main.py', 'w') as f:
    f.write(content)
print("main.py patched successfully")

