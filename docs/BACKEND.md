# Backend (Slicer Service) Architecture

The Slicer Service is a Python FastAPI microservice responsible for the heavy lifting of processing 3D models, generating slicing instructions, and calculating quotes.

## Background Job Pipeline (`main.py` -> `process_slicing_job`)

The core workflow for processing a custom print job involves a pipeline:

1. **Step A: Compute File SHA-256** - Identifies the file uniquely.
2. **Step B: Handle ZIP Archives (`archive_handler.py`)** - Extracts models if a ZIP is uploaded.
3. **Step C: File Inspection (`file_inspector.py`)** - Checks basic file validity and metadata.
4. **Step D: Slicer Routing (`slicer_router.py`)** - Determines the slicing path: `SINGLE_MATERIAL`, `MULTICOLOR`, or `MANUAL_REVIEW`.
5. **Step E: Validate Admin Pricing Config** - Ensures the pricing configuration used is current and valid.
6. **Step F: Printer Eligibility Resolution (`printer_eligibility.py`)** - Determines which printers can handle the model.
7. **Step F2: Dimension Check** - Verifies the model fits within the printer's build envelope.
8. **Step G: Job Config Hash Dedup Cache** - Checks if this exact job configuration has already been processed.
9. **Step H: Execute Slicing** - Calls out to the external CLI binaries (PrusaSlicer or Bambu Studio CLI).
10. **Step H2: Validate Slicer Result (`slicer_result_validator.py`)** - Ensures the output from the CLI is valid and contains expected metrics.
11. **Step I: Calculate Authoritative Quote (`pricing_engine.py`)** - Applies pricing logic based on material used, print time, and configuration.
12. **Step J: Build Immutable Quote Snapshot** - Saves the final quote to the `quote_store`.
