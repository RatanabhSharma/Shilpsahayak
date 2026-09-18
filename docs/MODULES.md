# Modules

This document outlines the key modules across all three services.

## Frontend (`frontend/`)
- `App.tsx`: Main router definition.
- `store.ts`: Zustand state management.
- `components/`: Reusable UI components (buttons, inputs, modals).
- `pages/`: Route-level components mapping to specific URLs.
- `lib/`: Utility functions and Firebase configuration.

## Slicer Service (`slicer-service/`)
- `main.py`: Application entry point, FastAPI router, and API definitions.
- `pricing_engine.py`: Core logic for calculating cost based on material, print time, and configuration.
- `slicer_router.py`: Determines how a job should be sliced (single material, multicolor, manual review).
- `printer_eligibility.py`: Logic to check if a model fits within a printer's build volume.
- `slicer_result_validator.py`: Parses and validates output from the slicer CLIs.
- `archive_handler.py`: Utility for handling uploaded `.zip` archives.
- `file_inspector.py`: Utility for basic inspection of uploaded `.stl`/`.obj` files.

## R2 Worker (`shilp-sahayak-r2/`)
- `src/index.ts`: The main Cloudflare Worker logic handling routing, auth validation, and R2 bindings.
