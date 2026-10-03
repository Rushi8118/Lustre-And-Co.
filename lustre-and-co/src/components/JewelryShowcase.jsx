import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, OrbitControls, Sparkles } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

/** Round brilliant profile, revolved and faceted by a low segment count. */
function gemGeometry() {
  const profile = [
    new THREE.Vector2(0, -0.95),
    new THREE.Vector2(0.45, -0.55),
    new THREE.Vector2(0.78, -0.12),
    new THREE.Vector2(0.92, 0.1),
    new THREE.Vector2(0.62, 0.3),
    new THREE.Vector2(0.4, 0.42),
    new THREE.Vector2(0, 0.42),
  ];
  const geometry = new THREE.LatheGeometry(profile, 16);
  geometry.computeVertexNormals();
  return geometry;
}

/** Ring band with a slight taper toward the bottom, made from a tube along a closed curve. */
function bandGeometry() {
  const points = [];
  const radius = 1.35;
  for (let i = 0; i <= 96; i++) {
    const angle = (i / 96) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.sin(angle) * radius, 0, Math.cos(angle) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, 240, 0.085, 48, true);
}

function Ring() {
  const group = useRef();
  const band = useMemo(bandGeometry, []);
  const gem = useMemo(gemGeometry, []);

  const gold = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e3bf72",
        metalness: 1,
        roughness: 0.2,
        clearcoat: 0.6,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.25,
      }),
    []
  );

  const goldDouble = useMemo(() => {
    const material = gold.clone();
    material.side = THREE.DoubleSide;
    return material;
  }, [gold]);

  const diamond = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        metalness: 0,
        roughness: 0,
        transmission: 1,
        thickness: 0.9,
        ior: 2.42,
        dispersion: 0.6,
        specularIntensity: 1,
        envMapIntensity: 2.2,
        clearcoat: 1,
      }),
    []
  );

  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.25;
  });

  const prongs = [0, 1, 2, 3];

  return (
    <group ref={group} rotation={[0.28, 0, 0.08]} position={[0, -0.1, 0]}>
      <mesh geometry={band} material={gold} castShadow />

      {/* Setting: a gold collar that holds the stone above the band */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.5, 0.2, 32, 1, true]} />
        <primitive object={goldDouble} attach="material" />
      </mesh>

      {prongs.map((index) => {
        const angle = (index / prongs.length) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.42, 1.42, Math.sin(angle) * 0.42]}
            rotation={[0, -angle, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
            <primitive object={gold} attach="material" />
          </mesh>
        );
      })}

      <mesh geometry={gem} material={diamond} position={[0, 1.78, 0]} scale={0.62} castShadow />
    </group>
  );
}

function Scene() {
  const { gl, scene } = useThree();

  useEffect(() => {
    // Local studio reflections: no HDR download, so the scene renders offline too.
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    return () => {
      scene.environment = null;
      envTexture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={2.2}
        color="#fff8ee"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <spotLight position={[-4, 3, 2]} angle={0.5} penumbra={1} intensity={18} color="#ffe2a8" />
      <pointLight position={[2, -1, 3]} intensity={3} color="#f2c6bb" />

      <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.25}>
        <Ring />
      </Float>

      <Sparkles count={24} scale={[4, 3, 3]} size={2.2} speed={0.2} color="#e3bf72" opacity={0.7} />

      <ContactShadows position={[0, -1.7, 0]} opacity={0.45} scale={6} blur={2.6} far={3} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.6}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
      />
    </>
  );
}

/** Interactive 3D ring. Local lighting and materials only, so it works without network access. */
export default function JewelryShowcase() {
  return (
    <div className="jewelry-showcase" aria-label="3D view of a gold ring with a diamond">
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{ position: [0, 0.6, 5.2], fov: 38 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Scene />
      </Canvas>
      <p className="jewelry-showcase-hint">Drag to rotate</p>
    </div>
  );
}
