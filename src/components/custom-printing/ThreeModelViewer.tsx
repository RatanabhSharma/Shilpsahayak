import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCcw,
  Maximize2,
  Eye,
  Grid,
  Loader2,
  Box,
  Compass,
  Palette,
} from 'lucide-react';

export interface ThreeModelViewerProps {
  geometry: THREE.BufferGeometry | null;
  object3d?: THREE.Object3D | null;
  hasOriginalColors?: boolean;
  colorMode?: 'original' | 'single';
  onColorModeChange?: (mode: 'original' | 'single') => void;
  colorHex?: string;
  wireframe?: boolean;
  isLoading?: boolean;
  error?: string | null;
  dimensions?: { x: number; y: number; z: number };
  scale?: number;
  onOrientedDimensionsChange?: (dimensions: { x: number; y: number; z: number }) => void;
}

export const ThreeModelViewer: React.FC<ThreeModelViewerProps> = ({
  geometry,
  object3d = null,
  hasOriginalColors = false,
  colorMode = 'original',
  onColorModeChange: _onColorModeChange,
  colorHex = '#2563EB',
  wireframe: initialWireframe = false,
  isLoading = false,
  error = null,
  dimensions,
  scale = 1.0,
  onOrientedDimensionsChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  const [isWireframe, setIsWireframe] = useState(initialWireframe);
  const [showGrid, setShowGrid] = useState(true);
  const [rotation, setRotation] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  const [currentDims, setCurrentDims] = useState<{ x: number; y: number; z: number } | null>(
    dimensions || null
  );

  const onOrientedDimensionsChangeRef = useRef(onOrientedDimensionsChange);
  onOrientedDimensionsChangeRef.current = onOrientedDimensionsChange;
  const lastNotifiedDimsRef = useRef<{ x: number; y: number; z: number } | null>(null);

  // Reset rotation when geometry or object3d changes
  useEffect(() => {
    setRotation({ x: 0, y: 0, z: 0 });
  }, [geometry, object3d]);

  // Camera framing function
  const fitCameraToObject = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const model = modelRef.current;
    if (!camera || !controls || !model) return;

    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 25);

    const fov = camera.fov * (Math.PI / 180);
    let distance = Math.abs(maxDim / Math.sin(fov / 2));
    distance = Math.min(Math.max(distance * 0.95, 45), 900);

    camera.position.set(center.x + distance * 0.75, center.y + distance * 0.65, center.z + distance * 0.85);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate 50
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(100, 100, 150);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Critical: output colour space must match texture colour space (sRGB).
    // Without this, sRGB textures are double-gamma-corrected and appear nearly
    // black — which is exactly what we saw with the Spider-Man 3MF model.
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1000;
    controls.minDistance = 5;
    controlsRef.current = controls;

    // 5. Lights — boosted for textured / multi-material models
    // Ambient at 1.2 ensures textures are fully visible from all angles.
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(150, 200, 150);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-150, -100, -150);
    scene.add(dirLight2);

    // 6. Build Plate Ground Grid (256 x 256 mm)
    const grid = new THREE.GridHelper(256, 32, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0;
    scene.add(grid);
    gridHelperRef.current = grid;

    // 7. Animation Loop with Visibility Gating
    let animationFrameId: number | null = null;
    let isVisible = true;

    const animate = () => {
      if (!isVisible) return;
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry.isIntersecting;
        if (nowVisible && !isVisible) {
          isVisible = true;
          animate();
        } else if (!nowVisible && isVisible) {
          isVisible = false;
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
        }
      },
      { threshold: 0.05 }
    );
    visibilityObserver.observe(container);

    animate();

    // 8. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      visibilityObserver.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Geometry, Materials, Color Mode, Scaling, and Rotation
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing model and dispose resources
    if (modelRef.current) {
      scene.remove(modelRef.current);
      modelRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => mat.dispose());
            } else {
              m.material.dispose();
            }
          }
        }
      });
      modelRef.current = null;
    }

    if (!geometry && !object3d) return;

    let displayObj: THREE.Object3D;
    const isOriginalMode = hasOriginalColors || colorMode === 'original';

    if (isOriginalMode && object3d) {
      // 1. Cloned 3D Group/Mesh preserving original materials, textures, and vertex colors
      displayObj = object3d.clone(true);
      displayObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          if (m.material) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mat) => {
              const sm = mat as THREE.MeshStandardMaterial;
              if ('wireframe' in sm) sm.wireframe = isWireframe;
              sm.side = THREE.DoubleSide;

              // Ensure textures are decoded with correct colour space.
              // Three.js r152+ requires explicit SRGBColorSpace on loaded
              // textures when renderer.outputColorSpace = SRGBColorSpace.
              if (sm.map) {
                sm.map.colorSpace = THREE.SRGBColorSpace;
                sm.map.needsUpdate = true;
              }
              if (sm.emissiveMap) {
                sm.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                sm.emissiveMap.needsUpdate = true;
              }

              // Apply reasonable surface defaults if not already set
              if (sm.roughness === undefined || sm.roughness > 0.95) sm.roughness = 0.55;
              if (sm.metalness === undefined) sm.metalness = 0.0;

              // Activate vertex colours if geometry carries them
              if (m.geometry && m.geometry.hasAttribute('color')) {
                sm.vertexColors = true;
              }
              sm.needsUpdate = true;
            });
          }
        }
      });
    } else if (isOriginalMode && geometry && geometry.hasAttribute('color')) {
      // 2. Vertex-colored geometry (STL with VisCAM/Magics or raw vertex colors)
      const clonedGeometry = geometry.clone();
      clonedGeometry.center();
      clonedGeometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.4,
        metalness: 0.05,
        wireframe: isWireframe,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(clonedGeometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      displayObj = mesh;
    } else if (geometry) {
      // 3. Single-colour preview with selected filament color
      const clonedGeometry = geometry.clone();
      clonedGeometry.center();
      clonedGeometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.35,
        metalness: 0.05,
        wireframe: isWireframe,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(clonedGeometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      displayObj = mesh;
    } else if (object3d) {
      // 4. Single-colour override on parsed object3d
      displayObj = object3d.clone(true);
      const overrideMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.35,
        metalness: 0.05,
        wireframe: isWireframe,
        side: THREE.DoubleSide,
      });
      displayObj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.castShadow = true;
          m.receiveShadow = true;
          m.material = overrideMat;
        }
      });
    } else {
      return;
    }

    // Wrap model in a pivot group centered at model's geometric center
    const pivot = new THREE.Group();
    const initialBox = new THREE.Box3().setFromObject(displayObj);
    const initialCenter = new THREE.Vector3();
    initialBox.getCenter(initialCenter);

    displayObj.position.set(-initialCenter.x, -initialCenter.y, -initialCenter.z);
    pivot.add(displayObj);

    // Apply rotation & scale to the centered pivot
    const radX = (rotation.x * Math.PI) / 180;
    const radY = (rotation.y * Math.PI) / 180;
    const radZ = (rotation.z * Math.PI) / 180;

    pivot.rotation.set(radX, radY, radZ);
    pivot.scale.set(scale, scale, scale);
    pivot.updateMatrixWorld(true);

    // Compute bounding box in transformed world orientation
    const bbox = new THREE.Box3().setFromObject(pivot);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Ground pivot on grid (y = 0) and center horizontally (x = 0, z = 0)
    pivot.position.x = -center.x;
    pivot.position.z = -center.z;
    pivot.position.y = -bbox.min.y;
    pivot.updateMatrixWorld(true);

    scene.add(pivot);
    modelRef.current = pivot;

    // Compute oriented dimensions
    const finalBBox = new THREE.Box3().setFromObject(pivot);
    const orientedWidth = Math.round((finalBBox.max.x - finalBBox.min.x) * 10) / 10;
    const orientedDepth = Math.round((finalBBox.max.z - finalBBox.min.z) * 10) / 10;
    const orientedHeight = Math.round((finalBBox.max.y - finalBBox.min.y) * 10) / 10;

    const newDims = {
      x: orientedWidth,
      y: orientedDepth,
      z: orientedHeight,
    };

    setCurrentDims((prev) => {
      if (prev && prev.x === orientedWidth && prev.y === orientedDepth && prev.z === orientedHeight) {
        return prev;
      }
      return newDims;
    });

    const last = lastNotifiedDimsRef.current;
    if (!last || last.x !== orientedWidth || last.y !== orientedDepth || last.z !== orientedHeight) {
      lastNotifiedDimsRef.current = newDims;
      if (onOrientedDimensionsChangeRef.current) {
        onOrientedDimensionsChangeRef.current(newDims);
      }
    }

    // Fit camera on orientation / geometry / mode changes
    fitCameraToObject();
  }, [
    geometry,
    object3d,
    hasOriginalColors,
    colorMode,
    colorHex,
    isWireframe,
    scale,
    rotation,
    fitCameraToObject,
  ]);

  // Toggle Grid
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  const handleRotateAxis = (axis: 'x' | 'y' | 'z') => {
    setRotation((prev) => ({
      ...prev,
      [axis]: (prev[axis] + 90) % 360,
    }));
  };

  const handleResetRotation = () => {
    setRotation({ x: 0, y: 0, z: 0 });
  };

  const isRotated = rotation.x !== 0 || rotation.y !== 0 || rotation.z !== 0;
  const displayDimensions = currentDims || dimensions;

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] md:h-[450px] bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Analysing 3D Mesh Geometry...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3 z-10">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500">
            <Box className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 max-w-sm">
            {error}
          </p>
          <span className="text-xs text-slate-500 max-w-xs">
            Please verify your 3D model is a valid STL, OBJ, or 3MF file.
          </span>
        </div>
      )}

      {/* Viewer Overlay Controls */}
      {(geometry || object3d) && !isLoading && !error && (
        <>
          {/* Top-Center: Original Colours Indicator */}
          {hasOriginalColors && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs z-10">
              <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                <Palette className="w-3.5 h-3.5 text-amber-500" />
                <span>Original Colours</span>
              </span>
            </div>
          )}

          {/* Top-Left: Model Orientation Toolbar */}
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1 hidden sm:inline">
              Rotate:
            </span>
            <button
              type="button"
              onClick={() => handleRotateAxis('x')}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Rotate 90° along X axis (Pitch / Tilt)"
            >
              X 90°
            </button>
            <button
              type="button"
              onClick={() => handleRotateAxis('y')}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Rotate 90° along Y axis (Yaw / Turn)"
            >
              Y 90°
            </button>
            <button
              type="button"
              onClick={() => handleRotateAxis('z')}
              className="px-2 py-1 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Rotate 90° along Z axis (Roll)"
            >
              Z 90°
            </button>
            {isRotated && (
              <>
                <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                <button
                  type="button"
                  onClick={handleResetRotation}
                  className="p-1 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Reset Model Orientation (0°, 0°, 0°)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Top-Right: Camera & Display Toolbar */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs z-10">
            <button
              type="button"
              onClick={fitCameraToObject}
              className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Reset Camera View"
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsWireframe(!isWireframe)}
              className={`p-1.5 rounded-lg transition-colors ${
                isWireframe
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Toggle Wireframe"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg transition-colors ${
                showGrid
                  ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Toggle Build Plate Grid"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={fitCameraToObject}
              className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Fit to View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom-Left Bounding Dimension Pill */}
          {displayDimensions && (displayDimensions.x > 0 || displayDimensions.y > 0 || displayDimensions.z > 0) && (
            <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs z-10 flex items-center gap-2 font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span>
                {displayDimensions.x} × {displayDimensions.y} × {displayDimensions.z} mm
              </span>
              {isRotated && (
                <span className="text-[9px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/50 px-1.5 py-0.5 rounded-md border border-brand-200/50 dark:border-brand-800/50">
                  Rotated ({rotation.x}°, {rotation.y}°, {rotation.z}°)
                </span>
              )}
            </div>
          )}

          {/* Bottom-Right Touch/Mouse Hint */}
          <div className="absolute bottom-3 right-3 hidden sm:block text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-200/50 dark:border-slate-800/50">
            Rotate: Left Click · Pan: Right Click · Zoom: Scroll
          </div>
        </>
      )}
    </div>
  );
};


