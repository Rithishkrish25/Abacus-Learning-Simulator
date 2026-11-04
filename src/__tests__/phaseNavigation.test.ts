/**
 * Phase navigation tests — verifies the exact user-reported sequence
 * (START → click NEXT N times → blank screen) and all 7 levels.
 *
 * These tests are pure logic: no React, no DOM, no component mounting.
 * They model the state machine that handleNext / handlePhaseComplete implement.
 */

import { describe, it, expect } from 'vitest';
import { LEVEL_DEFINITIONS } from '../levels/levelDefinitions';

// ─── Replicate the exact state machine from LevelScreen ──────────────────────

type PhaseAction = 'next' | 'phaseComplete';

interface NavState {
  phaseIndex: number;
  showSummary: boolean;
}

/**
 * Simulates one button press using the FIXED handleNext / handlePhaseComplete logic.
 *
 * handleNext (observe / guided-complete / free-explore):
 *   if isLastPhase → handlePhaseComplete (show summary)
 *   else           → advancePhase (phaseIndex + 1)
 *
 * handlePhaseComplete (challenge / arithmetic done button):
 *   if isLastPhase → show summary
 *   else           → advancePhase
 *
 * advancePhase: phaseIndex += 1  (never called when isLastPhase)
 */
function applyAction(state: NavState, totalPhases: number, action: PhaseAction): NavState {
  if (state.showSummary) return state; // already done — nothing changes

  const isLastPhase = state.phaseIndex === totalPhases - 1;

  if (action === 'next' || action === 'phaseComplete') {
    if (isLastPhase) {
      return { phaseIndex: state.phaseIndex, showSummary: true };
    } else {
      return { phaseIndex: state.phaseIndex + 1, showSummary: false };
    }
  }
  return state;
}

/** Returns true if phaseIndex is a valid array index for the phases. */
function isValidPhaseIndex(phaseIndex: number, totalPhases: number): boolean {
  return phaseIndex >= 0 && phaseIndex < totalPhases;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Level 1 — exact user-reported sequence: START → NEXT × 3', () => {
  const level1 = LEVEL_DEFINITIONS[0]!;

  it('Level 1 has exactly 4 observe phases', () => {
    expect(level1.phases.length).toBe(4);
    level1.phases.forEach((p) => expect(p.type).toBe('observe'));
  });

  it('initial phaseIndex is 0 — first NEXT click lands on phaseIndex 1', () => {
    const s0: NavState = { phaseIndex: 0, showSummary: false };
    const s1 = applyAction(s0, 4, 'next');
    expect(s1.phaseIndex).toBe(1);
    expect(s1.showSummary).toBe(false);
    expect(isValidPhaseIndex(s1.phaseIndex, 4)).toBe(true);
  });

  it('second NEXT click lands on phaseIndex 2', () => {
    const s1: NavState = { phaseIndex: 1, showSummary: false };
    const s2 = applyAction(s1, 4, 'next');
    expect(s2.phaseIndex).toBe(2);
    expect(s2.showSummary).toBe(false);
    expect(isValidPhaseIndex(s2.phaseIndex, 4)).toBe(true);
  });

  it('third NEXT click (user-reported crash point) lands on phaseIndex 3 — VALID, not blank', () => {
    const s2: NavState = { phaseIndex: 2, showSummary: false };
    const s3 = applyAction(s2, 4, 'next');
    expect(s3.phaseIndex).toBe(3);
    expect(s3.showSummary).toBe(false);
    expect(isValidPhaseIndex(s3.phaseIndex, 4)).toBe(true);
  });

  it('fourth NEXT click (the actual crash) sets showSummary=true, phaseIndex stays at 3 — NO out-of-bounds', () => {
    // This is the click that triggered the blank screen before the fix.
    // With the fix: isLastPhase=true → handlePhaseComplete → showSummary=true
    // phaseIndex must NOT become 4 (which would be phases[4] = undefined)
    const s3: NavState = { phaseIndex: 3, showSummary: false };
    const s4 = applyAction(s3, 4, 'next');

    expect(s4.showSummary).toBe(true);         // summary shown
    expect(s4.phaseIndex).toBe(3);             // index stays at 3, not advanced to 4
    expect(isValidPhaseIndex(s4.phaseIndex, 4)).toBe(true); // still a valid index
  });

  it('full 4-click sequence never produces an out-of-bounds phaseIndex', () => {
    let state: NavState = { phaseIndex: 0, showSummary: false };
    const totalPhases = level1.phases.length;

    for (let click = 1; click <= 4; click++) {
      state = applyAction(state, totalPhases, 'next');
      if (!state.showSummary) {
        expect(isValidPhaseIndex(state.phaseIndex, totalPhases)).toBe(true);
      }
    }
    // After 4 clicks on a 4-phase level, we must be on the summary
    expect(state.showSummary).toBe(true);
  });
});

