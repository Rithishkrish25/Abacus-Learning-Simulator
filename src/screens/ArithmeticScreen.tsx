import { useState, useEffect, useRef, useCallback } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { PlaceValueOverlay } from '../components/PlaceValueOverlay';
import { useAbacusStore } from '../store/useAbacusStore';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import {
  generateProblem,
  stepIsComplete,
  type ArithmeticProblem,
} from '../arithmetic/arithmeticEngine';
import type { AppScreen } from '../App';

interface ArithmeticScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ArithmeticScreen({ onNavigate }: ArithmeticScreenProps) {
  // ── Abacus store ──
  const rods = useAbacusStore((s) => s.rods);
  const reset = useAbacusStore((s) => s.reset);

  // ── Progress store ──
  const recordArithmeticSession = useProgressStore((s) => s.recordArithmeticSession);

  // ── Local state ──
  const [problem, setProblem] = useState<ArithmeticProblem>(() => generateProblem());
  const [stepIndex, setStepIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  // ── Hint timer ref ──
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived values ──
  const currentStep = problem.steps[stepIndex]!;
  const stepComplete = stepIsComplete(rods, currentStep.expectedState);

  // ── 9.3 Hint timer: reset on each step change ──
  useEffect(() => {
    // Clear any existing timer
    if (hintTimerRef.current !== null) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    setHintVisible(false);

    // Start a new 30-second timer
    hintTimerRef.current = setTimeout(() => {
      setHintVisible(true);
    }, 30_000);

    // Cleanup on unmount or before next effect run
    return () => {
      if (hintTimerRef.current !== null) {
        clearTimeout(hintTimerRef.current);
        hintTimerRef.current = null;
      }
    };
  }, [stepIndex, problem]);

  // ── 9.2 — "Next Step" handler ──
  const handleNextStep = useCallback(() => {
    if (!stepComplete) return;

    if (stepIndex < problem.steps.length - 1) {
      // Advance to the next step
      setStepIndex((prev) => prev + 1);
      reset();
      setHintVisible(false);
    } else {
      // Final step completed — record session and show summary
      const badgeIds = recordArithmeticSession(1);
      setNewBadgeIds(badgeIds);
      setSessionCorrect((prev) => prev + 1);
      setShowSummary(true);
    }
  }, [stepComplete, stepIndex, problem.steps.length, reset, recordArithmeticSession]);

  // ── 9.4 — "Next Problem" handler ──
  const handleNextProblem = useCallback(() => {
    setProblem(generateProblem());
    setStepIndex(0);
    reset();
    setShowSummary(false);
    setHintVisible(false);
  }, [reset]);

  // ── Exit handler ──
  const handleExit = useCallback(() => {
    reset();
    onNavigate('home');
  }, [reset, onNavigate]);

  // ── Reset soroban (within current step) ──
  const handleResetSoroban = useCallback(() => {
    reset();
  }, [reset]);

  // ─── 9.1 — Layout ────────────────────────────────────────────────────────────

  return (
    <div className="arithmetic-root">

      {/* Header */}
      <header className="arithmetic-header">
        <button
          className="practice-back-btn"
          onClick={handleExit}
          aria-label="Back to menu"
        >
          ← Menu
        </button>
        <div className="arithmetic-expression" aria-live="polite">
          {problem.operandA} {problem.operator} {problem.operandB} = ?
        </div>
      </header>

      {/* Abacus canvas */}
      <div className="arithmetic-canvas-area">
        <AbacusScene highlightRods={[currentStep.rodIndex]} />
        <PlaceValueOverlay />
      </div>

      {/* Step panel */}
      <section className="arithmetic-step-panel" aria-label="Step instructions">
        <div className="arithmetic-step-progress">
          Step {stepIndex + 1} of {problem.steps.length}
        </div>

        <div className="arithmetic-step-instruction">
          {currentStep.instruction}
        </div>

        <span className="arithmetic-technique-badge">
          {currentStep.technique}
        </span>

        {/* 9.2 — Correct feedback */}
        {stepComplete && (
          <div className="arithmetic-confirm" role="status">
            ✔ Correct!
          </div>
        )}

        {/* 9.3 — Hint */}
        {hintVisible && (
          <div className="arithmetic-hint" role="note">
            💡 {currentStep.instruction}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 9.2 — Next Step button */}
          <button
            className="arithmetic-next-btn"
            onClick={handleNextStep}
            disabled={!stepComplete}
            aria-disabled={!stepComplete}
          >
            {stepIndex < problem.steps.length - 1 ? 'Next Step' : 'Finish'}
          </button>

          {/* Reset soroban button */}
          <button
            className="arithmetic-next-btn"
            onClick={handleResetSoroban}
            style={{ background: 'rgba(210,190,155,0.90)', color: '#3d2a14', border: '1px solid rgba(160,120,60,0.32)', boxShadow: 'none' }}
            aria-label="Clear the soroban"
          >
            Reset
          </button>
        </div>
      </section>

      {/* 9.4 — Summary overlay */}
      {showSummary && (
        <div className="arithmetic-summary-overlay" role="dialog" aria-modal="true" aria-label="Problem complete">
          <div className="arithmetic-summary-card">
            <div className="arithmetic-summary-emoji">🎉</div>

            <div className="arithmetic-summary-expression">
              {problem.operandA} {problem.operator} {problem.operandB} = {problem.answer}
            </div>

            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2a7a2a' }}>
              ✔ Correct!
            </div>

            <div style={{ fontSize: '0.82rem', color: '#5a3a10' }}>
              Problems solved this session: {sessionCorrect}
            </div>

            <div className="arithmetic-summary-actions">
              <button
                className="arithmetic-summary-btn arithmetic-summary-btn--primary"
                onClick={handleNextProblem}
                autoFocus
              >
                Next Problem
              </button>
              <button
                className="arithmetic-summary-btn arithmetic-summary-btn--secondary"
                onClick={handleExit}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge toasts */}
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
