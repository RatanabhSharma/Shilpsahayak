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

## 2. Shop & Purchase Flow (Razorpay Test Mode)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer Browser
    participant FE as React Frontend (Checkout)
    participant CF as Cloudflare Worker (/api/payment)
    participant FS as Firestore Database
    participant RZP as Razorpay API / Modal

    Note over Customer,FE: 1. Item Selection (Buy Now vs Cart)
    alt Buy Now Mode
        Customer->>FE: Click "Buy Now" on Product Page
        FE->>FE: Set purchaseMode='buy_now' (Global cart preserved untouched)
    else Cart Mode
        Customer->>FE: Add items to Cart -> Proceed to Checkout
        FE->>FE: Set purchaseMode='cart'
    end

    Note over FE,CF: 2. Server-Authoritative Pricing & Order Creation
    FE->>CF: POST /api/payment/create-order (items, shippingAddress, purchaseMode)
    CF->>FS: Fetch unit prices for productIds (Firestore REST API)
    CF->>CF: Recalculate subtotal from Firestore data (Zero client trust)
    CF->>CF: Calculate shipping (Free >= ₹499, else ₹150) & total
    CF->>FS: Create Order (status: 'Pending', paymentStatus: 'Pending')
    CF->>RZP: POST /v1/orders (amount in paise, currency: 'INR', receipt: orderId)
    RZP-->>CF: { id: razorpayOrderId, amount, currency }
    CF->>FS: Update Order with razorpayOrderId
    CF-->>FE: { orderId, razorpayOrderId, amount, currency, keyId }

    Note over FE,RZP: 3. Razorpay Checkout Modal Interaction
    FE->>RZP: Open Razorpay Modal (keyId, order_id, amount, prefill)
    alt Payment Successful
        RZP-->>FE: Handler callback { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        FE->>CF: POST /api/payment/verify (orderId, razorpayOrderId, paymentId, signature)
        CF->>CF: Verify HMAC SHA-256 (Web Crypto: razorpay_order_id + "|" + paymentId)
        alt Signature Valid
            CF->>FS: Update Order (paymentStatus: 'Paid', status: 'Confirmed', paidAt, paymentId)
            CF->>FS: Add email job to `mail` collection (trigger-email extension)
            CF-->>FE: { success: true, orderId }
            FE->>FE: Clear cart (if purchaseMode === 'cart') & navigate to Confirmed screen
        else Signature Invalid / Tampered
            CF-->>FE: HTTP 400 { success: false, error: 'Invalid payment signature' }
            FE-->>Customer: Display payment verification failure banner (Retryable)
        end
    else Payment Dismissed / Cancelled
        Customer->>RZP: Close modal without paying
        RZP-->>FE: modal.ondismiss callback
        FE-->>Customer: Display "Payment was cancelled. You can retry anytime." banner
    else Payment Failed
        RZP-->>FE: payment.failed event
        FE->>FS: Record failure context (paymentStatus: 'Failed')
        FE-->>Customer: Display "Payment failed. Please try again or use another method."
    end

    Note over RZP,FS: 4. Asynchronous Webhook Safety Net
    opt Webhook Notification
        RZP->>CF: POST /api/payment/webhook (payment.captured / order.paid)
        CF->>CF: Verify HMAC SHA-256 with RAZORPAY_WEBHOOK_SECRET
        CF->>FS: Check webhook_events/{eventId} (Idempotency)
        alt First occurrence
            CF->>FS: Record event in webhook_events/{eventId}
            CF->>FS: Ensure Order paymentStatus: 'Paid', status: 'Confirmed'
            CF-->>RZP: HTTP 200 { received: true }
        else Duplicate event
            CF-->>RZP: HTTP 200 { received: true, message: 'Already processed' }
        end
    end
```

### Key Architectural Tenets:
- **Zero Client Financial Trust**: Product prices and shipping thresholds are authoritatively fetched and calculated on the Cloudflare Worker. Any client-sent prices or totals are disregarded.
- **Cart vs Buy Now State Isolation**: "Buy Now" transactions check out a single targeted item and clear only `buyNowItem`, preserving existing cart contents. Cart checkouts drain the global cart only upon verified payment.
- **Cryptographic Tamper-Proofing**: Verification uses Web Crypto HMAC SHA-256 against `RAZORPAY_KEY_SECRET` without external heavyweight Node dependencies.
- **Separation of Concerns**: `paymentStatus` tracks financial settlement (`Pending`, `Paid`, `Failed`, `Refunded`), while `orderStatus` tracks physical fulfillment (`Pending`, `Confirmed`, `Processing`, `Ready to ship`, `Shipped`, `Delivered`, `Cancelled`). Payment success automatically advances `orderStatus` to `Confirmed`.


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

