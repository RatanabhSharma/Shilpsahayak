# Shilp Sahayak

Shilp Sahayak is an integrated e-commerce and custom 3D printing platform. It provides a storefront for direct product purchases and a dedicated "Shilp Studio" for customers to upload 3D models and request custom printing quotes. The platform includes a comprehensive Admin CMS to manage orders, inventory, catalog, and custom quotations.

## Current Status

- The core e-commerce storefront is active.
- The Admin CMS is active.
- Custom Printing / Shilp Studio currently uses a **manual quotation** workflow.
- Automated 3D slicing and instant quotation are deferred.
- The archived slicer implementation is preserved for possible future reactivation.

## Architecture

The application follows a decoupled, serverless architecture:
- **Frontend:** A React Single Page Application (SPA) built with Vite and TypeScript, hosting both the storefront and the Admin CMS.
- **Backend / Edge:** A Cloudflare Worker handling secure file uploads, email dispatch, coupon validation, and payment webhooks.
- **Data & Identity:** Firebase provides NoSQL data storage (Firestore) and user identity management (Firebase Authentication).
- **Payments:** Handled securely via Razorpay, integrated through the Cloudflare Worker.

## Shilp Studio

The "Shilp Studio" Custom Printing feature follows a **Manual Quotation** workflow:
1. A customer uploads a supported 3D model.
2. The file is securely stored in Cloudflare R2 via the Cloudflare Worker.
3. A pending quote request is created in Firestore.
4. An Admin reviews the uploaded model and assigns a quotation price manually via the Admin CMS.
5. The customer is notified of the updated quote.
6. If the customer accepts, the quote proceeds through the standard checkout and payment flow.

## Technology Stack

**Active Stack:**
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand
- **Backend:** Cloudflare Workers (TypeScript)
- **Database & Auth:** Firebase Firestore, Firebase Authentication
- **Storage:** Cloudflare R2
- **Payments:** Razorpay

**Archived / Future:**
- Python, FastAPI, PrusaSlicer CLI, Bambu Studio CLI (Archived in `future-tasks/slicer/`)

## Repository Structure

```text
frontend/
    Current React/Vite storefront and Admin CMS application
shilp-sahayak-r2/
    Active Cloudflare Worker for edge services
docs/
    Detailed project documentation
future-tasks/slicer/
    Archived/future automated slicer implementation
e2e/
    End-to-end testing
scripts/
    Project validation and tooling scripts
```

## Quick Start

Ensure you have Node.js and npm installed.

**1. Clone the repository**
```bash
git clone <repository-url>
cd shilp-sahayak
```

**2. Install Frontend Dependencies**
```bash
cd frontend
npm install
npm run dev
```

**3. Install Worker Dependencies**
```bash
cd ../shilp-sahayak-r2
npm install
npm run dev
```

*Note: Valid Firebase and Cloudflare credentials must be set in your environment variables for full functionality. Refer to the [Setup Guide](docs/SETUP.md) for detailed configuration.*

## Documentation

Detailed technical documentation is available in the `docs/` directory:

- [Documentation Home](docs/README.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Architecture Details](docs/ARCHITECTURE.md)
- [Setup Guide](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Reference](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Security Guidelines](docs/SECURITY.md)
- [Testing Strategy](docs/TESTING.md)

## Archived / Future Work

The previous automated 3D slicing and instant quotation backend (Python/FastAPI) has been archived and deferred from active production. For historical reference and possible reactivation instructions, see:
- [Future Slicer Reactivation](docs/FUTURE_SLICER_REACTIVATION.md)
