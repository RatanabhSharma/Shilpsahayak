# Environment Variables

## Frontend (`frontend/.env`)
The frontend uses Vite, so environment variables must be prefixed with `VITE_`.

- `VITE_FIREBASE_API_KEY`: Firebase API Key.
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain.
- `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID.
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID.
- `VITE_FIREBASE_APP_ID`: Firebase App ID.
- `VITE_CLOUDFLARE_WORKER_URL`: The URL of your deployed Cloudflare R2 Worker (used for uploading models).

## Slicer Service (`slicer-service/.env` or system environment variables)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS. Default is `*`.
- `VITE_CLOUDFLARE_WORKER_URL`: The URL of the R2 worker to construct download/upload links if needed. Defaults to `http://127.0.0.1:8787`.

## R2 Worker (`shilp-sahayak-r2/wrangler.toml` & Secrets)
Configuration is managed via `wrangler.toml`.
- Secrets needed: Firebase Service Account details (if validating tokens strictly on the edge, though often handled via standard JWT verification using `jose`).
