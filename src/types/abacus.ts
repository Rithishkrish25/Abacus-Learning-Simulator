// ─── Shared types for the Abacus simulator ───────────────────────────────────

/** Zero-based index of a rod (0 = top, 4 = bottom) */
export type RodIndex = 0 | 1 | 2 | 3 | 4;

/** State of a single rod: how many beads are "active" (pushed to the left) */
export interface RodState {
  rodIndex: RodIndex;
  activeCount: number; // 0–10
}

/** Full abacus state across all 5 rods */
export type AbacusState = RodState[];

/** Colour palette entry for a rod's beads */
export interface BeadColour {
  /** Albedo/base colour hex */
  colour: string;
  /** Roughness 0–1 */
  roughness: number;
  /** Metalness 0–1 */
  metalness: number;
}

/** One entry in the undo history stack */
export interface HistoryEntry {
  state: AbacusState;
}
