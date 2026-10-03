import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import * as THREE from "three";
import Viewer, { ViewerFallback } from "./Viewer";
import JewelryPiece from "./JewelryPiece";
import { hasWebGL } from "../lib/helpers";
import { usePointerRef, useScrollRef } from "../hooks/useInteraction";

/** Soft gold dust that drifts and leans slightly toward the pointer. */
function Dust({ count = 110, pointer, still }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3 - 0.5;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: "#c8a45d",
        size: 0.035,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    []
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  const points = useRef(null);
  useFrame((_, delta) => {
    if (!points.current) return;
    if (!still) points.current.rotation.y += delta * 0.02;
    const p = pointer.current;
    points.current.position.x += (p.x * 0.3 - points.current.position.x) * 0.04;
    points.current.position.y += (-p.y * 0.2 - points.current.position.y) * 0.04;
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

function HeroScene({ pointer, scrollProgress, still }) {
  const wrap = useRef(null);
  const sweep = useRef(null);

  useFrame((state, delta) => {
    // Scroll: the ring eases down and shrinks slightly as the hero leaves the screen.
    if (wrap.current && !still) {
      const p = scrollProgress.current;
      const ease = 1 - Math.exp(-delta * 4);
      wrap.current.position.y += (-p * 0.35 - wrap.current.position.y) * ease;
      const targetScale = 1 - p * 0.12;
      wrap.current.scale.setScalar(wrap.current.scale.x + (targetScale - wrap.current.scale.x) * ease);
    }

    // Light sweep: a warm spot crosses the piece for about 1.8 seconds every 6 seconds.
    if (sweep.current) {
      if (still) {
        sweep.current.intensity = 0;
      } else {
        const cycle = state.clock.elapsedTime % 6;
        const active = cycle < 1.8;
        const t = cycle / 1.8;
        sweep.current.position.x = -5 + t * 10;
        sweep.current.intensity = active ? 16 * Math.sin(Math.PI * t) : 0;
      }
    }
  });

  return (
    <>
      <spotLight ref={sweep} position={[-5, 2.5, 3]} angle={0.35} penumbra={1} intensity={0} color="#fff4e0" />
      <group ref={wrap}>
        <JewelryPiece kind="ring" finish="warm" spin={still ? 0 : 0.25} />
      </group>
      <Dust pointer={pointer} still={still} />
    </>
  );
}

/** The hero jewellery: draggable and slowly orbiting, with a graceful fallback if WebGL is missing. */
export default function HeroRing({ onViewInSpace }) {
  const reduceMotion = useReducedMotion();
  const pointer = usePointerRef();
  const scrollProgress = useScrollRef();
  const webgl = useMemo(() => hasWebGL(), []);

  if (!webgl) return <ViewerFallback label="The 3D ring needs WebGL, which this browser does not support." />;

  return (
    <div className="hero-ring">
      <Viewer interactive autoRotate={!reduceMotion} camera={[0, 0.2, 5.8]} label="Gold ring with a diamond. Drag to rotate.">
        <HeroScene pointer={pointer} scrollProgress={scrollProgress} still={Boolean(reduceMotion)} />
      </Viewer>
      <p className="hero-ring-hint">Drag to discover</p>
      <button type="button" className="btn btn-outline hero-ring-ar" onClick={onViewInSpace}>
        View in your space
      </button>
    </div>
  );
}
