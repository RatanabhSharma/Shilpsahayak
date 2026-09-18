# Architecture

The Shilp Sahayak platform uses a modern decoupled architecture.

## System Context Diagram

```mermaid
flowchart TD
    User([User / Customer])
    Admin([Admin User])
    
    subgraph Frontend
        WebUI[React Frontend SPA]
    end
    
    subgraph Backend Services
        SlicerApi[Slicer Service FastAPI]
        R2Worker[Cloudflare R2 Worker]
    end
    
    subgraph External Dependencies
        Firebase[Firebase Auth & Firestore]
        CF_R2[(Cloudflare R2 Storage)]
        Prusa[PrusaSlicer CLI]
        Bambu[Bambu Studio CLI]
    end
    
    User -->|Views/Buys| WebUI
    Admin -->|Manages| WebUI
    
    WebUI -->|Auth & Data| Firebase
    WebUI -->|Uploads 3D Models| R2Worker
    WebUI -->|Requests Slicing Job| SlicerApi
    
    R2Worker -->|Reads/Writes| CF_R2
    SlicerApi -->|Uses| Prusa
    SlicerApi -->|Uses| Bambu
```

## Component Architecture

1. **Frontend (Vercel)**
   - Deployed on Vercel.
   - Communicates directly with Firebase for auth and structured data.
   - Communicates with Slicer Service for custom print jobs.
   - Communicates with R2 Worker for uploading STL/OBJ files.

2. **Slicer Service (Render/Docker)**
   - A Python-based microservice running FastAPI.
   - Handles the computationally expensive task of slicing 3D models.
   - Validates printability and calculates precise material usage and print time.

3. **Cloudflare Worker (Cloudflare Edge)**
   - Edge worker handling file uploads.
   - Enforces max size limits (100MB), validates extensions, and checks Firebase auth tokens.

4. **Firebase Ecosystem**
   - **Authentication**: Phone-based auth (OTP).
   - **Firestore**: Primary NoSQL database for orders, users, products, and quotes.

## Data Flow: Custom Print Job

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant W as R2 Worker
    participant S as Slicer Service
    participant DB as Firestore
    
    U->>F: Upload 3D Model
    F->>W: POST /upload (with Firebase Token)
    W-->>F: Return File URL/Key
    F->>S: POST /api/slice/jobs (Job Details & File)
    S->>S: Hash File, Route Job, Slice, Calculate Price
    S-->>F: Return Job ID
    F->>S: Poll GET /api/slice/jobs/{job_id}
    S-->>F: Return Status (Completed) & Quote Snapshot
    F->>DB: Save Quote / Add to Cart
```
