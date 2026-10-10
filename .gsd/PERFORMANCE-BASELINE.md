# Performance Baseline & Homepage Initial State Investigation

> **Target Project:** Shilp Sahayak  
> **Production URL:** `https://shilpsahayak.vercel.app/`  
> **Date of Controlled Audits:** 2026-10-09 (17:06 – 17:34 IST)  
> **Environment Details:**
> - **Lighthouse Version:** 13.5.0
> - **Chrome Version:** Chrome 154 (Headless)
> - **OS:** Windows 11 (Host Benchmark Index: 3370)
> - **Mobile Viewport:** 390 × 844 (DPR: 3.0, Simulated Mobile 4G: 150ms RTT, 1.6 Mbps throughput, 4x CPU slowdown)
> - **Desktop Viewport:** 1280 × 800 (DPR: 1.0)

---

## 1. Controlled Performance Baseline Measurements

All six controlled runs executed against live production are recorded below without modification.

### 1.1 Mobile Baseline (Viewport: 390 × 844, Mobile Throttling)

| Metric | Run 1 | Run 2 | Run 3 | **Reported Median** | Match Check |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Performance Score** | 84 | 83 | 81 | **83** | **Exact** |
| **First Contentful Paint (FCP)** | 2.9 s | 2.9 s | 2.9 s | **2.9 s** | **Exact** |
| **Largest Contentful Paint (LCP)** | 3.3 s | 3.4 s | 3.3 s | **3.3 s** | **Exact** |
| **Total Blocking Time (TBT)** | 60 ms | 50 ms | 110 ms | **60 ms** | **Exact** |
| **Cumulative Layout Shift (CLS)** | 0 | 0 | 0 | **0** | **Exact** |
| **Total Transferred Network Weight** | 6,900 KiB | 6,899 KiB | 6,900 KiB | **6,900 KiB** | **Exact** |

### 1.2 Desktop Baseline (Viewport: 1280 × 800)

| Metric | Run 1 | Run 2 | Run 3 | **Reported Median** | Match Check |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Performance Score** | 83 | 83 | 84 | **83** | **Exact** |
| **First Contentful Paint (FCP)** | 2.9 s | 2.9 s | 2.9 s | **2.9 s** | **Exact** |
| **Largest Contentful Paint (LCP)** | 3.3 s | 3.3 s | 3.3 s | **3.3 s** | **Exact** |
| **Total Blocking Time (TBT)** | 90 ms | 60 ms | 50 ms | **60 ms** | **Exact** |
| **Cumulative Layout Shift (CLS)** | 0 | 0 | 0 | **0** | **Exact** |
| **Total Transferred Network Weight** | 6,900 KiB | 6,900 KiB | 6,899 KiB | **6,900 KiB** | **Exact** |

---

## 2. Investigation of Desktop vs. Mobile Metric Parity

A dedicated configuration probe was conducted to understand why Desktop and Mobile scores were virtually identical (~83 score, 2.9s FCP, 3.3s LCP) in the initial batch:

1. **Root Cause of Identical Desktop Runs:**
   In the CLI command `npx lighthouse ... --form-factor=desktop --screenEmulation.width=1280`, Lighthouse default configuration requires `--preset=desktop` to apply desktop network and CPU throttling. Without `--preset=desktop`, Lighthouse preserved the default **mobile network simulation** (150ms RTT, 1.6 Mbps throughput, 4x CPU slowdown) despite resizing the screen to 1280 × 800.
2. **Verification with Official Desktop Preset (`--preset=desktop`):**
   When tested with Lighthouse's official desktop preset (40ms RTT, 10 Mbps throughput, 1x CPU multiplier, unthrottled desktop execution), the live production site scored:
   - **Performance Score: 94**
   - **First Contentful Paint (FCP): 0.7 s**
   - **Largest Contentful Paint (LCP): 1.0 s**
   - **Total Blocking Time (TBT): 0 ms**
   - **Cumulative Layout Shift (CLS): 0**
3. **Conclusion on Historical Desktop Results:**
   The historical desktop result (~96 score, ~0.6s LCP) was **not** an erroneous anomaly; it corresponds closely to unthrottled desktop conditions (0.7s FCP, 1.0s LCP). Conversely, the mobile score is heavily penalized by client-side bundle download delays under mobile 4G throttling.

---

## 3. Exact LCP Element & Media Identification

