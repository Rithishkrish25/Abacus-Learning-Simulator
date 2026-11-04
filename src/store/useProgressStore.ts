/**
 * Progress & Achievement Store — v4
 * Unified 7-level progress tracking. Migrates safely from v3.
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
  /** 0=locked, 1=available, 2=complete — one entry per level */
  levelStatus: number[];
  /** 0-based index of the currently active level */
  currentLevelIndex: number;
  /** Highest score (0–100) earned per level */
  levelScores: number[];
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
    description: 'Complete Level 1.',
    condition: (s) => (s.levelStatus[0] ?? 0) === 2,
  },
  {
    id: 'counting-star',
    emoji: '⭐',
    name: 'Counting Star',
    description: 'Complete Level 2.',
    condition: (s) => (s.levelStatus[1] ?? 0) === 2,
  },
  {
    id: 'practice-champion',
    emoji: '🏅',
    name: 'Practice Champion',
    description: 'Complete Level 4.',
    condition: (s) => (s.levelStatus[3] ?? 0) === 2,
  },
  {
    id: 'abacus-master',
    emoji: '🏆',
    name: 'Soroban Master',
    description: 'Complete all 7 levels.',
    condition: (s) => s.levelStatus.filter((v) => v === 2).length === 7,
  },
  {
    id: 'big-number',
    emoji: '💯',
    name: 'Big Number',
    description: 'Complete Level 4 (Place Values).',
    condition: (s) => (s.levelStatus[3] ?? 0) === 2,
  },
  {
    id: 'arithmetic-ace',
    emoji: '➕',
    name: 'Arithmetic Ace',
    description: 'Complete Level 5 (Addition).',
    condition: (s) => (s.levelStatus[4] ?? 0) === 2,
  },
];

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'soroban_progress_v4';
const STORAGE_KEY_V3 = 'soroban_progress_v3';

const DEFAULT_LEVEL_STATUS: number[] = [1, 0, 0, 0, 0, 0, 0];
const DEFAULT_LEVEL_SCORES: number[] = [0, 0, 0, 0, 0, 0, 0];

function loadFromStorage(): ProgressState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ProgressState;

    const v3raw = localStorage.getItem(STORAGE_KEY_V3);
    if (v3raw) {
      const old = JSON.parse(v3raw) as Partial<ProgressState>;
      const levelsCompleted = Math.min(
        (old.lessonsCompleted ?? 0) > 0 ? 4 : 0,
        7,
      );
      const levelStatus = DEFAULT_LEVEL_STATUS.map((_, i) =>
        i < levelsCompleted ? 2 : i === levelsCompleted ? 1 : 0
      );
      const migrated: ProgressState = {
        lessonsCompleted:            old.lessonsCompleted            ?? 0,
        practiceSessions:            old.practiceSessions            ?? 0,
        practiceMaxNumber:           old.practiceMaxNumber           ?? 0,
        challengeSessionsPlayed:     old.challengeSessionsPlayed     ?? 0,
        challengeQuestionsAttempted: old.challengeQuestionsAttempted ?? 0,
        challengeCorrectAnswers:     old.challengeCorrectAnswers     ?? 0,
        unlockedBadges: (old.unlockedBadges ?? []).filter((id) =>
          ALL_BADGES.some((b) => b.id === id),
        ),
        bestSessionCorrect:          old.bestSessionCorrect          ?? 0,
        lastActivityAt:              old.lastActivityAt              ?? null,
        arithmeticSessionsCompleted: old.arithmeticSessionsCompleted ?? 0,
        arithmeticProblemsCorrect:   old.arithmeticProblemsCorrect   ?? 0,
        levelStatus,
        currentLevelIndex: Math.max(0, levelsCompleted - 1),
        levelScores: [...DEFAULT_LEVEL_SCORES],
        _version: 4,
      };
      saveToStorage(migrated);
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

function saveToStorage(state: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota / private browsing
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
  levelStatus: [...DEFAULT_LEVEL_STATUS],
  currentLevelIndex: 0,
  levelScores: [...DEFAULT_LEVEL_SCORES],
  _version: 4,
};

function mergeWithDefaults(saved: Partial<ProgressState>): ProgressState {
  return {
    ...DEFAULT_STATE,
    ...saved,
    levelStatus: saved.levelStatus?.length === 7 ? saved.levelStatus : [...DEFAULT_LEVEL_STATUS],
    levelScores: saved.levelScores?.length === 7 ? saved.levelScores : [...DEFAULT_LEVEL_SCORES],
  };
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface ProgressStore extends ProgressState {
  completeLevel: (levelIndex: number, score: number) => string[];
  setCurrentLevel: (levelIndex: number) => void;
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

// ─── Store ────────────────────────────────────────────────────────────────────

export const useProgressStore = create<ProgressStore>((set, get) => ({
  ...initialData,

  completeLevel: (levelIndex, score) => {
    const current = get();
    const newLevelStatus = [...current.levelStatus];
    const newLevelScores = [...current.levelScores];

    newLevelStatus[levelIndex] = 2;
    newLevelScores[levelIndex] = Math.max(newLevelScores[levelIndex] ?? 0, score);

    if (levelIndex + 1 < 7 && (newLevelStatus[levelIndex + 1] ?? 0) === 0) {
      newLevelStatus[levelIndex + 1] = 1;
    }

    const next: ProgressState = {
      ...current,
      levelStatus: newLevelStatus,
      levelScores: newLevelScores,
      currentLevelIndex: Math.min(levelIndex + 1, 6),
      lessonsCompleted: current.lessonsCompleted + (levelIndex < 4 ? 1 : 0),
      lastActivityAt: Date.now(),
    };
    const { newBadgeIds, updatedBadges } = checkNewBadges(next);
    next.unlockedBadges = updatedBadges;
    saveToStorage(next);
    set(next);
    return newBadgeIds;
  },

  setCurrentLevel: (levelIndex) => {
    const current = get();
    const next = { ...current, currentLevelIndex: levelIndex };
    saveToStorage(next);
    set(next);
  },

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

  recordPracticeSession: (maxNumber) => {
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

  recordChallengeResult: (attempted, correct) => {
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

  recordArithmeticSession: (problemsCorrect) => {
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
