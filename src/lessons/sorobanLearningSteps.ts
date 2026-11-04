// ─── Soroban Learning — Lesson step definitions ───────────────────────────────
import { AbacusState, RodIndex } from '../types/abacus';
import { numberToState } from '../store/useAbacusStore';

export type ActivityType =
  | 'observe'
  | 'set-digit'       // set a specific digit on a specific rod
  | 'set-number'      // set the full soroban to a number
  | 'toggle-heaven'   // activate/deactivate heaven bead on a rod
  | 'count-earth';    // activate a specific number of earth beads

export interface LessonActivity {
  instruction: string;
  tamilInstruction?: string;
  type: ActivityType;
  targetNumber?: number;     // for set-number
  targetDigit?: number;      // for set-digit / toggle-heaven / count-earth
  rodIndex?: number;         // which rod (0=Ten-Thousands, 4=Ones)
}

export interface LessonStep {
  id: number;
  title: string;
  explanation: string;
  tamilExplanation?: string;
  emoji: string;
  highlightRods?: number[];
  targetState?: AbacusState;
  activity?: LessonActivity;
}

// ─── State builders ───────────────────────────────────────────────────────────
function makeState(digits: [number, number, number, number, number]): AbacusState {
  return digits.map((d, i) => ({
    rodIndex: i as RodIndex,
    heavenActive: d >= 5,
    earthActive: d % 5,
  }));
}

const ALL_ZERO = makeState([0, 0, 0, 0, 0]);

