# Security

## Data Access (Firestore)
- Protected by Firebase Security Rules (`firestore.rules`).
- Read/Write access is strictly partitioned between `admin` and `customer` roles.
- Customers can only read their own orders and quotes.

## File Storage (Cloudflare R2)
- R2 bucket is private.
- Access is gated by the **R2 Worker**, which requires a valid Firebase Bearer token.
- Users can only upload, download, and delete files that are prefixed with their own Firebase UID (`quotes/{uid}/...`).

## API Security (Slicer Service)
- CORS is configured via the `ALLOWED_ORIGINS` environment variable.
- Important actions (like accepting a quote or creating a payment intent) require validation of the user's intent and authorization, though specific endpoint security depends on the token validation implementation in the FastAPI routes.
- The `clientPrice` parameter in the payment endpoint is explicitly ignored by the backend to prevent price tampering; the backend relies on the authoritative quote.

## Idempotency
- Endpoints like job creation and payment processing require an `idempotencyKey` to prevent duplicate processing of the same request during network retries.
