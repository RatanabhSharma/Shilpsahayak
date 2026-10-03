# Deployment

## Frontend
- **Platform**: Vercel
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment**: Requires all `VITE_` variables to be set in the Vercel project settings.

## Slicer Service [ARCHIVED]
- **Status**: The slicer service is archived in `future-tasks/slicer/` and is NOT required for the active application.
- **Historical Requirements**: Requires PrusaSlicer and Bambu Studio CLI binaries if reactivated.

## R2 Worker
- **Platform**: Cloudflare Workers
- **Deployment Method**: Wrangler (`npx wrangler deploy`)
- **Configuration**: Managed via `wrangler.toml` and secrets configured in the Cloudflare dashboard.
