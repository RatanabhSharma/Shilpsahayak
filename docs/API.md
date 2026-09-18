# API Documentation

## Slicer Service Endpoints (`slicer-service/main.py`)

- `GET /health`: Lightweight liveness check. Returns `{status: "ok"}`.
- `GET /api/health`: Detailed health check, including the status of slicer binaries (PrusaSlicer/Bambu Studio).
- `POST /api/slice/jobs`: Creates an asynchronous slicing job. Expects a multipart form containing the file and job parameters (material, qualityProfile, infillPercent, scaleFactor, quantity, supportMode, etc.).
- `GET /api/slice/jobs/{job_id}`: Polls the status of an ongoing slicing job.
- `POST /api/inspect`: Directly inspects a 3D model file without full slicing.
- `GET /api/quotes/{quote_id}`: Retrieves an immutable quote snapshot based on a completed slicing job.
- `POST /api/quotes/{quote_id}/accept`: Accepts a quote, converting it into an order intent.
- `POST /api/orders/payment`: Creates a payment order intent. Body: `quoteId`, `customerId`, `idempotencyKey`, `gateway`, `clientPrice`.
- `POST /api/webhooks/payment`: Handles incoming payment webhooks from the gateway.
- `GET /api/admin/manual-review`: Fetches the queue of jobs marked for manual review.

## R2 Worker Endpoints (`shilp-sahayak-r2/src/index.ts`)

- `GET /health`: Worker health check.
- `POST /upload`: Uploads a file to R2.
  - Requires Firebase Bearer token in the `Authorization` header.
  - Requires `X-File-Name` header.
  - Validates extension and enforces a 100MB maximum file size.
  - Stores the file at `quotes/{uid}/{timestamp}_{filename}`.
- `GET /file?key={key}`: Downloads a file. This is a public endpoint that returns the file with appropriate cache headers.
- `DELETE /file?key={key}`: Deletes a file from R2. Requires Firebase Bearer token. Users can only delete files under their own `quotes/{uid}/` prefix.
