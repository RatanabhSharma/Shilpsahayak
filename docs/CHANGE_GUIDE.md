# Change Guide

## How to add a new Product to the Catalog
1. Log in as an Admin.
2. Navigate to `/admin/catalog`.
3. Use the UI to add product details, images, and pricing.
4. Changes are immediately saved to Firestore and reflected on the `/shop` route.

## How to modify Custom Slicing Pricing
Pricing logic is governed by Admin settings and the `pricing_engine.py` backend.
1. Admin modifies filament costs or markup multipliers in the Admin Dashboard (`/admin/settings` or `/admin/inventory`).
2. These settings are stored in Firestore.
3. The Slicer Service validates against the live Admin pricing config (Step E of the pipeline) when processing new jobs.

## How to update Slicer Logic
1. Modify `slicer-service/slicer_router.py` to change how jobs are routed.
2. Update `slicer_result_validator.py` if changing expected outputs from PrusaSlicer/Bambu Studio.
3. Restart the Python service.
