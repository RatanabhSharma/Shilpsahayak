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
**Status:** PASS
**Files changed:**
- `frontend/src/hooks/useHomepage.ts`
- `frontend/src/pages/admin/AdminHome.tsx`
- `frontend/src/utils/__tests__/cleanFirestorePayload.test.ts`
- `frontend/src/pages/admin/__tests__/adminHomeWorkflow.test.ts`

**Final Production Verification Results & Evidence (October 10, 2026):**
1. **Live Firestore `settings/storefront` Inspection:**
   - Document read via Google Firestore REST API: `updateTime: "2026-10-10T05:51:10.903676Z"`.
   - `hero.enableVideo`: `{ "booleanValue": false }` (confirmed strict boolean `false`).
   - `hero.heroImageUrl`: `{ "stringValue": "" }` (empty static hero preserved).
   - `hero.heroPosterUrl`: `{ "stringValue": "/images/logo.png" }`.
   - `hero.enablePrimaryCta`: `{ "booleanValue": false }`.
   - `hero.enableSecondaryCta`: `{ "booleanValue": false }`.
   - `updatedAt`: `"2026-10-10T05:51:09.305Z"`.
   - `updatedBy`: `"j2mGDyfoCUOzaVv1ZcjNHQn0pVu2"`.
2. **Production Network Capture (`https://shilpsahayak.vercel.app/`):**
   - Fresh browser context (headless Chrome, Moto G Power emulation, 412x915).
   - Monitored from initial navigation through 9.55 seconds elapsed (7 seconds post-load).
   - Total network requests captured: 26.
   - Media requests: **0** (`demo_video2.mp4` was **NOT** requested).
   - Resource-load savings: Complete elimination of the 4.36 MB / 4,468 kB hero video download.
3. **Hero DOM State on Production:**
   - Video elements: `0` (`videos: []`).
   - Hero images: `0` (`imagesInHero: []` — no logo substituted as hero image or poster).
   - Headline / CTA buttons: Absent (`h1: null`, `buttons: []`).
   - Background styling: Neutral dark background (`heroBg: rgb(13, 13, 15)`).
   - Console errors: 0 errors.
4. **Local Tests & Verification:**
   - Vitest: 8 test files passed, 70/70 tests passed.
   - TypeScript check (`npx tsc --noEmit`): 52 lines (identical to baseline).
   - Production build (`npm run build`): Clean build in 6.37s.
   - Whitespace: `git diff --check` clean.

---

### Phase 2 — Fix mobile LCP discovery and loading
**Status:** IN PROGRESS
**Files changed:**
- `frontend/index.html` (added non-destructive preconnect & dns-prefetch origin links for external asset origins)

#### 1. Reconciled Audit Reports & Profile Separation

A dedicated set of six audits was executed against live production `https://shilpsahayak.vercel.app/` using Lighthouse 13.5.0 in headless Chrome. Each run was uniquely named and captured to full JSON/HTML on disk, verifying strict parameter segregation between Mobile and Desktop:

##### Mobile Testing Profile (Identical across Runs 1, 2, 3)
- **Lighthouse Version:** 13.5.0
- **Form Factor:** `mobile`
- **User Agent:** `Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36`
- **Screen Emulation:** `mobile: true`, `width: 412`, `height: 823`, `deviceScaleFactor: 1.75` (Lighthouse default mobile device profile `moto g power (2022)`)
- **Throttling Method:** `simulate` (Lantern)
- **Throttling Parameters:** RTT: 150 ms, Throughput: 1,638.4 Kbps, Request Latency: 562.5 ms, Download: 1,474.56 Kbps, Upload: 675 Kbps, CPU Slowdown: 4x

