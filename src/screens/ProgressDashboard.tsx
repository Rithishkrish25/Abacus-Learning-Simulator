import { useState, useCallback } from 'react';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import { SOROBAN_BASICS_STEPS } from '../lessons/sorobanLearningSteps';
import type { AppScreen } from '../types/app';

interface ProgressDashboardProps {
  onNavigate: (screen: AppScreen) => void;
}

const TOTAL_LESSON_STEPS = SOROBAN_BASICS_STEPS.length;

export function ProgressDashboard({ onNavigate }: ProgressDashboardProps) {
  const store    = useProgressStore();
  const accuracy = store.accuracyPercent();

  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetClick   = useCallback(() => setConfirmReset(true), []);
  const handleResetCancel  = useCallback(() => setConfirmReset(false), []);
  const handleResetConfirm = useCallback(() => {
    store.resetProgress();
    setConfirmReset(false);
  }, [store]);

  const lessonStars    = Math.min(store.lessonsCompleted, 3);
  const challengeStars = store.challengeQuestionsAttempted === 0 ? 0 : accuracy >= 80 ? 3 : accuracy >= 50 ? 2 : 1;

  return (
    <div className="progress-root">
      <div className="progress-top-bar">
        <button className="practice-back-btn" onClick={() => onNavigate('home')} aria-label="Back to main menu">
          ← Menu
        </button>
        <span className="progress-title">📊 My Progress</span>
        <div className="practice-top-spacer" />
      </div>

      <div className="progress-body">

        {/* ── Soroban Basics ── */}
        <section className="progress-section" aria-label="Lesson progress">
          <h2 className="progress-section-title">🧮 Soroban Basics</h2>
          <div className="progress-stat-row">
            <div className="progress-stat-box">
              <span className="progress-stat-number">{store.lessonsCompleted}</span>
              <span className="progress-stat-label">Lessons Done</span>
            </div>
            <div className="progress-stat-box">
              <span className="progress-stat-number">{TOTAL_LESSON_STEPS}</span>
              <span className="progress-stat-label">Total Steps</span>
            </div>
            <div className="progress-stat-box">
              <div className="progress-stars" aria-label={`${lessonStars} out of 3 stars`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`progress-star${n <= lessonStars ? ' progress-star--lit' : ''}`} aria-hidden="true">⭐</span>
                ))}
              </div>
              <span className="progress-stat-label">Stars</span>
            </div>
          </div>
          {store.lessonsCompleted === 0 && (
            <p className="progress-hint">Complete the Soroban Basics lesson to earn your first star! 🌟</p>
          )}
        </section>

        {/* ── Free Practice ── */}
        <section className="progress-section" aria-label="Practice progress">
          <h2 className="progress-section-title">🎯 Free Practice</h2>
          <div className="progress-stat-row">
            <div className="progress-stat-box">
              <span className="progress-stat-number">{store.practiceSessions}</span>
              <span className="progress-stat-label">Sessions</span>
            </div>
            <div className="progress-stat-box">
              <span className="progress-stat-number">
                {store.practiceMaxNumber > 0 ? store.practiceMaxNumber.toLocaleString() : '–'}
              </span>
              <span className="progress-stat-label">Highest Number</span>
            </div>
          </div>
          {store.practiceSessions === 0 && (
            <p className="progress-hint">Try Free Practice to build your Soroban skills! 🎯</p>
          )}
        </section>

        {/* ── Challenge ── */}
        <section className="progress-section" aria-label="Challenge progress">
          <h2 className="progress-section-title">⭐ Challenge Mode</h2>
          <div className="progress-stat-row">
            <div className="progress-stat-box">
              <span className="progress-stat-number">{store.challengeSessionsPlayed}</span>
              <span className="progress-stat-label">Games Played</span>
            </div>
            <div className="progress-stat-box">
              <span className="progress-stat-number">{store.challengeCorrectAnswers}</span>
              <span className="progress-stat-label">Correct</span>
            </div>
            <div className="progress-stat-box">
              <span className={`progress-stat-number${accuracy >= 80 ? ' progress-stat-number--green' : accuracy >= 50 ? ' progress-stat-number--amber' : ''}`}>
                {store.challengeQuestionsAttempted > 0 ? `${accuracy}%` : '–'}
              </span>
              <span className="progress-stat-label">Accuracy</span>
            </div>
          </div>

          {store.challengeQuestionsAttempted > 0 && (
            <div className="progress-bar-wrap" aria-label={`Accuracy: ${accuracy}%`}>
              <div
                className={`progress-bar-fill${accuracy >= 80 ? ' progress-bar-fill--green' : accuracy >= 50 ? ' progress-bar-fill--amber' : ' progress-bar-fill--red'}`}
                style={{ width: `${accuracy}%` }}
                role="progressbar"
                aria-valuenow={accuracy}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {store.challengeQuestionsAttempted > 0 && (
            <div className="progress-stars-row">
              <div className="progress-stars" aria-label={`${challengeStars} of 3 stars`}>
                {[1, 2, 3].map((n) => (
                  <span key={n} className={`progress-star progress-star--lg${n <= challengeStars ? ' progress-star--lit' : ''}`} aria-hidden="true">⭐</span>
                ))}
              </div>
              <span className="progress-stars-label">
                {accuracy >= 80 ? 'Amazing!' : accuracy >= 50 ? 'Good job!' : 'Keep trying!'}
              </span>
            </div>
          )}

          {store.challengeSessionsPlayed === 0 && (
            <p className="progress-hint">Play a challenge to see your score here! ⭐</p>
          )}
        </section>

        {/* ── Arithmetic ── */}
        <section className="progress-section" aria-label="Arithmetic progress">
          <h2 className="progress-section-title">➕ Arithmetic Mode</h2>
          <div className="progress-stat-row">
            <div className="progress-stat-box">
              <span className="progress-stat-number">{store.arithmeticSessionsCompleted}</span>
              <span className="progress-stat-label">Sessions</span>
            </div>
            <div className="progress-stat-box">
              <span className="progress-stat-number">{store.arithmeticProblemsCorrect}</span>
              <span className="progress-stat-label">Problems Correct</span>
            </div>
          </div>
          {store.arithmeticSessionsCompleted === 0 && (
            <p className="progress-hint">Try Arithmetic mode to practice addition and subtraction! ➕</p>
          )}
        </section>

        {/* ── Badges ── */}
        <section className="progress-section" aria-label="Achievement badges">
          <h2 className="progress-section-title">🏅 My Badges</h2>
          <div className="progress-badges-grid">
            {ALL_BADGES.map((badge) => {
              const unlocked = store.unlockedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`progress-badge${unlocked ? ' progress-badge--unlocked' : ' progress-badge--locked'}`}
                  aria-label={unlocked ? `${badge.name}: earned` : `${badge.name}: not yet earned`}
                >
                  <span className="progress-badge-emoji" aria-hidden="true">{unlocked ? badge.emoji : '🔒'}</span>
                  <span className="progress-badge-name">{badge.name}</span>
                  <span className="progress-badge-desc">{badge.description}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Reset ── */}
        <section className="progress-section progress-section--reset" aria-label="Reset progress">
          {!confirmReset ? (
            <button className="progress-reset-btn" onClick={handleResetClick} aria-label="Reset all progress">
              🗑️ Reset My Progress
            </button>
          ) : (
            <div className="progress-reset-confirm" role="alertdialog" aria-label="Confirm reset">
              <p className="progress-reset-warning">⚠️ This will delete ALL your progress and badges. Are you sure?</p>
              <div className="progress-reset-actions">
                <button className="progress-reset-yes" onClick={handleResetConfirm} aria-label="Yes, reset">Yes, reset</button>
                <button className="progress-reset-no"  onClick={handleResetCancel}  aria-label="No, keep">No, keep it</button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
