# Scripts

## Frontend (`frontend/package.json`)
Standard Vite + React scripts.
- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the production ready SPA into `dist/`.
- `npm run lint`: Runs ESLint over the codebase.
- `npm run preview`: Previews the production build locally.

## R2 Worker (`shilp-sahayak-r2/package.json`)
- `npm run dev`: Starts Wrangler for local edge function development.
- `npm run deploy`: Deploys the worker to Cloudflare.

## Slicer Service
- No specific NPM scripts. Run via `uvicorn main:app --reload` during development.
