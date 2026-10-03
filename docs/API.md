# API Documentation

## Active Endpoints (Cloudflare Worker)
*Location: `shilp-sahayak-r2/src/index.ts`*

- `GET /health`: Worker health check. Returns `{status: "ok"}`.
- `POST /api/payment/create-order`: Creates a Razorpay order.
- `POST /api/payment/verify`: Verifies a Razorpay payment signature.
- `POST /api/payment/webhook`: Handles incoming Razorpay webhooks.
- `POST /api/coupons/validate`: Validates a coupon code and calculates discount.
- `POST /upload`: Uploads a file to R2.
- `GET /file?key={key}`: Downloads a file.
- `DELETE /file`: Deletes a file.
- `POST /api/orders/cancel`: Processes an order cancellation.
- `POST /api/mail/send`: Sends an email.
- `POST /api/contact`: Submits a contact inquiry.

## Archived / Future Endpoints (Slicer Service)
*Location: `future-tasks/slicer/slicer-service/main.py`*

- `GET /api/health`: Detailed health check, including the status of slicer binaries (PrusaSlicer/Bambu Studio).
- `POST /api/slice/jobs`: Creates an asynchronous slicing job.
- `GET /api/slice/jobs/{job_id}`: Polls the status of an ongoing slicing job.
- `POST /api/inspect`: Directly inspects a 3D model file without full slicing.
- `GET /api/quotes/{quote_id}`: Retrieves an immutable quote snapshot based on a completed slicing job.
- `POST /api/quotes/{quote_id}/accept`: Accepts a quote, converting it into an order intent.
