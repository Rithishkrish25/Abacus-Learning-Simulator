import { useMemo } from 'react';
import { Color } from 'three';
import { ROD_USABLE_LENGTH } from './AbacusRod';

// ─── Frame layout constants ───────────────────────────────────────────────────
const ROD_COUNT = 5;
const ROD_SPACING = 1.18;
const FRAME_INNER_H = (ROD_COUNT - 1) * ROD_SPACING;
const FRAME_INNER_W = ROD_USABLE_LENGTH + 0.55;

// Cross-sections — thicker than before for physical presence
const H_THICK = 0.30;   // horizontal beam height
const H_DEPTH = 0.42;   // horizontal beam depth (front-to-back)
const V_THICK = 0.30;   // vertical post width
const V_DEPTH = 0.42;   // vertical post depth

// Outer frame extents
const OUTER_W = FRAME_INNER_W + V_THICK;
const OUTER_H = FRAME_INNER_H + H_THICK;

// ─── Wood material parameters ─────────────────────────────────────────────────
// Rich natural oak — warm mid-brown, not the yellow/honey cliché.
// We create two slightly different tones (light-face / dark-face) and
// randomly assign them to faces to fake grain variation cheaply.
const WOOD_BASE = '#9b6b3a';   // medium warm oak
const WOOD_DARK = '#7a5228';   // darker grain shadow tone
const WOOD_ROUGHNESS = 0.78;
const WOOD_METALNESS = 0.0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface WoodBeamProps {
  position: [number, number, number];
  size: [number, number, number];
  variant?: 'base' | 'dark' | 'accent';
  rotation?: [number, number, number];
}

/**
 * A rectangular wood beam with a hand-oiled oak material.
 * `variant` lets us use a slightly darker tone on frame edges for grain depth.
 */
function WoodBeam({ position, size, variant = 'base', rotation }: WoodBeamProps) {
  const colour = useMemo(() => {
    if (variant === 'dark') return new Color(WOOD_DARK);
    if (variant === 'accent') return new Color('#c49a52'); // lighter highlight
    return new Color(WOOD_BASE);
  }, [variant]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={colour}
        roughness={WOOD_ROUGHNESS}
        metalness={WOOD_METALNESS}
        envMapIntensity={0.55}
      />
    </mesh>
  );
}

/**
 * Rounded corner peg / dowel — the traditional joinery detail on school abacuses.
 */
function Dowel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.055, 0.055, H_DEPTH + 0.02, 20, 1]} />
      <meshStandardMaterial
        color="#5c3a1a"
        roughness={0.70}
        metalness={0.0}
        envMapIntensity={0.4}
      />
    </mesh>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AbacusFrame() {
  const halfH = OUTER_H / 2;
  const halfW = OUTER_W / 2;

  // Decorative front-face inlay strip (thin lighter strip on face of beams)
  const inlayOffset = H_DEPTH / 2 + 0.005; // sits just proud of beam face
  const inlayH = 0.055;

  return (
    <group>
      {/* ── Top horizontal beam (main body) ── */}
      <WoodBeam
        position={[0, halfH + H_THICK * 0.5, 0]}
        size={[OUTER_W + V_THICK * 1.1, H_THICK, H_DEPTH]}
        variant="base"
      />
      {/* Top beam front decorative inlay */}
      <WoodBeam
        position={[0, halfH + H_THICK * 0.5, inlayOffset]}
        size={[OUTER_W + V_THICK * 1.1 - 0.04, inlayH, 0.012]}
        variant="accent"
      />

      {/* ── Bottom horizontal beam ── */}
      <WoodBeam
        position={[0, -halfH - H_THICK * 0.5, 0]}
        size={[OUTER_W + V_THICK * 1.1, H_THICK, H_DEPTH]}
        variant="base"
      />
      <WoodBeam
        position={[0, -halfH - H_THICK * 0.5, inlayOffset]}
        size={[OUTER_W + V_THICK * 1.1 - 0.04, inlayH, 0.012]}
        variant="accent"
      />

      {/* ── Left vertical post ── */}
      <WoodBeam
        position={[-halfW - V_THICK * 0.5, 0, 0]}
        size={[V_THICK, FRAME_INNER_H + H_THICK * 2.0, V_DEPTH]}
        variant="dark"
      />

      {/* ── Right vertical post ── */}
      <WoodBeam
        position={[halfW + V_THICK * 0.5, 0, 0]}
        size={[V_THICK, FRAME_INNER_H + H_THICK * 2.0, V_DEPTH]}
        variant="dark"
      />

      {/* ── Corner dowels (4 corners × front face) ── */}
      {([-halfW - V_THICK * 0.5, halfW + V_THICK * 0.5] as const).map((x, xi) =>
        ([-halfH - H_THICK * 0.5, halfH + H_THICK * 0.5] as const).map((y, yi) => (
          <group key={`dowel-${xi}-${yi}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Dowel position={[0, 0, 0]} />
          </group>
        ))
      )}

      {/* ── Thin back rail (prevents the frame from looking hollow from the side) ── */}
      <WoodBeam
        position={[0, 0, -H_DEPTH / 2 + 0.015]}
        size={[OUTER_W + V_THICK * 1.1, FRAME_INNER_H + H_THICK * 2.0, 0.03]}
        variant="dark"
      />
    </group>
  );
}

/** Vertically centred rod Y positions */
export function getRodYPositions(): number[] {
  const positions: number[] = [];
  for (let i = 0; i < ROD_COUNT; i++) {
    positions.push(((ROD_COUNT - 1) / 2 - i) * ROD_SPACING);
  }
  return positions;
}
