# Project Overview

**Shilp Sahayak** ("Craft Helper" in Hindi) is a 3D printing e-commerce platform developed for a fabrication studio in Patiala, Punjab, India. It facilitates both direct catalog purchases and custom 3D printing workflows.

## Core Components

The project consists of three main components:

1. **Frontend (`frontend/`)**: A Single Page Application (SPA) built with React, Vite, TailwindCSS, and TypeScript.
2. **Slicer Service (`slicer-service/`)**: A Python FastAPI backend responsible for 3D model slicing, cost estimation, and quote generation.
3. **R2 Worker (`shilp-sahayak-r2/`)**: A Cloudflare Worker that handles direct, secure file uploads and downloads to/from Cloudflare R2 object storage.

## Key Features

- **Storefront**: Browse catalog, view product details, add to cart, and checkout.
- **Custom Printing (Shilp Studio)**: Upload 3D models, configure print settings, get automated slicing & pricing quotes, and place custom orders.
- **Admin Dashboard**: Manage inventory, orders, catalog, quotes, and manual review queue.
- **Secure File Storage**: 3D models are securely stored in Cloudflare R2 using edge workers.
- **Real-time Slicing**: Integration with PrusaSlicer and Bambu Studio CLI for accurate time and material estimation.

## Target Audience
- End consumers looking to purchase pre-designed 3D printed items.
- Hobbyists, engineers, and designers needing custom 3D printing services.
- Admin staff managing the studio's operations, catalog, and order fulfillment.