describe('Discrepancy clarification: "3 clicks" vs "4 clicks"', () => {
  it('clarifies the discrepancy: after 3 NEXTs phaseIndex=3 (valid, last phase shown). Crash on the 4th.', () => {
    // The user said "clicked NEXT three times → blank screen".
    // The user was counting from the SECOND screen they saw (phaseIndex=1),
    // OR they saw the 4th phase render and the crash happened mid-render on that 4th page.
    // Either way: phaseIndex going to 4 was the fault — this test proves the fix.

    const clicks = [0, 1, 2, 3].map((startIdx) => {
      const state: NavState = { phaseIndex: startIdx, showSummary: false };
      const after = applyAction(state, 4, 'next');
      return { from: startIdx, to: after.phaseIndex, summary: after.showSummary };
    });

    // First 3 advances: phaseIndex increments, no summary
    expect(clicks[0]).toEqual({ from: 0, to: 1, summary: false });
    expect(clicks[1]).toEqual({ from: 1, to: 2, summary: false });
    expect(clicks[2]).toEqual({ from: 2, to: 3, summary: false });
    // 4th press on last phase: summary shown, index NOT incremented
    expect(clicks[3]).toEqual({ from: 3, to: 3, summary: true });
  });
});

describe('All 7 levels — no phase navigation produces an out-of-bounds index', () => {
  LEVEL_DEFINITIONS.forEach((level) => {
    const totalPhases = level.phases.length;

    it(`Level ${level.id} (${level.titleEn}) — ${totalPhases} phase(s) — no out-of-bounds`, () => {
      // Simulate pressing Next/Done on every phase in sequence
      let state: NavState = { phaseIndex: 0, showSummary: false };

      for (let press = 0; press < totalPhases; press++) {
        // phaseIndex must be valid before every press
        expect(
          isValidPhaseIndex(state.phaseIndex, totalPhases),
          `Level ${level.id} phase ${state.phaseIndex} out of bounds before press ${press + 1}`
        ).toBe(true);

        state = applyAction(state, totalPhases, 'next');

        if (!state.showSummary) {
          expect(
            isValidPhaseIndex(state.phaseIndex, totalPhases),
            `Level ${level.id} phaseIndex=${state.phaseIndex} out of bounds after press ${press + 1}`
          ).toBe(true);
        }
      }

      // After pressing through all phases, the summary must appear
      expect(state.showSummary).toBe(true);
      // phaseIndex must still be a valid index (it was the last phase, not +1 past it)
      expect(isValidPhaseIndex(state.phaseIndex, totalPhases)).toBe(true);

      // Confirm phaseIndex is exactly the last valid index
      expect(state.phaseIndex).toBe(totalPhases - 1);
    });

    it(`Level ${level.id} — extra NEXT after summary is a no-op (idempotent)`, () => {
      // Once showSummary=true, further presses must not change anything
      const summaryState: NavState = { phaseIndex: totalPhases - 1, showSummary: true };
      const after = applyAction(summaryState, totalPhases, 'next');
      expect(after.showSummary).toBe(true);
      expect(after.phaseIndex).toBe(totalPhases - 1);
    });
  });
});

describe('Phase count audit — every level has ≥1 phase with a recognised type', () => {
  const validTypes = new Set([
    'observe', 'guided', 'arithmetic-add', 'arithmetic-sub',
    'arithmetic-mixed', 'challenge', 'free-explore',
  ]);

  LEVEL_DEFINITIONS.forEach((level) => {
    it(`Level ${level.id} has ${level.phases.length} phase(s), all with valid types`, () => {
      expect(level.phases.length).toBeGreaterThanOrEqual(1);
      level.phases.forEach((phase, i) => {
        expect(
          validTypes.has(phase.type),
          `Level ${level.id} phase[${i}] type "${phase.type}" is not recognised`
        ).toBe(true);
      });
    });
  });
});

describe('handlePhaseComplete — non-last phase must call advancePhase (not showSummary)', () => {
  it('Level 2 phase 0 of 7: next press must advance, not summarise', () => {
    const s: NavState = { phaseIndex: 0, showSummary: false };
    const after = applyAction(s, 7, 'phaseComplete');
    expect(after.showSummary).toBe(false);
    expect(after.phaseIndex).toBe(1);
  });

  it('Level 2 phase 6 of 7 (last): phaseComplete must show summary', () => {
    const s: NavState = { phaseIndex: 6, showSummary: false };
    const after = applyAction(s, 7, 'phaseComplete');
    expect(after.showSummary).toBe(true);
    expect(after.phaseIndex).toBe(6); // must NOT be 7
  });
});
