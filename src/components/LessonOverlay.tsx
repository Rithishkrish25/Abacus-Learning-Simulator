import { useState } from 'react';
import type { LessonStep } from '../lessons/sorobanLearningSteps';
import { useAbacusStore, rodDigit, sorobanValue } from '../store/useAbacusStore';

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
  const [bodyOpen, setBodyOpen] = useState(true);

  const activity = step.activity;
  const isInteractive =
    activity?.type === 'set-digit' ||
    activity?.type === 'set-number' ||
    activity?.type === 'toggle-heaven' ||
    activity?.type === 'count-earth';

  const nextDisabled = isInteractive && !activityComplete;

  const liveDigit =
    activity?.rodIndex !== undefined
      ? rodDigit(rods[activity.rodIndex] ?? { rodIndex: 0, heavenActive: false, earthActive: 0 })
      : 0;

  const liveValue = sorobanValue(rods);

  return (
    <div className="lesson-panel lesson-panel--enhanced" role="region" aria-label="Lesson panel">

      {/* ── Top bar ── */}
      <div className="lesson-bar">
        <button
          className="lesson-bar-toggle"
          onClick={() => setBodyOpen((v) => !v)}
          aria-label={bodyOpen ? 'Collapse lesson panel' : 'Expand lesson panel'}
          aria-expanded={bodyOpen}
        >
          <span className="lesson-bar-emoji" aria-hidden="true">{step.emoji}</span>
          <span className="lesson-bar-step">{stepIndex + 1}/{totalSteps}</span>
          <span className="lesson-bar-title">{step.title}</span>
          <span className="lesson-bar-chevron" aria-hidden="true">{bodyOpen ? '▾' : '▸'}</span>
        </button>

        <div className="lesson-bar-actions">
          <button
            className={`lesson-nav-btn lesson-nav-btn--secondary${stepIndex === 0 ? ' lesson-nav-btn--disabled' : ''}`}
            onClick={onPrev}
            disabled={stepIndex === 0}
            aria-label="Previous step"
          >
            ←
          </button>
          <button className="lesson-exit-btn" onClick={onExit} aria-label="Exit lesson">✕</button>
        </div>
      </div>

      {/* ── Body ── */}
      {bodyOpen && (
        <div className="lesson-body">

          {/* Bilingual explanation */}
          <div className="lesson-explanation-block">
            <p className="lesson-explanation">{step.explanation}</p>
            {step.tamilExplanation && (
              <p className="lesson-explanation lesson-explanation--tamil">{step.tamilExplanation}</p>
            )}
          </div>

          {/* Activity card */}
          {activity && (
            <div className={`lesson-activity-card${activityComplete ? ' lesson-activity-card--done' : ''}`}>

              {/* Success state */}
              {activityComplete ? (
                <div className="lesson-success">
                  <span className="lesson-success-icon">✅</span>
                  <div className="lesson-success-text">
                    <span className="lesson-success-en">Well done! Correct!</span>
                    <span className="lesson-success-ta">சரியாக செய்தீர்கள்!</span>
                  </div>
                  {activity.type === 'set-digit' && (
                    <span className="lesson-success-value">{liveDigit}</span>
                  )}
                  {activity.type === 'set-number' && (
                    <span className="lesson-success-value">{liveValue}</span>
                  )}
                </div>
              ) : (
                <>
                  {/* Instruction */}
                  <div className="lesson-task-label">
                    <span className="lesson-task-icon">🎯</span>
                    <div className="lesson-task-text">
                      <span className="lesson-task-en">{activity.instruction}</span>
                      {activity.tamilInstruction && (
                        <span className="lesson-task-ta">{activity.tamilInstruction}</span>
                      )}
                    </div>
                  </div>

                  {/* Live progress */}
                  {activity.type === 'set-digit' && (
                    <div className="lesson-progress-bar-wrap" aria-live="polite">
                      <span className="lesson-progress-label">
                        Now / இப்போது: <strong>{liveDigit}</strong>
                      </span>
                      <span className="lesson-progress-sep">→</span>
                      <span className="lesson-progress-label">
                        Target / இலக்கு: <strong>{activity.targetDigit ?? 0}</strong>
                      </span>
                    </div>
                  )}
                  {activity.type === 'set-number' && (
                    <div className="lesson-progress-bar-wrap" aria-live="polite">
                      <span className="lesson-progress-label">
                        Now / இப்போது: <strong>{liveValue}</strong>
                      </span>
                      <span className="lesson-progress-sep">→</span>
                      <span className="lesson-progress-label">
                        Target / இலக்கு: <strong>{activity.targetNumber ?? 0}</strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom: prominent Next Step button ── */}
      <div className="lesson-next-bar">
        <button
          className={`lesson-next-btn${nextDisabled ? ' lesson-next-btn--disabled' : ' lesson-next-btn--ready'}${activityComplete ? ' lesson-next-btn--success' : ''}`}
          onClick={onNext}
          disabled={nextDisabled}
          aria-label={isLastStep ? 'Finish lesson' : 'Next step'}
        >
          {isLastStep
            ? '🎉 முடிந்தது! / Finish!'
            : activityComplete
              ? '✅ அடுத்தது / Next Step →'
              : isInteractive
                ? '🔒 மணிகளை நகர்த்துங்கள் / Move the beads first'
                : 'அடுத்தது / Next Step →'
          }
        </button>
      </div>
    </div>
  );
}
