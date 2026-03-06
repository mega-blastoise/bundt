import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function OrbitalParticles({ count = 80 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      radius: 1.5 + Math.random() * 2.5,
      speed: 0.1 + Math.random() * 0.3,
      phase: (i / count) * Math.PI * 2,
      y: (Math.random() - 0.5) * 3,
      scale: 0.015 + Math.random() * 0.03
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const angle = p.phase + t * p.speed;
      dummy.position.set(
        Math.cos(angle) * p.radius,
        p.y + Math.sin(t * 0.5 + p.phase) * 0.3,
        Math.sin(angle) * p.radius
      );
      dummy.scale.setScalar(p.scale * (1 + Math.sin(t * 2 + p.phase) * 0.3));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#a78bfa" transparent opacity={0.5} />
    </instancedMesh>
  );
}

function ToolkitCore() {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    ref.current.rotation.y = clock.getElapsedTime() * 0.1;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.05;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={ref}>
        {/* Central icosahedron */}
        <mesh>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.2} />
        </mesh>

        {/* Inner glow */}
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.15} />
        </mesh>

        {/* Orbiting package indicators */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8]}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshBasicMaterial
                color={['#a78bfa', '#c4b5fd', '#8b5cf6', '#7c3aed'][i]}
                transparent
                opacity={0.5}
              />
            </mesh>
          );
        })}
      </group>
    </Float>
  );
}

export function HeroScene() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ToolkitCore />
        <OrbitalParticles />
      </Canvas>
    </div>
  );
}
