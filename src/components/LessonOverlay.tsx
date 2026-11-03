import { useState } from 'react';
import { LessonStep } from '../lessons/abacusBasicsSteps';
import { useAbacusStore } from '../store/useAbacusStore';

interface LessonOverlayProps {
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  isLastStep: boolean;
  activityComplete: boolean;
}

/**
 * Compact lesson panel — anchored at the bottom of the canvas.
 *
 * Design goals:
 *  - Never taller than ~190px (desktop) / ~170px (mobile)
 *  - The 3D abacus always has ≥ 65% of canvas height
 *  - All 5 rods and all beads are visible at all times
 *  - On mobile: collapsible — tap the header bar to toggle the body open/closed
 *    so beads remain fully accessible while dragging
 *
 * Layout (always visible — top strip):
 *   [ emoji  Step N/7  Title ]   [ ← Prev ]  [ Next → ]  [ ✕ ]
 *
 * Layout (expandable body):
 *   Explanation text
 *   Activity instruction + live progress (if applicable)
 */
export function LessonOverlay({
  step,
  stepIndex,
  totalSteps,
  onPrev,
  onNext,
  onExit,
  isLastStep,
  activityComplete,
}: LessonOverlayProps) {
  const rods = useAbacusStore((s) => s.rods);
  // Mobile: body starts open; user can collapse to expose beads
  const [bodyOpen, setBodyOpen] = useState(true);

  const liveCount =
    step.activity?.rodIndex !== undefined
      ? (rods[step.activity.rodIndex]?.activeCount ?? 0)
      : 0;

  const targetCount = step.activity?.targetCount ?? 0;
  const isSetNumber = step.activity?.type === 'set-number';
  const isCountBeads = step.activity?.type === 'count-beads';
  const nextDisabled = (isSetNumber || isCountBeads) && !activityComplete;

  return (
    <div className="lesson-panel" role="region" aria-label="Lesson panel">

      {/* ══════════════════════════════════════════════════════
          TOP BAR — always visible, contains all controls
          ══════════════════════════════════════════════════════ */}
      <div className="lesson-bar">

        {/* Left side: toggle + step info */}
        <button
          className="lesson-bar-toggle"
          onClick={() => setBodyOpen((v) => !v)}
          aria-label={bodyOpen ? 'Collapse lesson panel' : 'Expand lesson panel'}
          aria-expanded={bodyOpen}
        >
          <span className="lesson-bar-emoji" aria-hidden="true">{step.emoji}</span>
          <span className="lesson-bar-step">
            {stepIndex + 1}/{totalSteps}
          </span>
          <span className="lesson-bar-title">{step.title}</span>
          <span className="lesson-bar-chevron" aria-hidden="true">
            {bodyOpen ? '▾' : '▸'}
          </span>
        </button>

        {/* Right side: nav + exit */}
        <div className="lesson-bar-actions">
          <button
            className={`lesson-nav-btn lesson-nav-btn--secondary${stepIndex === 0 ? ' lesson-nav-btn--disabled' : ''}`}
            onClick={onPrev}
            disabled={stepIndex === 0}
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            className={`lesson-nav-btn lesson-nav-btn--primary${nextDisabled ? ' lesson-nav-btn--disabled' : ''}`}
            onClick={onNext}
            disabled={nextDisabled}
            aria-label={isLastStep ? 'Finish lesson' : 'Next step'}
          >
            {isLastStep ? '🎉' : '→'}
          </button>
          <button
            className="lesson-exit-btn"
            onClick={onExit}
            aria-label="Exit lesson"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          BODY — collapsible content area
          ══════════════════════════════════════════════════════ */}
      {bodyOpen && (
        <div className="lesson-body">

          {/* Explanation */}
          <p className="lesson-explanation">{step.explanation}</p>

          {/* Activity block */}
          {step.activity && (
            <div className={`lesson-activity${activityComplete ? ' lesson-activity--done' : ''}`}>
              <span className="lesson-activity-icon" aria-hidden="true">
                {isSetNumber ? '🖐️' : isCountBeads ? '👀' : '👁️'}
              </span>
              <span className="lesson-activity-instruction">
                {step.activity.instruction}
              </span>

              {/* Live progress */}
              {isSetNumber && (
                <span className="lesson-progress" aria-live="polite">
                  {activityComplete
                    ? <span className="lesson-progress-done">✅ {liveCount} beads!</span>
                    : <span className="lesson-progress-count">
                        <strong>{liveCount}</strong> / <strong>{targetCount}</strong>
                      </span>
                  }
                </span>
              )}
              {isCountBeads && activityComplete && (
                <span className="lesson-progress">
                  <span className="lesson-progress-done">✅ {targetCount} beads!</span>
                </span>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
