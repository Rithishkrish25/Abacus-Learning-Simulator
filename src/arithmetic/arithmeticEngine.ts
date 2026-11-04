import { AbacusState } from '../types/abacus';
import { numberToState } from '../store/useAbacusStore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Operator = '+' | '-';

export interface ProblemStep {
  /** Index of the rod to focus on (0=Ten-Thousands … 4=Ones) */
  rodIndex: number;
  /** Human-readable instruction for this step */
  instruction: string;
  /** The technique used */
  technique: string;
  /** The expected soroban state after completing this step */
  expectedState: AbacusState;
}

export interface ArithmeticProblem {
  operandA: number;
  operandB: number;
  operator: Operator;
  answer: number;
  steps: ProblemStep[];
}

// ─── 7.1 — stepIsComplete ────────────────────────────────────────────────────

/**
 * Returns true if every rod's heavenActive and earthActive in liveState
 * exactly match those in expectedState.
 */
export function stepIsComplete(
  liveState: AbacusState,
  expectedState: AbacusState,
): boolean {
  return expectedState.every((expected, i) => {
    const live = liveState[i];
    if (!live) return false;
    return (
      live.heavenActive === expected.heavenActive &&
      live.earthActive === expected.earthActive
    );
  });
}

// ─── 7.2 — generateAdditionSteps ─────────────────────────────────────────────

/**
 * Generates steps for single-digit Grade-1 addition.
 * Constraints: a in 1–8, b in 1–(9-a), sum ≤ 9.
 */
export function generateAdditionSteps(a: number, b: number): ProblemStep[] {
  const setStep: ProblemStep = {
    rodIndex: 4,
    instruction: `Set ${a} on the Ones rod.`,
    technique: 'set-operand',
    expectedState: numberToState(a),
  };

  const sum = a + b;
  const heavenActive = a >= 5; // current heaven state after setting a

  let instruction: string;
  let technique: string;

  if (!heavenActive && a + b === 5) {
    // Complement-to-5: push heaven bead down, clear earth beads
    instruction = `Add ${b}: use the 5-complement. Push the heaven bead down and clear earth beads.`;
    technique = 'complement-5';
  } else if (sum > 9) {
    // Complement-to-10 carry (shouldn't occur for Grade-1 sum ≤ 9, but included for completeness)
    instruction = `Add ${b}: use the 10-complement. Carry 1 to Tens rod, then adjust Ones.`;
    technique = 'complement-10-carry';
  } else if (!heavenActive && a + b < 5) {
    // Direct earth add: value stays below 5, just push earth beads up
    instruction = `Add ${b}: push ${b} earth bead${b === 1 ? '' : 's'} up on the Ones rod.`;
    technique = 'direct-add';
  } else if (heavenActive) {
    // Heaven already active — just add earth beads
    instruction = `Add ${b}: push ${b} earth bead${b === 1 ? '' : 's'} up.`;
    technique = 'direct-add';
  } else {
    // General direct add (covers a < 5, a + b > 5 but ≤ 9 — crosses the 5 threshold)
    instruction = `Add ${b}: push ${b} earth bead${b === 1 ? '' : 's'} up on the Ones rod.`;
    technique = 'direct-add';
  }

  const addStep: ProblemStep = {
    rodIndex: 4,
    instruction,
    technique,
    expectedState: numberToState(sum),
  };

  return [setStep, addStep];
}

// ─── 7.2 — generateSubtractionSteps ──────────────────────────────────────────

/**
 * Generates steps for single-digit Grade-1 subtraction.
 * Constraints: a in 2–9, b in 1–(a-1), result > 0.
 */
export function generateSubtractionSteps(a: number, b: number): ProblemStep[] {
  const setStep: ProblemStep = {
    rodIndex: 4,
    instruction: `Set ${a} on the Ones rod.`,
    technique: 'set-operand',
    expectedState: numberToState(a),
  };

  let instruction: string;
  let technique: string;

  if (a < 5 && b <= a) {
    // Direct remove: just remove b earth beads
    instruction = `Subtract ${b}: remove ${b} earth bead${b === 1 ? '' : 's'} from the Ones rod.`;
    technique = 'direct-remove';
  } else if (a >= 5 && a - 5 >= b) {
    // Direct remove: remove b earth beads from the earth section (heaven stays)
    instruction = `Subtract ${b}: remove ${b} earth bead${b === 1 ? '' : 's'} from the Ones rod.`;
    technique = 'direct-remove';
  } else if (a >= 5 && a - 5 < b) {
    // Complement-to-5: remove heaven bead, push up complement earth beads
    instruction = `Subtract ${b}: use the 5-complement. Remove heaven bead and push up ${5 - b} earth beads.`;
    technique = 'complement-5';
  } else {
    // a < 5 && b > a: complement-to-10 borrow from Tens
    instruction = `Subtract ${b}: use the 10-complement. Borrow 1 from Tens, then adjust Ones.`;
    technique = 'complement-10-borrow';
  }

  const subtractStep: ProblemStep = {
    rodIndex: 4,
    instruction,
    technique,
    expectedState: numberToState(a - b),
  };

  return [setStep, subtractStep];
}

// ─── 7.3 — generateProblem ───────────────────────────────────────────────────

/**
 * Randomly generates a Grade-1 arithmetic problem (addition or subtraction)
 * with all operands in the single-digit range and result ≥ 1.
 */
export function generateProblem(): ArithmeticProblem {
  const operator: Operator = Math.random() < 0.5 ? '+' : '-';

  if (operator === '+') {
    // Pick a (1–8) and b (1–(9-a)) so sum <= 9
    const a = Math.floor(Math.random() * 8) + 1; // 1–8
    const maxB = 9 - a;
    const b = Math.floor(Math.random() * maxB) + 1; // 1–(9-a)
    return {
      operandA: a,
      operandB: b,
      operator: '+',
      answer: a + b,
      steps: generateAdditionSteps(a, b),
    };
  } else {
    // Pick a (2–9) and b (1–(a-1)) so result > 0
    const a = Math.floor(Math.random() * 8) + 2; // 2–9
    const b = Math.floor(Math.random() * (a - 1)) + 1; // 1–(a-1)
    return {
      operandA: a,
      operandB: b,
      operator: '-',
      answer: a - b,
      steps: generateSubtractionSteps(a, b),
    };
  }
}