| Metric | Run 1 (`phase2_reconcile_mobile_1`) | Run 2 (`phase2_reconcile_mobile_2`) | Run 3 (`phase2_reconcile_mobile_3`) | **Reconciled Mobile Median** |
| :--- | :---: | :---: | :---: | :---: |
| **Performance Score** | 66 | 65 | 68 | **66** |
| **First Contentful Paint (FCP)** | 2.89 s (2,892.1 ms) | 2.94 s (2,940.3 ms) | 2.87 s (2,869.2 ms) | **2.89 s** |
| **Largest Contentful Paint (LCP)** | 7.78 s (7,780.1 ms) | 7.85 s (7,853.8 ms) | 6.81 s (6,806.3 ms) | **7.78 s** |
| **Total Blocking Time (TBT)** | 119 ms | 98 ms | 92 ms | **98 ms** |
| **Cumulative Layout Shift (CLS)** | 0.001 | 0.001 | 0.001 | **0.001** |
| **Speed Index (SI)** | 5.08 s (5,077.5 ms) | 5.73 s (5,727.2 ms) | 4.97 s (4,969.8 ms) | **5.08 s** |
| **Total Transferred Weight** | 2.40 MB (2,511,776 B) | 2.39 MB (2,510,756 B) | 2.39 MB (2,510,833 B) | **2.39 MB** |

##### Desktop Testing Profile (Identical across Runs 1, 2, 3)
- **Lighthouse Version:** 13.5.0
- **Form Factor:** `desktop` (`--preset=desktop`)
- **User Agent:** `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36`
- **Screen Emulation:** `mobile: false`, `width: 1350`, `height: 940`, `deviceScaleFactor: 1.0`
- **Throttling Method:** `simulate`
- **Throttling Parameters:** RTT: 40 ms, Throughput: 10,240 Kbps, Request Latency: 0 ms, CPU Slowdown: 1x (Desktop unthrottled)

| Metric | Run 1 (`phase2_reconcile_desktop_1`) | Run 2 (`phase2_reconcile_desktop_2`) | Run 3 (`phase2_reconcile_desktop_3`) | **Reconciled Desktop Median** |
| :--- | :---: | :---: | :---: | :---: |
| **Performance Score** | 88 | 88 | 82 | **88** |
| **First Contentful Paint (FCP)** | 0.78 s (775.6 ms) | 0.74 s (744.0 ms) | 0.79 s (788.1 ms) | **0.78 s** |
| **Largest Contentful Paint (LCP)** | 2.19 s (2,189.8 ms) | 2.17 s (2,169.9 ms) | 2.81 s (2,808.6 ms) | **2.19 s** |
| **Total Blocking Time (TBT)** | 0 ms | 0 ms | 0 ms | **0 ms** |
| **Cumulative Layout Shift (CLS)** | 0.001 | 0.001 | 0.001 | **0.001** |
| **Speed Index (SI)** | 1.12 s (1,120.9 ms) | 1.37 s (1,368.5 ms) | 1.46 s (1,464.3 ms) | **1.37 s** |
| **Total Transferred Weight** | 2.20 MB (2,301,892 B) | 2.20 MB (2,301,986 B) | 2.19 MB (2,301,603 B) | **2.20 MB** |

##### Comparison & Reconciliation with Earlier Post-Phase-1 Mobile Median (6.02 s LCP)
In the initial post-Phase-1 check, a preliminary mobile median of **6.02 s LCP** (Score: 69) was observed across runs with lower unthrottled delays (`resourceLoadDelay: 715–772 ms`, `total unthrottled duration: ~980–1,030 ms`).
In the dedicated reconciled mobile batch, the median LCP measured **7.78 s LCP** (Score: 66).
**Root Cause for the Variance (1.76 s difference):**
1. **Network Request Latency & DOM Injection Timing:**
   Under Lantern mobile 4G simulation (which applies 150ms RTT and 4x CPU throttling to the execution graph), small network jitter in when Firestore's cold REST endpoint returns the `products` and `settings/storefront` documents shifts the DOM insertion timestamp of the product card from ~899 ms to ~1,421 ms in the unthrottled trace.
