// ─── Abacus Basics — Lesson step definitions ─────────────────────────────────
import { AbacusState, RodIndex } from '../types/abacus';

export type ActivityType = 'count-beads' | 'set-number' | 'observe';

export interface LessonActivity {
  instruction: string;
  type: ActivityType;
  targetCount?: number;
  rodIndex?: number;
}

export interface LessonStep {
  id: number;
  title: string;
  explanation: string;
  emoji: string;
  highlightRods?: number[];
  targetState?: AbacusState;
  activity?: LessonActivity;
}

// Helper: build a full 5-rod state with specific active counts
function makeState(counts: [number, number, number, number, number]): AbacusState {
  return counts.map((activeCount, i) => ({
    rodIndex: i as RodIndex,
    activeCount,
  }));
}

const ALL_ZEROS = makeState([0, 0, 0, 0, 0]);
const ROD0_THREE = makeState([3, 0, 0, 0, 0]);
const ROD0_FIVE = makeState([5, 0, 0, 0, 0]);
const ROD0_ZERO = makeState([0, 0, 0, 0, 0]);

export const ABACUS_BASICS_STEPS: LessonStep[] = [
  {
    id: 1,
    title: 'What is an Abacus?',
    explanation:
      'An abacus is a counting tool! People have used abacuses for thousands of years to count things. You can use it to count toys, apples — anything!',
    emoji: '🧮',
    targetState: ALL_ZEROS,
    activity: {
      instruction: 'Look at the abacus in front of you. Take a moment to explore it with your eyes!',
      type: 'observe',
    },
  },
  {
    id: 2,
    title: 'The Frame',
    explanation:
      'This is the wooden frame! It holds everything together. The frame has a top bar, a bottom bar, and two side posts.',
    emoji: '🪵',
    targetState: ALL_ZEROS,
    activity: {
      instruction: 'Look at the brown wooden edges around the abacus. That is the frame!',
      type: 'observe',
    },
  },
  {
    id: 3,
    title: 'The Rods',
    explanation:
      'See the shiny silver bars? Those are rods! Our abacus has 5 rods. Each rod holds 10 beads.',
    emoji: '✨',
    targetState: ALL_ZEROS,
    highlightRods: [0, 1, 2, 3, 4],
    activity: {
      instruction: 'Count the glowing silver rods from top to bottom. How many do you see?',
      type: 'observe',
    },
  },
  {
    id: 4,
    title: 'The Beads',
    explanation:
      'The colourful balls on each rod are beads! You can slide them left to count them. Beads on the LEFT side are counted. Beads on the RIGHT side are not counted yet.',
    emoji: '🔴',
    targetState: ROD0_THREE,
    activity: {
      instruction: 'Look at the top row — some beads are already on the left side! Those beads are being counted.',
      type: 'observe',
    },
  },
  {
    id: 5,
    title: 'Counting Beads',
    explanation:
      'Let\'s count! Look at the top row. There are 3 beads on the left side. That means this rod shows the number 3! Can you count them?',
    emoji: '🔢',
    targetState: ROD0_THREE,
    highlightRods: [0],
    activity: {
      instruction: 'Count the beads on the left side of the top row. There should be 3!',
      type: 'count-beads',
      targetCount: 3,
      rodIndex: 0,
    },
  },
  {
    id: 6,
    title: 'Try It Yourself!',
    explanation:
      'Now YOU try! Move 5 beads to the left on the first row. Slide them one by one or click them. When you have 5 beads on the left, you\'re done!',
    emoji: '🌟',
    targetState: ROD0_ZERO,
    highlightRods: [0],
    activity: {
      instruction: 'Slide or click beads on the top row until you have 5 beads on the LEFT side.',
      type: 'set-number',
      targetCount: 5,
      rodIndex: 0,
    },
  },
  {
    id: 7,
    title: 'Great Job!',
    explanation:
      'You showed the number 5! An abacus shows numbers by counting beads on the left side of each rod. You are ready to explore more!',
    emoji: '🎉',
    targetState: ROD0_FIVE,
    activity: {
      instruction: 'You did it! Look at those 5 beads on the left — that\'s the number 5!',
      type: 'observe',
    },
  },
];
