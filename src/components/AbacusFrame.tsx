import { useMemo } from 'react';
import { Color } from 'three';

// ─── Soroban frame layout constants ──────────────────────────────────────────
export const ROD_COUNT = 5;
export const ROD_SPACING = 1.65;          // horizontal gap between rods
export const FRAME_INNER_W = (ROD_COUNT - 1) * ROD_SPACING; // distance between leftmost/rightmost rod centres

// Heaven section height above bar, earth section height below bar
export const HEAVEN_HEIGHT = 1.55;   // space for 1 bead + travel + margin
export const EARTH_HEIGHT  = 3.80;   // space for 4 beads + travel + margin
export const BAR_Y         = 0.0;    // reckoning bar Y position (world units)
export const ROD_TOTAL_HEIGHT = HEAVEN_HEIGHT + EARTH_HEIGHT + 0.4;
export const HALF_ROD_H = ROD_TOTAL_HEIGHT / 2;

// Frame thickness
const H_THICK = 0.28;
const H_DEPTH  = 0.38;
const V_THICK  = 0.28;
const V_DEPTH  = 0.38;

// Outer frame extents
const OUTER_W = FRAME_INNER_W + V_THICK * 2 + 0.55;
const OUTER_H = ROD_TOTAL_HEIGHT + H_THICK * 2;

// Wood colours
const WOOD_BASE = '#9b6b3a';
const WOOD_DARK = '#7a5228';
const WOOD_ROUGHNESS = 0.78;
const WOOD_METALNESS = 0.0;

// ─── Wood beam component ─────────────────────────────────────────────────────
interface WoodBeamProps {
  position: [number, number, number];
  size: [number, number, number];
  variant?: 'base' | 'dark' | 'accent';
  rotation?: [number, number, number];
}

function WoodBeam({ position, size, variant = 'base', rotation }: WoodBeamProps) {
  const colour = useMemo(() => {
    if (variant === 'dark') return new Color(WOOD_DARK);
    if (variant === 'accent') return new Color('#c49a52');
    return new Color(WOOD_BASE);
  }, [variant]);

  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
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

function Dowel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.055, 0.055, H_DEPTH + 0.02, 20, 1]} />
      <meshStandardMaterial color="#5c3a1a" roughness={0.70} metalness={0.0} envMapIntensity={0.4} />
    </mesh>
  );
}

// ─── Main frame component ─────────────────────────────────────────────────────
export function AbacusFrame() {
  const halfH = OUTER_H / 2;
  const halfW = OUTER_W / 2;
  const inlayOffset = H_DEPTH / 2 + 0.005;
  const inlayH = 0.05;

  return (
    <group>
      {/* ── Top beam ── */}
      <WoodBeam position={[0, halfH - H_THICK * 0.5, 0]} size={[OUTER_W, H_THICK, H_DEPTH]} variant="base" />
      <WoodBeam position={[0, halfH - H_THICK * 0.5, inlayOffset]} size={[OUTER_W - 0.04, inlayH, 0.012]} variant="accent" />

      {/* ── Bottom beam ── */}
      <WoodBeam position={[0, -halfH + H_THICK * 0.5, 0]} size={[OUTER_W, H_THICK, H_DEPTH]} variant="base" />
      <WoodBeam position={[0, -halfH + H_THICK * 0.5, inlayOffset]} size={[OUTER_W - 0.04, inlayH, 0.012]} variant="accent" />

      {/* ── Left post ── */}
      <WoodBeam position={[-halfW + V_THICK * 0.5, 0, 0]} size={[V_THICK, OUTER_H, V_DEPTH]} variant="dark" />

      {/* ── Right post ── */}
      <WoodBeam position={[halfW - V_THICK * 0.5, 0, 0]} size={[V_THICK, OUTER_H, V_DEPTH]} variant="dark" />

      {/* ── Reckoning bar (thin horizontal divider between heaven & earth) ── */}
      <WoodBeam
        position={[0, BAR_Y, 0.06]}
        size={[OUTER_W, 0.13, H_DEPTH * 0.5]}
        variant="dark"
      />
      {/* Bar front accent stripe */}
      <WoodBeam
        position={[0, BAR_Y, H_DEPTH * 0.25 + 0.065]}
        size={[OUTER_W - 0.04, 0.06, 0.012]}
        variant="accent"
      />

      {/* ── Corner dowels ── */}
      {([-halfW + V_THICK * 0.5, halfW - V_THICK * 0.5] as const).map((x, xi) =>
        ([-halfH + H_THICK * 0.5, halfH - H_THICK * 0.5] as const).map((y, yi) => (
          <group key={`dowel-${xi}-${yi}`} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <Dowel position={[0, 0, 0]} />
          </group>
        ))
      )}

      {/* ── Back panel ── */}
      <WoodBeam
        position={[0, 0, -H_DEPTH / 2 + 0.01]}
        size={[OUTER_W, OUTER_H, 0.03]}
        variant="dark"
      />
    </group>
  );
}

/** X positions of each rod (left to right = rod 0..4) */
export function getRodXPositions(): number[] {
  const positions: number[] = [];
  for (let i = 0; i < ROD_COUNT; i++) {
    positions.push(-(ROD_COUNT - 1) / 2 * ROD_SPACING + i * ROD_SPACING);
  }
  return positions;
}
