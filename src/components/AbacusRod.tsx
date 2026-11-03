import { useCallback } from 'react';
import { BeadColour, RodIndex } from '../types/abacus';
import { InteractiveBead } from './InteractiveBead';
import { useAbacusStore, BEADS_PER_ROD } from '../store/useAbacusStore';

// ─── Layout constants (exported so AbacusFrame can use ROD_USABLE_LENGTH) ────
export const BEAD_RADIUS = 0.38;
const BEAD_GAP = 0.018;
export const BEAD_SLOT = BEAD_RADIUS * 2 + BEAD_GAP;

/**
 * Rod usable length — extra 1.5 wu gives a visible gap between clusters.
 * 10 beads × 0.778 wu/slot = 7.78 wu + 1.5 wu gap = 9.28 wu total.
 */
export const ROD_USABLE_LENGTH = BEADS_PER_ROD * BEAD_SLOT + 1.5;
const HALF_ROD = ROD_USABLE_LENGTH / 2;

/** X of leftmost active bead (bead 0 fully left) */
export const LEFT_WALL_X = -HALF_ROD + BEAD_RADIUS;
/** X of rightmost inactive bead (bead 9 fully right) */
export const RIGHT_WALL_X = HALF_ROD - BEAD_RADIUS;

const ROD_RADIUS_GEO = 0.052;
const ROD_OVERHANG = 0.22;
const ROD_LENGTH = ROD_USABLE_LENGTH + ROD_OVERHANG * 2;

// ─── Snap helper ─────────────────────────────────────────────────────────────
/**
 * Given a drag-release world X on the rod, determine the new activeCount.
 *
 * Rule: if the released X is in the left half of the rod → activate that bead
 *       and all beads to its left; otherwise deactivate.
 *
 * We find which "slot" the release X corresponds to and clamp to 0–10.
 *
 * The midpoint between the two clusters is always the centre of the rod (X=0).
 * Anything left of centre snaps to the left cluster; right of centre snaps right.
 *
 * More precisely: we figure out how many beads fit to the LEFT of the release X
 * by computing distance from LEFT_WALL_X in bead-slot units.
 */
export function snapToActiveCount(releaseX: number): number {
  // Distance from the left wall
  const distFromLeft = releaseX - LEFT_WALL_X;
  // How many full slots fit? +0.5 gives round-to-nearest
  const count = Math.round(distFromLeft / BEAD_SLOT + 0.5);
  return Math.max(0, Math.min(BEADS_PER_ROD, count));
}

// ─── Bead position formula ────────────────────────────────────────────────────
function beadTargetX(beadIndex: number, activeCount: number): number {
  if (beadIndex < activeCount) {
    return LEFT_WALL_X + beadIndex * BEAD_SLOT;
  }
  const slotFromRight = (BEADS_PER_ROD - 1) - beadIndex;
  return RIGHT_WALL_X - slotFromRight * BEAD_SLOT;
}

// ─── Component ────────────────────────────────────────────────────────────────
interface AbacusRodProps {
  rodIndex: RodIndex;
  positionY: number;
  activeCount: number;
  beadColour: BeadColour;
}

export function AbacusRod({ rodIndex, positionY, activeCount, beadColour }: AbacusRodProps) {
  const clickBead = useAbacusStore((s) => s.clickBead);
  const setRodCount = useAbacusStore((s) => s.setRodCount);

  // onDragRelease: determine new activeCount from release X and commit to store
  const handleDragRelease = useCallback(
    (releaseX: number) => {
      const newCount = snapToActiveCount(releaseX);
      setRodCount(rodIndex, newCount);
    },
    [rodIndex, setRodCount],
  );

  const beadTargets = Array.from({ length: BEADS_PER_ROD }, (_, i) => ({
    beadIndex: i,
    targetX: beadTargetX(i, activeCount),
    isActive: i < activeCount,
  }));

  return (
    <group position={[0, positionY, 0]}>
      {/* ── Brushed stainless rod ── */}
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[ROD_RADIUS_GEO, ROD_RADIUS_GEO, ROD_LENGTH, 32, 1]} />
        <meshStandardMaterial
          color="#c8cdd2"
          roughness={0.22}
          metalness={0.95}
          envMapIntensity={1.8}
        />
      </mesh>

      {/* ── End caps ── */}
      {([-1, 1] as const).map((side) => (
        <mesh key={side} position={[side * (ROD_LENGTH / 2), 0, 0]} castShadow>
          <sphereGeometry args={[ROD_RADIUS_GEO * 1.15, 16, 16]} />
          <meshStandardMaterial
            color="#a8afb5"
            roughness={0.30}
            metalness={0.90}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}

      {/* ── Interactive beads ── */}
      {beadTargets.map(({ beadIndex, targetX, isActive }) => (
        <InteractiveBead
          key={beadIndex}
          targetX={targetX}
          rodY={0}
          isActive={isActive}
          beadColour={beadColour}
          radius={BEAD_RADIUS}
          minX={LEFT_WALL_X}
          maxX={RIGHT_WALL_X}
          onClick={() => clickBead(rodIndex, beadIndex)}
          onDragRelease={handleDragRelease}
        />
      ))}
    </group>
  );
}