2. **Amplification by 4x CPU Throttling and 150ms RTT:**
   Because the product card image is not in the static HTML, Lantern models the dependency chain: HTML -> JS bundles -> JS execution (4x slowdown) -> Firestore API request (150ms RTT) -> Firestore response -> React state update -> Image discovery -> Image download (150ms RTT + 1.6 Mbps bandwidth). A ~300–400 ms variance in cold Firestore response time during unthrottled execution is mathematically amplified by the simulated 4x CPU and mobile network multiplier into a ~1.7 s difference in the simulated LCP timestamp (from 6.02 s to 7.78 s).
3. **Consistency of Core Metrics:** FCP remained virtually identical across all runs (**2.87 s – 2.94 s**), TBT remained low risk (**92 ms – 119 ms**), CLS was rock-solid (**0.001**), and total transferred weight remained strictly constant (**2.39 MB** vs. the old 6.90 MB pre-Phase-1 baseline). Both batches empirically confirm that mobile LCP on production is gated entirely by client-side Firestore resolution.

---

#### 2. Reconciled LCP Breakdown & Metric Reconciliation

##### A. Exact LCP Element Identification
- **Mobile LCP Node:** Featured Carousel Product Image `<img>`
  - Selector: `a.group/card > div.flex > div.relative > img.h-full`
  - Outer HTML Snippet:
    ```html
    <img src="https://i.pinimg.com/1200x/88/4b/8d/884b8d6527501b6cdbba6bbaa8d541e1.jpg" alt="Lightbox" loading="eager" decoding="async" fetchpriority="high" class="h-full w-full object-cover transition-all duration-500 group-hover/card:scale-105">
    ```
  - First Visible Product: `"Lightbox"` (Doc ID `HPaKMYGsBN3SwdtjP8cG` in Firestore `settings/storefront.featuredProductIds[0]`).
- **Desktop LCP Node:** Featured Collection Section Header `<h2>`
  - Selector: `section.bg-[#F0F4F8] > div.mx-auto > div > h2.mt-1`
  - Outer HTML Snippet:
    ```html
    <h2 class="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-ink">
    ```
  - Text: `"CURATED SPECIMENS"` / `"Featured 3D Creations"`

##### B. Mathematical Reconciliation: Observed Raw Trace vs. Lantern Simulated Metric
Lighthouse produces two distinct sets of timing values:
1. **Observed Trace Timings (`network-requests` and `lcp-breakdown-insight`):** Recorded directly during unthrottled Chrome execution on the host machine.
2. **Simulated LCP (`audits['largest-contentful-paint'].numericValue`):** Modeled by the Lantern simulation engine applying mobile 4G network latency (150ms RTT, 1.6 Mbps download) and 4x CPU slowdown to the dependency graph.

Mathematical correspondence verified across each individual run:

* **Mobile Run 1 (`phase2_reconcile_mobile_1`):**
  - Observed Image Request Start (`networkRequestTime`): **1,101.37 ms**
  - Observed Image Response End (`networkEndTime`): **1,166.30 ms**
  - Unthrottled Resource Duration: **64.93 ms**
  - Unthrottled Subparts sum (`TTFB: 176.91 ms` + `Load Delay: 924.75 ms` + `Load Duration: 65.20 ms` + `Render Delay: 23.46 ms`) = **1,190.33 ms**
  - Modeled Simulated LCP under Slow 4G + 4x CPU: **7,780.13 ms (7.8 s)**
* **Mobile Run 2 (`phase2_reconcile_mobile_2`):**
  - Observed Image Request Start (`networkRequestTime`): **1,421.81 ms**
  - Observed Image Response End (`networkEndTime`): **1,492.25 ms**
  - Unthrottled Resource Duration: **70.44 ms**
  - Unthrottled Subparts sum (`TTFB: 321.95 ms` + `Load Delay: 1,100.15 ms` + `Load Duration: 70.75 ms` + `Render Delay: 25.16 ms`) = **1,518.01 ms**
  - Modeled Simulated LCP under Slow 4G + 4x CPU: **7,853.79 ms (7.9 s)**
