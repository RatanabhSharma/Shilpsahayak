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

## R2 Worker (`shilp-sahayak-r2/wrangler.jsonc` & Secrets)
The Worker uses a Google service-account OAuth access token for every Firestore REST read and write. The Firebase client ID token is used only to authenticate the customer request and is never used as Firestore write authorization.

Set these as Wrangler secrets, not `vars`:
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (the PEM key; escaped `\\n` is accepted)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

The service account must belong to the `FIREBASE_PROJECT_ID` project and have an IAM role that permits Firestore document reads and writes, such as `Cloud Datastore User` (`roles/datastore.user`). The Firestore API must be enabled. The Worker requests the OAuth `https://www.googleapis.com/auth/datastore` scope and calls `firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents/...` with `Authorization: Bearer <access token>`.
