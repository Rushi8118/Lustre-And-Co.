import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  OrbitControls,
  PerspectiveCamera,
  Sparkles,
  Torus
} from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function JewelryObject() {
  const group = useRef();

  useFrame((state) => {
    if (!group.current) return;

    group.current.rotation.y =
      Math.sin(state.clock.elapsedTime * 0.35) * 0.35;
    group.current.rotation.x =
      Math.cos(state.clock.elapsedTime * 0.25) * 0.08;
  });

  return (
    <group ref={group} rotation={[0.18, -0.3, 0.08]}>
      <Torus
        args={[1.25, 0.08, 32, 120]}
        rotation={[Math.PI / 2, 0.15, 0]}
      >
        <meshPhysicalMaterial
          color="#d6b56d"
          metalness={0.94}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </Torus>

      <mesh position={[0, 0.03, 0.02]}>
        <sphereGeometry args={[0.27, 48, 48]} />
        <meshPhysicalMaterial
          color="#fffdf8"
          metalness={0.08}
          roughness={0.05}
          transmission={0.15}
          clearcoat={1}
        />
      </mesh>

      <mesh position={[0, 0.03, 0.03]} scale={0.72}>
        <octahedronGeometry args={[0.42, 2]} />
        <meshPhysicalMaterial
          color="#c98c82"
          metalness={0.05}
          roughness={0.08}
          transmission={0.24}
          clearcoat={1}
          ior={1.45}
        />
      </mesh>

      <Torus
        args={[0.65, 0.035, 20, 80]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshPhysicalMaterial
          color="#fffdf8"
          metalness={0.25}
          roughness={0.08}
          clearcoat={1}
        />
      </Torus>
    </group>
  );
}

export default function ThreeHero() {
  return (
    <div className="three-hero-canvas" aria-hidden="true">
      <Canvas dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0.2, 4.5]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 3, 4]} intensity={4} color="#fffdf8" />
        <pointLight position={[-2, 1, 2]} intensity={5} color="#d6b56d" />
        <pointLight position={[2, -2, 1]} intensity={4} color="#c98c82" />

        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.35}>
          <JewelryObject />
        </Float>

        <Sparkles
          count={55}
          scale={4.5}
          size={2.4}
          speed={0.25}
          color="#d6b56d"
        />

        <Environment preset="studio" />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.35}
          minPolarAngle={Math.PI / 2.4}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}