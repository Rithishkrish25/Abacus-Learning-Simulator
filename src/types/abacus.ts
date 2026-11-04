// ─── Shared types for the Soroban Learning Simulator ────────────────────────

/**
 * Zero-based rod index.
 * 0 = Ten-Thousands, 1 = Thousands, 2 = Hundreds, 3 = Tens, 4 = Ones
 */
export type RodIndex = 0 | 1 | 2 | 3 | 4;

/**
 * Soroban rod state.
 * - heavenActive: whether the single heaven bead (worth 5) is pushed DOWN to the bar
 * - earthActive:  how many earth beads (0–4, worth 1 each) are pushed UP to the bar
 */
export interface RodState {
  rodIndex: RodIndex;
  /** true = heaven bead is touching the reckoning bar (counts 5) */
  heavenActive: boolean;
  /** 0–4: number of earth beads touching the reckoning bar (each counts 1) */
  earthActive: number;
}

/** Full soroban state across all 5 rods */
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

/**
 * Rod place-value metadata.
 */
export interface RodMeta {
  rodIndex: RodIndex;
  label: string;       // e.g. "Ones", "Tens"
  placeValue: number;  // 1, 10, 100, 1000, 10000
}

/** The five rods, from most significant to least significant */
export const ROD_META: RodMeta[] = [
  { rodIndex: 0, label: '万\nTen-Thousands', placeValue: 10000 },
  { rodIndex: 1, label: '千\nThousands',     placeValue: 1000  },
  { rodIndex: 2, label: '百\nHundreds',      placeValue: 100   },
  { rodIndex: 3, label: '十\nTens',          placeValue: 10    },
  { rodIndex: 4, label: '一\nOnes',          placeValue: 1     },
];
