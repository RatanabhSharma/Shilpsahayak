# SPEC.md — Shilp Sahayak Canonical Project Specification

> **Status**: `DRAFT` (Awaiting User Review)
>
> ⚠️ **Planning Lock**: No code may be written until this spec is marked `FINALIZED`.

---

## 1. Vision & Business Purpose

**Shilp Sahayak** is an Indian precision fabrication and 3D printing e-commerce platform and on-demand custom manufacturing service. The platform bridges creative makers, engineers, and everyday consumers with reliable, high-quality additive manufacturing capabilities.

The platform provides two primary customer journeys alongside operational administrative tooling:
1. **Curated E-Commerce Storefront**: Ready-to-ship 3D-printed home accessories, architectural lighting, planters, organizers, and functional hardware.
2. **Shilp Studio (Custom Fabrication)**: On-demand custom 3D printing where customers upload 3D CAD models (`.stl`, `.obj`, `.3mf`), inspect geometries in an interactive 3D WebGL viewport, configure printing parameters, and either add verified models directly to cart with deterministic pricing snapshots or request manual quotes handled through a governed engineering review pipeline.
3. **Integrated Admin CMS**: An administrative operations suite providing end-to-end management over store catalog, order fulfillment, manual quote review, homepage visual layouts, pricing matrices, shipping rates, coupons, and business settings.

---

## 2. Core Architecture & Technology Stack

The repository is an existing production web application structured as follows:

```
/
├── frontend/                     # React 18 SPA + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/           # Storefront & Admin modular UI components
│   │   ├── hooks/                # Domain & React Query data-fetching hooks
│   │   ├── lib/                  # Firebase SDK initializers & shared constants
│   │   ├── pages/
│   │   │   ├── storefront/       # Public storefront routes (Home, Catalog, ProductDetail, Cart, CustomPrinting, Checkout, etc.)
│   │   │   └── admin/            # Protected management routes (Dashboard, Catalog, Orders, Quotes, AdminHome, Settings, etc.)
│   │   ├── services/             # Payment processing, CAD parsing, pricing engine
│   │   └── store.ts              # Global Zustand state store (Cart, CustomPrint, UI modals)
│   ├── public/images/logo.jpg    # Static logo fallback asset
│   └── vite.config.ts            # Vite config with manual Rollup vendor chunking
├── shilp-sahayak-r2/             # Serverless backend Cloudflare Worker (Fetch-based API router)
│   ├── wrangler.toml             # Bindings to Cloudflare R2 bucket and edge secrets
│   └── src/index.ts              # Edge endpoints for payments, uploads, and order operations
├── firestore.rules               # Declarative Firebase security rules for collections
└── docs/                         # Governance specifications (ADMIN_CMS_MASTER_PLAN.md, etc.)
```

### Key Technologies
- **Frontend**: React 18.3.1, Vite 5.4.21, TypeScript 5.5.4, Tailwind CSS 3.4.17.
- **State Management**: TanStack Query (`@tanstack/react-query` v5) for server state caching/background sync; Zustand for client-side Cart, Studio custom printing configuration, and UI modals.
- **3D Graphics & CAD**: Three.js (`three` v0.185.1) with loaders (`STLLoader`, `OBJLoader`, `MTLLoader`, `3MFLoader`, `fflate`) for WebGL visualization, multi-part/multicolor inspection, and client-side bounding/volume analysis.
- **Animation & UI**: Framer Motion (`framer-motion` v11), Lucide React icons, React Hot Toast.
- **Backend & Auth**: Google Firebase (Authentication, Cloud Firestore, Firebase Storage).
- **Edge Backend & File Storage**: Cloudflare Workers (trusted edge compute for payments and file uploads) and Cloudflare R2 (S3-compatible bucket for user CAD files).
- **Payment Gateway**: Razorpay India (INR checkout via Credit/Debit Cards, UPI, NetBanking).

---

## 3. Product Scope & Functional Requirements

### 3.1 Storefront Navigation & Routes (Verified against `frontend/src/App.tsx`)
- **Home (`/`)**: Main landing page with hero media (video/image/slideshow), 3D CAD preview teaser, material showcase, featured products, and customer reviews.
- **Shop / Catalog (`/shop`)**: Product browsing grid.
  - *Legacy redirect*: `/catalog` permanently redirects to `/shop`.
