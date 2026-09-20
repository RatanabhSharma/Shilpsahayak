# Automatic Slicer Archive

This directory contains the archived V1 automatic 3D slicing implementation for Shilp Studio.

## A. Why automatic slicing was disabled
Automatic quotation derived directly from headless slicer execution was temporarily disabled because it could not be proven mathematically identical to the verified production output. Relying on conservative, unoptimized headless slicing for real-time customer quoting causes incorrect estimates (e.g., pricing parts far higher than actual production cost or failing to identify valid printing optimizations). For stability, ALL files now proceed through manual engineer review.

## B. The previous architecture
- **Frontend** passed STL/OBJ/3MF files to a FastAPI backend endpoint (`/api/slice/jobs`).
- **Backend (FastAPI)** routed files based on extension.
- **Slicer Adapters** wrapped executables like PrusaSlicer (`prusa-slicer-console.exe`) and Bambu Studio CLI (`bambu-studio.exe`).
- **Quotation Engine** computed a total price using formulas matching the raw G-code metrics (Print Time + Filament).

## C. STL/OBJ/3MF/STEP routing history
- Originally, `STL` and `OBJ` routed to PrusaSlicer explicitly to bypass Bambu CLI constraints.
- `3MF` routed to the Bambu Adapter.
- `STEP` and `STP` routed to manual review.

## D. Bambu Studio CLI experiments
When attempting to run `bambu-studio.exe` directly on an `.stl` file with headless arguments (`--export-slicedata`, `--load-settings`), the CLI fails (Exit code -2). Bambu Studio expects full `.3mf` projects for headless operation and relies on Bambu-specific `.json` machine/process settings.

## E. PrusaSlicer fallback behavior
Because the backend couldn't natively process STLs through Bambu Studio CLI, it forcefully passed them to `PrusaSlicer`. PrusaSlicer cannot use Bambu's proprietary high-speed `.json` profiles. Instead, it used an unoptimized, generic `.ini` profile, stripping out features like Arachne, advanced cooling, and kinematics.

## F. Known accuracy problem
Reference comparison on an identical model:
- **Bambu Studio Desktop (Real Production):** ~50.83 g filament, ~3h22m total print time
- **Previous Application Result (via PrusaSlicer):** ~68.19 g filament, ~7h34m print time

## G. Why automatic production pricing is unsafe until validated
If the system quotes based on a 7h34m estimate, the customer price is dramatically inflated. Alternatively, if a model slices correctly in PrusaSlicer but crashes the actual Bambu hardware due to complex unhandled geometry (or differing clearance margins), the quote is fundamentally broken. Automated production pricing MUST exactly match the production floor capabilities.

## H. Files archived
- `slicer-service/`
  - `app/slicer_adapters/` (Bambu, Prusa)
  - `slicer_router.py`
  - `slice_core.py`
  - `convert_3mf.py`
  - All test scripts and temporary `.obj` debug files
- Dockerfiles and Render configuration.

## I. Required work before reactivation
To re-enable this system:
1. STL/OBJ files must be natively packaged into `.3mf` format (with valid project structure) *before* headless slicing.
2. The headless execution must use the exact Bambu Studio CLI without fallback.
3. The extracted G-code metrics (Time & Filament) must perfectly match the Bambu Studio GUI for the exact same geometry.

## J. Future reactivation architecture
The pipeline must exclusively use `BambuSlicerAdapter` against a unified `.3mf` input. The router should wrap incoming geometries in `.3mf` before invoking the slicer.

## K. Benchmark requirements
"Never enable automatic production quotation until slicer output has been benchmarked against the intended production slicer/profile and the resulting filament/time measurements have been independently validated."

