/**
 * Progress & Achievement Store
 * Tracks lesson completions, practice sessions, challenge results, and arithmetic sessions.
 * Persists to localStorage automatically on every change.
 * Handles safe migration from v2 to v3 format.
 */
import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgressState {
  lessonsCompleted: number;
  practiceSessions: number;
  practiceMaxNumber: number;
  challengeSessionsPlayed: number;
  challengeQuestionsAttempted: number;
  challengeCorrectAnswers: number;
  unlockedBadges: string[];
  bestSessionCorrect: number;
  lastActivityAt: number | null;
  arithmeticSessionsCompleted: number;
  arithmeticProblemsCorrect: number;
  /** Schema version — used for migrations */
  _version: number;
}

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  condition: (s: ProgressState) => boolean;
}

// ─── Badge definitions ────────────────────────────────────────────────────────

export const ALL_BADGES: Badge[] = [
  {
    id: 'first-lesson',
    emoji: '🎓',
    name: 'Soroban Student',
    description: 'Finish the Soroban Basics lesson for the first time.',
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
    name: 'Soroban Master',
    description: 'Complete a Challenge session with 8 or more correct answers.',
    condition: (s) => s.bestSessionCorrect >= 8,
  },
  {
    id: 'big-number',
    emoji: '💯',
    name: 'Big Number',
    description: 'Set a number larger than 999 in Free Practice.',
    condition: (s) => s.practiceMaxNumber > 999,
  },
  {
    id: 'arithmetic-ace',
    emoji: '➕',
    name: 'Arithmetic Ace',
    description: 'Answer 10 arithmetic problems correctly.',
    condition: (s) => s.arithmeticProblemsCorrect >= 10,
  },
];

// ─── localStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY     = 'soroban_progress_v3';
const STORAGE_KEY_V2  = 'soroban_progress_v2';

function loadFromStorage(): ProgressState | null {
  try {
    // 1. Try v3 key first
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressState;

    // 2. Attempt migration from v2 key
    const v2raw = localStorage.getItem(STORAGE_KEY_V2);
    if (v2raw) {
      const old = JSON.parse(v2raw) as Partial<ProgressState>;
      const migrated: ProgressState = {
        lessonsCompleted: old.lessonsCompleted ?? 0,
        practiceSessions: old.practiceSessions ?? 0,
        practiceMaxNumber: old.practiceMaxNumber ?? 0,
        challengeSessionsPlayed: old.challengeSessionsPlayed ?? 0,
        challengeQuestionsAttempted: old.challengeQuestionsAttempted ?? 0,
        challengeCorrectAnswers: old.challengeCorrectAnswers ?? 0,
        unlockedBadges: (old.unlockedBadges ?? []).filter((id) =>
          ALL_BADGES.some((b) => b.id === id),
        ),
        bestSessionCorrect: old.bestSessionCorrect ?? 0,
        lastActivityAt: old.lastActivityAt ?? null,
        arithmeticSessionsCompleted: 0,
        arithmeticProblemsCorrect: 0,
        _version: 3,
      };
      saveToStorage(migrated);
      localStorage.removeItem(STORAGE_KEY_V2);
      return migrated;
    }

    // 3. Nothing found
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing / quota — ignore silently
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
  arithmeticSessionsCompleted: 0,
  arithmeticProblemsCorrect: 0,
  _version: 3,
};

function mergeWithDefaults(saved: Partial<ProgressState>): ProgressState {
  return { ...DEFAULT_STATE, ...saved };
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface ProgressStore extends ProgressState {
  recordLessonComplete: () => string[];
  recordPracticeSession: (maxNumber: number) => string[];
  recordChallengeResult: (attempted: number, correct: number) => string[];
  recordArithmeticSession: (problemsCorrect: number) => string[];
  resetProgress: () => void;
  accuracyPercent: () => number;
}

// ─── Badge checker ────────────────────────────────────────────────────────────

function checkNewBadges(state: ProgressState): { newBadgeIds: string[]; updatedBadges: string[] } {
  const newBadgeIds: string[] = [];
  for (const badge of ALL_BADGES) {
    if (!state.unlockedBadges.includes(badge.id) && badge.condition(state)) {
      newBadgeIds.push(badge.id);
    }
  }
  return { newBadgeIds, updatedBadges: [...state.unlockedBadges, ...newBadgeIds] };
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

  recordArithmeticSession: (problemsCorrect: number) => {
    const current = get();
    const clamped = Math.max(0, problemsCorrect);
    const next: ProgressState = {
      ...current,
      arithmeticSessionsCompleted: current.arithmeticSessionsCompleted + 1,
      arithmeticProblemsCorrect: current.arithmeticProblemsCorrect + clamped,
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