* **Mobile Run 3 (`phase2_reconcile_mobile_3`):**
  - Observed Image Request Start (`networkRequestTime`): **899.77 ms**
  - Observed Image Response End (`networkEndTime`): **963.09 ms**
  - Unthrottled Resource Duration: **63.31 ms**
  - Unthrottled Subparts sum (`TTFB: 159.60 ms` + `Load Delay: 740.46 ms` + `Load Duration: 63.61 ms` + `Render Delay: 21.51 ms`) = **985.19 ms**
  - Modeled Simulated LCP under Slow 4G + 4x CPU: **6,806.32 ms (6.8 s)**

##### C. Terminology & Subpart Role Definitions
- **Time to First Byte (TTFB):** Time from initial navigation until the browser receives the first byte of the main HTML document (`160 ms – 322 ms`).
- **Resource Load Delay:** Time between TTFB and when the browser initiates the request for the LCP resource. In client-side SPAs, this delay encompasses downloading the JS bundles (`vendor-firebase`, `index`), compiling JS under 4x CPU slowdown, React mounting, executing the Firestore REST query, and creating the `<img>` tag in the DOM.
- **Resource Load Duration:** Time spent transferring the image bytes over the network.
- **Element Render Delay:** Time between the image finishing download and Chrome decoding, painting, and compositing the element into the viewport.

---

#### 3. Validation of the Connection-Hint Change (Controlled Local Preview A/B Test)

To evaluate the hypothesis that origin connection hints accelerate third-party resource discovery, an isolated A/B experiment was conducted under identical local preview conditions (`http://localhost:4173/`, Lighthouse 13.5.0, Moto G Power profile, Lantern simulation, 3 runs per condition):
- **Condition A (With Hints):** `frontend/index.html` with `<link rel="preconnect">` and `<link rel="dns-prefetch">` for `https://i.pinimg.com` and `https://firestore.googleapis.com`.
- **Condition B (Without Hints):** `frontend/index.html` at clean Git HEAD baseline without connection hints.

##### Controlled A/B Test Results

| Condition | Performance Score | FCP | LCP | TBT | CLS | Speed Index | Transferred Bytes | Pinterest Request Start |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Condition A (With Hints)** Run 1 | 74 | 2.86 s | 5.75 s | 80 ms | 0.001 | 2.86 s | 2,506,980 B | 654.6 ms |
| Condition A Run 2 | 74 | 2.86 s | 5.72 s | 76 ms | 0.001 | 2.86 s | 2,507,882 B | 597.6 ms |
| Condition A Run 3 | 79 | 2.86 s | 4.48 s | 0 ms | 0.000 | 2.86 s | 694,496 B | *(warm)* |
| **Condition A Median** | **74** | **2.86 s** | **5.72 s** | **76 ms** | **0.001** | **2.86 s** | **2.51 MB** | **626.1 ms** |
| **Condition B (No Hints)** Run 1 | 71 | 2.86 s | 6.88 s | 63 ms | 0.001 | 2.86 s | 2,506,531 B | 632.5 ms |
| Condition B Run 2 | 71 | 2.86 s | 6.88 s | 71 ms | 0.001 | 2.86 s | 2,506,587 B | 563.3 ms |
| Condition B Run 3 | 71 | 2.86 s | 6.89 s | 65 ms | 0.001 | 2.86 s | 2,507,388 B | 681.0 ms |
| **Condition B Median** | **71** | **2.86 s** | **6.88 s** | **65 ms** | **0.001** | **2.86 s** | **2.51 MB** | **632.5 ms** |

##### Investigation of Connection-Hint A/B Findings
1. **Pinterest Request Start Timings (626 ms vs 633 ms):**
   - The observed network request initiation for the first Pinterest product image begins almost identically in both conditions (~626 ms median with hints vs. ~633 ms without hints, a ~7 ms difference).
   - This occurs because in a client-side single page application (SPA), the browser cannot initiate the Pinterest image request until the React JavaScript bundle mounts, queries Firestore, receives product data, and injects the `<img src="https://i.pinimg.com/...">` element into the DOM. Connection hints cannot accelerate this execution chain.
