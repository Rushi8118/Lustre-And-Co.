import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Local studio reflections. Generated in code, so no HDR file is downloaded. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = texture;
    return () => {
      scene.environment = null;
      texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/**
 * Shared canvas for every 3D view. Lighting, reflections and a contact shadow are set here
 * so each view looks consistent. Pass `interactive` to allow drag (and zoom with `zoom`).
 */
export default function Viewer({
  children,
  interactive = false,
  zoom = false,
  autoRotate = false,
  shadows = true,
  camera = [0, 0.3, 4.6],
  label = "Interactive 3D jewellery view",
  className = "",
}) {
  return (
    <div className={`viewer ${className}`} role="img" aria-label={label}>
      <Canvas
        dpr={[1, 2]}
        shadows={shadows}
        camera={{ position: camera, fov: 36 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <StudioEnvironment />
          <ambientLight intensity={0.3} />
          <directionalLight position={[3, 5, 4]} intensity={2} color="#fff8ee" castShadow={shadows} shadow-mapSize={[1024, 1024]} />
          <pointLight position={[-3, 1, 2]} intensity={2.5} color="#f2c6bb" />
          {children}
          {shadows && <ContactShadows position={[0, -1.45, 0]} opacity={0.42} scale={5} blur={2.6} far={2.5} />}
          {interactive && (
            <OrbitControls
              enablePan={false}
              enableZoom={zoom}
              minDistance={3}
              maxDistance={7}
              autoRotate={autoRotate}
              autoRotateSpeed={0.5}
              minPolarAngle={Math.PI / 2.6}
              maxPolarAngle={Math.PI / 1.9}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}

/** Static stand-in shown when the browser cannot run WebGL. It keeps the layout intact. */
export function ViewerFallback({ label = "3D preview is not available in this browser." }) {
  return (
    <div className="viewer viewer-fallback" role="img" aria-label={label}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <ellipse cx="100" cy="112" rx="62" ry="22" fill="none" stroke="#c8a45d" strokeWidth="5" />
        <rect x="92" y="62" width="16" height="22" fill="#c8a45d" opacity="0.85" />
        <path d="M100 42 L118 60 L100 80 L82 60 Z" fill="#fff" stroke="#c8a45d" strokeWidth="2" />
      </svg>
      <p>{label}</p>
    </div>
  );
}

/** Loading state shown while the 3D module and canvas start up. */
export function ViewerLoading() {
  return <div className="viewer viewer-loading" aria-live="polite">Loading the jewellery…</div>;
}
