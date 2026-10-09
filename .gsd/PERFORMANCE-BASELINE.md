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
| **6** | `i.pinimg.com/.../884b8d65...jpg` | `image` | **120,259 B (~117 KB)** | External product image. |
| **7** | `/assets/index-nLXdRFbb.js` | `script` | **108,827 B (~106 KB)** | Main application JS bundle. |
| **8** | `cdn.magicpatterns.com/.../24c7b789...jpg` | `image` | **103,196 B (~100 KB)** | Catalog thumbnail image. |
| **9** | `cdn.magicpatterns.com/.../1f4a4228...jpg` | `image` | **102,649 B (~100 KB)** | Catalog thumbnail image. |
| **10** | `shilp-sahayak.firebaseapp.com/__/auth/iframe.js` | `script` | **95,289 B (~93 KB)** | Firebase auth iframe. |

---

## 6. Summary of Verified Findings

1. **Hero Flash Root Cause Identified (CTA Vanishing):**  
   The primary hero flash is caused by a data mismatch between `DEFAULT_HOMEPAGE_SETTINGS` (which defines fallback headline and buttons) and the live Firestore `settings/storefront` document (which has `headline: ""` and `enablePrimaryCta: false`). When Firestore loads, React unmounts the buttons and headline.
2. **Second Media Flash Identified (Image Swap + Video Mount):**  
   The initial render displays `/images/logo.jpg`, swaps to `/images/logo.png` upon Firestore load, and then mounts a `<video>` container at 3.5–4.5s.
3. **4.36 MB Video Download Bypass:**  
   The 3.5-second `setTimeout` fallback in `Home.tsx` triggers the 4.47 MB MP4 download on every automated audit and passive session, accounting for 64% of total page weight.
4. **Resolution of Mobile vs. Desktop Parity:**  
   Under true desktop conditions (`--preset=desktop`), production achieves a **94 Performance Score** (0.7s FCP, 1.0s LCP). Under mobile network simulation (150ms RTT, 1.6 Mbps), both desktop and mobile settle at **83 Performance Score** (2.9s FCP, 3.3s LCP).
5. **Exact LCP Identity:**  
   The LCP element is the hero background image (`<img src="/images/logo.png">`, 390 × 420 px rendered). It cannot be safely hardcoded for preloading because its source is managed dynamically via Firestore CMS.

---

## 7. Unresolved Questions

1. **Intended Hero CTA State:**  
   Did the business intentionally disable the headline and CTA buttons in Admin CMS (`enablePrimaryCta: false`), or was this an accidental empty save in Firestore?
2. **Fallback Synchronization Strategy:**  
   Should `DEFAULT_HOMEPAGE_SETTINGS` be updated to mirror the current empty Firestore state to eliminate the vanishing button flash, or should Firestore be restored with proper hero copy?
3. **Hero Video Architecture:**  
   Should the hero video be served only on explicit user interaction (`click`/`scroll`), or moved to Cloudflare R2 / CDN with adaptive bitrate (HLS/DASH) to prevent downloading the full 4.36 MB MP4?

---

## 8. Recommended First Fix

**First Fix: Synchronize In-Memory Default Settings with the Live Production CMS**  
Align `DEFAULT_HOMEPAGE_SETTINGS` in `frontend/src/hooks/useHomepage.ts` with the actual production Firestore configuration (image paths, button visibility, and headline text). This will instantly eliminate the visual unmounting flash on initial paint without introducing risk to payments, routing, or database structure.
