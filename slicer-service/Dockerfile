# Shilp Studio Slicing Service — production image for Render
#
# NOTE ON PRUSASLICER / BAMBU STUDIO:
# The application's actual slicing logic (app/slice_core.py, app/slicer_adapters/
# bambu_adapter.py) shells out to the PrusaSlicer and Bambu Studio/OrcaSlicer CLI
# executables via PRUSASLICER_PATH / BAMBUSTUDIO_PATH. Those are large desktop GUI
# applications (PrusaSlicer 2.9 depends on wxWidgets/WebKit; Bambu Studio/OrcaSlicer
# on Qt) that are not designed to run headless in a minimal Linux container, and
# they are intentionally NOT bundled here (see slicer-service/README.md — this was
# already a known, unresolved gap before this Dockerfile was written).
#
# This image runs the API as-is: everything that doesn't require an actual slicer
# binary (health checks, quotes, payments, job/queue endpoints, manual-review
# queue) works out of the box. Without PRUSASLICER_PATH/BAMBUSTUDIO_PATH pointing
# at real installed binaries, slicing jobs will fail validation and route to
# manual review (the same graceful failure path the code already has for
# unsupported files) rather than crash the service.
#
# If/when you want real slicing to work on Render, that needs a follow-up image
# stage that installs the PrusaSlicer AppImage (extracted, with its shared-library
# dependencies and a virtual framebuffer such as xvfb-run to satisfy its GTK/WebKit
# init) — treat that as a separate, riskier piece of work to test on its own.

FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies first for better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt || \
    pip install --no-cache-dir -r requirements.txt

# Copy only what the service needs at runtime (poc/ and tests/ are excluded via
# .dockerignore — poc/ alone is ~240MB of local experiment output)
COPY app ./app

# Ensure the runtime storage directory exists (job uploads + persistent quote/
# idempotency JSON files — ephemeral on Render's default filesystem, wiped on
# each redeploy; that matches this app's existing local-disk-only persistence)
RUN mkdir -p /app/app/storage

# Render sets $PORT at runtime; default to 8000 for local `docker run`
ENV PORT=8000
EXPOSE 8000

# Bind to 0.0.0.0 and Render's assigned port. Single worker by default — raise
# via UVICORN_WORKERS if you need more concurrency (slicing itself is offloaded
# to FastAPI BackgroundTasks, not separate workers).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
