# Backend Architecture

The active backend consists of Cloudflare Workers (`shilp-sahayak-r2/`) for edge computing (payments, file uploads, coupon validation) and Firebase (Firestore, Auth, Functions) for core database and identity.

*Note: The automatic Python slicer service has been deferred to `future-tasks/slicer/`.*

## Archived Slicer Pipeline

The automated quotation pipeline using PrusaSlicer/Bambu Studio CLI was archived to `future-tasks/slicer/`. 
Currently, 3D printing jobs create a pending quote in Firestore which is manually reviewed and priced by an Admin in the React CMS (`QuoteReviewDrawer.tsx`).
