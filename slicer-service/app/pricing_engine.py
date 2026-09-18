"""
Shilp Sahayak Authoritative Backend Pricing Engine
Pure python pricing calculation mirroring shop economics, adhering strictly to:
Actual filament grams + Actual print hours + Workshop costs + Margin = Authoritative Quote

Guaranteed Requirements:
1. Decimal arithmetic throughout with explicit ROUND_HALF_UP (no float money errors, no banker's rounding)
2. Currency explicitly set to "INR"
3. Fully config-driven GST tax line item (rate read from versioned config)
4. Comprehensive calculationTrace stored in snapshot for 100% dispute auditability
5. Two-part model identity (file SHA-256 + job config hash)
"""

import os
import math
import json
import hashlib
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional

# Precision helpers
PENNY = Decimal('0.01')
RUPEE = Decimal('1')

def D(val: Any) -> Decimal:
    """Converts any value cleanly to Decimal without float representation artifacts."""
    if val is None:
        return Decimal('0')
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))

DEFAULT_PRICING_CONFIG = {
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
    "gstEnabled": False,
    "gstRate": 18.0,
    "packagingPrice": 20.0,
    "maxBuildVolume": {"x": 256.0, "y": 256.0, "z": 200.0}
}

MATERIAL_RATES = {
    "pla": {"pricePerGram": 4.5, "density": 1.24},
    "petg": {"pricePerGram": 5.5, "density": 1.27},
    "tpu": {"pricePerGram": 7.0, "density": 1.21},
    "abs": {"pricePerGram": 5.0, "density": 1.04},
    "resin": {"pricePerGram": 12.0, "density": 1.15},
    "wood pla": {"pricePerGram": 7.0, "density": 1.28},
    "silk pla": {"pricePerGram": 6.0, "density": 1.24}
}

DEFAULT_QUANTITY_DISCOUNTS = [
    {"minQuantity": 1, "maxQuantity": 4, "discountPercent": 0},
    {"minQuantity": 5, "maxQuantity": 9, "discountPercent": 5},
    {"minQuantity": 10, "maxQuantity": 24, "discountPercent": 10},
    {"minQuantity": 25, "discountPercent": 15},
]

def get_quantity_discount(quantity: int, discount_tiers: Optional[List[Dict[str, Any]]] = None) -> Decimal:
    if quantity <= 1:
        return Decimal('0')
    tiers = discount_tiers or DEFAULT_QUANTITY_DISCOUNTS
    for tier in tiers:
        min_q = tier.get("minQuantity", 1)
        max_q = tier.get("maxQuantity")
        if quantity >= min_q:
            if max_q is None or quantity <= max_q:
                return D(tier.get("discountPercent", 0))
    return Decimal('0')

