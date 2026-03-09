import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const PACKAGES = [
  {
    name: '@bundt/cleo',
    abbrev: 'CLEO',
    tagline: 'Claude extensions orchestrator',
    tags: ['cli', 'ai', 'mcp'],
    gradient: ['#8b5cf6', '#7c3aed'],
    released: true,
    // Terminal icon path
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // terminal box
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.5, cy - s * 0.4, s, s * 0.8, s * 0.1);
      ctx.stroke();
      // prompt arrow >_
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.25, cy - s * 0.1);
      ctx.lineTo(cx - s * 0.05, cy + s * 0.05);
      ctx.lineTo(cx - s * 0.25, cy + s * 0.2);
      ctx.stroke();
      // cursor line
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.05, cy + s * 0.2);
      ctx.lineTo(cx + s * 0.25, cy + s * 0.2);
      ctx.stroke();
    },
  },
  {
    name: '@bundt/prev',
    abbrev: 'PREV',
    tagline: 'Agent-native UI framework',
    tags: ['react', 'ssr', 'ai'],
    gradient: ['#f59e0b', '#d97706'],
    released: true,
    // Layout/grid icon
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // outer rect
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.45, cy - s * 0.4, s * 0.9, s * 0.8, s * 0.08);
      ctx.stroke();
      // horizontal divider
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.45, cy - s * 0.05);
      ctx.lineTo(cx + s * 0.45, cy - s * 0.05);
      ctx.stroke();
      // vertical divider (bottom half)
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.05);
      ctx.lineTo(cx, cy + s * 0.4);
      ctx.stroke();
    },
  },
  {
    name: '@bundt/dxdocs',
    abbrev: 'DXDC',
    tagline: 'Zero-JS documentation',
    tags: ['docs', 'mdx', 'ssg'],
    gradient: ['#3b82f6', '#0891b2'],
    released: true,
    // FileText icon
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // file shape with folded corner
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, cy - s * 0.45);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.45);
      ctx.lineTo(cx + s * 0.35, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.35, cy + s * 0.45);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.45);
      ctx.closePath();
      ctx.stroke();
      // fold
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.1, cy - s * 0.45);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.35, cy - s * 0.2);
      ctx.stroke();
      // text lines
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.15, cy);
      ctx.lineTo(cx + s * 0.2, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.15, cy + s * 0.18);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.18);
      ctx.stroke();
    },
  },
  {
    name: '@bundt/ollama',
    abbrev: 'OLLM',
    tagline: 'Local LLM management',
    tags: ['cli', 'ai', 'llm'],
    gradient: ['#f43f5e', '#ec4899'],
    released: false,
    // Brain/CPU icon
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // CPU square
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.25, cy - s * 0.25, s * 0.5, s * 0.5, s * 0.06);
      ctx.stroke();
      // inner square
      ctx.beginPath();
      ctx.roundRect(cx - s * 0.12, cy - s * 0.12, s * 0.24, s * 0.24, s * 0.03);
      ctx.stroke();
      // pins top/bottom/left/right
      const pins = [-s * 0.1, 0, s * 0.1];
      for (const p of pins) {
        ctx.beginPath(); ctx.moveTo(cx + p, cy - s * 0.25); ctx.lineTo(cx + p, cy - s * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + p, cy + s * 0.25); ctx.lineTo(cx + p, cy + s * 0.4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s * 0.25, cy + p); ctx.lineTo(cx - s * 0.4, cy + p); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + s * 0.25, cy + p); ctx.lineTo(cx + s * 0.4, cy + p); ctx.stroke();
      }
    },
  },
  {
    name: '@bundt/signals',
    abbrev: 'SGNL',
    tagline: 'Reactive signal graph',
    tags: ['reactive', 'signals'],
    gradient: ['#10b981', '#14b8a6'],
    released: true,
    // Activity/zap icon
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // activity line (heartbeat shape)
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.45, cy);
      ctx.lineTo(cx - s * 0.25, cy);
      ctx.lineTo(cx - s * 0.12, cy - s * 0.35);
      ctx.lineTo(cx + s * 0.02, cy + s * 0.3);
      ctx.lineTo(cx + s * 0.15, cy - s * 0.15);
      ctx.lineTo(cx + s * 0.25, cy);
      ctx.lineTo(cx + s * 0.45, cy);
      ctx.stroke();
    },
  },
  {
    name: '@bundt/hateoas',
    abbrev: 'HTOA',
    tagline: 'Hypermedia React framework',
    tags: ['react', 'rest'],
    gradient: ['#0ea5e9', '#6366f1'],
    released: false,
    // Link/chain icon
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const r = s * 0.15;
      // left link
      ctx.beginPath();
      ctx.arc(cx - s * 0.2, cy - s * 0.15, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.lineTo(cx - s * 0.05, cy - s * 0.15 - r);
      ctx.arc(cx - s * 0.05, cy - s * 0.15, r, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.lineTo(cx - s * 0.2, cy - s * 0.15 + r);
      ctx.stroke();
      // right link
      ctx.beginPath();
      ctx.arc(cx + s * 0.2, cy + s * 0.15, r, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.lineTo(cx + s * 0.05, cy + s * 0.15 + r);
      ctx.arc(cx + s * 0.05, cy + s * 0.15, r, Math.PI * 0.5, Math.PI * 1.5);
      ctx.lineTo(cx + s * 0.2, cy + s * 0.15 - r);
      ctx.stroke();
    },
  },
  {
    name: '@bundt/waavy',
    abbrev: 'WAVY',
    tagline: 'Polyglot React SSR',
    tags: ['react', 'ssr'],
    gradient: ['#d946ef', '#8b5cf6'],
    released: false,
    // Waves icon
    iconPath: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) => {
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const dy of [-s * 0.2, 0, s * 0.2]) {
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.4, cy + dy);
        ctx.bezierCurveTo(
          cx - s * 0.2, cy + dy - s * 0.15,
          cx, cy + dy + s * 0.15,
          cx + s * 0.2, cy + dy - s * 0.05
        );
        ctx.bezierCurveTo(
          cx + s * 0.3, cy + dy - s * 0.1,
          cx + s * 0.35, cy + dy,
          cx + s * 0.4, cy + dy
        );
        ctx.stroke();
      }
    },
  },
];

