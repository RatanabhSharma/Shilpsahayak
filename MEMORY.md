# Durable Project Memory

This document records the reasoning behind major project decisions, historical discoveries, known problems, and mistakes that must not be repeated. Future AI agents and engineers must consult this document to maintain architectural continuity.

## 1. The Slicer Discrepancy & Archival
**Decision**: Automatic pricing via the Slicer API is disabled. The codebase is archived in `future-tasks/slicer/`.
**Reasoning**: Historical testing revealed that the Bambu Studio CLI output differed materially from the intended Bambu Studio Desktop reference. For example, a benchmark file yielded ~50.83g / 3h22m on Desktop, but the CLI/application resulted in ~68.19g / 7h34m. Furthermore, the application occasionally fell back to PrusaSlicer unexpectedly. This inaccuracy is unsafe for production pricing.
**Rule**: Do not assume Bambu CLI universally cannot process STL, nor that STL->3MF is the definitive fix, without independent validation. Never enable automatic production quoting until the pipeline is rigorously benchmarked.

## 2. Manual Review Fallback
**Decision**: All uploaded files (STL, OBJ, 3MF, STEP) default to a manual Engineer Review workflow.
**Reasoning**: Until the slicer is fixed, business operations must continue. The customer receives a confirmation ("We'll review your model and send you a quotation within 48 hours"), and the engineer uses the admin panel/email to supply the final quote.

## 3. Original File Preservation
**Decision**: The original customer CAD upload is authoritative and must be stored directly in Cloudflare R2.
**Reasoning**: Slicers or conversion scripts can corrupt geometry. We must always retain the original file as the ground truth. Slicer-generated temporary files must never replace the customer's source file.

## 4. Admin UI Regressions
**Decision**: The legacy "Slideshow" and other unused content editors were permanently removed from the Storefront Content Manager.
**Reasoning**: The legacy UI kept reappearing because form states initialized defaults for them, even though the frontend no longer consumed them. The active UI is the only visual source of truth.
**Rule**: Do not restore older UI wholesale just because it exists in git history. If an old design element reappears, identify the root cause and remove it cleanly.

## 5. Review Integrity
**Decision**: Product reviews must be genuine.
**Reasoning**: We do not use fabricated ratings (e.g., hardcoded 4.9 or 5.0), fake review counts, or fake names. If a product has no reviews, the UI must accurately state "No reviews yet". Reviews are tied to authenticated customers and verified purchases via Firestore.

## 6. Checkout Separation
**Decision**: "Buy Now" and "Add to Cart" are distinct pathways.
**Reasoning**: "Buy Now" triggers direct checkout for a single item without polluting or merging with the user's existing cart state. "Add to Cart" utilizes the global cart store. Do not conflate these behaviors or create duplicate cart systems.

## 7. Future Payment Security
**Decision**: The frontend must never be trusted to calculate final financial totals.
**Reasoning**: Client-side values can be manipulated. Future Razorpay integration will rely on a secure Cloudflare Worker / Server environment to validate product identity, quantity, and final price before generating a payment order. 
**Rule**: Do not put payment gateway secrets in the frontend code.

## 8. State & System Duplication
**Decision**: Reuse existing infrastructure.
**Reasoning**: We use Firebase for Auth/Firestore and Cloudflare for Edge/Storage. We use the Firebase Trigger Email extension for notifications. We do not want parallel, duplicate implementations of databases, email services, or cart stores. Make minimal changes to existing systems.