def compute_production_profile_hash(profile: Optional[Dict[str, Any]]) -> str:
    """
    Computes a deterministic hash of all configuration settings in a production printer profile.
    Any change to build volume, nozzle diameter, layer height, infill, machine parameters,
    or profile files produces a different hash, invalidating cached quotes.
    """
    if not profile or not isinstance(profile, dict):
        return "no_profile"
    canonical_keys = [
        "id", "manufacturer", "model", "printerProfileFile",
        "machineProfileFile", "processProfileFile",
        "printerSettingsId", "processSettingsId", "slicerSettingsId",
        "profileVersion", "buildVolumeX", "buildVolumeY", "buildVolumeZ",
        "nozzleDiameter", "defaultLayerHeight", "defaultInfill",
        "defaultSupportMode", "machineParameters", "toolpathDefaults"
    ]
    canonical_data = {k: profile.get(k) for k in canonical_keys if profile.get(k) is not None}
    raw = json.dumps(canonical_data, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()[:16]


def compute_job_config_hash(
    file_sha256: str,
    scale_x: float,
    scale_y: float,
    scale_z: float,
    printer_profile: str,
    material_key: str,
    quality_profile: str,
    quantity: int,
    support_mode: str,
    packaging_included: bool,
    pricing_version: Optional[str] = None,
    route: Optional[str] = None,
    # Authoritative extended identity parameters:
    effective_dimensions: Optional[Dict[str, float]] = None,
    production_profile: Optional[Dict[str, Any]] = None,
    infill_percent: Optional[Any] = None,
    color_configuration: Optional[Any] = None,
    machine_profile_file: Optional[str] = None,
    process_profile_file: Optional[str] = None,
    pricing_config: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Computes a cryptographic hash of all slicing and pricing inputs.
    Every input that can change the production toolpath, timing, material usage,
    or pricing is included in the hash key:
      - Raw file SHA-256
      - Effective dimensions and scale factors
      - Resolved production printer ID & full profile configuration hash
      - Machine profile & process profile file identity
      - Material key and multicolor/color configuration
      - Quality profile, infill percent, and support mode
      - Quantity, packaging, route, and pricing version / config
    """
    prof_dict = production_profile if isinstance(production_profile, dict) else {}
    printer_id = (prof_dict.get("id") or printer_profile or "unknown").strip()
    prof_hash = compute_production_profile_hash(prof_dict) if prof_dict else "default"

    mach_file = (machine_profile_file or prof_dict.get("machineProfileFile") or "").strip()
    proc_file = (process_profile_file or prof_dict.get("processProfileFile") or "").strip()
    printer_settings_id = (prof_dict.get("printerSettingsId") or "").strip()
    process_settings_id = (prof_dict.get("processSettingsId") or "").strip()

    if effective_dimensions and isinstance(effective_dimensions, dict):
        dims_str = f"{effective_dimensions.get('x', 0.0):.3f}x{effective_dimensions.get('y', 0.0):.3f}x{effective_dimensions.get('z', 0.0):.3f}"
    else:
        dims_str = "auto"

    infill_str = str(infill_percent) if infill_percent is not None else "default"

    if isinstance(color_configuration, dict) and "colors" in color_configuration:
        colors_list = []
        for c in color_configuration.get("colors", []):
            if isinstance(c, dict):
                sf = c.get("sourceFilament") or c.get("index") or "0"
                hex_c = c.get("hex") or ""
                mat_c = c.get("materialType") or ""
                colors_list.append(f"{sf}:{hex_c}:{mat_c}")
        colors_str = ";".join(colors_list) or "none"
    elif isinstance(color_configuration, list):
        colors_str = ";".join(str(x) for x in color_configuration)
    else:
        colors_str = str(color_configuration or "default")

    pricing_hash = "default"
    if pricing_config and isinstance(pricing_config, dict):
        try:
            pricing_hash = hashlib.sha256(json.dumps(pricing_config, sort_keys=True).encode("utf-8")).hexdigest()[:8]
        except Exception:
            pass

    raw_key = (
        f"{file_sha256}:"
        f"{scale_x:.4f}:{scale_y:.4f}:{scale_z:.4f}:"
        f"dims={dims_str}:"
        f"printer={printer_id.lower()}:prof_hash={prof_hash}:"
        f"mach={mach_file.lower()}:proc={proc_file.lower()}:"
        f"ps_id={printer_settings_id.lower()}:{process_settings_id.lower()}:"
        f"mat={material_key.lower()}:colors={colors_str.lower()}:"
        f"qual={quality_profile.lower()}:infill={infill_str}:support={support_mode.lower()}:"
        f"qty={quantity}:pkg={str(packaging_included).lower()}:"
        f"price_ver={str(pricing_version or 'default')}:price_hash={pricing_hash}:"
        f"route={str(route or 'default').lower()}"
    )
    return hashlib.sha256(raw_key.encode('utf-8')).hexdigest()

def calculate_authoritative_quote(
    filament_grams: float,
    print_time_hours: float,
    material_key: str = "pla",
    quantity: int = 1,
    packaging_included: bool = False,
    config: Optional[Dict[str, Any]] = None,
    discount_tiers: Optional[List[Dict[str, Any]]] = None,
    dimensions: Optional[Dict[str, float]] = None,
    materials: Optional[Dict[str, Dict[str, float]]] = None,
    filament_mm: float = 0.0,
    active_envelope: Optional[Dict[str, float]] = None,
    per_filament: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Calculate an authoritative print quote using live admin config.
    All monetary arithmetic uses Decimal with explicit ROUND_HALF_UP.
    Supports per-filament material costing for multicolor models.
    """
    cfg = {**DEFAULT_PRICING_CONFIG, **(config or {})}
    qty = max(1, quantity)
    d_qty = Decimal(str(qty))

    active_materials = materials if materials else MATERIAL_RATES
    mat_info = active_materials.get(material_key.lower()) or MATERIAL_RATES.get(material_key.lower(), MATERIAL_RATES["pla"])
    d_price_per_gram = D(mat_info.get("pricePerGram", 4.5))
    d_density = D(mat_info.get("density", 1.24))

    # Authoritative filament weight source
    raw_grams = float(filament_grams or 0.0)
    if raw_grams > 0.0:
        d_valid_weight = D(max(0.0, raw_grams))
        weight_source = "slicer_grams"
    else:
        d_valid_weight = Decimal('0')
        weight_source = "unavailable"

    d_valid_hours = D(max(0.0, float(print_time_hours or 0.0)))

    # 1. Material Cost: computed per-filament for multicolor or uniformly for single-material
    if per_filament and len(per_filament) > 0:
        d_material_cost = Decimal('0')
        for f in per_filament:
            f_mat_key = str(f.get("materialType") or f.get("material") or material_key).lower()
            f_mat_info = active_materials.get(f_mat_key) or MATERIAL_RATES.get(f_mat_key, MATERIAL_RATES.get(material_key.lower(), MATERIAL_RATES["pla"]))
            f_price_per_gram = D(f_mat_info.get("pricePerGram", 4.5))
            f_weight = D(max(0.0, float(f.get("totalGrams") or f.get("modelGrams") or 0.0)))
            d_material_cost += f_weight * f_price_per_gram
    else:
        d_material_cost = d_valid_weight * d_price_per_gram

    # 2. Electricity Cost: kWh * rate
    d_power_watts = D(cfg.get("printerPowerWatts", 100.0))
    d_kwh = (d_valid_hours * d_power_watts) / Decimal('1000')
    d_elec_rate = D(cfg.get("electricityRatePerKwh", 8.0))
    d_electricity_cost = d_kwh * d_elec_rate

    # 3. Machine Wear: hours * (printerCost / lifespanHours)
    d_lifespan = max(Decimal('1'), D(cfg.get("printerLifespanHours", 5000.0)))
    d_printer_cost = D(cfg.get("printerCost", 25000.0))
    d_machine_wear_cost = d_valid_hours * (d_printer_cost / d_lifespan)

    # 4. Failure Buffer
    d_failure_pct = D(cfg.get("failureBufferPercent", 10.0)) / Decimal('100')
    d_failure_buffer_cost = (d_material_cost + d_electricity_cost + d_machine_wear_cost) * d_failure_pct

    # 5. Finishing Labour
    d_finishing_mins = D(cfg.get("finishingMinutes", 5.0))
    d_labour_rate = D(cfg.get("labourRatePerHour", 200.0))
    d_labour_cost = (d_finishing_mins / Decimal('60')) * d_labour_rate

    # 6. Packaging
    d_pack_unit_price = D(cfg.get("packagingPrice", 20.0)) if packaging_included else Decimal('0')

    # 7. Base Service Fee
    d_base_service_fee = D(cfg.get("baseServiceFee", 30.0))

    # 8. Single unit production cost
    d_unit_prod_cost = (
        d_material_cost +
        d_electricity_cost +
        d_machine_wear_cost +
        d_failure_buffer_cost +
        d_labour_cost +
        d_base_service_fee
    )

    # 9. Selling unit price before discount
    d_markup = D(cfg.get("markupMultiplier", 2.2))
    d_raw_unit_selling = d_unit_prod_cost * d_markup
    d_unit_price = max(Decimal('1'), d_raw_unit_selling.quantize(RUPEE, rounding=ROUND_HALF_UP))

    # 10. Subtotal
    d_subtotal = d_unit_price * d_qty

    # 11. Quantity discount
    d_discount_pct = get_quantity_discount(qty, discount_tiers)
    d_discount_amount = (d_subtotal * (d_discount_pct / Decimal('100'))).quantize(RUPEE, rounding=ROUND_HALF_UP)
    d_discounted_subtotal = d_subtotal - d_discount_amount

    # 12. Minimum order value
    d_min_order = D(cfg.get("minimumOrderValue", 149.0))
    min_order_applied = d_discounted_subtotal < d_min_order
    d_print_subtotal_after_min = max(d_discounted_subtotal, d_min_order)

    # 13. Packaging total add-on
    d_total_packaging = (d_pack_unit_price * d_qty).quantize(PENNY, rounding=ROUND_HALF_UP)

    # 14. Subtotal before Tax
    d_subtotal_before_tax = d_print_subtotal_after_min + d_total_packaging

    # 15. Config-driven GST / Tax Line Item (§10a & Correction #5)
    gst_enabled = bool(cfg.get("gstEnabled", False))
    d_tax_rate_pct = D(cfg.get("gstRate", cfg.get("taxRate", 18.0)))
    d_tax_rate = d_tax_rate_pct / Decimal('100')

    if gst_enabled:
        d_tax_amount = (d_subtotal_before_tax * d_tax_rate).quantize(PENNY, rounding=ROUND_HALF_UP)
    else:
        d_tax_amount = Decimal('0.00')

    # Total price rounded explicitly using ROUND_HALF_UP to nearest rupee
    d_total_price = (d_subtotal_before_tax + d_tax_amount).quantize(RUPEE, rounding=ROUND_HALF_UP)

    # Envelope validation
    if active_envelope and all(k in active_envelope for k in ("x", "y", "z")):
        max_vol = active_envelope
    else:
        max_vol = cfg.get("maxBuildVolume", {"x": 256.0, "y": 256.0, "z": 200.0})

    exceeds_build_volume = False
    if dimensions:
        if (dimensions.get("x", 0) > max_vol.get("x", 256) or
            dimensions.get("y", 0) > max_vol.get("y", 256) or
            dimensions.get("z", 0) > max_vol.get("z", 200)):
            exceeds_build_volume = True

    quote_status = "production_verified" if (not exceeds_build_volume and float(d_valid_weight) > 0 and float(d_valid_hours) > 0) else "manual_review"

    # Calculation trace recording every intermediate variable and formula for 100% dispute auditability (§11 & Correction #4)
    calculation_trace = {
        "inputs": {
            "filamentGrams": float(d_valid_weight),
            "filamentMm": float(filament_mm),
            "printTimeHours": float(d_valid_hours),
            "materialKey": material_key,
            "quantity": qty,
            "packagingIncluded": packaging_included,
            "pricePerGram": float(d_price_per_gram),
            "density": float(d_density),
            "printerPowerWatts": float(d_power_watts),
            "electricityRatePerKwh": float(d_elec_rate),
            "printerCost": float(d_printer_cost),
            "printerLifespanHours": float(d_lifespan),
            "failureBufferPercent": float(d_failure_pct * 100),
            "labourRatePerHour": float(d_labour_rate),
            "finishingMinutes": float(d_finishing_mins),
            "baseServiceFee": float(d_base_service_fee),
            "markupMultiplier": float(d_markup),
            "minimumOrderValue": float(d_min_order),
            "packagingUnitPrice": float(d_pack_unit_price),
            "taxRatePercent": float(d_tax_rate_pct),
            "taxEnabled": gst_enabled,
            "perFilamentMaterials": [
                {
                    "filamentIndex": f.get("filamentIndex"),
                    "materialType": f.get("materialType") or material_key,
                    "totalGrams": float(f.get("totalGrams") or f.get("modelGrams") or 0.0),
                }
                for f in per_filament
            ] if per_filament else None
        },
        "intermediateCosts": {
            "materialCost": float(d_material_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "electricityCost": float(d_electricity_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "machineWearCost": float(d_machine_wear_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "failureBufferCost": float(d_failure_buffer_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "labourCost": float(d_labour_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "baseServiceFee": float(d_base_service_fee.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "unitProductionCost": float(d_unit_prod_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "rawUnitSellingPrice": float(d_raw_unit_selling.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "unitPrice": int(d_unit_price),
            "subtotal": int(d_subtotal),
            "discountPercent": float(d_discount_pct),
            "discountAmount": int(d_discount_amount),
            "discountedSubtotal": int(d_discounted_subtotal),
            "minimumOrderApplied": min_order_applied,
            "printSubtotalAfterMin": int(d_print_subtotal_after_min),
            "packagingTotalAmount": float(d_total_packaging),
            "subtotalBeforeTax": float(d_subtotal_before_tax),
            "taxAmount": float(d_tax_amount),
            "totalPrice": int(d_total_price)
        },
        "currency": "INR",
        "roundingRule": "ROUND_HALF_UP_TO_NEAREST_RUPEE"
    }

    return {
        "currency": "INR",
        "unitPrice": int(d_unit_price),
        "quantity": qty,
        "subtotal": int(d_subtotal),
        "discountAmount": int(d_discount_amount),
        "discountedSubtotal": int(d_discounted_subtotal),
        "packagingAmount": float(d_total_packaging),
        "subtotalBeforeGst": float(d_subtotal_before_tax),
        "subtotalBeforeTax": float(d_subtotal_before_tax),
        "minimumOrderChargeApplied": min_order_applied,
        "gstAmount": float(d_tax_amount),
        "taxAmount": float(d_tax_amount),
        "taxRatePercent": float(d_tax_rate_pct),
        "totalPrice": int(d_total_price),
        "roundingRule": "ROUND_HALF_UP_TO_NEAREST_RUPEE",
        "exceedsBuildVolume": exceeds_build_volume,
        "weightSource": weight_source,
        "timeSource": "slicer_toolpath",
        "quoteStatus": quote_status,
        "calculationTrace": calculation_trace,
        "pricingBreakdown": {
            "materialCost": float(d_material_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "electricityCost": float(d_electricity_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "machineWearCost": float(d_machine_wear_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "failureBufferCost": float(d_failure_buffer_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "labourCost": float(d_labour_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "baseServiceFee": float(d_base_service_fee.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "unitProductionCost": float(d_unit_prod_cost.quantize(PENNY, rounding=ROUND_HALF_UP)),
            "unitMarkupAmount": float((d_raw_unit_selling - d_unit_prod_cost).quantize(PENNY, rounding=ROUND_HALF_UP)),
            "taxRatePercent": float(d_tax_rate_pct),
            "taxAmount": float(d_tax_amount),
            "currency": "INR",
            "roundingRule": "ROUND_HALF_UP_TO_NEAREST_RUPEE"
        }
    }
