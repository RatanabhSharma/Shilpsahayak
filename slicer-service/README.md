# Shilp Studio Slicing Service

FastAPI service that runs real PrusaSlicer CLI slices and returns authoritative
quotes (grams, print time, cost) to the customer-facing Shilp Studio flow.

## PrusaSlicer setup (not committed to git)

The PrusaSlicer binary distribution (~200MB, Windows-only) used to be committed
directly into this repo under `poc/bin/`. It has been removed and is now
gitignored — a public git repo should never carry a 200MB executable bundle in
its history.

To run this service locally or in a deploy target, install PrusaSlicer
yourself and point the service at it:

1. Download PrusaSlicer 2.9.0 for your platform from
   https://github.com/prusa3d/PrusaSlicer/releases/tag/version_2.9.0
   - Windows (local dev, matches this repo's existing Windows dev setup):
     grab the portable/console build.
   - Linux (for any container/Cloud Run deployment): grab the Linux AppImage
     build — the Windows `.exe` build in the old `poc/bin/` folder will NOT
     run in a Linux container.
2. Set the `PRUSASLICER_PATH` environment variable to the full path of the
   console executable (`prusa-slicer-console.exe` on Windows, the AppImage or
   extracted binary on Linux).
3. `slice_core.py`'s `find_prusaslicer_executable()` checks, in order: the
   `PRUSASLICER_PATH` env var, a few common Windows install locations, then
   `PATH`. On Linux you must set `PRUSASLICER_PATH` explicitly — no Linux
   paths are currently in the fallback list.

## Runtime storage

`app/storage/` holds uploaded models and intermediate files for in-flight
slicing jobs. This is scratch space, not a database — it's gitignored and
should stay empty in version control (a `.gitkeep` keeps the folder present).
On a real deployment this should be cleaned up periodically (e.g. delete files
older than a few hours) since nothing currently prunes it automatically.

## Pricing configuration

`pricing_engine.py` has hardcoded default pricing/material constants, but
these are a **fallback only** for local testing (`/api/slice/sync`, the POC
scripts). The real customer-facing flow (`CustomPrinting.tsx` via
`slicingClient.ts`) always forwards the live admin-configured pricing data
from Firestore (`settings/pricing`) on every request. If you're debugging a
quote that looks wrong, check whether the request actually included
`pricingConfigJson` / `materialsJson` — the job result includes a
`pricingSourceIsLiveAdminConfig` flag that tells you which source was used.
