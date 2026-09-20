# Shilp Studio Slicing Service — production image for Render
# Using Ubuntu 22.04 (Jammy) because Bambu Studio AppImage natively expects
# its glibc and libwebkit2gtk-4.0 versions.

FROM ubuntu:22.04

# Prevent interactive prompts (like timezone selection) during apt-get install
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies for AppImages, GTK, OpenGL, and Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
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

# Setup virtual environment so pip doesn't complain about system-managed Python
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
