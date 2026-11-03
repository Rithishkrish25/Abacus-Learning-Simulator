import { useState, useCallback, useEffect, useRef } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { useAbacusStore, totalActive } from '../store/useAbacusStore';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import type { AppScreen } from '../App';

interface ChallengeScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

// ─── Challenge constants ──────────────────────────────────────────────────────
const TOTAL_QUESTIONS = 10;
const POINTS_PER_CORRECT = 10;
const MIN_NUMBER = 1;
const MAX_NUMBER = 50;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateQuestions(count: number): number[] {
  const pool = Array.from(
    { length: MAX_NUMBER - MIN_NUMBER + 1 },
    (_, i) => i + MIN_NUMBER,
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, count);
}

type AnswerState = 'pending' | 'correct' | 'incorrect';

interface QuestionResult {
  target: number;
  studentAnswer: number;
  correct: boolean;
}

export function ChallengeScreen({ onNavigate }: ChallengeScreenProps) {
  const rods    = useAbacusStore((s) => s.rods);
  const reset   = useAbacusStore((s) => s.reset);
  const undo    = useAbacusStore((s) => s.undo);
  const history = useAbacusStore((s) => s.history);

  const total   = totalActive(rods);
  const canUndo = history.length > 0;

  const recordChallengeResult = useProgressStore((s) => s.recordChallengeResult);

  const questions = useRef<number[]>(generateQuestions(TOTAL_QUESTIONS));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('pending');
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [done, setDone] = useState(false);
  const [studentAnswerAtSubmit, setStudentAnswerAtSubmit] = useState(0);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  const currentTarget = questions.current[questionIndex] ?? 1;
  const score = results.filter((r) => r.correct).length * POINTS_PER_CORRECT;
  const correctCount = results.filter((r) => r.correct).length;

  useEffect(() => {
    reset();
    setAnswerState('pending');
    setStudentAnswerAtSubmit(0);
  }, [questionIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    if (answerState !== 'pending') return;
    const correct = total === currentTarget;
    setStudentAnswerAtSubmit(total);
    setAnswerState(correct ? 'correct' : 'incorrect');
    setResults((prev) => [
      ...prev,
      { target: currentTarget, studentAnswer: total, correct },
    ]);
  }, [answerState, total, currentTarget]);

  const handleNext = useCallback(() => {
    if (questionIndex + 1 >= TOTAL_QUESTIONS) {
      setDone(true);
    } else {
      setQuestionIndex((i) => i + 1);
    }
  }, [questionIndex]);

  // Record results when session finishes (done becomes true)
  useEffect(() => {
    if (!done || results.length === 0) return;
    const correct = results.filter((r) => r.correct).length;
    const earned = recordChallengeResult(results.length, correct);
    setNewBadgeIds(earned);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayAgain = useCallback(() => {
    questions.current = generateQuestions(TOTAL_QUESTIONS);
    setQuestionIndex(0);
    setAnswerState('pending');
    setResults([]);
    setDone(false);
    setStudentAnswerAtSubmit(0);
    setNewBadgeIds([]);
    reset();
  }, [reset]);

  const handleBack = useCallback(() => {
    reset();
    onNavigate('home');
  }, [reset, onNavigate]);

  const diff = total - currentTarget;

  const feedbackText = (() => {
    if (answerState === 'correct') return '🎉 Correct! Well done!';
    if (answerState === 'incorrect') {
      if (studentAnswerAtSubmit === currentTarget) return '';
      return `Almost! You had ${studentAnswerAtSubmit}. The answer was ${currentTarget}.`;
    }
    return '';
  })();

  const liveHint = (() => {
    if (answerState !== 'pending') return '';
    if (diff === 0) return '✓ Ready to submit!';
    if (diff < 0) return `Add ${-diff} more bead${-diff !== 1 ? 's' : ''}`;
    return `Remove ${diff} bead${diff !== 1 ? 's' : ''}`;
  })();

  // ── Final results screen ──────────────────────────────────────────────────
  if (done) {
    const perfect = correctCount === TOTAL_QUESTIONS;
    const good = correctCount >= 7;
    return (
      <div className="challenge-results-root">
        <div className="challenge-results-card">
          <div className="challenge-results-emoji" aria-hidden="true">
            {perfect ? '🏆' : good ? '🌟' : '🎯'}
          </div>
          <h2 className="challenge-results-heading">
            {perfect ? 'Perfect Score!' : good ? 'Great Job!' : 'Good Try!'}
          </h2>
          <p className="challenge-results-sub">
            You got <strong>{correctCount}</strong> out of <strong>{TOTAL_QUESTIONS}</strong> right!
          </p>

          <div className="challenge-score-big" aria-label={`Final score: ${score} points`}>
            <span className="challenge-score-big-label">Your score</span>
            <span className="challenge-score-big-number">{score}</span>
            <span className="challenge-score-big-label">points</span>
          </div>

          <div className="challenge-results-list" aria-label="Question results">
            {results.map((r, i) => (
              <div
                key={i}
                className={`challenge-results-item${r.correct ? ' challenge-results-item--correct' : ' challenge-results-item--wrong'}`}
              >
                <span className="challenge-results-q">Q{i + 1}</span>
                <span className="challenge-results-target">Target: {r.target}</span>
                <span className="challenge-results-answer">You: {r.studentAnswer}</span>
                <span className="challenge-results-mark">{r.correct ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>

          <div className="challenge-results-actions">
            <button
              className="challenge-btn challenge-btn--primary"
              onClick={handlePlayAgain}
              aria-label="Play again"
            >
              🔄 Play Again
            </button>
            <button
              className="challenge-btn challenge-btn--secondary"
              onClick={handleBack}
              aria-label="Back to main menu"
            >
              🏠 Menu
            </button>
          </div>
        </div>

        {/* Badge toast notifications */}
        {newBadgeIds.length > 0 && (
          <div className="badge-toast-stack" aria-live="polite">
            {newBadgeIds.map((id) => {
              const badge = ALL_BADGES.find((b) => b.id === id);
              if (!badge) return null;
              return (
                <div key={id} className="badge-toast">
                  <span className="badge-toast-emoji" aria-hidden="true">{badge.emoji}</span>
                  <div className="badge-toast-text">
                    <span className="badge-toast-title">New Badge!</span>
                    <span className="badge-toast-name">{badge.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Main challenge screen ─────────────────────────────────────────────────
  return (
    <div className="practice-root">
      <AbacusScene />

      <div className="practice-hud" aria-label="Challenge controls">

        {/* Top bar */}
        <div className="practice-top-bar">
          <button
            className="practice-back-btn"
            onClick={handleBack}
            aria-label="Back to main menu"
          >
            ← Menu
          </button>
          <span className="practice-screen-label">⭐ Challenge</span>
          <div className="challenge-progress-pill" aria-label={`Question ${questionIndex + 1} of ${TOTAL_QUESTIONS}`}>
            Q{questionIndex + 1}/{TOTAL_QUESTIONS}
          </div>
          <div className="challenge-score-pill" aria-label={`Score: ${score} points`}>
            ⭐ {score}
          </div>
        </div>

        <div className="practice-mid-spacer" />

        {/* Bottom panel */}
        <div className="practice-bottom-panel">

          <div className="practice-info-row">
            <div className={`challenge-target-box${answerState === 'correct' ? ' challenge-target-box--correct' : answerState === 'incorrect' ? ' challenge-target-box--wrong' : ''}`}>
              <span className="challenge-target-label">Show this number:</span>
              <span className="challenge-target-number" aria-label={`Target: ${currentTarget}`}>
                {currentTarget}
              </span>
            </div>

            <div className={`practice-total${answerState === 'correct' ? ' practice-total--matched' : ''}`}>
              <span className="practice-total-label">You have</span>
              <span className="practice-total-number">{total}</span>
              <span className="practice-total-label">beads</span>
            </div>
          </div>

          {answerState === 'pending' && liveHint && (
            <div
              className={`challenge-hint${diff === 0 ? ' challenge-hint--ready' : ''}`}
              aria-live="polite"
            >
              {liveHint}
            </div>
          )}
          {answerState !== 'pending' && (
            <div
              className={`challenge-feedback${answerState === 'correct' ? ' challenge-feedback--correct' : ' challenge-feedback--wrong'}`}
              role="alert"
            >
              {feedbackText}
            </div>
          )}

          <div className="practice-btn-row">
            <button
              className="practice-btn practice-btn--secondary"
              onClick={reset}
              aria-label="Reset all beads to zero"
            >
              🔄 Reset
            </button>

            {answerState === 'pending' && (
              <button
                className={`practice-btn practice-btn--secondary${!canUndo ? ' practice-btn--disabled' : ''}`}
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo last move"
              >
                ↩ Undo
              </button>
            )}

            {answerState === 'pending' && (
              <button
                className="practice-btn challenge-btn--submit"
                onClick={handleSubmit}
                aria-label="Submit your answer"
              >
                ✓ Submit
              </button>
            )}

            {answerState !== 'pending' && (
              <button
                className="practice-btn challenge-btn--next"
                onClick={handleNext}
                aria-label={questionIndex + 1 >= TOTAL_QUESTIONS ? 'See results' : 'Next question'}
              >
                {questionIndex + 1 >= TOTAL_QUESTIONS ? '🏆 Results' : 'Next →'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
