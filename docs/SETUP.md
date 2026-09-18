# Setup Guide

## Prerequisites
- Node.js (v18+)
- Python (v3.12+)
- Docker (optional, for deploying the slicer service)
- Firebase Account (with Firestore, Auth, Storage configured)
- Cloudflare Account (for R2 and Workers)
- PrusaSlicer and Bambu Studio installed (if running the Slicer Service locally)

## 1. Frontend Setup
1. Navigate to the `frontend/` directory.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in the environment variables (see [Environment Variables](ENVIRONMENT_VARIABLES.md)).
4. Start the development server: `npm run dev`

## 2. Slicer Service Setup
1. Navigate to the `slicer-service/` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Linux/macOS: `source venv/bin/activate`
   - Windows: `venv\Scripts\activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Ensure slicer binaries are accessible in your system PATH.
6. Start the server: `uvicorn main:app --reload`

## 3. R2 Worker Setup
1. Navigate to the `shilp-sahayak-r2/` directory.
2. Install dependencies: `npm install`
3. Login to Cloudflare via Wrangler: `npx wrangler login`
4. Configure your `wrangler.toml` with your account details and R2 bucket name.
5. Deploy or run locally:
   - Local dev: `npx wrangler dev`
   - Deploy: `npx wrangler deploy`
