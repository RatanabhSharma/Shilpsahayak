# Troubleshooting

## Uploads Failing in Shilp Studio
- **Symptom**: User sees an error when uploading an STL/OBJ file.
- **Possible Causes**:
  - File exceeds 100MB limit enforced by the R2 worker.
  - Invalid file extension.
  - Firebase auth token has expired.
  - R2 Worker URL (`VITE_CLOUDFLARE_WORKER_URL`) is incorrect in the frontend `.env`.

## Slicing Job Stuck
- **Symptom**: Job status doesn't change from pending/processing.
- **Possible Causes**:
  - The `slicer-service` is down or unreachable.
  - Slicer CLI (Prusa/Bambu) crashed or isn't installed in the deployment environment. Check backend logs.
  - Model has complex geometry causing the slicer to hang.

## Payment Webhook Not Triggering
- **Symptom**: Customer pays, but order remains 'Pending'.
- **Possible Causes**:
  - Webhook URL configured in the payment gateway doesn't match the deployed `/api/webhooks/payment` endpoint.
  - Idempotency key mismatch.
  - Errors in saving the updated status to Firestore.
