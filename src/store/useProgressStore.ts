/**
 * Progress & Achievement Store
 * Tracks lesson completions, practice sessions, and challenge results.
 * Persists to localStorage automatically on every change.
 */
import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressState {
  /** How many times the Basics lesson has been completed */
  lessonsCompleted: number;
  /** Total Free Practice sessions started */
  practiceSessions: number;
  /** Highest single number set in Free Practice */
  practiceMaxNumber: number;
  /** Total Challenge sessions finished */
  challengeSessionsPlayed: number;
  /** Total questions attempted across all Challenge sessions */
  challengeQuestionsAttempted: number;
  /** Total correct answers across all Challenge sessions */
  challengeCorrectAnswers: number;
  /** Badges already unlocked (badge IDs) */
  unlockedBadges: string[];
  /** Best correct-answer count in a single Challenge session */
  bestSessionCorrect: number;
  /** Timestamp (ms) of last activity */
  lastActivityAt: number | null;
}

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  /** Returns true when the badge should be awarded given the current state */
  condition: (s: ProgressState) => boolean;
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export const ALL_BADGES: Badge[] = [
  {
    id: 'first-lesson',
    emoji: '🎓',
    name: 'First Lesson',
    description: 'Finish the Abacus Basics lesson for the first time.',
    condition: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: 'counting-star',
    emoji: '⭐',
    name: 'Counting Star',
    description: 'Get 5 or more correct answers in Challenge mode.',
    condition: (s) => s.challengeCorrectAnswers >= 5,
  },
  {
    id: 'practice-champion',
    emoji: '🏅',
    name: 'Practice Champion',
    description: 'Complete 5 Free Practice sessions.',
    condition: (s) => s.practiceSessions >= 5,
  },
  {
    id: 'abacus-master',
    emoji: '🏆',
    name: 'Abacus Master',
    description: 'Complete a full Challenge with 8 or more correct answers.',
    // Checked immediately after a session — bestSessionCorrect tracks the per-session peak
    condition: (s) => s.bestSessionCorrect >= 8,
  },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'abacus_progress_v1';

function loadFromStorage(): ProgressState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProgressState;
  } catch {
    return null;
  }
}

function saveToStorage(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently ignore storage errors (private browsing, quota exceeded, etc.)
  }
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_STATE: ProgressState = {
  lessonsCompleted: 0,
  practiceSessions: 0,
  practiceMaxNumber: 0,
  challengeSessionsPlayed: 0,
  challengeQuestionsAttempted: 0,
  challengeCorrectAnswers: 0,
  bestSessionCorrect: 0,
  unlockedBadges: [],
  lastActivityAt: null,
};

function mergeWithDefaults(saved: Partial<ProgressState>): ProgressState {
  return { ...DEFAULT_STATE, ...saved };
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface ProgressStore extends ProgressState {
  /** Called when the Basics lesson completes */
  recordLessonComplete: () => string[];
  /** Called when a Free Practice session starts */
  recordPracticeSession: (maxNumber: number) => string[];
  /** Called when a full Challenge session ends */
  recordChallengeResult: (attempted: number, correct: number) => string[];
  /** Wipe all progress (after user confirms) */
  resetProgress: () => void;
  /** Derived: accuracy percentage (0–100, integer) */
  accuracyPercent: () => number;
}

// ─── Store ────────────────────────────────────────────────────────────────────

/** Check which new badges are earned and return their IDs */
function checkNewBadges(state: ProgressState): { newBadgeIds: string[]; updatedBadges: string[] } {
  const newBadgeIds: string[] = [];
  for (const badge of ALL_BADGES) {
    if (!state.unlockedBadges.includes(badge.id) && badge.condition(state)) {
      newBadgeIds.push(badge.id);
    }
  }
  const updatedBadges = [...state.unlockedBadges, ...newBadgeIds];
  return { newBadgeIds, updatedBadges };
}

const initialData = mergeWithDefaults(loadFromStorage() ?? {});

export const useProgressStore = create<ProgressStore>((set, get) => ({
  ...initialData,

  recordLessonComplete: () => {
    const current = get();
    const next: ProgressState = {
      ...current,
      lessonsCompleted: current.lessonsCompleted + 1,
      lastActivityAt: Date.now(),
    };
    const { newBadgeIds, updatedBadges } = checkNewBadges(next);
    next.unlockedBadges = updatedBadges;
    saveToStorage(next);
    set(next);
    return newBadgeIds;
  },

  recordPracticeSession: (maxNumber: number) => {
    const current = get();
    const next: ProgressState = {
      ...current,
      practiceSessions: current.practiceSessions + 1,
      practiceMaxNumber: Math.max(current.practiceMaxNumber, maxNumber),
      lastActivityAt: Date.now(),
    };
    const { newBadgeIds, updatedBadges } = checkNewBadges(next);
    next.unlockedBadges = updatedBadges;
    saveToStorage(next);
    set(next);
    return newBadgeIds;
  },

  recordChallengeResult: (attempted: number, correct: number) => {
    const current = get();
    const next: ProgressState = {
      ...current,
      challengeSessionsPlayed: current.challengeSessionsPlayed + 1,
      challengeQuestionsAttempted: current.challengeQuestionsAttempted + attempted,
      challengeCorrectAnswers: current.challengeCorrectAnswers + correct,
      bestSessionCorrect: Math.max(current.bestSessionCorrect, correct),
      lastActivityAt: Date.now(),
    };
    const { newBadgeIds, updatedBadges } = checkNewBadges(next);
    next.unlockedBadges = updatedBadges;
    saveToStorage(next);
    set(next);
    return newBadgeIds;
  },

  resetProgress: () => {
    const fresh = { ...DEFAULT_STATE };
    saveToStorage(fresh);
    set(fresh);
  },

  accuracyPercent: () => {
    const { challengeQuestionsAttempted, challengeCorrectAnswers } = get();
    if (challengeQuestionsAttempted === 0) return 0;
    return Math.round((challengeCorrectAnswers / challengeQuestionsAttempted) * 100);
  },
}));