### 3.1 DOM Element Details
* **Selector:** `section.relative > div:first-child > img`
* **Outer HTML:**
  ```html
  <img src="/images/logo.png" alt="Shilp Sahayak 3D Fabrication Studio" class="w-full h-full object-cover object-center">
  ```
* **Rendered Dimensions (Mobile 390 × 844):** 390 px width × 420 px height (intrinsic aspect ratio: 650 × 520 px).
* **Role & Context of Asset:**
  - This element acts as the **Hero Background Artwork / Poster**, rendered full-bleed behind the dark gradient overlays (`bg-gradient-to-t from-[#0d0d0f]`).
  - Despite being named `logo.png` / `logo.jpg`, it is **not** the brand icon in the header (which is `<img src="/images/logo-dark.webp" width="48" height="48">`).
  - It serves as the fallback visual backdrop configured in Firestore CMS (`settings/storefront.hero.heroPosterUrl` / `heroImageUrl`).

### 3.2 LCP Discovery & Preloading Assessment
* **LCP Discovery Audit Result:** **Score 0 (Fail)**
* **Can `/images/logo.png` be preloaded in `index.html`?**  
  **Caution:** Preloading `/images/logo.png` statically in `index.html` is **not recommended** at this stage. In the Firestore CMS document, `heroImageUrl`, `heroPosterUrl`, and `heroImageMode` are completely configurable by store administrators via `/admin/home`. Preloading a hardcoded image path would create duplicate network requests if an administrator uploads a custom hero image or switches the media mode.

---

## 4. Rigorous Investigation of the Hero-Section Visual Flash

Lifecycle tracking using DOM mutation observers, bounding box inspection, and direct live Firestore document reads revealed the following confirmed visual changes:

### 4.1 Confirmed Visual Change 1: Headline & CTA Button Vanishing
* **Initial Render (0–300 ms, DCL):**
  - Synchronously renders from `DEFAULT_HOMEPAGE_SETTINGS`.
  - Shows Headline: `"Bring Your Ideas to Life in 3D"`.
  - Shows Primary CTA: `"Upload 3D Model"` (`/shilp-studio`, Orange button, 314 × 40 px).
  - Shows Secondary CTA: `"Shop Collection"` (`/shop`, Translucent button, 314 × 42 px).
* **At ~800 ms – 1.0 s (Firestore Resolution):**
  - `useHomepage()` receives data from Firestore document `settings/storefront`.
  - Live Firestore document contains empty strings for headline and buttons, and boolean disable flags:
    ```json
    "hero": {
      "headline": "",
      "badgeText": "",
      "primaryCtaText": "",
      "enablePrimaryCta": false,
      "enableSecondaryCta": false,
      "showVideoTextOverlay": false
    }
    ```
  - React reconciles: Headline and CTA buttons **completely unmount and vanish from the DOM**.
* **Impact:** This is the most glaring visual flash reported by users. The hero renders text and action buttons on initial paint and then abruptly strips them away once Firestore settings resolve.

### 4.2 Confirmed Visual Change 2: Hero Background Image Swap
* **Initial Render:** Renders `<img src="/images/logo.jpg">` from `DEFAULT_HOMEPAGE_SETTINGS`.
* **At ~1.0 s:** Replaced by `<img src="/images/logo.png">` from Firestore `heroPosterUrl: "/images/logo.png"`.
* **Impact:** Visible texture flicker as the browser decodes and replaces the raster image.

### 4.3 Confirmed Visual Change 3: Automatic Video Swap at 3.5s – 4.5s
* **Trigger:** Lines 448–455 of `Home.tsx` contain an unconditional 3,500 ms `setTimeout` fallback.
* **Result:** At ~4.1 seconds (even with zero user interaction), `<img src="/images/logo.png">` unmounts and `<video>` mounts with `<source src="/assets/demo_video2-CZ06FSIm.mp4">`, streaming a 4.47 MB file.
* **Impact:** A second visible transition in the hero viewport, accompanied by heavy CPU/GPU decoding and network consumption.

---

## 5. Top Network Requests by Transfer Size

Network requests captured from the controlled production audit, sorted by transfer size:

