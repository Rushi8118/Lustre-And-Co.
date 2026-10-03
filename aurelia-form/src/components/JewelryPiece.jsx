import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DEFAULT_FINISH, FINISHES } from "../lib/materials";
import { createPiece, disposePiece } from "../lib/geometry";

const scratchColor = new THREE.Color();

/**
 * Renders one piece of jewellery. Finish changes are eased in frame by frame, so the metal
 * shifts colour and reflectance smoothly rather than snapping.
 *
 * spin: radians per second around the vertical axis (0 = still).
 * turn: a target yaw in radians, eased to when spin is 0 (used by the product viewer thumbnails).
 */
export default function JewelryPiece({ kind = "ring", finish = DEFAULT_FINISH, spin = 0, turn = 0, scale = 1 }) {
  const piece = useMemo(() => createPiece(kind), [kind]);
  useEffect(() => () => disposePiece(piece), [piece]);

  const group = useRef(null);
  const turnTarget = useRef(turn);

  useEffect(() => {
    turnTarget.current = turn;
  }, [turn]);

  useEffect(() => {
    if (group.current) group.current.rotation.set(0.2, 0, 0.1);
  }, [piece]);

  useFrame((_, delta) => {
    const metal = piece.materials.metal;
    const target = FINISHES[finish] || FINISHES[DEFAULT_FINISH];
    const ease = 1 - Math.exp(-delta * 5);

    metal.color.lerp(scratchColor.set(target.color), ease);
    metal.roughness += (target.roughness - metal.roughness) * ease;

    if (group.current) {
      if (spin) group.current.rotation.y += spin * delta;
      else group.current.rotation.y += (turnTarget.current - group.current.rotation.y) * ease;
    }
  });

  return (
    <group ref={group} scale={scale}>
      {piece.parts.map((part, index) => (
        <mesh
          key={index}
          geometry={part.geometry}
          material={piece.materials[part.mat]}
          position={part.position}
          rotation={part.rotation}
          scale={part.scale}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}
