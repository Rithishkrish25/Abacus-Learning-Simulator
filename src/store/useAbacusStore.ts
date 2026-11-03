import { create } from 'zustand';
import { AbacusState, RodIndex, HistoryEntry } from '../types/abacus';

// ─── Constants ────────────────────────────────────────────────────────────────
export const BEADS_PER_ROD = 10;
export const ROD_COUNT = 5;
const MAX_HISTORY = 50;

// ─── Initial / reset state ────────────────────────────────────────────────────
export const INITIAL_STATE: AbacusState = Array.from({ length: ROD_COUNT }, (_, i) => ({
  rodIndex: i as RodIndex,
  activeCount: 0,
}));

// ─── Store shape ──────────────────────────────────────────────────────────────
interface AbacusStore {
  /** Live abacus state — 5 rods, each with an activeCount */
  rods: AbacusState;
  /** Undo history — most recent entry at the end */
  history: HistoryEntry[];
  /** Redo stack — states available to redo, most recent at the end */
  redoStack: HistoryEntry[];
  /** Challenge target number (null = no active challenge) */
  challenge: number | null;
  /** Whether a hint is currently shown */
  showHint: boolean;

  // ── Actions ──
  clickBead: (rodIndex: RodIndex, beadIndex: number) => void;
  setRodCount: (rodIndex: RodIndex, count: number) => void;
  undo: () => void;
  /** Redo the last undone move */
  redo: () => void;
  reset: () => void;
  startChallenge: () => void;
  clearChallenge: () => void;
  toggleHint: () => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function deepCloneState(state: AbacusState): AbacusState {
  return state.map((r) => ({ ...r }));
}

/** Total beads active across all rods */
export function totalActive(rods: AbacusState): number {
  return rods.reduce((sum, r) => sum + r.activeCount, 0);
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useAbacusStore = create<AbacusStore>((set, get) => ({
  rods: deepCloneState(INITIAL_STATE),
  history: [],
  redoStack: [],
  challenge: null,
  showHint: false,

  clickBead: (rodIndex, beadIndex) => {
    const { rods, history } = get();
    const rod = rods.find((r) => r.rodIndex === rodIndex);
    if (!rod) return;

    const currentActive = rod.activeCount;
    let newActive: number;

    if (beadIndex < currentActive) {
      newActive = beadIndex;
    } else {
      newActive = beadIndex + 1;
    }

    newActive = Math.max(0, Math.min(BEADS_PER_ROD, newActive));
    if (newActive === currentActive) return;

    const newHistory = [
      ...history,
      { state: deepCloneState(rods) },
    ].slice(-MAX_HISTORY);

    const newRods = rods.map((r) =>
      r.rodIndex === rodIndex ? { ...r, activeCount: newActive } : { ...r }
    );

    // Any new action clears the redo stack
    set({ rods: newRods, history: newHistory, redoStack: [] });
  },

  setRodCount: (rodIndex, count) => {
    const { rods, history } = get();
    const clamped = Math.max(0, Math.min(BEADS_PER_ROD, count));
    const rod = rods.find((r) => r.rodIndex === rodIndex);
    if (!rod || rod.activeCount === clamped) return;

    const newHistory = [...history, { state: deepCloneState(rods) }].slice(-MAX_HISTORY);
    const newRods = rods.map((r) =>
      r.rodIndex === rodIndex ? { ...r, activeCount: clamped } : { ...r }
    );
    set({ rods: newRods, history: newHistory, redoStack: [] });
  },

  undo: () => {
    const { history, rods, redoStack } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    set({
      rods: deepCloneState(prev.state),
      history: history.slice(0, -1),
      // Push current state onto redo stack
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
    const alreadyZero = rods.every((r) => r.activeCount === 0);
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
    const target = Math.floor(Math.random() * 50) + 1;
    set({ challenge: target, showHint: false });
  },

  clearChallenge: () => set({ challenge: null, showHint: false }),

  toggleHint: () => set((s) => ({ showHint: !s.showHint })),
}));
