"""
Shilp Sahayak Authoritative Backend Pricing Engine
Pure python pricing calculation mirroring shop economics, adhering strictly to:
Actual filament grams + Actual print hours + Workshop costs + Margin = Reliable Estimate
"""

from typing import Dict, Any, List, Optional
import math

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
    "maxBuildVolume": {"x": 256.0, "y": 256.0, "z": 256.0}
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

def get_quantity_discount(quantity: int, discount_tiers: List[Dict[str, Any]] = None) -> float:
    if quantity <= 1:
        return 0.0
    tiers = discount_tiers or DEFAULT_QUANTITY_DISCOUNTS
    for tier in tiers:
        min_q = tier.get("minQuantity", 1)
        max_q = tier.get("maxQuantity")
        if quantity >= min_q:
            if max_q is None or quantity <= max_q:
                return float(tier.get("discountPercent", 0))
    return 0.0

def calculate_authoritative_quote(
    filament_grams: float,
    print_time_hours: float,
    material_key: str = "pla",
    quantity: int = 1,
    packaging_included: bool = False,
    config: Optional[Dict[str, Any]] = None,
    discount_tiers: Optional[List[Dict[str, Any]]] = None,
    dimensions: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    cfg = {**DEFAULT_PRICING_CONFIG, **(config or {})}
    qty = max(1, quantity)

    mat_info = MATERIAL_RATES.get(material_key.lower(), MATERIAL_RATES["pla"])
    price_per_gram = float(mat_info.get("pricePerGram", 4.5))

    valid_weight = max(0.0, float(filament_grams or 0.0))
    valid_hours = max(0.0, float(print_time_hours or 0.0))

    # 1. Material Cost
    material_cost = valid_weight * price_per_gram

    # 2. Electricity Cost: kWh * rate
    power_watts = float(cfg.get("printerPowerWatts", 100.0))
    kwh = (valid_hours * power_watts) / 1000.0
    electricity_cost = kwh * float(cfg.get("electricityRatePerKwh", 8.0))

    # 3. Machine wear & amortization: hours * (printerCost / lifespanHours)
    lifespan = max(1.0, float(cfg.get("printerLifespanHours", 5000.0)))
    printer_cost = float(cfg.get("printerCost", 25000.0))
    machine_wear_cost = valid_hours * (printer_cost / lifespan)

    # 4. Failure Buffer
    failure_pct = float(cfg.get("failureBufferPercent", 10.0)) / 100.0
    failure_buffer_cost = (material_cost + electricity_cost + machine_wear_cost) * failure_pct

    # 5. Finishing labour
    finishing_mins = float(cfg.get("finishingMinutes", 5.0))
    labour_rate = float(cfg.get("labourRatePerHour", 200.0))
    labour_cost = (finishing_mins / 60.0) * labour_rate

    # 6. Packaging per unit
    packaging_unit_cost = float(cfg.get("packagingPrice", 20.0)) if packaging_included else 0.0

    # 7. Base service fee
    base_service_fee = float(cfg.get("baseServiceFee", 30.0))

    # 8. Single unit production cost (base without packaging)
    unit_prod_cost_without_pack = (
        material_cost +
        electricity_cost +
        machine_wear_cost +
        failure_buffer_cost +
        labour_cost +
        base_service_fee
    )

    # 9. Selling unit price before quantity discount
    markup = float(cfg.get("markupMultiplier", 2.2))
    raw_unit_selling = unit_prod_cost_without_pack * markup
    unit_price = max(1, round(raw_unit_selling))

    # 10. Subtotal
    subtotal = unit_price * qty

    # 11. Bulk quantity discount
    discount_pct = get_quantity_discount(qty, discount_tiers)
    discount_amount = round(subtotal * (discount_pct / 100.0))
    discounted_subtotal = subtotal - discount_amount

    # 12. Minimum order value threshold
    min_order = float(cfg.get("minimumOrderValue", 149.0))
    min_order_applied = discounted_subtotal < min_order
    print_subtotal_after_min = max(discounted_subtotal, min_order)

    # 13. Packaging total add-on
    total_packaging_amount = (float(cfg.get("packagingPrice", 20.0)) * qty) if packaging_included else 0.0

    # 14. Subtotal before GST
    subtotal_before_gst = print_subtotal_after_min + total_packaging_amount

    # 15. GST
    gst_enabled = bool(cfg.get("gstEnabled", False))
    gst_rate = float(cfg.get("gstRate", 18.0)) / 100.0
    gst_amount = round(subtotal_before_gst * gst_rate) if gst_enabled else 0.0

    total_price = subtotal_before_gst + gst_amount

    # Exceeds build volume check
    max_vol = cfg.get("maxBuildVolume", {"x": 256, "y": 256, "z": 256})
    exceeds_build_volume = False
    if dimensions:
        if (dimensions.get("x", 0) > max_vol.get("x", 256) or
            dimensions.get("y", 0) > max_vol.get("y", 256) or
            dimensions.get("z", 0) > max_vol.get("z", 256)):
            exceeds_build_volume = True

    return {
        "unitPrice": unit_price,
        "quantity": qty,
        "subtotal": subtotal,
        "discountAmount": discount_amount,
        "discountedSubtotal": discounted_subtotal,
        "packagingAmount": total_packaging_amount,
        "subtotalBeforeGst": subtotal_before_gst,
        "minimumOrderChargeApplied": min_order_applied,
        "gstAmount": gst_amount,
        "totalPrice": total_price,
        "exceedsBuildVolume": exceeds_build_volume,
        "pricingBreakdown": {
            "materialCost": round(material_cost, 2),
            "electricityCost": round(electricity_cost, 2),
            "machineWearCost": round(machine_wear_cost, 2),
            "failureBufferCost": round(failure_buffer_cost, 2),
            "labourCost": round(labour_cost, 2),
            "baseServiceFee": round(base_service_fee, 2),
            "unitProductionCost": round(unit_prod_cost_without_pack, 2),
            "unitMarkupAmount": round(raw_unit_selling - unit_prod_cost_without_pack, 2)
        }
    }
