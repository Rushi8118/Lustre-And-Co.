import * as THREE from "three";

/**
 * Procedural jewellery builders. Each returns the geometries and materials it created,
 * plus a list of parts to render, so the caller can dispose of everything it owns.
 */

function metalMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#d9b26a",
    metalness: 1,
    roughness: 0.2,
    clearcoat: 0.5,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.2,
  });
}

function gemMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.9,
    ior: 2.4,
    dispersion: 0.5,
    envMapIntensity: 2,
  });
}

function pearlMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: "#f5efe6",
    metalness: 0,
    roughness: 0.28,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    sheen: 0.4,
    sheenColor: new THREE.Color("#ffffff"),
    envMapIntensity: 1.1,
  });
}

/** Revolved brilliant-cut profile. Tip points down, table faces up. */
function brilliantGeometry() {
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

/** Teardrop profile for a pearl or pendant body, point at the bottom. */
function dropGeometry(scale = 1) {
  const profile = [
    new THREE.Vector2(0, 1.0 * scale),
    new THREE.Vector2(0.32 * scale, 0.6 * scale),
    new THREE.Vector2(0.36 * scale, 0.1 * scale),
    new THREE.Vector2(0.28 * scale, -0.35 * scale),
    new THREE.Vector2(0.12 * scale, -0.7 * scale),
    new THREE.Vector2(0, -0.75 * scale),
  ];
  return new THREE.LatheGeometry(profile, 24);
}

function ringBandCurve(radius, startAngle = 0, endAngle = Math.PI * 2, segments = 128) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + ((endAngle - startAngle) * i) / segments;
    points.push(new THREE.Vector3(Math.sin(angle) * radius, Math.cos(angle) * radius, 0));
  }
  return new THREE.CatmullRomCurve3(points, endAngle - startAngle >= Math.PI * 2 - 1e-6);
}

function ringParts(metal, gem) {
  const geometries = [];
  const band = new THREE.TubeGeometry(ringBandCurve(1), 256, 0.09, 48, true);
  const collar = new THREE.CylinderGeometry(0.3, 0.2, 0.14, 32, 1, true);
  const prong = new THREE.CylinderGeometry(0.028, 0.028, 0.45, 12);
  const gemGeo = brilliantGeometry();
  geometries.push(band, collar, prong, gemGeo);

  const parts = [
    { geometry: band, mat: "metal" },
    { geometry: collar, mat: "metal", position: [0, 1.12, 0] },
  ];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push({
      geometry: prong,
      mat: "metal",
      position: [Math.cos(angle) * 0.26, 1.38, Math.sin(angle) * 0.26],
    });
  }
  parts.push({ geometry: gemGeo, mat: "gem", position: [0, 1.42, 0], scale: 0.42 });
  return { geometries, parts, materials: { metal, gem, pearl: null } };
}

function pendantParts(metal, pearl) {
  const body = dropGeometry(1);
  const cap = new THREE.TorusGeometry(0.2, 0.035, 16, 48);
  const bail = new THREE.TorusGeometry(0.14, 0.03, 16, 40);
  return {
    geometries: [body, cap, bail],
    parts: [
      { geometry: body, mat: "pearl", position: [0, 0, 0], scale: 0.95 },
      { geometry: cap, mat: "metal", position: [0, 0.95, 0], rotation: [Math.PI / 2, 0, 0] },
      { geometry: bail, mat: "metal", position: [0, 1.22, 0] },
    ],
    materials: { metal, gem: null, pearl },
  };
}

function earringParts(metal, pearl) {
  const hook = new THREE.TorusGeometry(0.22, 0.03, 12, 40, Math.PI * 1.6);
  const bead = new THREE.SphereGeometry(0.22, 40, 40);
  const stem = new THREE.CylinderGeometry(0.025, 0.025, 0.3, 10);
  return {
    geometries: [hook, bead, stem],
    parts: [
      { geometry: hook, mat: "metal", position: [0, 0.75, 0], rotation: [0, 0, Math.PI * 0.2] },
      { geometry: stem, mat: "metal", position: [0, 0.38, 0] },
      { geometry: bead, mat: "pearl", position: [0, 0.05, 0] },
    ],
    materials: { metal, gem: null, pearl },
  };
}

function braceletParts(metal, pearl) {
  const curve = ringBandCurve(1.05, 0.5, Math.PI * 2 - 0.5, 96);
  const band = new THREE.TubeGeometry(curve, 200, 0.06, 32, false);
  const beadGeo = new THREE.SphereGeometry(0.11, 24, 24);
  const geometries = [band, beadGeo];
  const parts = [{ geometry: band, mat: "metal" }];
  const beadCount = 7;
  for (let i = 0; i < beadCount; i++) {
    const t = 0.5 + ((Math.PI * 2 - 1.0) * (i + 0.5)) / beadCount;
    parts.push({
      geometry: beadGeo,
      mat: "pearl",
      position: [Math.sin(t) * 1.05, Math.cos(t) * 1.05, 0],
    });
  }
  return { geometries, parts, materials: { metal, gem: null, pearl } };
}

/** Builds a piece of jewellery for `kind`: ring, pendant, earring or bracelet. */
export function createPiece(kind) {
  const metal = metalMaterial();
  const gem = gemMaterial();
  const pearl = pearlMaterial();
  let result;
  if (kind === "pendant") result = pendantParts(metal, pearl);
  else if (kind === "earring") result = earringParts(metal, pearl);
  else if (kind === "bracelet") result = braceletParts(metal, pearl);
  else result = ringParts(metal, gem);

  result.materials = { metal, gem, pearl };
  return result;
}

/** Frees every geometry and material a piece created. Call when the piece is unmounted or replaced. */
export function disposePiece(piece) {
  if (!piece) return;
  piece.geometries.forEach((geometry) => geometry.dispose());
  Object.values(piece.materials).forEach((material) => material && material.dispose());
}
