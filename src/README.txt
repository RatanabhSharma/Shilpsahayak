SHILP SAHAYAK — STEP 2 AUTHENTICATION

Baseline:
Current recovered Step 1A/1B codebase supplied by the user.

Replace:
src/hooks/useAuth.ts
src/pages/storefront/Login.tsx

Reference/unchanged files included:
src/components/CustomerRoute.tsx
src/hooks/useUserProfile.ts
src/App.tsx

New functionality:
- Real Firebase password reset
- Sign up with name + Indian mobile number
- Password confirmation
- Password visibility controls
- Password strength feedback
- Automatic Firestore users/{uid} customer profile creation
- role defaults to customer
- Existing redirect-back behavior preserved
- Existing migrated Login visual design preserved

IMPORTANT:
Before testing Google/Microsoft login, those providers must be enabled in Firebase Authentication.
This step does not add them.

Run:
npm install
npm run build
npm run dev
