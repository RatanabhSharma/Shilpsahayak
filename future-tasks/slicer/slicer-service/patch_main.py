import re

with open('app/main.py', 'r') as f:
    c = f.read()

# 1. Update eligibility check
old_eligibility = """            eligibility = resolve_eligible_production_printer(
                profiles=validated_profiles,
                model_dimensions=effective_dims or {},
                requires_multicolor=requires_multicolor,
            )"""

new_eligibility = """            is_multi_3mf = JOBS[job_id].get("is_multi_plate", False) and file_ext == ".3mf"
            if is_multi_3mf:
                class DummyElig:
                    eligible = True
                    selected_profile = {"id": "deferred", "displayName": "Deferred to Adapter"}
                    candidates_evaluated = len(validated_profiles)
                    reason_code = "DEFERRED_TO_ADAPTER"
                    reason = "Multi-plate 3MF evaluates eligibility per plate"
                eligibility = DummyElig()
            else:
                eligibility = resolve_eligible_production_printer(
                    profiles=validated_profiles,
                    model_dimensions=effective_dims or {},
                    requires_multicolor=requires_multicolor,
                )"""

if old_eligibility in c:
    c = c.replace(old_eligibility, new_eligibility)

# 2. Add production profiles before execute_bounded_slice
old_exec = """            # Step G: Adapter Slicing
            JOBS[job_id]["stage_message"] = "Executing production profile slice..."
            slice_res = execute_bounded_slice(active_job["file_path"], params, slice_core.temp_dir)"""

new_exec = """            # Step G: Adapter Slicing
            JOBS[job_id]["stage_message"] = "Executing production profile slice..."
            params["production_profiles"] = validated_profiles
            slice_res = execute_bounded_slice(active_job["file_path"], params, slice_core.temp_dir)"""

if old_exec in c:
    c = c.replace(old_exec, new_exec)

# 3. Add plates to calculate_authoritative_quote
old_quote = """        quote = calculate_authoritative_quote(
            filament_grams=filament_grams,
            filament_mm=filament_mm,
            print_time_hours=print_time_hours,
            material_key=params.get("material", "pla"),
            quantity=params.get("quantity", 1),
            packaging_included=params.get("packagingIncluded", False),
            dimensions=dims,
            active_envelope=active_envelope,
            config=params.get("pricingConfig"),
            discount_tiers=params.get("quantityDiscounts"),
            production_profile=production_profile,
            per_filament=per_filament,
        )"""

new_quote = """        quote = calculate_authoritative_quote(
            filament_grams=filament_grams,
            filament_mm=filament_mm,
            print_time_hours=print_time_hours,
            material_key=params.get("material", "pla"),
            quantity=params.get("quantity", 1),
            packaging_included=params.get("packagingIncluded", False),
            dimensions=dims,
            active_envelope=active_envelope,
            config=params.get("pricingConfig"),
            discount_tiers=params.get("quantityDiscounts"),
            production_profile=production_profile,
            per_filament=per_filament,
            plates=slice_res.get("plates"),
        )"""

if old_quote in c:
    c = c.replace(old_quote, new_quote)

with open('app/main.py', 'w') as f:
    f.write(c)
