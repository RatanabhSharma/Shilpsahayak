# Non-Negotiable Project Rules

These engineering, product, UI, and security rules must be read and strictly followed before making any substantial changes to the Shilp Sahayak repository.

## 1. Safety & Inspection
- **Inspect Before Editing**: Always read the relevant existing files, state stores, and Firebase structures before implementing new logic. 
- **Make Minimal Changes**: Implement only the requested scope. Do not rewrite large files unnecessarily.
- **Check Git Diff**: Always review your changes via `git diff` before considering a task complete.
- **Verify Build**: Always run `npm run build` after meaningful changes to ensure project integrity.
- **No Temporary Clutter**: Delete temporary scripts or patch files before finishing a task.

## 2. UI & Design Source of Truth
- **Current UI is Authoritative**: The current active UI is always the visual source of truth. 
- **Do Not Reintroduce Old UI**: Never restore an older UI wholesale just because it exists in previous commits (e.g., plain white/gray backgrounds, generic ecommerce styles, obsolete slideshows).
- **Fix Regressions Minimally**: If investigating a regression, identify the actual component causing the issue and make the smallest correction.

## 3. Product & Business Logic
- **Do Not Reactivate Slicer**: The automated slicer is archived. Do not reactivate it or use it to calculate automated prices without explicit authorization.
- **Preserve Originals**: Original customer CAD uploads must be preserved exactly as uploaded. Never overwrite them or replace them with a slicer-generated temporary file.
- **No Fake Data**: Do not hardcode fake review ratings, fake review counts, fake customer names, or fabricated prices. Products with no approved reviews should say "No reviews yet". Average ratings and counts must derive from genuine data.
- **Buy Now vs. Add to Cart**: "Buy Now" directs straight to Checkout and does not unexpectedly merge with existing cart contents. "Add to Cart" utilizes the existing cart state.

## 4. Architecture & State Management
- **Reuse Existing Systems**: Do not create parallel implementations when one already exists (e.g., reuse existing state stores, cart stores, email trigger collections).
- **No Duplicate Firebase Collections**: Do not create duplicate collections without architectural justification.
- **Single Source of Truth**: Use the existing cart state/store as the source of truth for cart functionality. Use Firestore as the source of truth for products, orders, and reviews.

## 5. Security & Payment Processing
- **Zero Client Trust for Financials**: Client input must never be trusted for financial or security-critical values. Future payment architectures must validate product identity, price, quantity, and final total server-side.
- **No Secrets in Frontend**: Private email-provider secrets, Razorpay secrets, or any other sensitive keys must never exist in the frontend code.
- **Protected Status Fields**: Customers must not be able to directly change `paymentStatus`, `orderStatus`, `product price`, `product averageRating`, `reviewCount`, `review moderation state`, or `verifiedPurchase` unless through an explicitly authorized and securely validated workflow.
- **Prove Security**: Never claim a feature is secure without actually validating the relevant security boundary.
- **Prove Tests**: Never claim a test passed if it was only reasoned about.

