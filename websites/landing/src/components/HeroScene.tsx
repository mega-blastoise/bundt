import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshReflectorMaterial, Environment, RoundedBox } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';

const PACKAGES = [
  {
    name: '@bundt/cleo',
    tagline: 'Claude extensions orchestrator',
    tags: ['cli', 'ai', 'mcp'],
    gradient: ['#8b5cf6', '#7c3aed'],
    icon: 'C',
    released: true,
  },
  {
    name: '@bundt/prev',
    tagline: 'Agent-native UI framework',
    tags: ['react', 'ssr', 'ai'],
    gradient: ['#f59e0b', '#d97706'],
    icon: 'P',
    released: true,
  },
  {
    name: '@bundt/dxdocs',
    tagline: 'Zero-JS documentation',
    tags: ['docs', 'mdx', 'ssg'],
    gradient: ['#3b82f6', '#0891b2'],
    icon: 'D',
    released: true,
  },
  {
    name: '@bundt/ollama',
    tagline: 'Local LLM management',
    tags: ['cli', 'ai', 'llm'],
    gradient: ['#f43f5e', '#ec4899'],
    icon: 'O',
    released: false,
  },
  {
    name: '@bundt/signals',
    tagline: 'Reactive signal graph',
    tags: ['reactive', 'signals'],
    gradient: ['#10b981', '#14b8a6'],
    icon: 'S',
    released: true,
  },
  {
    name: '@bundt/hateoas',
    tagline: 'Hypermedia React framework',
    tags: ['react', 'rest'],
    gradient: ['#0ea5e9', '#6366f1'],
    icon: 'H',
    released: false,
  },
  {
    name: '@bundt/waavy',
    tagline: 'Polyglot React SSR',
    tags: ['react', 'ssr'],
    gradient: ['#d946ef', '#8b5cf6'],
    icon: 'W',
    released: false,
  },
];

const TEX_W = 512;
const TEX_H = 320;

function renderCardTexture(pkg: typeof PACKAGES[number]) {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c0c1e';
  ctx.beginPath();
  ctx.roundRect(0, 0, TEX_W, TEX_H, 16);
  ctx.fill();

  const grad = ctx.createLinearGradient(0, 0, TEX_W, 0);
  grad.addColorStop(0, pkg.gradient[0]);
  grad.addColorStop(1, pkg.gradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(24, 16, TEX_W - 48, 3);

  ctx.fillStyle = pkg.gradient[0] + '18';
  ctx.beginPath();
  ctx.arc(TEX_W - 70, TEX_H / 2, 80, 0, Math.PI * 2);
  ctx.fill();

  const iconGrad = ctx.createLinearGradient(TEX_W - 120, TEX_H / 2 - 30, TEX_W - 40, TEX_H / 2 + 30);
  iconGrad.addColorStop(0, pkg.gradient[0]);
  iconGrad.addColorStop(1, pkg.gradient[1]);
  ctx.fillStyle = iconGrad;
  ctx.font = 'bold 56px "Fira Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pkg.icon, TEX_W - 70, TEX_H / 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(pkg.name, 28, 40);

  if (!pkg.released) {
    const label = 'SOON';
    ctx.font = 'bold 10px "Fira Sans", system-ui, sans-serif';
    const labelW = ctx.measureText(label).width + 12;
    // const labelX = 28 + ctx.measureText(pkg.name).width + 10;
    ctx.save();
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    const nameW = ctx.measureText(pkg.name).width;
    ctx.restore();
    const lx = 28 + nameW + 12;
    ctx.strokeStyle = '#fbbf2450';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(lx, 42, labelW, 16, 4);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px "Fira Sans", system-ui, sans-serif';
    ctx.fillText(label, lx + 6, 45);
  }

  ctx.fillStyle = pkg.gradient[0];
  ctx.font = '500 16px "Fira Sans", system-ui, sans-serif';
  ctx.fillText(pkg.tagline, 28, 74);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 11px "Fira Sans", system-ui, sans-serif';
  const tagStr = pkg.tags.map((t) => t.toUpperCase()).join('   ');
  ctx.fillText(tagStr, 28, TEX_H - 36);

  ctx.strokeStyle = pkg.gradient[0] + '15';
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
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);
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
    const scale = THREE.MathUtils.lerp(1.1, 0.9, Math.min(dist / (CARD_COUNT / 2), 1));
    groupRef.current.scale.setScalar(scale);

    matRef.current.opacity = THREE.MathUtils.lerp(0.95, 0.4, Math.min(dist / (CARD_COUNT / 2), 1));
  });

  return (
    <group ref={groupRef} onClick={onClick}>
      <RoundedBox args={[CARD_WIDTH, CARD_HEIGHT, 0.04]} radius={0.03} smoothness={4} castShadow>
        <meshStandardMaterial
          ref={matRef}
          map={texture}
          transparent
          opacity={0.9}
          roughness={0.3}
          metalness={0.1}
          envMapIntensity={0.3}
        />
      </RoundedBox>

      {/* Subtle glow behind */}
      <mesh position={[0, 0, -0.06]}>
        <planeGeometry args={[CARD_WIDTH + 0.2, CARD_HEIGHT + 0.2]} />
        <meshBasicMaterial color={pkg.gradient[0]} transparent opacity={0.04} />
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
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.25} />
    </instancedMesh>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]}>
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#08081a"
        metalness={0.5}
        mirror={0}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 10, 22]} />

      <ambientLight intensity={0.15} />
      <spotLight position={[5, 8, 2]} angle={0.3} penumbra={1} intensity={2} color="#8b5cf6" castShadow />
      <spotLight position={[-4, 6, -3]} angle={0.4} penumbra={1} intensity={1.2} color="#6d28d9" />
      <pointLight position={[0, 3, 4]} intensity={0.5} color="#a78bfa" />

      <Carousel />
      <AmbientParticles />
      <Ground />
      <Environment preset="night" />

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
      </EffectComposer>
    </>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0.8, 8], fov: 35 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
        style={{ pointerEvents: 'auto' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
