# Integrations

The Shilp Sahayak platform relies on several key external integrations.

## Firebase
- **Authentication**: Phone-based OTP authentication for users.
- **Firestore**: Primary NoSQL database.
- **Firebase Trigger Email**: Extension used to process the `mail` collection and send outbound transactional emails.

## Cloudflare
- **Cloudflare R2**: Used for secure, scalable object storage for 3D model files.
- **Cloudflare Workers**: Edge compute used to securely route and authenticate file uploads/downloads to R2 without exposing the bucket directly.

## Slicing Engines (Local/System Dependencies)
The `slicer-service` heavily relies on two external binaries installed on the host machine:

## Payment Gateway
- Payments are processed via external gateways. Webhooks are handled at `/api/payment/webhook` in the Cloudflare Worker (`shilp-sahayak-r2`). The specific gateway (e.g., Razorpay, Stripe) is configured via environment variables and admin settings.