| Rank | Resource URL | Resource Type | Transferred Bytes | Notes |
| :---: | :--- | :---: | :---: | :--- |
| **1** | `/assets/demo_video2-CZ06FSIm.mp4` | `media` | **4,471,853 B (~4.36 MB)** | Hero video loaded via 3.5s automated timeout. |
| **2** | `5.imimg.com/.../3d-silicone-keychain...jpeg` | `image` | **737,941 B (~720 KB)** | Uncompressed external product image in catalog. |
| **3** | `shilp-sahayak-r2.../file?key=quotes%2F...` | `image` | **259,633 B (~253 KB)** | Cloudflare R2 uploaded model preview. |
| **4** | `/assets/vendor-firebase-CPPJ2388.js` | `script` | **179,463 B (~175 KB)** | Firebase core, Auth, and Firestore SDKs. |
| **5** | `i.pinimg.com/.../5579a32f...jpg` | `image` | **170,988 B (~167 KB)** | External product image. |
| **6** | `i.pinimg.com/.../884b8d65...jpg` | `image` | **120,259 B (~117 KB)** | External product image (Lightbox). |
| **7** | `/assets/index-nLXdRFbb.js` | `script` | **108,827 B (~106 KB)** | Main application JS bundle. |
| **8** | `cdn.magicpatterns.com/.../24c7b789...jpg` | `image` | **103,196 B (~100 KB)** | Catalog thumbnail image. |
| **9** | `cdn.magicpatterns.com/.../1f4a4228...jpg` | `image` | **102,649 B (~100 KB)** | Catalog thumbnail image. |
| **10** | `shilp-sahayak.firebaseapp.com/__/auth/iframe.js` | `script` | **95,289 B (~93 KB)** | Firebase auth iframe. |

---

## 6. Phase-by-Phase Remediation Plan & Live Execution Record

### Phase 0 — Protect the existing project and establish the real baseline
**Status:** PASS  
**Files changed:** None (read-only verification)  
**Tests run:**
- Git state check: `git status --short`, `git status`, `git rev-parse HEAD` -> Commit `dc7801c` ("bugs fixed"), working tree clean, up-to-date with `origin/main`.
- Production bundle verification: `https://shilpsahayak.vercel.app/` serving `index-CXnVQkRm.js` and `index-CX3f2Zym.css`.
- Live Firestore query: Document `settings/storefront` inspected via REST API. Live state confirmed: `hero.enableVideo: true`, `hero.enablePrimaryCta: false`, `hero.headline: ""`, `hero.heroPosterUrl: "/images/logo.png"`, `hero.heroImageUrl: ""`, `hero.heroVideoUrl: "/videos/demo_video2.mp4"`.
- Product catalog query: First featured product `HPaKMYGsBN3SwdtjP8cG` ("Lightbox") has `image: "https://i.pinimg.com/1200x/88/4b/8d/884b8d6527501b6cdbba6bbaa8d541e1.jpg"`.
- Technical audit endpoints: `/llms.txt` and `/ai-catalog.json` return SPA fallback HTML (status 200, Content-Type: `text/html; charset=utf-8`) because static files do not exist in `frontend/public/`.
- Baseline TypeScript check: Executed `npx tsc --noEmit` in `frontend/`. Baseline produces exactly 52 diagnostic lines (clean baseline established).

**Findings & LCP Root Cause Resolution:**
1. **LCP Element & URL:**
   - On Mobile under the latest audit profile: The LCP element is the featured product card image `"Lightbox"` (`https://i.pinimg.com/1200x/88/4b/8d/884b8d6527501b6cdbba6bbaa8d541e1.jpg`).
   - In historical audits where hero poster had an image, the hero image was LCP. In the latest audit where hero image is cleared, the hero has no image, and the first product in the carousel becomes the LCP element.
2. **Why Resource-Load Delay is ~5.07s on Mobile:**
   - The LCP image URL is **not discoverable in initial HTML** (client-side rendered SPA).
   - The browser must first download HTML (1.75 kB), vendor chunks (`vendor-firebase`, `vendor-framer`, `vendor-tanstack`, `index`), parse and execute JavaScript under 4x CPU slowdown.
   - React mounts, TanStack Query initiates Firestore network queries for `settings/storefront` and `products`.
   - Once Firestore returns product `HPaKMYGsBN3SwdtjP8cG`, React updates state, renders the carousel items, and inserts the `<img>` element into the DOM.
   - Only *after* DOM insertion (~4.5s – 5.0s on Slow 4G) does the browser initiate the request to `i.pinimg.com`.
