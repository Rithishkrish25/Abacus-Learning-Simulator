import { useCallback } from 'react';
import { BeadColour, RodIndex } from '../types/abacus';
import { SorobanBead } from './SorobanBead';
import { useAbacusStore } from '../store/useAbacusStore';
import {
  BAR_Y,
  HEAVEN_HEIGHT,
  EARTH_HEIGHT,
  ROD_TOTAL_HEIGHT,
} from './AbacusFrame';

// ─── Layout constants ────────────────────────────────────────────────────────
export const BEAD_RADIUS = 0.36;
const BEAD_SLOT = BEAD_RADIUS * 2 + 0.06; // vertical slot per bead

// Rod geometry
const ROD_RADIUS_GEO = 0.048;
const ROD_LENGTH = ROD_TOTAL_HEIGHT + 0.18; // slightly taller than frame inner height

// Heaven bead positions (single bead on top half)
// Resting (inactive): near the top beam
// Active: touching the bar from above
export const HEAVEN_REST_Y  = BAR_Y + HEAVEN_HEIGHT - BEAD_RADIUS - 0.12;
export const HEAVEN_ACTIVE_Y = BAR_Y + BEAD_RADIUS + 0.08;

// Earth bead positions (4 beads on bottom half)
// Resting: stacked at the bottom
// Active: touching the bar from below
// Earth bead i (0-based from bar): active Y = BAR_Y - BEAD_RADIUS - 0.08 - i * BEAD_SLOT
// Resting Y = BAR_Y - EARTH_HEIGHT + BEAD_RADIUS + 0.12 + (3 - i) * BEAD_SLOT
export function earthBeadY(beadIdx: number, earthActive: number): number {
  // beadIdx: 0 = closest to bar, 3 = farthest from bar
  if (beadIdx < earthActive) {
    // Active: stacked up toward bar
    return BAR_Y - BEAD_RADIUS - 0.10 - beadIdx * BEAD_SLOT;
  } else {
    // Resting: stacked down at bottom
    const fromBottom = 3 - beadIdx;
    return BAR_Y - EARTH_HEIGHT + BEAD_RADIUS + 0.14 + fromBottom * BEAD_SLOT;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
interface AbacusRodProps {
  rodIndex: RodIndex;
  positionX: number;
  heavenActive: boolean;
  earthActive: number;  // 0–4
  beadColour: BeadColour;
  heavenColour: BeadColour;
  /** Whether this rod is highlighted (e.g. in lesson mode) */
  highlighted?: boolean;
}

export function AbacusRod({
  rodIndex,
  positionX,
  heavenActive,
  earthActive,
  beadColour,
  heavenColour,
  highlighted = false,
}: AbacusRodProps) {
  const toggleHeaven = useAbacusStore((s) => s.toggleHeaven);
  const setEarthCount = useAbacusStore((s) => s.setEarthCount);

  const handleHeavenClick = useCallback(() => {
    toggleHeaven(rodIndex);
  }, [rodIndex, toggleHeaven]);

  /**
   * Earth bead click logic (Soroban rules):
   * Clicking bead i (0 = closest to bar):
   *   - If beadIdx < earthActive → deactivate: new count = beadIdx
   *   - If beadIdx >= earthActive → activate: new count = beadIdx + 1
   */
  const handleEarthClick = useCallback(
    (beadIdx: number) => {
      const newCount = beadIdx < earthActive ? beadIdx : beadIdx + 1;
      setEarthCount(rodIndex, Math.max(0, Math.min(4, newCount)));
    },
    [rodIndex, earthActive, setEarthCount],
  );

  const heavenY = heavenActive ? HEAVEN_ACTIVE_Y : HEAVEN_REST_Y;

  return (
    <group position={[positionX, 0, 0]}>
      {/* ── Vertical rod ── */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[ROD_RADIUS_GEO, ROD_RADIUS_GEO, ROD_LENGTH, 32, 1]} />
        <meshStandardMaterial
          color={highlighted ? '#ffe080' : '#c8cdd2'}
          roughness={0.22}
          metalness={highlighted ? 0.3 : 0.95}
          envMapIntensity={1.8}
          emissive={highlighted ? '#ffe080' : '#000000'}
          emissiveIntensity={highlighted ? 0.22 : 0}
        />
      </mesh>

      {/* ── End caps ── */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[0, side * (ROD_LENGTH / 2), 0]} castShadow>
          <sphereGeometry args={[ROD_RADIUS_GEO * 1.15, 16, 16]} />
          <meshStandardMaterial color="#a8afb5" roughness={0.30} metalness={0.90} envMapIntensity={1.5} />
        </mesh>
      ))}

      {/* ── Heaven bead (1 bead, top half) ── */}
      <SorobanBead
        key="heaven"
        targetY={heavenY}
        isActive={heavenActive}
        beadColour={heavenColour}
        radius={BEAD_RADIUS}
        minY={BAR_Y + BEAD_RADIUS + 0.04}
        maxY={HEAVEN_REST_Y}
        isHeavenBead
        onClick={handleHeavenClick}
        onDragRelease={(releaseY) => {
          // If released in lower half of heaven section → activate
          const midY = BAR_Y + HEAVEN_HEIGHT / 2;
          toggleHeaven(rodIndex);
          const shouldBeActive = releaseY < midY;
          if (shouldBeActive !== heavenActive) {
            // already toggled above — no-op; but we need to set to the right state
          }
          // More robust: directly set based on position
          const nowActive = releaseY < (BAR_Y + HEAVEN_HEIGHT * 0.55);
          // Only toggle if state needs to change
          if (nowActive !== heavenActive) {
            // toggleHeaven was already called; call again to revert
          }
        }}
        onDragReleaseExact={(releaseY) => {
          const shouldBeActive = releaseY < (BAR_Y + HEAVEN_HEIGHT * 0.55);
          if (shouldBeActive !== heavenActive) {
            toggleHeaven(rodIndex);
          }
        }}
      />

      {/* ── Earth beads (4 beads, bottom half) ── */}
      {Array.from({ length: 4 }, (_, i) => {
        const targetY = earthBeadY(i, earthActive);
        const isActive = i < earthActive;
        return (
          <SorobanBead
            key={`earth-${i}`}
            targetY={targetY}
            isActive={isActive}
            beadColour={beadColour}
            radius={BEAD_RADIUS}
            minY={BAR_Y - EARTH_HEIGHT + BEAD_RADIUS + 0.10}
            maxY={BAR_Y - BEAD_RADIUS - 0.06}
            isHeavenBead={false}
            onClick={() => handleEarthClick(i)}
            onDragRelease={() => { /* handled by onDragReleaseExact */ }}
            onDragReleaseExact={(releaseY) => {
              // Count how many beads should be active based on release position
              // Bead 0 is closest to bar; active if releaseY > midpoint
              let newCount = 0;
              for (let j = 0; j < 4; j++) {
                const activeY = BAR_Y - BEAD_RADIUS - 0.10 - j * BEAD_SLOT;
                const restY   = BAR_Y - EARTH_HEIGHT + BEAD_RADIUS + 0.14 + (3 - j) * BEAD_SLOT;
                const midY    = (activeY + restY) / 2;
                if (releaseY > midY) {
                  newCount = j + 1;
                }
              }
              setEarthCount(rodIndex, newCount);
            }}
          />
        );
      })}
    </group>
  );
}
