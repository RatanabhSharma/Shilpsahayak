# Future Slicer Reactivation Requirements

Automatic 3D slicing for real-time customer quotation is intentionally disabled in the active application.

## Principle
Never enable automatic production quotation until slicer output has been benchmarked against the intended production slicer/profile and the resulting filament/time measurements have been independently validated.

## Background
The application previously attempted to map user STLs to PrusaSlicer (due to Bambu Studio CLI lacking support for direct STL headless slicing with custom machine configurations). This resulted in highly unoptimized output due to missing capabilities (Arachne engine, Bambu kinematics, Bambu cooling).

**Historical Investigation Data:**
- **Reference Bambu Studio Desktop (A1):** ~50.83 g filament, ~3h22m total print time.
- **Previous Application Result (Fallback):** ~68.19 g filament, ~7h34m total print time.

These values were NOT accepted as accurate production results. The discrepancy confirms that the fallback execution path lacks the specialized processing steps necessary for commercial Bambu Lab hardware. (Note: This is isolated to the specific tested environment and configurations, but highlights the fundamental risk of mismatch).

## Requirements for Reactivation
1. **Containerized Translation:** All geometric formats (STL, OBJ, STEP, STP) must be correctly localized and enveloped in a standardized `.3mf` format *before* the slicer CLI runs.
2. **Deterministic Execution:** The slicer service MUST utilize `bambu-studio.exe` (or equivalent Linux Bambu CLI AppImage) exclusively, without falling back to generalized Prusa engines.
3. **Verified Benchmarking:** Test suites must execute CLI output on standard calibration models (e.g., Benchy, Dragon) and verify the resulting `[g]` and `[time]` variables are within a 5% margin of the GUI equivalent.

Until these conditions are met, the custom printing flow enforces a `MANUAL_REVIEW` (Engineer Review Required) state, where users can upload files and request a human-verified quote.