const TEX_W = 512;
const TEX_H = 320;

function renderCardTexture(pkg: typeof PACKAGES[number]) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;

  // Background — slightly lighter so texture reads well without scene lighting
  ctx.fillStyle = '#111130';
  ctx.beginPath();
  ctx.roundRect(0, 0, TEX_W, TEX_H, 16);
  ctx.fill();

  // Top accent bar
  const grad = ctx.createLinearGradient(0, 0, TEX_W, 0);
  grad.addColorStop(0, pkg.gradient[0]);
  grad.addColorStop(1, pkg.gradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(24, 16, TEX_W - 48, 3);

  // Subtle background circle for icon area
  ctx.fillStyle = pkg.gradient[0] + '20';
  ctx.beginPath();
  ctx.arc(TEX_W / 2, TEX_H / 2 + 10, 70, 0, Math.PI * 2);
  ctx.fill();

  // Center icon (drawn with canvas paths)
  const iconGrad = ctx.createLinearGradient(TEX_W / 2 - 40, TEX_H / 2 - 30, TEX_W / 2 + 40, TEX_H / 2 + 30);
  iconGrad.addColorStop(0, pkg.gradient[0]);
  iconGrad.addColorStop(1, pkg.gradient[1]);
  ctx.strokeStyle = iconGrad;
  ctx.fillStyle = 'transparent';
  pkg.iconPath(ctx, TEX_W / 2, TEX_H / 2 + 10, 80);

  // 4-letter abbreviation — top right
  ctx.fillStyle = pkg.gradient[0] + '90';
  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(pkg.abbrev, TEX_W - 28, 28);

  // Package name — top left
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(pkg.name, 28, 40);

  // "SOON" badge for unreleased
  if (!pkg.released) {
    const label = 'SOON';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    const nameW = ctx.measureText(pkg.name).width;
    const lx = 28 + nameW + 12;
    ctx.font = 'bold 10px "Fira Sans", system-ui, sans-serif';
    const labelW = ctx.measureText(label).width + 12;
    ctx.strokeStyle = '#fbbf2450';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lx, 42, labelW, 16, 4);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(label, lx + 6, 45);
  }

  // Tagline
  ctx.fillStyle = pkg.gradient[0];
  ctx.font = '500 16px "Fira Sans", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(pkg.tagline, 28, 74);

  // Tags at bottom
  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Fira Sans", system-ui, sans-serif';
  const tagStr = pkg.tags.map((t) => t.toUpperCase()).join('   ');
  ctx.fillText(tagStr, 28, TEX_H - 36);

  // Border
  ctx.strokeStyle = pkg.gradient[0] + '30';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(1, 1, TEX_W - 2, TEX_H - 2, 16);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CARD_COUNT = PACKAGES.length;