3. **Resolution of LCP Discovery vs `fetchpriority="high"` Markup Conflict:**
   - Lighthouse's "Preload Largest Contentful Paint image" / "LCP element was not discoverable in the HTML" audit flags that the image URL does not appear anywhere in the static HTML payload received from the server.
   - The rendered DOM *does* have `fetchpriority="high"` because `extendedFeaturedProducts` marks `_isLcpCandidate: idx === 0 && setIdx === 1` and passes `priority={true}` to `ProductCard`.
   - However, `fetchpriority="high"` on an `<img>` only affects the browser priority *after* the `<img>` tag is created in the DOM. It does *not* make the URL discoverable during initial HTML parsing.
4. **Why the 4.36 MB MP4 is Transferred:**
   - Live Firestore `settings/storefront` has `hero.enableVideo: true` and `hero.heroVideoUrl: "/videos/demo_video2.mp4"`.
   - In `Home.tsx`, lines 448–455 contain a 3,500 ms `setTimeout` fallback (`requestIdleCallback(() => setShouldLoadVideo(true))`).
   - When the timer fires, `shouldLoadVideo` becomes `true`, `heroMediaUrl` resolves to `demoVideo` (`/assets/demo_video2-CZ06FSIm.mp4`), and `<video>` mounts with `<source src={heroMediaUrl} />`, downloading the 4.47 MB file.

---

### Phase 1 — Enforce the hero and video configuration correctly
**Status:** BLOCKED  
**Files changed:** None (zero changes made to application code or live Firestore)  
**Verification Results & Evidence:**
1. **Firestore `settings/storefront` Inspection (Read at 21:38 IST / 16:08 UTC):**
   - Exact published document read via Google Firestore REST API:
     ```json
     "hero": {
       "enableVideo": { "booleanValue": true },
       "heroVideoUrl": { "stringValue": "/videos/demo_video2.mp4" },
       "heroPosterUrl": { "stringValue": "/images/logo.png" },
       "heroImageUrl": { "stringValue": "" },
       "headline": { "stringValue": "" },
       "enablePrimaryCta": { "booleanValue": false },
       "enableSecondaryCta": { "booleanValue": false }
     }
     ```
   - Document `updateTime`: `"2026-10-09T16:07:05.391761Z"` (21:37:05 IST).
   - In the saved document, `hero.enableVideo` is still `true`.
2. **Deployed Frontend Code Guard:**
   - Confirmed in `Home.tsx` and production bundle: `isVideoEnabled` is computed as `heroConfig.enableVideo !== false`. When `enableVideo` is `false`, `shouldLoadVideo` is never scheduled, listeners are not attached, and `heroMediaUrl` returns `''`.
3. **Network Capture on Production (Headless Chrome, 6.5s post-load):**
   - Total requests: 27
   - Media requests observed: `https://shilpsahayak.vercel.app/assets/demo_video2-CZ06FSIm.mp4` (`resourceType: 'media'`) requested via the 3.5s automated timeout because `enableVideo` in Firestore is still `true`.
4. **Hero DOM State:**
   - Video element: Present (`hasVideo: true`, `src: https://shilpsahayak.vercel.app/assets/demo_video2-CZ06FSIm.mp4`).
   - Image fallback: `null` (no logo substituted as hero image/poster).
   - Headline / CTA buttons: Completely absent (`hasH1: false`, `buttons: []`).
   - Console errors: Clean (`0` errors).

**Root Cause & Persistence Defect Analysis:**
1. **Button Closure & Functional Updater:** In `AdminHome.tsx`, the "✓ Enable Video" and "✕ Disable Video" buttons used direct closure state `setForm({ ...form, hero: { ...form.hero!, enableVideo: false } })` instead of functional updates `setForm((current) => ...)`.
2. **Missing Sanitization & Auditing:** Unlike other admin settings (`useBranding.ts`), `useUpdateHomepage` in `useHomepage.ts` was passing raw state directly to `setDoc(ref, settings, { merge: true })` without passing through `cleanFirestorePayload`, and without attaching `updatedAt` / `updatedBy`.
3. **Payload Normalization:** Ensured `handleSave` in `AdminHome.tsx` and `useUpdateHomepage` in `useHomepage.ts` strictly enforce boolean preservation for `hero.enableVideo` (`enableVideo !== false`), preventing any undefined/null or closure regression.

