import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Layers, Sparkles, RefreshCw } from 'lucide-react';

interface Hero3DCanvasProps {
  className?: string;
}

export function Hero3DCanvas({ className = '' }: Hero3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeShape, setActiveShape] = useState<'gear' | 'gem' | 'vase'>('gear');
  const [wireframeOnly, setWireframeOnly] = useState(false);
  const [isRotating, setIsRotating] = useState(true);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const laserRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.2;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.replaceChildren(renderer.domElement);

    // Group for the 3D Object
    const meshGroup = new THREE.Group();
    meshGroupRef.current = meshGroup;
    scene.add(meshGroup);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xff4d00, 2.5); // Brand Accent Orange
    dirLight1.position.set(4, 5, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 1.8); // Cool Blue Rim
    dirLight2.position.set(-4, -3, -2);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xff7700, 3, 10);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);

    // Background Particle Dust
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 8;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 6;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffa066,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Slicing Laser Ring / Plane
    const laserGeo = new THREE.RingGeometry(0.01, 1.6, 32);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0xff4d00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const laserMesh = new THREE.Mesh(laserGeo, laserMat);
    laserMesh.rotation.x = Math.PI / 2;
    laserRef.current = laserMesh;
    scene.add(laserMesh);

    // Mouse Interaction (Ignore touch so mobile page scrolling is smooth)
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.targetX = x * 0.6;
      mouseRef.current.targetY = y * 0.6;
    };

    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      if (meshGroupRef.current) {
        if (isRotating) {
          meshGroupRef.current.rotation.y = elapsedTime * 0.45 + mouseRef.current.x;
          meshGroupRef.current.rotation.x = Math.sin(elapsedTime * 0.3) * 0.2 + mouseRef.current.y;
        } else {
          meshGroupRef.current.rotation.y = mouseRef.current.x;
          meshGroupRef.current.rotation.x = mouseRef.current.y;
        }
      }

      // Slicing Laser scan up and down
      if (laserRef.current) {
        const laserY = Math.sin(elapsedTime * 1.6) * 1.25;
        laserRef.current.position.y = laserY;
        const pulse = 0.35 + Math.abs(Math.sin(elapsedTime * 3)) * 0.3;
        (laserRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
      }

      // Rotate particles slowly
      particles.rotation.y = elapsedTime * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      container.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      laserGeo.dispose();
      laserMat.dispose();
    };
  }, [isRotating]);

  // Re-build 3D Mesh when activeShape or wireframeOnly changes
  useEffect(() => {
    if (!meshGroupRef.current) return;
    const group = meshGroupRef.current;

    // Clear previous children
    while (group.children.length > 0) {
      const obj = group.children[0] as THREE.Mesh;
      if (obj.geometry) obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else if (obj.material) {
        obj.material.dispose();
      }
      group.remove(obj);
    }

    let geometry: THREE.BufferGeometry;
    if (activeShape === 'gear') {
      const gearShape = new THREE.Shape();
      const teeth = 12;
      const innerRadius = 0.72;
      const outerRadius = 0.95;
      const angleStep = (Math.PI * 2) / (teeth * 2);

      for (let i = 0; i < teeth * 2; i++) {
        const angle = i * angleStep;
        const r = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) {
          gearShape.moveTo(x, y);
        } else {
          gearShape.lineTo(x, y);
        }
      }
      gearShape.closePath();

      // Add a center hole for the gear
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, 0.32, 0, Math.PI * 2, true);
      gearShape.holes.push(holePath);

      geometry = new THREE.ExtrudeGeometry(gearShape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02,
      });
      geometry.center();
    } else if (activeShape === 'gem') {
      geometry = new THREE.IcosahedronGeometry(1.05, 1);
    } else {
      // Helix / Designer Vase Lathe
      const points = [];
      for (let i = 0; i < 24; i++) {
        const t = i / 23;
        const y = t * 1.8 - 0.9;
        const x = 0.55 + Math.sin(t * Math.PI * 2.5) * 0.18 + t * 0.25;
        points.push(new THREE.Vector2(x, y));
      }
      geometry = new THREE.LatheGeometry(points, 32);
    }

    if (!wireframeOnly) {
      // Solid base with metallic luster
      const solidMaterial = new THREE.MeshStandardMaterial({
        color: 0x18181b,
        metalness: 0.85,
        roughness: 0.25,
      });
      const solidMesh = new THREE.Mesh(geometry, solidMaterial);
      group.add(solidMesh);
    }

    // Glowing wireframe overlay for 3D printing aesthetic
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: wireframeOnly ? 0xff6622 : 0xff4d00,
      wireframe: true,
      transparent: true,
      opacity: wireframeOnly ? 0.95 : 0.45,
    });
    const wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    wireframeMesh.scale.set(1.002, 1.002, 1.002);
    group.add(wireframeMesh);
  }, [activeShape, wireframeOnly]);

  return (
    <div className={`relative flex flex-col items-center justify-center rounded-3xl overflow-hidden bg-gradient-to-b from-zinc-950 via-[#101012] to-zinc-950 border border-zinc-800 shadow-2xl touch-pan-y ${className}`}>
      {/* Interactive 3D Canvas Mount */}
      <div
        ref={mountRef}
        style={{ touchAction: 'pan-y' }}
        className="w-full h-full min-h-[320px] sm:min-h-[380px] cursor-grab active:cursor-grabbing touch-pan-y"
      />

      {/* Top Overlay Badges Row */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between gap-2 pointer-events-none z-10">
        <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10 text-white font-mono text-[9px] sm:text-[10px] shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
          <span className="font-bold text-accent">REAL-TIME 3D CAD</span>
          <span className="text-zinc-500 hidden sm:inline">| Drag to tilt</span>
        </div>

        <div className="flex items-center gap-1 bg-accent/20 backdrop-blur-md px-2 py-1 rounded-full border border-accent/40 text-accent font-mono text-[9px] sm:text-[10px] font-bold shadow-xs">
          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span>G-Code Sim</span>
        </div>
      </div>

      {/* Bottom Interactive Controls Strip */}
      <div className="absolute bottom-3 inset-x-3 sm:bottom-4 sm:inset-x-4 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 bg-black/80 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-white/10 text-white font-mono text-xs z-10">
        {/* Shape Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            type="button"
            onClick={() => setActiveShape('gear')}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${
              activeShape === 'gear' ? 'bg-accent text-white shadow-xs' : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            Gear
          </button>
          <button
            type="button"
            onClick={() => setActiveShape('gem')}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${
              activeShape === 'gem' ? 'bg-accent text-white shadow-xs' : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            Gem
          </button>
          <button
            type="button"
            onClick={() => setActiveShape('vase')}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${
              activeShape === 'vase' ? 'bg-accent text-white shadow-xs' : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
            }`}
          >
            Vase
          </button>
        </div>

        {/* View Mode Toggles */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setWireframeOnly(!wireframeOnly)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${
              wireframeOnly ? 'bg-white text-ink' : 'bg-zinc-800 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Wireframe"
          >
            <Layers className="w-3 h-3" />
            <span>{wireframeOnly ? 'Wireframe' : 'Solid + Wire'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1 sm:p-1.5 rounded-xl transition-all ${
              isRotating ? 'bg-zinc-800 text-accent' : 'bg-zinc-800 text-zinc-500'
            }`}
            title={isRotating ? 'Pause Rotation' : 'Resume Rotation'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          </button>
        </div>
      </div>
    </div>
  );
}




