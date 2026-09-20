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

### C. Integrate Razorpay Sandbox [FUTURE]
- Integrate Razorpay payment gateway in TEST/SANDBOX mode first.
- Do not deploy production keys yet.

### D. Secure Server-Side Order/Payment Workflow [FUTURE]
- Move order total calculation to trusted Cloudflare Worker / Server environment.
- Setup webhook verification for Razorpay status updates.

### E. Automate Payment → Order Status [FUTURE]
- Implement the automatic transition logic: 
  `Razorpay Captured` -> `paymentStatus = Paid` -> `orderStatus = Confirmed`.

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

