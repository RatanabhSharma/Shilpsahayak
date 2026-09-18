# Development Guidelines

## General Coding Standards
- Use TypeScript for all new frontend and worker code.
- Ensure strict typings to prevent runtime errors.
- Prefer functional React components with hooks.

## State Management
- Use Zustand for global UI state (e.g., cart, settings).
- Use React Query for server state (e.g., fetching orders, polling slicer jobs) to handle caching and loading states automatically.

## Slicer Service (Python)
- Follow standard PEP 8 guidelines.
- Ensure all endpoints are fully typed using Pydantic models for request/response validation.
- Keep the slicing pipeline steps decoupled as defined in `main.py` -> `process_slicing_job`.

## Documentation
- Keep this documentation updated when making structural or architectural changes.
- Ensure Mermaid diagrams in `ARCHITECTURE.md` and `DATA_FLOW.md` remain accurate.
