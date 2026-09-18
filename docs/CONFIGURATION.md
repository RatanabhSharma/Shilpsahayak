# Configuration Files

## Frontend
- `vite.config.ts`: Vite bundler configuration, handles plugins and build settings.
- `tailwind.config.js`: TailwindCSS theme, colors, plugins, and content paths.
- `tsconfig.json`: TypeScript compiler options.
- `.env`: Environment variables for Firebase and external APIs.

## Slicer Service
- `requirements.txt`: Python package dependencies.
- `Dockerfile`: Container image definition.

## R2 Worker
- `wrangler.toml`: Cloudflare Worker configuration, including route bindings, R2 bucket bindings, and environment variables.

## Firebase
- `firestore.rules`: Security rules for the Cloud Firestore database.
- `firebase.json`: Configuration for Firebase hosting/functions if applicable.
