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

## 7. Razorpay Test Mode & Payment Security
**Decision**: The frontend is completely untrusted for final financial totals. Razorpay is integrated in TEST/SANDBOX mode only.
**Implementation**:
- **Authoritative Calculations**: Cloudflare Worker (`/api/payment/create-order`) recalculates subtotal, shipping (free over ₹499, else ₹150), and total based on Firestore product data, stock sufficiency, and settings. Any client-submitted total mismatch is rejected with HTTP 400.
- **Payment Verification & Capture Checks**: `/api/payment/verify` verifies user ownership, matches internal Razorpay order ID, verifies HMAC SHA-256 using trusted server-side order ID, and validates live payment capture status with `api.razorpay.com/v1/payments/{payment_id}` before transitioning status.
- **Canonical Webhook**: A single endpoint (`POST /api/payment/webhook`) verifies `X-Razorpay-Signature` against raw request body using `RAZORPAY_WEBHOOK_SECRET`.
- **Multi-State Idempotency**: Webhook events track lifecycle states (`processing` -> `processed` / `failed`) in `webhook_events/{eventId}`. Failed events remain retryable, and duplicate arrivals while processing or after completion are safely acknowledged.
- **Email Deduplication**: Guaranteed exactly one confirmation email per order via the `confirmationEmailSent: true` guard on the order record and deterministic `mail` collection document IDs.
- **Separated Statuses**:
  - `paymentStatus`: 'Pending' | 'Paid' | 'Failed' | 'Refunded'
  - `orderStatus`: 'Pending' | 'Confirmed' | 'Processing' | 'Ready to ship' | 'Shipped' | 'Delivered' | 'Cancelled'
  - Successful payment automatically transitions `paymentStatus = Paid` and `orderStatus = Confirmed`.
  - Payment failure from webhook sets `paymentStatus = Failed` while `orderStatus` remains 'Pending'. Out-of-order webhook failures never overwrite an order that is already 'Paid'.
- **Theme**: Razorpay Checkout modal uses official Shilp Sahayak brand accent `#FF4D00`.
- **Stock Reservation**: Inventory units are reserved only for confirmed or paid active orders. Abandoned `Pending` checkout sessions do not lock inventory.
- **Secrets Isolation**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` reside strictly on the Cloudflare Worker. No secrets are exposed to React, VITE environment variables, or Git.
**Rule**: Live Mode remains deactivated until end-to-end sandbox operations, staff onboarding, and legal policies are reviewed.

## 8. State & System Duplication
**Decision**: Reuse existing infrastructure.
**Reasoning**: We use Firebase for Auth/Firestore and Cloudflare for Edge/Storage. We use the Firebase Trigger Email extension for notifications. We do not want parallel, duplicate implementations of databases, email services, or cart stores. Make minimal changes to existing systems.

## 9. V1 Authentication Simplicity
**Decision**: Firebase Email/Password is the primary authentication method. Phone number verification / OTP has been removed.
**Reasoning**: Phone SMS/Email OTP added unnecessary friction and dependency points during customer registration and checkout. Firebase natively handles account security, password resets, and email verification.
**Implementation**:
- Phone numbers remain standard contact information on user profiles and shipping addresses for courier and order notifications.
- Phone number input is optional on signup and user profile editing, but validated as a 10-digit Indian number if provided.
- Checkout does not gate order placement or payment on phone verification.
- All OTP verification state, modal components, and OTP verification services have been cleanly removed.

## 10. Buy Now vs Cart Isolation Architecture
**Decision**: BUY NOW and Cart checkout flows must operate with complete independence and mutual isolation.
**Reasoning**: A customer using BUY NOW expects to purchase only that single selected item without altering, leaking, or wiping their existing cart items. Conversely, a customer with an empty cart using BUY NOW must not see "Your cart is empty".
**Implementation**:
- **Store Contracts**: Zustand store maintains `purchaseMode: 'cart' | 'buy_now'`, `buyNowItem: CartItem | null`, `setPurchaseMode`, `setBuyNowItem`, and `clearBuyNowItem`. Rehydration migrations default to `purchaseMode: 'cart'` and `buyNowItem: null`.
- **Card & Detail Triggering**: Both `ProductCard` and `ProductDetail` set `setPurchaseMode('buy_now')`, set `setBuyNowItem(buyNowItem)`, and pass `{ state: { buyNowItem } }` to `navigate('/checkout', ...)`.
- **Checkout Strict Priority Resolution**: `Checkout.tsx` synchronizes navigation state and resolves checkout items with strict priority:
  - If `effectivePurchaseMode === 'buy_now'`, items resolve to `[effectiveBuyNowItem]` if present, or `[]` if missing (never falling back to `storeCart`, avoiding cart leakage).
  - If `effectivePurchaseMode === 'cart'`, items resolve to `storeCart`.
- **Cart Checkout Reset**: `Cart.tsx` explicitly invokes `setPurchaseMode('cart')` on "Proceed to Checkout" to guarantee no lingering `buy_now` mode persists.
- **Isolated Post-Payment Cleanup**: Upon successful payment verification, `Checkout.tsx` clears only `buyNowItem` and resets `purchaseMode` to `'cart'` for Buy Now orders, leaving `storeCart` completely untouched; only normal cart checkouts invoke `clearCart()`.


