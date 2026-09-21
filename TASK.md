# Project Roadmap & Tasks

## Current Priority Order
1. Stability
2. Customer UX
3. Core storefront functionality
4. Checkout/payment security
5. Order management
6. Reviews
7. Admin functionality
8. Notifications
9. Performance/SEO/accessibility
10. Future automatic slicer research (MUST NOT BLOCK prior tasks)

---

## Roadmap

### A. Finish and Validate Customer Review System [IN PROGRESS]
- Complete the real review system architecture.
- Ensure product detail pages show genuine ratings (no fabricated counts/scores).
- Ensure Admin can moderate reviews successfully.

### B. Finish Checkout Architecture
- Stabilize the Cart and Buy Now workflows to ensure they remain separated.
- Guarantee order state correctly reflects intended purchases.

### C. Integrate Razorpay Sandbox [HARDENED - TEST MODE]
- Integrated Razorpay payment gateway in TEST/SANDBOX mode via Standard Checkout SDK.
- Configured public Key ID on frontend and secret verification on trusted server with Shilp Sahayak accent `#FF4D00`.
- Server-authoritative capture verification against `api.razorpay.com/v1/payments/{payment_id}` to ensure payment is captured and parameters match before marking Paid.
- Real Sandbox E2E transaction testing remains pending user test credentials.

### D. Secure Server-Side Order/Payment Workflow [HARDENED - TEST MODE]
- Authoritative order subtotal, shipping, and total calculation moved to Cloudflare Worker.
- Worker verifies product existence, stock sufficiency, and active pricing from Firestore.
- Single canonical webhook route: `POST /api/payment/webhook`.
- Webhook HMAC SHA256 signature verification over raw request body using `RAZORPAY_WEBHOOK_SECRET`.
- Multi-state webhook idempotency tracking (`processing` -> `processed` / `failed`) in `webhook_events/{eventId}` with out-of-order safety.

### E. Automate Payment → Order Status [HARDENED - TEST MODE]
- Automated transition logic:
  `Razorpay Captured & Verified` -> `paymentStatus = Paid` -> `orderStatus = Confirmed`.
- Dispatches order confirmation email via Firestore `mail` collection upon authoritative verification, with strict deduplication (`confirmationEmailSent: true`).
- Admin fulfillment lifecycle retains control from Confirmed -> Processing -> Ready to ship -> Shipped -> Delivered.

### F. Improve Customer Order Experience
- Flesh out customer-facing order tracking / history UI in their account dashboard.

### G. Complete Admin Workflow
- Ensure all fulfillment steps (Processing, Printing, QC, Shipped) are cleanly manageable by staff.

### H. Final UI/UX Polish
- Audit overall responsive design and accessibility.
- Polish animations and visual feedback.

### I. Revisit Slicer [BLOCKED / FUTURE]
- Perform rigorous benchmarking on automated CLI outputs vs Desktop slicer outputs.
- Reactivate automatic quoting only when accuracy is proven.

---

## Completed & Established
- **Slicer Archived**: Automated slicing is disabled and moved to `future-tasks/slicer/`.
- **Manual Review Fallback**: All uploaded CAD models route to the manual Engineer Quote workflow.
- **Firebase/Cloudflare Architecture**: Core infrastructure for Auth, Firestore, and R2 storage is active.
- **Review Strategy Defined**: Reviews must be tied to verified purchases; no fake data.
- **Cart Separation**: "Buy Now" and "Add to Cart" are treated as distinct workflows.
- **Admin Cleanup**: Obsolete legacy UI (slideshow editor, obsolete content controls) has been permanently removed from the active Storefront manager.
- **Design Baseline**: Current UI is established as the visual source of truth to prevent regressions.
- **Authentication Streamlined (V1)**: Firebase Email/Password is the primary authentication system with official email verification. Phone numbers are collected as optional customer contact information for courier and order updates, with all phone OTP verification and checkout gating permanently removed.

