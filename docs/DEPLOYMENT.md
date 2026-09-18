# Deployment

## Frontend
- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment**: Requires all `VITE_` variables to be set in the Vercel project settings.

## Slicer Service
- **Platform**: Render (or any Docker-compatible host)
- **Deployment Method**: Dockerfile provided in `slicer-service/`.
- **Requirements**: The deployment environment *must* have PrusaSlicer and Bambu Studio CLI binaries installed. If deploying via Docker, the `Dockerfile` must install these dependencies alongside Python and FastAPI.

## R2 Worker
- **Platform**: Cloudflare Workers
- **Deployment Method**: Wrangler (`npx wrangler deploy`)
- **Configuration**: Managed via `wrangler.toml` and secrets configured in the Cloudflare dashboard.
