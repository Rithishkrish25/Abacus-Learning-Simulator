import { useRef, useMemo } from 'react';
import { Mesh, Color } from 'three';
import { BeadColour } from '../types/abacus';

interface BeadProps {
  position: [number, number, number];
  beadColour: BeadColour;
  /** Equatorial radius of the bead */
  radius?: number;
}

/**
 * Premium abacus bead.
 *
 * Geometry: a sphere flattened along Z (depth) to produce the classic
 * lenticular / bicone profile.  The scale is applied directly on the mesh
 * so position always stays in the unscaled coordinate system.
 *
 * Material: MeshPhysicalMaterial with clearcoat gives a polished lacquer
 * finish that catches light realistically without looking like wet plastic.
 *
 * - clearcoat       → thin transparent topcoat (lacquered wood / hard candy)
 * - roughness 0.32  → soft sheen, not mirror-bright
 * - reflectivity    → controls dielectric F0 (real lacquer ~0.05)
 * - sheen           → subtle retroreflective fabric-like edge glow
 */
export function Bead({ position, beadColour, radius = 0.38 }: BeadProps) {
  const meshRef = useRef<Mesh>(null);

  // Slight random colour variation per bead to break the "all same" look.
  // Variance is tiny (±4 lightness), unnoticeable individually but
  // makes a row look hand-crafted rather than injection-moulded.
  const baseColour = useMemo(() => {
    const c = new Color(beadColour.colour);
    const hsl = { h: 0, s: 0, l: 0 };
    c.getHSL(hsl);
    // nudge lightness ±2 %
    const delta = (Math.random() - 0.5) * 0.04;
    c.setHSL(hsl.h, hsl.s, Math.max(0.05, Math.min(0.95, hsl.l + delta)));
    return c;
  }, [beadColour.colour]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      // Lenticular profile: full equatorial radius × 0.78 depth (front-to-back)
      scale={[1, 1, 0.78]}
      castShadow
      receiveShadow
    >
      {/*
        80×40 segments — smooth silhouette, no visible facets even up close.
        SphereGeometry is the correct primitive for a bead; a CapsuleGeometry
        would give barrel distortion at the equator.
      */}
      <sphereGeometry args={[radius, 80, 40]} />
      <meshPhysicalMaterial
        color={baseColour}
        roughness={beadColour.roughness}
        metalness={beadColour.metalness}
        clearcoat={0.65}
        clearcoatRoughness={0.18}
        reflectivity={0.5}
        envMapIntensity={1.0}
      />
    </mesh>
  );
}