- **Product Detail (`/product/:id`)**: High-resolution image galleries, product specifications, material options, inventory status, customer reviews, Add-to-Cart, and Buy-Now checkout trigger.
- **Cart (`/cart`)**: Dedicated Cart page and slide-over drawer with persistent Zustand storage.
- **Checkout (`/checkout`)**: Multi-step checkout capturing shipping address, billing details, order summary, coupon validation, and Razorpay modal launch.
- **Shilp Studio (`/shilp-studio`)**: Primary route for custom 3D printing CAD ingestion and quoting.
  - *Legacy redirects*: `/custom-printing` and `/custom-service` permanently redirect to `/shilp-studio`.
- **Information & Brand Pages**:
  - `/our-story` (about page; `/about` redirects to `/our-story`).
  - `/reach-us` (contact page; `/contact` redirects to `/reach-us`).
- **Customer Account & Auth**:
  - `/login`: Customer and guest authentication gateway.
  - `/account`: Protected customer portal wrapped in `<CustomerRoute>` for viewing profile and order history.
- **Legal Routes**: `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`, `/cookie-policy`.
- **Catch-All (404)**: Custom 3D themed fallback route ("Lost in the Slicer").

### 3.2 Admin Panel Routes (Verified against `frontend/src/App.tsx`)
All admin routes are protected under `<ProtectedRoute>` within `<AdminLayout>`:
- **Login**: `/admin/login` (standalone login route).
- **Root Admin**: `/admin` (automatically redirects to `/admin/dashboard`).
- **Dashboard**: `/admin/dashboard` (metrics, order velocity, alerts).
- **Storefront CMS**: `/admin/home` (visual hero copy, media toggles, section visibility).
- **Orders**: `/admin/orders` and single order detail `/admin/orders/:id`.
- **Quotes**: `/admin/quotes` (in-depth CAD review, status updates, and quote-to-order conversion).
  - *Note*: Quotes are managed via a sliding review drawer and modal inside `/admin/quotes`; there is no separate `/admin/quotes/:id` route in `App.tsx`.
- **Catalog**: `/admin/catalog` (product CRUD, variants, stock).
- **Inventory**: `/admin/inventory` (stock levels and adjustments).
- **Customers**: `/admin/customers` (customer directory and transaction history).
- **Inquiries**: `/admin/inquiries` (contact form submissions).
- **Reviews**: `/admin/reviews` (moderation and publishing).
- **Branding**: `/admin/branding` (logo, brand colors, typography).
- **Coupons**: `/admin/coupons` (discount codes, expiry dates, usage limits).
- **Settings**: `/admin/settings` (business profile, shipping rates, GST, email notifications).

### 3.3 Shilp Studio (Custom 3D-Printing Workflow)
- **CAD File Ingestion**: Drag-and-drop file upload supporting `.stl`, `.obj`, and `.3mf` (including Bambu Lab multi-material project files via `bambu3mfParser.ts`).
- **Client-Side Parsing & Geometry Inspection**: Three.js WebGL canvas displaying interactive CAD mesh, bounding box dimensions ($X \times Y \times Z\text{ mm}$), estimated surface area, volume, and material weight.
- **Dual Fulfillment Flow**:
  1. **Instant Slicing & Cart Addition**: For standard geometries with deterministic pricing, a complete immutable `QuoteSnapshot` is constructed client-side and attached directly to a cart item, uploading the CAD model to R2.
  2. **Manual Quotation Pipeline**: For non-standard models, oversized builds, or custom assisted inquiries, customers submit quotation requests to Firestore `/quotes` collection with initial status `New Request` / `Under Review`.
- **R2 Storage Upload**: Files are sent via `multipart/form-data` to Cloudflare Worker `POST /upload`, which writes directly to the Cloudflare R2 bucket. If the worker is unreachable or during guest preview, an IndexedDB fallback (`saveModelLocally`) preserves the file locally.
- **Slicer Status**: Slicing parameters and estimates are calculated via client-side deterministic algorithms (`calculateQuote.ts`, `instantEstimator.ts`). Automated server-side slicer CLI execution is currently disabled/inactive in favor of client parsing and engineering review.

