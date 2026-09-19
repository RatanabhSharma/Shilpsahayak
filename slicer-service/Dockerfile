# Shilp Studio Slicing Service — production image for Render
#
# This Dockerfile fully bundles the Bambu Studio and PrusaSlicer AppImages,
# extracts them, and sets up a virtual framebuffer (Xvfb) so the headless
# CLI slicing engines can safely initialize their GTK/WebKit dependencies
# on a purely headless server environment like Render.

FROM python:3.11-slim-bullseye

WORKDIR /app

# Install system dependencies for AppImages, GTK, OpenGL, and Xvfb
# (Bullseye specifically includes libwebkit2gtk-4.0-37 which Bambu Studio needs)
RUN apt-get update && apt-get install -y --no-install-recommends --fix-missing \
    wget \
    ca-certificates \
    libglib2.0-0 \
    libgtk-3-0 \
    libwebkit2gtk-4.0-37 \
    libgl1 \
    libegl1 \
    libosmesa6 \
    xvfb \
    xauth \
    squashfs-tools \
    && rm -rf /var/lib/apt/lists/*

# Download and extract Bambu Studio AppImage
RUN mkdir -p /opt/slicers && cd /opt/slicers && \
    wget -qO bambu.AppImage "https://github.com/bambulab/BambuStudio/releases/download/v01.09.01.66/Bambu_Studio_linux_ubuntu-v01.09.01.66.AppImage" && \
    chmod +x bambu.AppImage && \
    ./bambu.AppImage --appimage-extract && \
    mv squashfs-root bambu-studio && \
    rm bambu.AppImage && \
    ln -s /opt/slicers/bambu-studio/AppRun /usr/local/bin/bambu-studio

# Download and extract PrusaSlicer AppImage
RUN cd /opt/slicers && \
    wget -qO prusa.AppImage "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.8.0/PrusaSlicer-2.8.0+linux-x64-GTK3-202406270929.AppImage" && \
    chmod +x prusa.AppImage && \
    ./prusa.AppImage --appimage-extract && \
    mv squashfs-root prusa-slicer && \
    rm prusa.AppImage && \
    ln -s /opt/slicers/prusa-slicer/AppRun /usr/local/bin/prusa-slicer

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt || \
    pip install --no-cache-dir -r requirements.txt

# Copy only what the service needs at runtime
COPY app ./app

# Ensure the runtime storage directory exists
RUN mkdir -p /app/app/storage

# Render sets $PORT at runtime; default to 8000 for local `docker run`
ENV PORT=8000
EXPOSE 8000

# Bind to 0.0.0.0 and Render's assigned port. 
# Wrap uvicorn in xvfb-run so the slicer subprocesses inherit a virtual DISPLAY.
CMD ["sh", "-c", "xvfb-run -a uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