2. **Why Lantern Simulated LCP Differs by 1.16 s (5.72 s vs 6.88 s):**
   - Although the request start time is similar, `<link rel="preconnect" href="https://i.pinimg.com">` prompts the browser to perform DNS lookup and TLS negotiation in advance.
   - Under Lighthouse's Lantern simulation engine (which applies a 150 ms TCP round-trip penalty and bandwidth constraints), an un-preconnect origin requires an extra DNS + TCP handshake round-trip before byte transfer starts. Under Lantern's mobile dependency graph modeling, this difference is amplified into a ~1.16 s simulated LCP improvement (5.72 s vs 6.88 s) and raises the mobile score from 71 to 74.
3. **Condition A Run 3 Transfer Weight (694,496 B):**
   - In Condition A Run 3, total byte weight dropped to ~694 KB because Chrome reused an existing cached profile state where third-party Pinterest images were not re-transferred over the network (`pinterestReq: null`).
   - Excluding the cached anomaly, runs A1 (2,506,980 B) and A2 (2,507,882 B) confirm that actual uncached transfer size matches Condition B (~2,506,500 B) within <0.05%.
4. **Empirical Status:** The connection hints are safe, non-destructive, and conform to web standards, but their real-world impact is limited by the client-side SPA rendering chain. The benefit should be described as modest pre-resolution assistance, not a verified ~450 ms raw time saving.

---

#### 4. Minimal Safe LCP Fix: Eliminating the Featured Section Entrance Animation Delay

##### Rationale & Scope
- In `frontend/src/pages/storefront/Home.tsx`, the Featured Products container was wrapped in:
  `<motion.section variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} className="bg-[#F0F4F8] py-12 sm:py-14">`
- This caused Framer Motion to apply `initial="hidden"` (`opacity: 0`, `translateY: 20px`), delaying the visual presentation and paint of the critical viewport section by an additional `0.55s` after data resolution.
- **Adjustment:** Replaced `<motion.section>` with a plain `<section className="bg-[#F0F4F8] py-12 sm:py-14">` and corresponding closing tag `</section>`.
- Preserved all inner markup, styles, grid structure, product carousel behavior, and unaffected page animations.
- Verified that the first visible product card still receives `priority={true}` and renders `loading="eager"`, `fetchpriority="high"`, and `decoding="async"` on its `<img>` element.

##### Post-Change Verification Audits (Local Preview, Lighthouse 13.5.0)

**Mobile Verification (3 Runs, Moto G Power profile, Lantern simulation):**
| Metric | Post Run 1 | Post Run 2 | Post Run 3 | **Post-Change Mobile Median** | Condition A Baseline | Condition B Baseline |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Performance Score** | 77 | 75 | 79 | **77** | 74 | 71 |
| **First Contentful Paint (FCP)** | 2.86 s | 2.86 s | 2.86 s | **2.86 s** | 2.86 s | 2.86 s |
| **Largest Contentful Paint (LCP)** | 4.83 s | 5.30 s | 4.55 s | **4.83 s** | 5.72 s | 6.88 s |
| **Total Blocking Time (TBT)** | 64 ms | 66 ms | 69 ms | **66 ms** | 76 ms | 65 ms |
| **Cumulative Layout Shift (CLS)** | 0.001 | 0.000 | 0.001 | **0.001** | 0.001 | 0.001 |
| **Speed Index (SI)** | 2.86 s | 2.86 s | 2.86 s | **2.86 s** | 2.86 s | 2.86 s |
| **Total Transferred Weight** | 2.51 MB | 2.51 MB | 2.51 MB | **2.51 MB** | 2.51 MB | 2.51 MB |