const RADIUS = 1.8;
const CARD_WIDTH = 1.1;
const CARD_HEIGHT = CARD_WIDTH * (TEX_H / TEX_W);

function CarouselCard({ index, activeIndex, pkg, onClick }: {
  index: number;
  activeIndex: number;
  pkg: typeof PACKAGES[number];
  onClick: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);
  const glowRef = useRef<THREE.MeshBasicMaterial>(null!);
  const targetAngle = useRef(0);
  const currentAngle = useRef((index / CARD_COUNT) * Math.PI * 2);
  const texture = useMemo(() => renderCardTexture(pkg), [pkg]);

  useFrame(() => {
    targetAngle.current = ((index - activeIndex) / CARD_COUNT) * Math.PI * 2;
    currentAngle.current = THREE.MathUtils.lerp(currentAngle.current, targetAngle.current, 0.04);

    const angle = currentAngle.current;
    groupRef.current.position.x = Math.sin(angle) * RADIUS;
    groupRef.current.position.y = 0;
    groupRef.current.position.z = Math.cos(angle) * RADIUS;
    groupRef.current.rotation.y = angle;

    const dist = Math.abs(((index - activeIndex + CARD_COUNT / 2) % CARD_COUNT) - CARD_COUNT / 2);
    const norm = Math.min(dist / (CARD_COUNT / 2), 1);
    const scale = THREE.MathUtils.lerp(1.1, 0.9, norm);
    groupRef.current.scale.setScalar(scale);

    matRef.current.opacity = THREE.MathUtils.lerp(1, 0.45, norm);
    glowRef.current.opacity = THREE.MathUtils.lerp(0.12, 0.03, norm);
  });

  return (
    <group ref={groupRef} onClick={onClick}>
      <RoundedBox args={[CARD_WIDTH, CARD_HEIGHT, 0.04]} radius={0.03} smoothness={4}>
        <meshBasicMaterial
          ref={matRef}
          map={texture}
          transparent
          opacity={1}
        />
      </RoundedBox>

      {/* Colored glow behind card */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[CARD_WIDTH + 0.3, CARD_HEIGHT + 0.3]} />
        <meshBasicMaterial ref={glowRef} color={pkg.gradient[0]} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const autoRotate = useRef(true);
  const lastInteraction = useRef(0);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    if (now - lastInteraction.current > 4) {
      autoRotate.current = true;
    }
    if (autoRotate.current) {
      const newIndex = (now * 0.15) % CARD_COUNT;
      setActiveIndex(newIndex);
    }
  });

  const handleClick = useCallback((index: number) => {
    setActiveIndex(index);
    autoRotate.current = false;
    lastInteraction.current = performance.now() / 1000;
  }, []);

  return (
    <Float speed={0.4} rotationIntensity={0.02} floatIntensity={0.1}>
      <group position={[0, 0.2, 0]} rotation={[0.15, -0.3, 0.35]}>
        {PACKAGES.map((pkg, i) => (
          <CarouselCard
            key={pkg.name}
            index={i}
            activeIndex={activeIndex}
            pkg={pkg}
            onClick={() => handleClick(i)}
          />
        ))}
      </group>
    </Float>
  );
}

function AmbientParticles({ count = 50 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 6,
      z: (Math.random() - 0.5) * 12 - 3,
      speed: 0.01 + Math.random() * 0.03,
      phase: (i / count) * Math.PI * 2,
      scale: 0.003 + Math.random() * 0.008,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.phase) * 0.6,
        p.y + Math.sin(t * 0.15 + p.phase * 2) * 0.3,
        p.z + Math.cos(t * p.speed + p.phase) * 0.4
      );
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t + p.phase) * 0.3));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
    </instancedMesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#08081a" roughness={1} metalness={0.3} />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 14, 28]} />

      <ambientLight intensity={0.4} />
      <spotLight position={[5, 8, 2]} angle={0.3} penumbra={1} intensity={3} color="#8b5cf6" />
      <spotLight position={[-4, 6, -3]} angle={0.4} penumbra={1} intensity={2} color="#6d28d9" />
      <pointLight position={[0, 3, 4]} intensity={1} color="#a78bfa" />

      <Carousel />
      <AmbientParticles />
      <Ground />
    </>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0.8, 8], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: false,
        }}
        style={{ pointerEvents: 'auto' }}
        onCreated={({ gl }) => {
          gl.getContext().canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
          });
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