// ─── Soroban Basics lesson ────────────────────────────────────────────────────
export const SOROBAN_BASICS_STEPS: LessonStep[] = [
  {
    id: 1,
    title: 'Welcome to the Soroban!',
    explanation:
      'The Soroban is a Japanese abacus used by millions of students. It lets you add, subtract and even multiply using only your fingers and these colourful beads!',
    tamilExplanation: 'சோரோபன் என்பது ஜப்பானிய கணக்கு சட்டகம். இதை கொண்டு கூட்டல், கழித்தல் செய்யலாம்!',
    emoji: '🧮',
    targetState: ALL_ZERO,
    activity: {
      instruction: 'Take a moment to look at the Soroban. All beads are resting — the abacus shows zero.',
      tamilInstruction: 'சோரோபனை கவனமாகப் பாருங்கள். அனைத்து மணிகளும் ஓய்வில் உள்ளன — பூஜ்ஜியம் காட்டுகிறது.',
      type: 'observe',
    },
  },
  {
    id: 2,
    title: 'The Reckoning Bar',
    explanation:
      'See the horizontal bar dividing the abacus? That is the RECKONING BAR. Only beads touching the bar are counted. Beads away from the bar are resting.',
    tamilExplanation: 'நடுவில் உள்ள கிடைமட்ட பட்டை "கணக்கு பட்டை". பட்டையை தொடும் மணிகள் மட்டுமே கணக்கிடப்படும்.',
    emoji: '➖',
    targetState: ALL_ZERO,
    activity: {
      instruction: 'Look at the dark horizontal bar in the middle of the frame. That is where counting happens!',
      tamilInstruction: 'சட்டகத்தின் நடுவில் உள்ள இருண்ட கிடைமட்ட பட்டையை பாருங்கள்!',
      type: 'observe',
    },
  },
  {
    id: 3,
    title: 'Heaven Beads (天珠)',
    explanation:
      'The ONE bead ABOVE the reckoning bar is the HEAVEN bead (天珠 — Tama). It is worth FIVE. When you push it DOWN to the bar, you count 5.',
    tamilExplanation: 'பட்டைக்கு மேலே உள்ள ஒரு மணி "சொர்க்க மணி". இது 5 மதிப்பை கொண்டது. கீழே தள்ளினால் 5 கணக்கிடப்படும்.',
    emoji: '🔅',
    targetState: ALL_ZERO,
    highlightRods: [4],
    activity: {
      instruction: 'Look at the top section of the rightmost rod (Ones). There is one ivory bead — that is the Heaven bead!',
      tamilInstruction: 'வலது புறம் உள்ள கோலில் (Ones) மேல் பகுதியில் உள்ள தந்தை வெண்மை மணியை பாருங்கள்!',
      type: 'observe',
    },
  },
  {
    id: 4,
    title: 'Earth Beads (地珠)',
    explanation:
      'The FOUR beads BELOW the reckoning bar are EARTH beads (地珠 — Ji-Tama). Each is worth ONE. Push them UP to the bar to count them.',
    tamilExplanation: 'பட்டைக்கு கீழே உள்ள நான்கு மணிகள் "பூமி மணிகள்". ஒவ்வொன்றும் 1 மதிப்பு கொண்டது. மேலே தள்ளினால் கணக்கிடப்படும்.',
    emoji: '🌏',
    targetState: ALL_ZERO,
    highlightRods: [4],
    activity: {
      instruction: 'Look at the bottom section of the rightmost rod (Ones). There are four beads — those are the Earth beads!',
      tamilInstruction: 'வலது கோலின் கீழ் பகுதியில் நான்கு மணிகள் உள்ளன — அவை பூமி மணிகள்!',
      type: 'observe',
    },
  },
  {
    id: 5,
    title: 'Show the number 3',
    explanation:
      'To show 3: push THREE earth beads UP to the bar on the Ones rod. Heaven bead stays at the top. Three earth beads × 1 = 3.',
    tamilExplanation: '3 காட்ட: Ones கோலில் மூன்று பூமி மணிகளை மேலே தள்ளுங்கள். சொர்க்க மணி மேலே இருக்கட்டும். 3 × 1 = 3.',
    emoji: '3️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Click or drag 3 earth beads UP on the rightmost rod (Ones) to show the number 3.',
      tamilInstruction: 'வலது கோலில் 3 பூமி மணிகளை மேல் நோக்கி இழுங்கள் அல்லது கிளிக் செய்யுங்கள்.',
      type: 'set-digit',
      targetDigit: 3,
      rodIndex: 4,
    },
  },
  {
    id: 6,
    title: 'Show the number 5',
    explanation:
      'To show 5: push the Heaven bead DOWN to the bar. Push ALL earth beads back down (away from bar). Heaven = 5, Earth = 0. Total: 5!',
    tamilExplanation: '5 காட்ட: சொர்க்க மணியை கீழே தள்ளுங்கள். அனைத்து பூமி மணிகளையும் கீழே நகர்த்துங்கள். சொர்க்கம் = 5!',
    emoji: '5️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Push the ivory Heaven bead DOWN to the reckoning bar on the Ones rod. Make sure all earth beads are resting at the bottom.',
      tamilInstruction: 'தந்தை நிற சொர்க்க மணியை Ones கோலில் கணக்கு பட்டைக்கு கீழே தள்ளுங்கள்.',
      type: 'set-digit',
      targetDigit: 5,
      rodIndex: 4,
    },
  },
  {
    id: 7,
    title: 'Show the number 8',
    explanation:
      'To show 8: push Heaven bead DOWN (=5) AND push THREE earth beads UP (=3). 5 + 3 = 8. Both types of beads working together!',
    tamilExplanation: '8 காட்ட: சொர்க்க மணி கீழே (=5) மற்றும் மூன்று பூமி மணிகள் மேலே (=3). 5 + 3 = 8.',
    emoji: '8️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Set the Ones rod to show 8: Heaven bead DOWN + 3 earth beads UP.',
      tamilInstruction: 'Ones கோலில் 8 அமைக்கவும்: சொர்க்க மணி கீழே + 3 பூமி மணிகள் மேலே.',
      type: 'set-digit',
      targetDigit: 8,
      rodIndex: 4,
    },
  },
  {
    id: 8,
    title: 'Place Values',
    explanation:
      'Each rod represents a different place value! From right to left: Ones (一), Tens (十), Hundreds (百), Thousands (千), Ten-Thousands (万). Together they can show numbers up to 99,999!',
    tamilExplanation: 'ஒவ்வொரு கோலும் வெவ்வேறு இட மதிப்பை குறிக்கும்! வலது இருந்து இடது: ஒன்று, பத்து, நூறு, ஆயிரம், பத்தாயிரம்.',
    emoji: '📊',
    targetState: numberToState(12345),
    highlightRods: [0, 1, 2, 3, 4],
    activity: {
      instruction: 'Look at the abacus — it now shows 12,345! Each rod shows one digit of the number.',
      tamilInstruction: 'சோரோபன் இப்போது 12,345 காட்டுகிறது! ஒவ்வொரு கோலும் ஒரு இலக்கம் காட்டுகிறது.',
      type: 'observe',
    },
  },
  {
    id: 9,
    title: 'Make the number 42',
    explanation:
      'Let\'s build 42! Tens rod (second from right): 4 earth beads UP. Ones rod (rightmost): 2 earth beads UP. Together: 40 + 2 = 42.',
    tamilExplanation: '42 உருவாக்கலாம்! பத்துகள் கோல்: 4 பூமி மணிகள் மேலே (=40). Ones கோல்: 2 பூமி மணிகள் மேலே (=2). 40 + 2 = 42.',
    emoji: '🔢',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [3, 4],
    activity: {
      instruction: 'Set the Soroban to show 42. Use the Tens rod (十) and Ones rod (一).',
      tamilInstruction: 'சோரோபனில் 42 அமைக்கவும். Tens (十) மற்றும் Ones (一) கோல்களை பயன்படுத்துங்கள்.',
      type: 'set-number',
      targetNumber: 42,
    },
  },
  {
    id: 10,
    title: 'Excellent! You know the Soroban!',
    explanation:
      'You have learned the key Soroban concepts: Heaven beads (worth 5), Earth beads (worth 1 each), the Reckoning bar, and Place values. Now try Free Practice or Challenge mode!',
    emoji: '🎉',
    targetState: numberToState(42),
    activity: {
      instruction: 'Well done! The abacus still shows 42 — your first number on the Soroban!',
      type: 'observe',
    },
  },

  // ── Subtask 4.1 — Single-digit practice steps (ids 11–17) ─────────────────
  {
    id: 11,
    title: 'Clear the Ones rod — show 0',
    explanation:
      'To show 0: all beads rest away from the bar. Heaven bead stays up, all four earth beads stay down. Nothing touches the bar = zero.',
    emoji: '0️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Clear the Ones rod so that it shows 0 — heaven bead up, all earth beads down.',
      type: 'set-digit',
      targetDigit: 0,
      rodIndex: 4,
    },
  },
  {
    id: 12,
    title: 'Show the number 1',
    explanation:
      'To show 1: push ONE earth bead UP to the bar. Heaven bead stays at the top. One earth bead × 1 = 1.',
    emoji: '1️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Push ONE earth bead UP on the Ones rod to show 1.',
      type: 'set-digit',
      targetDigit: 1,
      rodIndex: 4,
    },
  },
  {
    id: 13,
    title: 'Show the number 2',
    explanation:
      'To show 2: push TWO earth beads UP to the bar. Heaven bead rests at the top. 2 earth beads × 1 = 2.',
    emoji: '2️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Push TWO earth beads UP on the Ones rod to show 2.',
      type: 'set-digit',
      targetDigit: 2,
      rodIndex: 4,
    },
  },
  {
    id: 14,
    title: 'Show the number 4',
    explanation:
      'To show 4: push FOUR earth beads UP to the bar — all four earth beads touching the bar. Heaven bead still rests at the top. 4 × 1 = 4.',
    emoji: '4️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Push all FOUR earth beads UP on the Ones rod to show 4.',
      type: 'set-digit',
      targetDigit: 4,
      rodIndex: 4,
    },
  },
  {
    id: 15,
    title: 'Show the number 6',
    explanation:
      'To show 6: push the heaven bead DOWN (5) and push 1 earth bead UP (1). 5 + 1 = 6.',
    emoji: '6️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Set the Ones rod to 6: Heaven bead DOWN + 1 earth bead UP.',
      type: 'set-digit',
      targetDigit: 6,
      rodIndex: 4,
    },
  },
  {
    id: 16,
    title: 'Show the number 7',
    explanation:
      'To show 7: push the heaven bead DOWN (5) and push 2 earth beads UP (2). 5 + 2 = 7.',
    emoji: '7️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Set the Ones rod to 7: Heaven bead DOWN + 2 earth beads UP.',
      type: 'set-digit',
      targetDigit: 7,
      rodIndex: 4,
    },
  },
  {
    id: 17,
    title: 'Show the number 9',
    explanation:
      'To show 9: push the heaven bead DOWN (5) and push 4 earth beads UP (4). 5 + 4 = 9. This is the maximum digit on any single rod!',
    emoji: '9️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [4],
    activity: {
      instruction: 'Set the Ones rod to 9: Heaven bead DOWN + all 4 earth beads UP.',
      type: 'set-digit',
      targetDigit: 9,
      rodIndex: 4,
    },
  },

  // ── Subtask 4.2 — Two-digit number steps (ids 18–20) ──────────────────────
  {
    id: 18,
    title: 'Make the number 23',
    explanation:
      "Let's build 23! Tens rod: 2 earth beads UP (20). Ones rod: 3 earth beads UP (3). 20 + 3 = 23.",
    emoji: '2️⃣3️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [3, 4],
    activity: {
      instruction: 'Set the Soroban to show 23. Use the Tens rod (十) and Ones rod (一).',
      type: 'set-number',
      targetNumber: 23,
    },
  },
  {
    id: 19,
    title: 'Make the number 57',
    explanation:
      'To show 57: Tens rod uses heaven bead (50) + 0 earth = 50. Ones rod uses heaven bead (5) + 2 earth = 7. 50 + 7 = 57.',
    emoji: '5️⃣7️⃣',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [3, 4],
    activity: {
      instruction: 'Set the Soroban to show 57. Tens rod: heaven bead only (50). Ones rod: heaven bead + 2 earth (7).',
      type: 'set-number',
      targetNumber: 57,
    },
  },
  {
    id: 20,
    title: 'The maximum two-digit number: 99',
    explanation:
      'Show the biggest two-digit number! Tens rod: heaven (5) + 4 earth = 9 → 90. Ones rod: heaven (5) + 4 earth = 9. 90 + 9 = 99!',
    emoji: '💯',
    targetState: makeState([0, 0, 0, 0, 0]),
    highlightRods: [3, 4],
    activity: {
      instruction: 'Set the Soroban to show 99. Both Tens and Ones rods need heaven bead DOWN + all 4 earth beads UP.',
      type: 'set-number',
      targetNumber: 99,
    },
  },
];

// ─── Legacy export for backward compatibility ─────────────────────────────────
export const ABACUS_BASICS_STEPS = SOROBAN_BASICS_STEPS;
