"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ParticleField() {
  const count = 800;
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 20;
      pos[i + 1] = (Math.random() - 0.5) * 20;
      pos[i + 2] = (Math.random() - 0.5) * 12;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#7dd3fc"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function GlowOrb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.5;
  });
  return (
    <mesh ref={ref} position={[4, 0, -4]}>
      <sphereGeometry args={[1.8, 32, 32]} />
      <meshBasicMaterial
        color="#1e3a5f"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </mesh>
  );
}

function SecondOrb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.x = Math.cos(state.clock.elapsedTime * 0.2) * 0.3;
  });
  return (
    <mesh ref={ref} position={[-5, 2, -6]}>
      <sphereGeometry args={[1.2, 24, 24]} />
      <meshBasicMaterial
        color="#1e40af"
        transparent
        opacity={0.08}
        depthWrite={false}
      />
    </mesh>
  );
}

export function SceneInner() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0a0e1a"]} />
      <ambientLight intensity={0.4} />
      <GlowOrb />
      <SecondOrb />
      <ParticleField />
    </Canvas>
  );
}
