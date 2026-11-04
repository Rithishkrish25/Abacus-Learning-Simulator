import { useState, useEffect, useCallback, useRef } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { PlaceValueOverlay } from '../components/PlaceValueOverlay';
import { BeadGuideOverlay } from '../components/BeadGuideOverlay';
import { DemoAnimation } from '../components/DemoAnimation';
import { LEVEL_DEFINITIONS } from '../levels/levelDefinitions';
import { SOROBAN_BASICS_STEPS } from '../lessons/sorobanLearningSteps';
import {
  useAbacusStore,
  rodDigit,
  sorobanValue,
} from '../store/useAbacusStore';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import {
  generateProblem,
  generateAdditionSteps,
  generateSubtractionSteps,
  stepIsComplete,
  type ArithmeticProblem,
} from '../arithmetic/arithmeticEngine';
import type { RodIndex } from '../types/abacus';

interface LevelScreenProps {
  levelIndex: number;       // 0-based
  onBack: () => void;       // return to level map
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeChallengeProblem(max: number): number {
  return randomInt(1, max);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LevelScreen({ levelIndex, onBack }: LevelScreenProps) {
  const level   = LEVEL_DEFINITIONS[levelIndex]!;
  const phases  = level.phases;

  // ── abacus store ──
  const rods       = useAbacusStore((s) => s.rods);
  const history    = useAbacusStore((s) => s.history);
  const redoStack  = useAbacusStore((s) => s.redoStack);
  const reset      = useAbacusStore((s) => s.reset);
  const undo       = useAbacusStore((s) => s.undo);
  const redo       = useAbacusStore((s) => s.redo);
  const setRodDigit = useAbacusStore((s) => s.setRodDigit);

  // ── progress store ──
  const completeLevel  = useProgressStore((s) => s.completeLevel);

  // ── phase state ──
  const [phaseIndex,    setPhaseIndex]    = useState(0);
  const [showSummary,   setShowSummary]   = useState(false);
  const [newBadgeIds,   setNewBadgeIds]   = useState<string[]>([]);

  // ── challenge / arithmetic state ──
  const [score,         setScore]         = useState(0);        // correct answers
  const [total,         setTotal]         = useState(0);        // questions attempted
  const [questionsDone, setQuestionsDone] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState(0);
  const [answerSubmitted,  setAnswerSubmitted]  = useState(false);
  const [lastCorrect,      setLastCorrect]      = useState(false);

  // ── arithmetic problem state ──
  const [problem,      setProblem]      = useState<ArithmeticProblem | null>(null);
  const [stepIdx,      setStepIdx]      = useState(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hintVisible,  setHintVisible]  = useState(false);

  // ── demo animation ──
  const [showDemo, setShowDemo] = useState(false);

  // ── free-explore tracker ──
  const maxNumberRef = useRef(0);

  const phase          = phases[phaseIndex]!;
  const isLastPhase    = phaseIndex === phases.length - 1;
  const liveTotal      = sorobanValue(rods);
  const canUndo        = history.length > 0;
  const canRedo        = redoStack.length > 0;

  // ─── current lesson step (for observe / guided phases) ───────────────────
  const lessonStep = (phase.type === 'observe' || phase.type === 'guided') && phase.lessonStepId
    ? SOROBAN_BASICS_STEPS.find((s) => s.id === phase.lessonStepId) ?? null
    : null;

  // ─── reset abacus on phase change ────────────────────────────────────────
  useEffect(() => {
    reset();
    setAnswerSubmitted(false);
    setLastCorrect(false);
    setHintVisible(false);

    if (hintTimer.current) clearTimeout(hintTimer.current);

    if (phase.type === 'observe' && lessonStep?.targetState) {
      // Apply the lesson step's preset bead state
      const state = lessonStep.targetState;
      setTimeout(() => {
        state.forEach((rod) => {
          const digit = (rod.heavenActive ? 5 : 0) + rod.earthActive;
          if (digit > 0) setRodDigit(rod.rodIndex as RodIndex, digit);
        });
      }, 80);
    }

    if (phase.type === 'guided' && lessonStep?.targetState) {
      // Clear abacus — student must build the target themselves
      reset();
    }

    if (phase.type === 'challenge') {
      const target = makeChallengeProblem(phase.challengeMax ?? 9);
      setChallengeTarget(target);
      setQuestionsDone(false);
      setTotal(0);
      setScore(0);
    }

    if (phase.type === 'arithmetic-add' || phase.type === 'arithmetic-sub' || phase.type === 'arithmetic-mixed') {
      // Override operator for add-only / sub-only phases
      const filtered = buildArithmeticProblem(phase.type);
      setProblem(filtered);
      setStepIdx(0);
      setTotal(0);
      setScore(0);
      setQuestionsDone(false);
      // Show demo for first arithmetic step
      setTimeout(() => setShowDemo(true), 400);
    }

    if (phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit') {
      setTimeout(() => setShowDemo(true), 400);
    }

    if (phase.type === 'free-explore') {
      maxNumberRef.current = 0;
    }
  }, [phaseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── hint timer for arithmetic ───────────────────────────────────────────
  useEffect(() => {
    if (phase.type !== 'arithmetic-add' && phase.type !== 'arithmetic-sub' && phase.type !== 'arithmetic-mixed') return;
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintVisible(false);
    hintTimer.current = setTimeout(() => setHintVisible(true), 30_000);
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, [stepIdx, problem]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── track max number in free-explore ────────────────────────────────────
  useEffect(() => {
    if (phase.type === 'free-explore') {
      const v = sorobanValue(rods);
      if (v > maxNumberRef.current) maxNumberRef.current = v;
    }
  }, [rods, phase.type]);

  // ─── activity complete logic ──────────────────────────────────────────────
  const guidedComplete = (() => {
    if (phase.type !== 'guided' || !lessonStep?.activity) return true;
    const activity = lessonStep.activity;
    switch (activity.type) {
      case 'observe': return true;
      case 'set-digit': {
        const rodIdx = activity.rodIndex ?? 4;
        const d = rodDigit(rods[rodIdx] ?? { rodIndex: 0, heavenActive: false, earthActive: 0 });
        return d === (activity.targetDigit ?? 0);
      }
      case 'set-number': return sorobanValue(rods) === (activity.targetNumber ?? 0);
      default: return true;
    }
  })();

  const arithmeticStepComplete = (() => {
    if (!problem || !problem.steps[stepIdx]) return false;
    return stepIsComplete(rods, problem.steps[stepIdx]!.expectedState);
  })();

  // ─── guide type for BeadGuideOverlay ─────────────────────────────────────
  const guideType = (() => {
    if (phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit') {
      return 'both-for-digit' as const;
    }
    return undefined;
  })();

  // ─── advance to next question inside a multi-question phase ──────────────
  function buildArithmeticProblem(
    ptype: 'arithmetic-add' | 'arithmetic-sub' | 'arithmetic-mixed'
  ): ArithmeticProblem {
    if (ptype === 'arithmetic-add') {
      const a = randomInt(1, 8);
      const b = randomInt(1, 9 - a);
      return { operandA: a, operandB: b, operator: '+', answer: a + b, steps: generateAdditionSteps(a, b) };
    }
    if (ptype === 'arithmetic-sub') {
      const a = randomInt(2, 9);
      const b = randomInt(1, a - 1);
      return { operandA: a, operandB: b, operator: '-', answer: a - b, steps: generateSubtractionSteps(a, b) };
    }
    return generateProblem();
  }

  // ─── handlers ────────────────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    // Guided / observe → just advance phase
    if (phase.type === 'observe' || (phase.type === 'guided' && guidedComplete)) {
      advancePhase();
      return;
    }
    if (phase.type === 'free-explore') {
      advancePhase();
      return;
    }
  }, [phase.type, guidedComplete, phaseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleArithmeticNext = useCallback(() => {
    if (!problem || !arithmeticStepComplete) return;
    const ptype = phase.type as 'arithmetic-add' | 'arithmetic-sub' | 'arithmetic-mixed';
    const maxQ  = phase.questionCount ?? 8;

    if (stepIdx < problem.steps.length - 1) {
      // More steps in this problem
      setStepIdx((i) => i + 1);
      reset();
      setHintVisible(false);
    } else {
      // Problem complete
      const newScore = score + 1;
      const newTotal = total + 1;
      setScore(newScore);
      setTotal(newTotal);
      reset();

      if (newTotal >= maxQ) {
        // Phase complete
        setQuestionsDone(true);
      } else {
        // Next problem
        const next = buildArithmeticProblem(ptype);
        setProblem(next);
        setStepIdx(0);
        setHintVisible(false);
        setTimeout(() => setShowDemo(true), 300);
      }
    }
  }, [problem, arithmeticStepComplete, stepIdx, score, total, phase, reset]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChallengeSubmit = useCallback(() => {
    if (answerSubmitted) return;
    const correct = liveTotal === challengeTarget;
    setLastCorrect(correct);
    if (correct) setScore((s) => s + 1);
    setTotal((t) => t + 1);
    setAnswerSubmitted(true);
  }, [answerSubmitted, liveTotal, challengeTarget]);

  const handleChallengeNext = useCallback(() => {
    const maxQ  = phase.questionCount ?? 5;
    const done  = total + 1 >= maxQ;  // total was incremented in submit

    if (done) {
      setQuestionsDone(true);
    } else {
      const target = makeChallengeProblem(phase.challengeMax ?? 9);
      setChallengeTarget(target);
      setAnswerSubmitted(false);
      setLastCorrect(false);
      reset();
    }
  }, [total, phase, reset]);

  const handlePhaseComplete = useCallback(() => {
    if (isLastPhase) {
      // All phases done — complete the level
      const pct = computeScore();
      const earned = completeLevel(levelIndex, pct);
      setNewBadgeIds(earned);
      setShowSummary(true);
    } else {
      advancePhase();
    }
  }, [isLastPhase, levelIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function advancePhase() {
    setPhaseIndex((i) => i + 1);
  }

  function computeScore(): number {
    // For observe / guided phases: 100%
    // For arithmetic / challenge: percentage of correct answers
    const phaseTypes = phases.map((p) => p.type);
    const hasQuestions = phaseTypes.some((t) =>
      t === 'arithmetic-add' || t === 'arithmetic-sub' || t === 'arithmetic-mixed' || t === 'challenge'
    );
    if (!hasQuestions) return 100;
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  }

  // ─── render helpers ───────────────────────────────────────────────────────

  const renderBottomPanel = () => {
    // ── FREE EXPLORE ──
    if (phase.type === 'free-explore') {
      return (
        <div className="ls-panel ls-panel--free">
          <div className="ls-free-row">
            <div className="ls-free-display">
              <span className="ls-free-label">Soroban / சோரோபன்</span>
              <span className="ls-free-value">{liveTotal}</span>
            </div>
            <div className="ls-free-controls">
              <button className="ls-btn ls-btn--secondary" onClick={reset}>🔄 Reset</button>
              <button className={`ls-btn ls-btn--secondary${!canUndo ? ' ls-btn--disabled' : ''}`} onClick={undo} disabled={!canUndo}>↩ Undo</button>
              <button className={`ls-btn ls-btn--secondary${!canRedo ? ' ls-btn--disabled' : ''}`} onClick={redo} disabled={!canRedo}>↪ Redo</button>
            </div>
          </div>
          <div className="ls-free-hint">
            <span>சுதந்திரமாக எந்த எண்ணையும் அமைக்கவும்!</span>
            <span>Set any number freely to explore!</span>
          </div>
          <button className="ls-next-btn ls-next-btn--ready" onClick={handleNext}>
            Continue → தொடரவும்
          </button>
        </div>
      );
    }

    // ── OBSERVE ──
    if (phase.type === 'observe') {
      return (
        <div className="ls-panel">
          {lessonStep && (
            <div className="ls-observe-text">
              <p className="ls-observe-en">{lessonStep.explanation}</p>
              {lessonStep.tamilExplanation && (
                <p className="ls-observe-ta">{lessonStep.tamilExplanation}</p>
              )}
            </div>
          )}
          <button className="ls-next-btn ls-next-btn--ready" onClick={handleNext}>
            அடுத்தது / Next →
          </button>
        </div>
      );
    }

    // ── GUIDED ──
    if (phase.type === 'guided' && lessonStep) {
      const act = lessonStep.activity;
      const isComplete = guidedComplete;
      return (
        <div className={`ls-panel${isComplete ? ' ls-panel--success' : ''}`}>
          <div className="ls-guided-instruction">
            <span className="ls-guided-en">{act?.instruction ?? lessonStep.explanation}</span>
            {act?.tamilInstruction && <span className="ls-guided-ta">{act.tamilInstruction}</span>}
          </div>

          {/* Progress display */}
          {act?.type === 'set-digit' && !isComplete && (
            <div className="ls-progress-row">
              <span>Now / இப்போது: <strong>{rodDigit(rods[act.rodIndex ?? 4] ?? { rodIndex: 0, heavenActive: false, earthActive: 0 })}</strong></span>
              <span className="ls-progress-arrow">→</span>
              <span>Target / இலக்கு: <strong>{act.targetDigit ?? 0}</strong></span>
            </div>
          )}
          {act?.type === 'set-number' && !isComplete && (
            <div className="ls-progress-row">
              <span>Now / இப்போது: <strong>{liveTotal}</strong></span>
              <span className="ls-progress-arrow">→</span>
              <span>Target / இலக்கு: <strong>{act.targetNumber ?? 0}</strong></span>
            </div>
          )}

          {isComplete && (
            <div className="ls-success-row">
              <span className="ls-success-icon">✅</span>
              <div>
                <span className="ls-success-en">Well done! Correct!</span>
                <span className="ls-success-ta">சரியாக செய்தீர்கள்!</span>
              </div>
              {act?.type === 'set-digit' && <span className="ls-success-value">{liveTotal}</span>}
            </div>
          )}

          <button
            className={`ls-next-btn${isComplete ? ' ls-next-btn--success' : ' ls-next-btn--locked'}`}
            onClick={isComplete ? handleNext : undefined}
            disabled={!isComplete}
          >
            {isComplete ? '✅ அடுத்தது / Next Step →' : '🔒 மணிகளை நகர்த்துங்கள் / Move beads first'}
          </button>
        </div>
      );
    }

    // ── CHALLENGE ──
    if (phase.type === 'challenge') {
      if (questionsDone) {
        const pct = Math.round((score / (phase.questionCount ?? 5)) * 100);
        return (
          <div className="ls-panel ls-panel--done">
            <div className="ls-done-row">
              <span className="ls-done-emoji">{pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪'}</span>
              <div>
                <span className="ls-done-en">{score}/{phase.questionCount ?? 5} correct — {pct}%</span>
                <span className="ls-done-ta">{score}/{phase.questionCount ?? 5} சரியான விடை — {pct}%</span>
              </div>
            </div>
            <button className="ls-next-btn ls-next-btn--success" onClick={handlePhaseComplete}>
              {isLastPhase ? '🎉 Finish Level!' : 'Continue → தொடரவும்'}
            </button>
          </div>
        );
      }

      return (
        <div className={`ls-panel${answerSubmitted ? (lastCorrect ? ' ls-panel--success' : ' ls-panel--wrong') : ''}`}>
          <div className="ls-challenge-row">
            <div className="ls-challenge-target">
              <span className="ls-challenge-label">Show this number / இந்த எண்ணை காட்டு</span>
              <span className="ls-challenge-number">{challengeTarget}</span>
            </div>
            <div className="ls-challenge-live">
              <span className="ls-challenge-label">Soroban shows / காட்டுகிறது</span>
              <span className={`ls-challenge-number${liveTotal === challengeTarget ? ' ls-challenge-number--match' : ''}`}>{liveTotal}</span>
            </div>
          </div>

          {!answerSubmitted && (
            <div className="ls-challenge-hint" aria-live="polite">
              {liveTotal === challengeTarget ? '✓ Ready! / தயார்!' : liveTotal < challengeTarget ? `Need ${challengeTarget - liveTotal} more` : `Over by ${liveTotal - challengeTarget}`}
            </div>
          )}

          {answerSubmitted && (
            <div className={`ls-feedback${lastCorrect ? ' ls-feedback--correct' : ' ls-feedback--wrong'}`} role="alert">
              {lastCorrect ? '🎉 Correct! சரியாக!' : `❌ Answer was ${challengeTarget} / விடை ${challengeTarget}`}
            </div>
          )}

          <div className="ls-btn-row">
            <button className="ls-btn ls-btn--secondary" onClick={reset}>🔄 Reset</button>
            {!answerSubmitted && (
              <button className="ls-btn ls-btn--primary" onClick={handleChallengeSubmit}>✓ Submit / சமர்ப்பி</button>
            )}
            {answerSubmitted && (
              <button className="ls-next-btn ls-next-btn--ready" onClick={handleChallengeNext}>
                {total >= (phase.questionCount ?? 5) - 1 ? 'See Results / முடிவுகள்' : 'Next Question / அடுத்த கேள்வி →'}
              </button>
            )}
          </div>

          <div className="ls-qprogress" aria-label={`Question ${total + (answerSubmitted ? 0 : 0) + 1} of ${phase.questionCount ?? 5}`}>
            {Array.from({ length: phase.questionCount ?? 5 }, (_, i) => (
              <span key={i} className={`ls-qpip${i < total ? ' ls-qpip--done' : i === total && answerSubmitted ? (lastCorrect ? ' ls-qpip--correct' : ' ls-qpip--wrong') : ''}`} />
            ))}
          </div>
        </div>
      );
    }

    // ── ARITHMETIC ──
    if (
      (phase.type === 'arithmetic-add' || phase.type === 'arithmetic-sub' || phase.type === 'arithmetic-mixed')
      && problem
    ) {
      const currentStep = problem.steps[stepIdx]!;
      const isStepDone  = arithmeticStepComplete;

      if (questionsDone) {
        const pct = Math.round((score / (phase.questionCount ?? 8)) * 100);
        return (
          <div className="ls-panel ls-panel--done">
            <div className="ls-done-row">
              <span className="ls-done-emoji">{pct >= 80 ? '🌟' : pct >= 60 ? '👍' : '💪'}</span>
              <div>
                <span className="ls-done-en">{score}/{phase.questionCount ?? 8} correct — {pct}%</span>
                <span className="ls-done-ta">{score}/{phase.questionCount ?? 8} சரியான விடை — {pct}%</span>
              </div>
            </div>
            <button className="ls-next-btn ls-next-btn--success" onClick={handlePhaseComplete}>
              {isLastPhase ? '🎉 Finish Level!' : 'Continue → தொடரவும்'}
            </button>
          </div>
        );
      }

      return (
        <div className={`ls-panel${isStepDone ? ' ls-panel--success' : ''}`}>
          {/* Expression header */}
          <div className="ls-arith-header">
            <span className="ls-arith-expr">
              {problem.operandA} {problem.operator} {problem.operandB} = ?
            </span>
            <span className="ls-arith-step">{stepIdx + 1}/{problem.steps.length}</span>
            <span className="ls-qprogress-inline">{total}/{phase.questionCount ?? 8}</span>
          </div>

          {/* Instruction */}
          <div className="ls-arith-instruction">{currentStep.instruction}</div>
          <span className="ls-arith-badge">{currentStep.technique}</span>

          {isStepDone && (
            <div className="ls-success-row">
              <span className="ls-success-icon">✅</span>
              <span className="ls-success-en">Correct! சரியாக!</span>
            </div>
          )}

          {hintVisible && !isStepDone && (
            <div className="ls-hint">💡 {currentStep.instruction}</div>
          )}

          <div className="ls-btn-row">
            <button className="ls-btn ls-btn--secondary" onClick={reset}>🔄 Reset</button>
            <button
              className={`ls-next-btn${isStepDone ? ' ls-next-btn--success' : ' ls-next-btn--locked'}`}
              onClick={handleArithmeticNext}
              disabled={!isStepDone}
            >
              {stepIdx < problem.steps.length - 1 ? (isStepDone ? '✅ Next Step →' : '🔒 Move beads first') : (isStepDone ? '✅ Done! →' : '🔒 Move beads first')}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── level complete summary ───────────────────────────────────────────────
  if (showSummary) {
    const finalScore = computeScore();
    return (
      <div className="ls-root">
        <div className="ls-summary-overlay">
          <div className="ls-summary-card">
            <div className="ls-summary-emoji">{finalScore >= 80 ? '🏆' : finalScore >= 60 ? '🌟' : '🎯'}</div>
            <h2 className="ls-summary-title">Level {level.id} Complete!</h2>
            <p className="ls-summary-title-ta">நிலை {level.id} முடிந்தது!</p>
            <div className="ls-summary-score">{finalScore}%</div>
            <div className="ls-summary-stars">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`ls-sum-star${finalScore >= n * 34 ? ' ls-sum-star--lit' : ''}`}>⭐</span>
              ))}
            </div>
            {newBadgeIds.length > 0 && (
              <div className="ls-summary-badges">
                {newBadgeIds.map((id) => {
                  const b = ALL_BADGES.find((x) => x.id === id);
                  return b ? (
                    <div key={id} className="ls-summary-badge">
                      <span>{b.emoji}</span>
                      <span>{b.name}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <button className="ls-next-btn ls-next-btn--success" onClick={onBack}>
              🗺 Back to Levels / நிலை வரைபடம்
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── main render ─────────────────────────────────────────────────────────
  return (
    <div className="ls-root">

      {/* ── Header bar ── */}
      <div className="ls-header">
        <button className="practice-back-btn" onClick={onBack} aria-label="Back to levels">
          ← Levels
        </button>
        <div className="ls-header-center">
          <span className="ls-level-badge">Level {level.id}</span>
          <span className="ls-level-title">{level.emoji} {level.titleEn}</span>
          <span className="ls-level-title-ta">{level.titleTa}</span>
        </div>
        {/* Phase progress dots */}
        <div className="ls-phase-dots" aria-label={`Phase ${phaseIndex + 1} of ${phases.length}`}>
          {phases.map((_, i) => (
            <span key={i} className={`ls-phase-dot${i < phaseIndex ? ' ls-phase-dot--done' : i === phaseIndex ? ' ls-phase-dot--active' : ''}`} />
          ))}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="ls-canvas-area">
        <AbacusScene highlightRods={
          phase.type === 'guided' && lessonStep?.highlightRods ? lessonStep.highlightRods :
          (phase.type === 'arithmetic-add' || phase.type === 'arithmetic-sub' || phase.type === 'arithmetic-mixed') && problem
            ? [problem.steps[stepIdx]?.rodIndex ?? 4]
            : phase.type === 'observe' && lessonStep?.highlightRods ? lessonStep.highlightRods
            : []
        } />
        <PlaceValueOverlay highlightRods={
          phase.type === 'guided' && lessonStep?.highlightRods ? lessonStep.highlightRods : []
        } />

        {/* Bead guide overlay */}
        {phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit' && !guidedComplete && (
          <BeadGuideOverlay
            rodIndex={lessonStep.activity.rodIndex ?? 4}
            guideType={guideType}
            targetDigit={lessonStep.activity.targetDigit}
            complete={guidedComplete}
          />
        )}

        {/* Demo animation */}
        {showDemo && (
          <DemoAnimation
            targetDigit={
              phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit'
                ? lessonStep.activity.targetDigit
                : problem?.steps[0] ? undefined : undefined
            }
            guideType={
              phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit'
                ? 'both-for-digit'
                : (phase.type === 'arithmetic-add' || phase.type === 'arithmetic-sub' || phase.type === 'arithmetic-mixed')
                  ? 'both-for-digit'
                  : null
            }
            onDone={() => setShowDemo(false)}
          />
        )}
      </div>

      {/* ── Bottom instruction panel ── */}
      {renderBottomPanel()}
    </div>
  );
}
