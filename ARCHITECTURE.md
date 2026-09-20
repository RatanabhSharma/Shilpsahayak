# System Architecture

Shilp Sahayak is built as a modern, serverless e-commerce application utilizing a React frontend paired with Firebase for backend logic and Cloudflare for edge computing and storage.

## 1. High-Level Active Architecture

```mermaid
flowchart TD
    Customer[Customer Browser]
    Frontend[React / Vite Frontend]
    Firebase[Firebase Services]
    Cloudflare[Cloudflare Workers / R2]
    Admin[Admin Panel]

    Customer -->|Interacts| Frontend
    Frontend -->|Reads/Writes Data, Auth| Firebase
    Frontend -->|Uploads CAD Models| Cloudflare
    Admin -->|Manages Platform| Firebase
```

### Active Services:
- **Frontend**: React, Vite, Tailwind CSS, Zustand, React Query.
- **Firebase**: 
  - Authentication
  - Firestore (Products, Orders, Customers, Reviews, Manual Quotes, Settings)
  - Trigger Email Extension (Notifications)
- **Cloudflare**:
  - R2 File Storage (Original CAD uploads)
  - Cloudflare Workers (Upload orchestration, future secure payment validation)

---

## 2. Shop & Purchase Flow (Active)

```mermaid
flowchart TD
    Browse[Product Detail Page]
    
    Browse -->|ADD TO CART| CartState[Cart Store]
    CartState --> Checkout[Checkout Page]
    
    Browse -->|BUY NOW| Checkout
    
    Checkout -->|Submit| Payment[Payment Gateway / Razorpay]
    Payment -->|Webhook Verification| Firestore[Firestore Order]
    Firestore --> AdminWorkflow[Admin Fulfillment Workflow]
```

---

## 3. Custom Printing / Shilp Studio Flow (Active)

```mermaid
flowchart TD
    Upload[Customer Uploads 3D Model]
    Storage[(Cloudflare R2 Storage)]
    QuoteReq[Manual Quote Request Created in Firestore]
    NotifyCust[Confirmation Email to Customer]
    Review[Engineer Manual Review]
    SendQuote[Engineer Prepares & Sends Quote]
    Checkout[Customer Completes Order]

    Upload -->|Original File Preserved| Storage
    Upload --> QuoteReq
    QuoteReq --> NotifyCust
    QuoteReq --> Review
    Review --> SendQuote
    SendQuote --> Checkout
```

---

## 4. Archived / Disabled Systems

### Automatic Slicer (`future-tasks/slicer/`)
The previous automated slicer backend (FastAPI, Bambu Studio CLI, PrusaSlicer fallback) is intentionally disabled and archived. It was deemed unsafe for production pricing due to material discrepancies between CLI toolpaths and the reference Bambu Studio Desktop application.

```mermaid
flowchart TD
    subgraph Disabled Architecture
        API[FastAPI Slicer Service]
        Bambu[Bambu Studio CLI]
        Prusa[PrusaSlicer Fallback]
        API -.-> Bambu
        API -.-> Prusa
    end
```

**Rule**: Original customer uploads (STL, OBJ, 3MF, STEP) must remain untouched in storage. The slicer must not overwrite original files, nor should it act as the primary quotation authority until independently validated.

