# Change Guide

## How to add a new Product to the Catalog
1. Log in as an Admin.
2. Navigate to `/admin/catalog`.
3. Use the UI to add product details, images, and pricing.
4. Changes are immediately saved to Firestore and reflected on the `/shop` route.

## How to modify Custom Slicing Pricing
Currently, Custom Slicing pricing is applied manually by the Admin via `QuoteReviewDrawer.tsx`.

## How to update Slicer Logic [ARCHIVED]
The automated slicer service is deferred to `future-tasks/slicer/`. Update its routing (`slicer_router.py`) or validators if reactivated in the future.
