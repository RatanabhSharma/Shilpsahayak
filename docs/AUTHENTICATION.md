# Authentication

Shilp Sahayak uses Firebase Authentication to handle user identity.

## Authentication Methods
- **Phone Authentication (OTP)**: The primary method for customers to log in.

## Roles and Authorization
Users are assigned roles which are stored in the `users` Firestore collection.
- **Customer**: Default role. Can place orders, request quotes, and view their own history.
- **Admin**: Special role. Has access to the Admin Dashboard routes (`/admin/*`) and can modify products, categories, settings, and view all orders.

## Token Validation
- The React Frontend automatically attaches the Firebase ID Token (JWT) to requests made to secure backend endpoints.
- The **R2 Worker** validates the Firebase Bearer token on the `/upload` and `/file` (DELETE) endpoints using `jose` or similar JWT validation mechanisms.
- The **Slicer Service** receives job requests and validates admin pricing configs, utilizing token authorization where applicable.
