import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, OrbitControls, Sparkles } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

const BAND_RADIUS = 1.0;
const BAND_TUBE = 0.09;
const SEAT_Y = BAND_RADIUS + BAND_TUBE; // top of the band, where the setting sits

/** Round-brilliant profile revolved around the Y axis. The point faces down into the setting. */
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
  return new THREE.LatheGeometry(profile, 16);
}

/** Closed band standing upright in the XY plane, like a ring worn on a finger. */
function bandGeometry() {
  const points = [];
  for (let i = 0; i < 128; i++) {
    const angle = (i / 128) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.sin(angle) * BAND_RADIUS, Math.cos(angle) * BAND_RADIUS, 0));
  }
  const curve = new THREE.CatmullRomCurve3(points, true);
  return new THREE.TubeGeometry(curve, 256, BAND_TUBE, 48, true);
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
        roughness: 0.22,
        clearcoat: 0.6,
        clearcoatRoughness: 0.12,
        envMapIntensity: 1.25,
      }),
    []
  );

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
    group.current.rotation.y = state.clock.elapsedTime * 0.3;
  });

  const prongCount = 4;
  const prongRadius = 0.26;
  const prongHeight = 0.42;
  const gemScale = 0.5;
  const gemY = SEAT_Y + 0.2 + 0.42 * gemScale; // flat top of the stone sits above the prongs

  return (
    <group ref={group} rotation={[0.2, 0, 0.12]}>
      <mesh geometry={band} material={gold} castShadow />

      {/* Collar: an open gold cylinder the stone's pointed bottom sits in */}
      <mesh position={[0, SEAT_Y + 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.2, 0.16, 32, 1, true]} />
        <meshPhysicalMaterial color="#e3bf72" metalness={1} roughness={0.22} side={THREE.DoubleSide} />
      </mesh>

      {/* Prongs rise from the collar and hold the stone */}
      {Array.from({ length: prongCount }, (_, index) => {
        const angle = (index / prongCount) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * prongRadius, SEAT_Y + 0.08 + prongHeight / 2, Math.sin(angle) * prongRadius]}
            castShadow
          >
            <cylinderGeometry args={[0.028, 0.028, prongHeight, 12]} />
            <meshPhysicalMaterial color="#e3bf72" metalness={1} roughness={0.22} />
          </mesh>
        );
      })}

      <mesh geometry={gem} material={diamond} position={[0, gemY, 0]} scale={gemScale} castShadow />
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
      <directionalLight position={[3, 5, 4]} intensity={2.2} color="#fff8ee" castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-4, 3, 2]} angle={0.5} penumbra={1} intensity={18} color="#ffe2a8" />
      <pointLight position={[2, -1, 3]} intensity={3} color="#f2c6bb" />

      <Float speed={1} rotationIntensity={0.05} floatIntensity={0.2}>
        <Ring />
      </Float>

      <Sparkles count={24} scale={[4, 3, 3]} size={2.2} speed={0.2} color="#e3bf72" opacity={0.7} />

      <ContactShadows position={[0, -1.45, 0]} opacity={0.45} scale={5} blur={2.6} far={2.5} />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={false}
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
        camera={{ position: [0, 0.2, 4.6], fov: 36 }}
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
