import { create } from 'zustand';
import { AbacusState, RodIndex, HistoryEntry, RodState } from '../types/abacus';

// ─── Constants ────────────────────────────────────────────────────────────────
export const ROD_COUNT = 5;
const MAX_HISTORY = 50;

// ─── Initial / reset state ────────────────────────────────────────────────────
export const INITIAL_ROD_STATE = (i: number): RodState => ({
  rodIndex: i as RodIndex,
  heavenActive: false,
  earthActive: 0,
});

export const INITIAL_STATE: AbacusState = Array.from(
  { length: ROD_COUNT },
  (_, i) => INITIAL_ROD_STATE(i),
);

// ─── Soroban calculation helpers ──────────────────────────────────────────────

/** Digit value of a single rod: heaven bead (5) + earth beads (1 each) */
export function rodDigit(rod: RodState): number {
  return (rod.heavenActive ? 5 : 0) + rod.earthActive;
}

/** Total soroban value across all rods (place-value sum) */
export function sorobanValue(rods: AbacusState): number {
  const placeValues = [10000, 1000, 100, 10, 1];
  return rods.reduce((sum, rod, i) => {
    return sum + rodDigit(rod) * (placeValues[i] ?? 1);
  }, 0);
}

/**
 * Decompose a number (0–99999) into per-rod digit states.
 * Returns an AbacusState representing that number.
 */
export function numberToState(n: number): AbacusState {
  const clamped = Math.max(0, Math.min(99999, Math.round(n)));
  const placeValues = [10000, 1000, 100, 10, 1];
  let remaining = clamped;
  return placeValues.map((pv, i) => {
    const digit = Math.floor(remaining / pv);
    remaining -= digit * pv;
    return {
      rodIndex: i as RodIndex,
      heavenActive: digit >= 5,
      earthActive: digit % 5,
    };
  });
}

// ─── Store shape ──────────────────────────────────────────────────────────────
interface AbacusStore {
  rods: AbacusState;
  history: HistoryEntry[];
  redoStack: HistoryEntry[];
  /** Challenge target number (null = no active challenge) */
  challenge: number | null;
  showHint: boolean;

  // ── Soroban-specific actions ──
  /** Toggle the heaven bead on a rod */
  toggleHeaven: (rodIndex: RodIndex) => void;
  /** Set earth bead count (0–4) on a rod */
  setEarthCount: (rodIndex: RodIndex, count: number) => void;
  /** Set a rod directly to a digit 0–9 */
  setRodDigit: (rodIndex: RodIndex, digit: number) => void;
  /** Set the entire soroban to represent a given number */
  setNumber: (n: number) => void;

  undo: () => void;
  redo: () => void;
  reset: () => void;
  startChallenge: () => void;
  clearChallenge: () => void;
  toggleHint: () => void;

  // ── Legacy shim for components that call setRodCount ──
  setRodCount: (rodIndex: RodIndex, count: number) => void;
  clickBead: (rodIndex: RodIndex, beadIndex: number) => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function deepCloneState(state: AbacusState): AbacusState {
  return state.map((r) => ({ ...r }));
}

function pushHistory(
  history: HistoryEntry[],
  rods: AbacusState,
): HistoryEntry[] {
  return [...history, { state: deepCloneState(rods) }].slice(-MAX_HISTORY);
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAbacusStore = create<AbacusStore>((set, get) => ({
  rods: deepCloneState(INITIAL_STATE),
  history: [],
  redoStack: [],
  challenge: null,
  showHint: false,

  toggleHeaven: (rodIndex) => {
    const { rods, history } = get();
    const newHistory = pushHistory(history, rods);
    const newRods = rods.map((r) =>
      r.rodIndex === rodIndex
        ? { ...r, heavenActive: !r.heavenActive }
        : { ...r },
    );
    set({ rods: newRods, history: newHistory, redoStack: [] });
  },

  setEarthCount: (rodIndex, count) => {
    const { rods, history } = get();
    const clamped = Math.max(0, Math.min(4, count));
    const rod = rods.find((r) => r.rodIndex === rodIndex);
    if (!rod || rod.earthActive === clamped) return;
    const newHistory = pushHistory(history, rods);
    const newRods = rods.map((r) =>
      r.rodIndex === rodIndex ? { ...r, earthActive: clamped } : { ...r },
    );
    set({ rods: newRods, history: newHistory, redoStack: [] });
  },

  setRodDigit: (rodIndex, digit) => {
    const { rods, history } = get();
    const d = Math.max(0, Math.min(9, digit));
    const newHistory = pushHistory(history, rods);
    const newRods = rods.map((r) =>
      r.rodIndex === rodIndex
        ? { ...r, heavenActive: d >= 5, earthActive: d % 5 }
        : { ...r },
    );
    set({ rods: newRods, history: newHistory, redoStack: [] });
  },

  setNumber: (n) => {
    const { history, rods } = get();
    const newRods = numberToState(n);
    const newHistory = pushHistory(history, rods);
    set({ rods: newRods, history: newHistory, redoStack: [] });
  },

  // ── Legacy shim: treat activeCount as a digit (0–9) ──
  setRodCount: (rodIndex, count) => {
    get().setRodDigit(rodIndex, count);
  },

  clickBead: (rodIndex, beadIndex) => {
    // beadIndex 0 = heaven bead, 1–4 = earth bead 1–4
    const { rods } = get();
    const rod = rods.find((r) => r.rodIndex === rodIndex);
    if (!rod) return;
    if (beadIndex === 0) {
      get().toggleHeaven(rodIndex);
    } else {
      const earthIdx = beadIndex; // 1-based: 1–4
      const newCount = rod.earthActive === earthIdx ? earthIdx - 1 : earthIdx;
      get().setEarthCount(rodIndex, newCount);
    }
  },

  undo: () => {
    const { history, rods, redoStack } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    set({
      rods: deepCloneState(prev.state),
      history: history.slice(0, -1),
      redoStack: [...redoStack, { state: deepCloneState(rods) }].slice(-MAX_HISTORY),
    });
  },

  redo: () => {
    const { redoStack, rods, history } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    set({
      rods: deepCloneState(next.state),
      redoStack: redoStack.slice(0, -1),
      history: [...history, { state: deepCloneState(rods) }].slice(-MAX_HISTORY),
    });
  },

  reset: () => {
    const { rods } = get();
    const alreadyZero = rods.every((r) => !r.heavenActive && r.earthActive === 0);
    if (alreadyZero) return;
    set({
      rods: deepCloneState(INITIAL_STATE),
      history: [],
      redoStack: [],
      challenge: null,
      showHint: false,
    });
  },

  startChallenge: () => {
    const target = Math.floor(Math.random() * 99) + 1;
    set({ challenge: target, showHint: false });
  },

  clearChallenge: () => set({ challenge: null, showHint: false }),

  toggleHint: () => set((s) => ({ showHint: !s.showHint })),
}));

// ─── Backward-compat export ───────────────────────────────────────────────────
/** @deprecated Use sorobanValue() instead */
export function totalActive(rods: AbacusState): number {
  return sorobanValue(rods);
}