### 3.4 Homepage CMS & Storefront Configuration
- **Firestore Document Paths** (Verified in code):
  - **Storefront CMS**: Document path is `settings/storefront` (handled by `useHomepage.ts`).
  - **Business & Store Settings**: Document path is `settings/business` (handled by `useSettings.ts`).
  - **Private Administrative Settings**: Document path is `settings/private` (notifications, admin user list).
  - **Pricing Parameters**: Document path is `settings/pricing` (handled by `usePricingSettings.ts`).
- **Data Hydration**: Synchronously pre-warmed using static defaults (`DEFAULT_HOMEPAGE_SETTINGS`, `DEFAULT_SETTINGS`) in TanStack Query (`initialData` with `initialDataUpdatedAt: 0`) to prevent visual layout shifts during network resolution.

### 3.5 Identity, Authentication & Role-Based Access Control
- **Authentication Provider**: Firebase Authentication (Email/Password and Google OAuth popup/redirect).
- **Role Verification Mechanism**:
  - Authorization is verified primarily via **Firestore document role lookups**: `users/{uid}` document contains `role: 'admin' | 'customer'`.
  - `useUserRole.ts` queries `doc(db, 'users', user.uid)` and sets `isAdmin = (role === 'admin')`.
  - `firestore.rules` enforces admin access via Firestore document lookups:
    ```javascript
    function isAdmin() {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    ```
  - *Open Note*: Firebase Auth Custom Claims (`request.auth.token.admin`) are not currently utilized in `firestore.rules` or `useUserRole.ts`; roles are stored and verified directly in Firestore documents.

### 3.6 Cloudflare Worker & API Endpoints (Verified against `shilp-sahayak-r2/src/index.ts`)
The serverless edge backend runs on Cloudflare Workers with direct R2 bucket bindings:
- `POST /api/payment/create-order`: Validates cart items, calculates server-side totals, creates order in Firestore, and calls Razorpay API to generate a `razorpayOrderId`.
- `POST /api/payment/verify`: Verifies Razorpay HMAC-SHA256 signature (`razorpay_order_id|razorpay_payment_id` against `RAZORPAY_KEY_SECRET`), transitions order status to `Paid`, and triggers post-order workflows.
- `POST /api/payment/webhook`: Webhook handler for asynchronous Razorpay events.
- `POST /upload`: Uploads CAD files (`.stl`, `.obj`, `.3mf`, `.zip`) or images directly into Cloudflare R2 bucket.
- `GET /file` & `DELETE /file`: R2 object retrieval and deletion endpoints.
- `POST /api/coupons/validate`: Server-side coupon verification and discount calculation.
- `POST /api/orders/cancel`: Customer/Admin order cancellation and refund handling.
- `POST /api/mail/send` & `POST /api/contact`: Email delivery and inquiry submission via edge worker.
- `GET /health`: Worker health probe.

### 3.7 Payment Pipeline (Razorpay India)
- Currency: Indian Rupee (INR - ₹).
- Client dynamically loads `https://checkout.razorpay.com/v1/checkout.js` via `paymentService.ts`.
- End-to-end payment verification:
  1. Frontend calls `POST ${CLOUDFLARE_WORKER_URL}/api/payment/create-order` with Firebase bearer token.
  2. Worker calculates authoritative pricing and creates Razorpay order.
  3. Client launches Razorpay modal.
  4. On completion, client submits payment ID, order ID, and signature to `POST ${CLOUDFLARE_WORKER_URL}/api/payment/verify`.
  5. Worker validates cryptographic HMAC signature and marks order `Paid` in Firestore.

---

## 4. Performance & Media Refactor Status

### 4.1 Implemented Performance Features (Verified in Source)
- **Route Code Splitting**: All storefront and admin pages are code-split via `React.lazy` in `App.tsx` and wrapped in `<Suspense>` with loading fallbacks.
- **Rollup Manual Chunks**: `frontend/vite.config.ts` partitions heavy libraries into dedicated bundles:
  - `vendor-firebase`: `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`.
  - `vendor-framer`: `framer-motion`.
  - `vendor-tanstack`: `@tanstack/react-query`.
