import re

with open('app/pricing_engine.py', 'r') as f:
    c = f.read()

c = c.replace(
    'per_filament: Optional[List[Dict[str, Any]]] = None',
    'per_filament: Optional[List[Dict[str, Any]]] = None,\n    plates: Optional[list] = None'
)

repl = """    # 1-3. Base Manufacturing Costs
    d_material_cost = Decimal('0')
    d_electricity_cost = Decimal('0')
    d_machine_wear_cost = Decimal('0')

    if plates and len(plates) > 0:
        for p in plates:
            stats = p.get("statistics", {})
            printer = p.get("production_printer", {})
            p_hours = D(max(0.0, float(stats.get("print_time_hours", 0.0))))
            p_grams = D(max(0.0, float(stats.get("filament_grams", 0.0))))
            
            p_mat_cost = p_grams * d_price_per_gram
            if p.get("per_filament"):
                p_mat_cost = Decimal('0')
                for f in p.get("per_filament"):
                    f_mat_key = str(f.get("materialType") or f.get("material") or material_key).lower()
                    f_mat_info = active_materials.get(f_mat_key) or MATERIAL_RATES.get(f_mat_key, MATERIAL_RATES.get(material_key.lower(), MATERIAL_RATES["pla"]))
                    f_weight = D(max(0.0, float(f.get("totalGrams") or f.get("modelGrams") or 0.0)))
                    p_mat_cost += f_weight * D(f_mat_info.get("pricePerGram", 4.5))
            d_material_cost += p_mat_cost
            
            p_watts = D(printer.get("printerPowerWatts", 100.0))
            d_elec_rate = D(cfg.get("electricityRatePerKwh", 8.0))
            d_electricity_cost += ((p_hours * p_watts) / D('1000')) * d_elec_rate
            
            p_life = max(Decimal('1'), D(printer.get("printerLifespanHours", 5000.0)))
            p_cost = D(printer.get("printerCost", 25000.0))
            d_machine_wear_cost += p_hours * (p_cost / p_life)
    else:
        if per_filament and len(per_filament) > 0:
            for f in per_filament:
                f_mat_key = str(f.get("materialType") or f.get("material") or material_key).lower()
                f_mat_info = active_materials.get(f_mat_key) or MATERIAL_RATES.get(f_mat_key, MATERIAL_RATES.get(material_key.lower(), MATERIAL_RATES["pla"]))
                f_price_per_gram = D(f_mat_info.get("pricePerGram", 4.5))
                f_weight = D(max(0.0, float(f.get("totalGrams") or f.get("modelGrams") or 0.0)))
                d_material_cost += f_weight * f_price_per_gram
        else:
            d_material_cost = d_valid_weight * d_price_per_gram

        d_power_watts = D(cfg.get("printerPowerWatts", 100.0))
        d_kwh = (d_valid_hours * d_power_watts) / Decimal('1000')
        d_elec_rate = D(cfg.get("electricityRatePerKwh", 8.0))
        d_electricity_cost = d_kwh * d_elec_rate

        d_lifespan = max(Decimal('1'), D(cfg.get("printerLifespanHours", 5000.0)))
        d_printer_cost = D(cfg.get("printerCost", 25000.0))
        d_machine_wear_cost = d_valid_hours * (d_printer_cost / d_lifespan)

    """

c = re.sub(r'# 1\. Material Cost: computed per-filament.*?(?=# 4\. Failure Buffer)', repl, c, flags=re.DOTALL)

with open('app/pricing_engine.py', 'w') as f:
    f.write(c)