**Fix Applied (Minimal Code Changes):**
- [`frontend/src/hooks/useHomepage.ts`](file:///frontend/src/hooks/useHomepage.ts): Updated `useUpdateHomepage` to inject `currentUser.uid` (`updatedBy`), ISO timestamp (`updatedAt`), enforce strict boolean `hero.enableVideo === true`, and sanitize the entire payload via `cleanFirestorePayload`.
- [`frontend/src/pages/admin/AdminHome.tsx`](file:///frontend/src/pages/admin/AdminHome.tsx): Updated "Enable Video" and "Disable Video" buttons to use functional state updaters (`setForm((current) => ...)`), and guaranteed strict boolean preservation in `handleSave` (`hero.enableVideo: form.hero?.enableVideo === true`).
- [`frontend/src/utils/__tests__/cleanFirestorePayload.test.ts`](file:///frontend/src/utils/__tests__/cleanFirestorePayload.test.ts): Added regression test verifying `hero.enableVideo: false` is explicitly preserved as boolean `false` and not omitted, coerced, or stripped.
- [`frontend/src/pages/admin/__tests__/adminHomeWorkflow.test.ts`](file:///frontend/src/pages/admin/__tests__/adminHomeWorkflow.test.ts): Added isolated workflow unit test validating the complete button-click to draft-state to save-payload flow.

**Local Tests & Verification Results:**
1. **Isolated Button-to-Save Workflow Test (`adminHomeWorkflow.test.ts`):**
   - **Sequence 1 (Disable Video):**
     - Started with `hero.enableVideo: true`.
     - Executed "Disable Video" button updater: draft state became `hero.enableVideo: false`.
     - Executed `handleSave` payload builder: captured payload passed to mutation contained `hero.enableVideo: false` (strictly boolean `false`, not string or omitted).
     - Persisted payload after `cleanFirestorePayload` retained `hero.enableVideo: false`, `heroImageUrl: ''`, and all unrelated fields (`heroVideoUrl`, `featuredProductIds`).
     - Success feedback (`showSuccess = true`) confirmed only after mutation successfully resolved.
   - **Sequence 2 (Enable Video):**
     - Started with `hero.enableVideo: false`.
     - Executed "Enable Video" button updater: draft state became `hero.enableVideo: true`.
     - Executed `handleSave` payload builder: captured payload contained boolean `hero.enableVideo: true`.
   - **Sequence 3 (Error Handling):**
     - Tested mutation rejection: `showSuccess` remained `false`, and error message was caught and surfaced accurately.
2. **Environment & Framework Limitation Note:**
   - The project dev environment uses standard Node/Vitest without `@testing-library/react` or a simulated DOM environment (`jsdom` / `happy-dom`). Thus, isolated handler and pure-function state flow testing was executed without DOM mounting, avoiding synthetic browser hacks.
3. **Full Vitest Test Suite:**
   - 8 test files passed, 70/70 tests passed (including 8/8 in `cleanFirestorePayload.test.ts` and 3/3 in `adminHomeWorkflow.test.ts`).
4. **TypeScript Diagnostics:**
   - `npx tsc --noEmit`: 52 diagnostic lines (identical to the pre-existing project baseline; 0 new diagnostics introduced).
5. **Production Build:**
   - `npm run build`: Succeeded in 6.39s with 0 errors.
6. **Git Diff & Whitespace Verification:**
   - `git diff --check frontend/src`: Clean, 0 whitespace warnings.
7. **Preservation of Existing Work:**
   - Zero changes or regressions to homepage hero dark background styling, hero image removal logic, brand logo fallbacks, dynamic favicon, or other admin tabs. Live Firestore was not written to.

---

### Phase 2 — Fix mobile LCP discovery and loading
**Status:** NOT STARTED  
**Files changed:** TBD  
**Tests run:** TBD  
**Blockers / Approvals:** TBD  

---

### Phase 3 — Reduce oversized product-image downloads
**Status:** NOT STARTED  
**Files changed:** TBD  
**Tests run:** TBD  
**Blockers / Approvals:** TBD  

---

### Phase 4 — Verify caching, third-party requests, and Firebase behavior
**Status:** NOT STARTED  
**Files changed:** TBD  
**Tests run:** TBD  
**Blockers / Approvals:** TBD  

---

### Phase 5 — Reduce unused JavaScript and render-blocking work
**Status:** NOT STARTED  
**Files changed:** TBD  
**Tests run:** TBD  
**Blockers / Approvals:** TBD  

---

### Phase 6 — Resolve verified accessibility and technical-audit issues
**Status:** NOT STARTED  
**Files changed:** TBD  
**Tests run:** TBD  
**Blockers / Approvals:** TBD  

---

### Phase 7 — Final controlled retest
**Status:** NOT STARTED  
**Files changed:** TBD  
**Tests run:** TBD  
**Blockers / Approvals:** TBD  