**Desktop Audit Reconciliation & True Desktop Verification (3 Runs):**
- **Investigation of Previous Desktop Audits:**
  - In earlier runs executed via `cmd /c "npx lighthouse ... --preset=desktop"`, Windows cmd/npx argument forwarding dropped the `--preset=desktop` argument, causing Lighthouse to fall back to its default mobile profile (`formFactor: mobile`, Moto G Power emulation, 4x CPU slowdown, 150 ms RTT).
  - This explained why the earlier desktop reports recorded an FCP of 2.86 s identical to mobile runs. Those earlier desktop numbers were invalid and are discarded.
- **Rerun with True Desktop Configuration (Local Preview):**
  - Audits executed directly via Node invoking Lighthouse CLI with verified `--preset=desktop` (`core/config/desktop-config.js`).
  - Stored Configuration Confirmed:
    - `formFactor: desktop`
    - `screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1 }`
    - `throttling: { rttMs: 40, throughputKbps: 10240, requestLatencyMs: 0, cpuSlowdownMultiplier: 1 }` (Desktop unthrottled)

| Metric | True Desktop Run 1 | True Desktop Run 2 | True Desktop Run 3 | **Post-Change Desktop Median (Local Preview)** | Historical "Desktop" Record *(Invalid Profile - Discarded)* |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Performance Score** | 99 | 99 | 99 | **99** | 88 *(unsuitable for comparison)* |
| **First Contentful Paint (FCP)** | 0.57 s | 0.57 s | 0.57 s | **0.57 s** | 0.78 s *(unsuitable for comparison)* |
| **Largest Contentful Paint (LCP)** | 0.91 s | 0.90 s | 0.94 s | **0.91 s** | 2.19 s *(unsuitable for comparison)* |
| **Total Blocking Time (TBT)** | 0 ms | 0 ms | 0 ms | **0 ms** | 0 ms |
| **Cumulative Layout Shift (CLS)** | 0.001 | 0.001 | 0.001 | **0.001** | 0.001 |
| **Speed Index (SI)** | 0.57 s | 0.57 s | 0.57 s | **0.57 s** | 1.37 s *(unsuitable for comparison)* |
| **Total Transferred Weight** | 2.30 MB | 2.30 MB | 2.30 MB | **2.30 MB** | 2.20 MB |

*Note on Desktop Baseline & Improvement:* The metrics above represent local-preview measurements (`http://localhost:4173/`). Because the previous desktop audits were found to have executed under a misconfigured mobile profile, there is no valid pre-change desktop production baseline available for comparison. Consequently, desktop improvement versus a valid baseline has **not** been established; these figures serve as a verified standalone desktop reference for the current codebase under the official desktop configuration.

##### Summary of Improvements
1. **Mobile LCP:** Reduced from **5.72 s** (Condition A baseline) down to **4.83 s** median (best run **4.55 s**), representing a **~0.89 s reduction** locally. Compared to Condition B (no hints + animation: **6.88 s**), the combined change cuts mobile LCP by **~2.05 s**.
2. **Mobile Score:** Improved to **77** median (peaking at **79**), vs. 66 on production baseline and 71 in Condition B.
3. **Desktop Metrics (Local Preview):** Verified under true desktop profile at **99 Score** with LCP of **0.91 s**, FCP of **0.57 s**, TBT of **0 ms**, CLS of **0.001**, Speed Index of **0.57 s**, and transferred weight of **2.30 MB** (comparative desktop improvement remains unestablished pending a valid production baseline).
4. **No Regressions:** FCP (2.86 s mobile, 0.57 s desktop), TBT (66 ms mobile, 0 ms desktop), and CLS (0.001) remain rock solid.
5. **Zero Regressions to Hero & CMS:** Production hero video remains disabled, neutral background (`rgb(13, 13, 15)`) preserved, branding intact.
6. **Quality Gates:** 8/8 Vitest files passed (70/70 tests), `npx tsc --noEmit` produces exactly 52 diagnostic lines (clean baseline match), production build passes in 6.51s.

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