- **Initial Data Caching**: `useHomepage` and `useProducts` utilize synchronous static seeds (`DEFAULT_HOMEPAGE_SETTINGS` and `INITIAL_CATALOG_PRODUCTS`) with `initialDataUpdatedAt: 0` to enable instant rendering without blank layout shifts.
- **Video Deferral Mechanism**: In `Home.tsx`, hero video rendering is held until user interaction (`mousemove`, `touchstart`, or scroll) or connection verification (`navigator.connection.saveData`).
- **Viewport Video Pausing**: An `IntersectionObserver` in `Home.tsx` pauses the hero video when scrolled out of view to conserve CPU/GPU resources.
- **3D Canvas Lazy Loading**: `Hero3DCanvas` is loaded via `React.lazy()` so Three.js WebGL execution is isolated from critical page start.
- **Fallback Logo Asset**: `staticHeroImage` falls back to `/images/logo.jpg`, which is physically present in `frontend/public/images/logo.jpg`.

### 4.2 Historical Performance Baseline (Previous Production PageSpeed Audit)
> **Note**: The metrics below represent historical external PageSpeed audit records from previous deployment testing. They do **not** reflect local development server measurements and must be independently re-verified with fresh, reproducible runs.

- **Historical Mobile Run**:
  - Performance Score: 64
  - First Contentful Paint (FCP): 3.6 s
  - Largest Contentful Paint (LCP): 5.8 s
  - Total Blocking Time (TBT): 80 ms
  - Cumulative Layout Shift (CLS): 0
- **Historical Desktop Run**:
  - Performance Score: 96
  - First Contentful Paint (FCP): 0.6 s
  - Largest Contentful Paint (LCP): Reported as 0.6 s in summary screenshots, but flagged for re-run due to variance across test runs.
  - Total Blocking Time (TBT): 60 ms
  - Cumulative Layout Shift (CLS): 0

---

## 5. Non-Negotiable Quality Gates & Acceptance Criteria

Every subsequent phase, milestone, and pull request must clear the following non-negotiable verification gates:

- [ ] **Production Build Pass**: Clean compilation with zero errors via `cmd /c "cd frontend && npm run build"`.
- [ ] **Type & Lint Safety**: TypeScript typecheck passes with no errors; ESLint reports zero breaking violations.
- [ ] **Multi-Device Responsive Matrix**: Visual layout verified clean and free of layout defects at 360 × 800, 390 × 844, 412 × 915, and 1280 × 800.
- [ ] **Visual Stability**: Zero horizontal viewport overflow, zero broken image placeholders, zero visual flash of unstyled/unhydrated content, and CLS score $< 0.1$.
- [ ] **Route & Refresh Integrity**: Direct URL navigation and hard browser refresh function without 404 or blank screen across all public and authenticated routes.
- [ ] **Commerce & Operations Preserved**: Shopping cart, direct Buy Now, custom 3D model upload to R2, checkout initiation, and Admin CMS controls function seamlessly.
- [ ] **Security Review**: Any changes touching authorization, API routes, or data access must maintain strict zero-trust boundary verification.
- [ ] **Empirical Measurement**: Any performance optimization must be verified with reproducible audit evidence.

---

## 6. Open Decisions & Technical Inquiries

1. **Firebase Custom Claims vs. Firestore Roles**:
   - *Current Implementation*: Authorization relies entirely on reading `users/{uid}` in Firestore (`role == 'admin'`).
   - *Question*: Should administrative accounts be migrated to standard Firebase Auth Custom Claims (`admin: true`) to avoid Firestore document read overhead on every rule evaluation?
2. **Hero Video Asset Delivery**:
   - *Current Implementation*: Hero video is packaged locally (`demo_video2.mp4`, ~4.36 MB) and conditionally deferred.
   - *Question*: Should the demo video be hosted externally on Cloudflare R2 / CDN with adaptive bitrate or WebM compression to eliminate static bundle weight?
3. **Hero Image LCP Optimization**:
   - *Current Finding*: In `Home.tsx`, the hero fallback `<img>` elements currently lack explicit `fetchpriority="high"` and preloading attributes, while `ProductCard.tsx` does support `fetchPriority`.
   - *Question*: Should explicit high-priority preloading be applied to the hero fallback image for faster mobile LCP discovery?
4. **Desktop LCP Measurement Rerun**:
   - *Current Finding*: Historical desktop audit logged an LCP of 0.6s, which exhibits discrepancy with typical asset discovery timing.
   - *Action*: Schedule a controlled local Lighthouse audit rerun using a production build preview to obtain an authoritative, reproducible baseline.

---

*Last reviewed & verified against source code: 2026-10-09*
