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
  levelIndex: number;
  onBack: () => void;
  onLevelComplete: (levelIndex: number) => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeChallengeProblem(max: number): number {
  return randomInt(1, max);
}

/** Format seconds as M:SS */
function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LevelScreen({ levelIndex, onBack, onLevelComplete }: LevelScreenProps) {
  const level  = LEVEL_DEFINITIONS[levelIndex]!;
  const phases = level.phases;
  const totalLevels = LEVEL_DEFINITIONS.length;

  // ── abacus store ──
  const rods      = useAbacusStore((s) => s.rods);
  const history   = useAbacusStore((s) => s.history);
  const redoStack = useAbacusStore((s) => s.redoStack);
  const reset     = useAbacusStore((s) => s.reset);
  const undo      = useAbacusStore((s) => s.undo);
  const redo      = useAbacusStore((s) => s.redo);
  const setRodDigit = useAbacusStore((s) => s.setRodDigit);

  // ── progress store ──
  const completeLevel = useProgressStore((s) => s.completeLevel);

  // ── phase state ──
  const [phaseIndex,  setPhaseIndex]  = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  // ── challenge / arithmetic state ──
  const [score,           setScore]           = useState(0);
  const [total,           setTotal]           = useState(0);
  const [questionsDone,   setQuestionsDone]   = useState(false);
  const [challengeTarget, setChallengeTarget] = useState(0);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [lastCorrect,     setLastCorrect]     = useState(false);

  // ── arithmetic problem state ──
  const [problem,     setProblem]     = useState<ArithmeticProblem | null>(null);
  const [stepIdx,     setStepIdx]     = useState(0);
  const hintTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hintVisible, setHintVisible] = useState(false);

  // ── demo animation ──
  const [showDemo, setShowDemo] = useState(false);

  // ── free-explore tracker ──
  const maxNumberRef = useRef(0);

  // ── countdown timer ──
  const [timeLeft,        setTimeLeft]        = useState<number | null>(null);
  const [,                setTimerRunning]     = useState(false);
  const [timeTakenSecs,   setTimeTakenSecs]    = useState(0);  // seconds used when phase ended
  const timerIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef      = useRef<number>(0);  // epoch ms when timer started

  const phase       = phases[phaseIndex]!;
  const isLastPhase = phaseIndex === phases.length - 1;
  const liveTotal   = sorobanValue(rods);
  const canUndo     = history.length > 0;
  const canRedo     = redoStack.length > 0;

  // ─── current lesson step ─────────────────────────────────────────────────
  const lessonStep =
    (phase.type === 'observe' || phase.type === 'guided') && phase.lessonStepId
      ? SOROBAN_BASICS_STEPS.find((s) => s.id === phase.lessonStepId) ?? null
      : null;

  // ─── timer helpers ────────────────────────────────────────────────────────

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setTimerRunning(false);
    if (startTimeRef.current > 0) {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTimeTakenSecs((prev) => prev + elapsed);
      startTimeRef.current = 0;
    }
  }, []);

  const startTimer = useCallback((limitSecs: number) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setTimeLeft(limitSecs);
    setTimerRunning(true);
    startTimeRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          // Time's up
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          setTimerRunning(false);
          setQuestionsDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ─── reset abacus + timer on phase change ────────────────────────────────
  useEffect(() => {
    reset();
    setAnswerSubmitted(false);
    setLastCorrect(false);
    setHintVisible(false);
    setTimeLeft(null);
    setTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    startTimeRef.current = 0;

    if (hintTimer.current) clearTimeout(hintTimer.current);

    if (phase.type === 'observe' && lessonStep?.targetState) {
      const state = lessonStep.targetState;
      setTimeout(() => {
        state.forEach((rod) => {
          const digit = (rod.heavenActive ? 5 : 0) + rod.earthActive;
          if (digit > 0) setRodDigit(rod.rodIndex as RodIndex, digit);
        });
      }, 80);
    }

    if (phase.type === 'challenge') {
      const target = makeChallengeProblem(phase.challengeMax ?? 9);
      setChallengeTarget(target);
      setQuestionsDone(false);
      setTotal(0);
      setScore(0);
      // Timer starts when first question appears
      if (phase.timeLimitSeconds) {
        startTimer(phase.timeLimitSeconds);
      }
    }

    if (
      phase.type === 'arithmetic-add' ||
      phase.type === 'arithmetic-sub' ||
      phase.type === 'arithmetic-mixed'
    ) {
      const filtered = buildArithmeticProblem(phase.type);
      setProblem(filtered);
      setStepIdx(0);
      setTotal(0);
      setScore(0);
      setQuestionsDone(false);
      // Timer starts immediately when first problem appears
      if (phase.timeLimitSeconds) {
        startTimer(phase.timeLimitSeconds);
      }
      setTimeout(() => setShowDemo(true), 400);
    }

    if (phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit') {
      setTimeout(() => setShowDemo(true), 400);
    }

    if (phase.type === 'free-explore') {
      maxNumberRef.current = 0;
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phaseIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── hint timer for arithmetic ────────────────────────────────────────────
  useEffect(() => {
    if (
      phase.type !== 'arithmetic-add' &&
      phase.type !== 'arithmetic-sub' &&
      phase.type !== 'arithmetic-mixed'
    ) return;
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

  const guideType = (() => {
    if (phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit') {
      return 'both-for-digit' as const;
    }
    return undefined;
  })();

  // ─── build arithmetic problem ─────────────────────────────────────────────
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

  const advancePhase = useCallback(() => {
    setPhaseIndex((i) => i + 1);
  }, []);

  const computeScore = useCallback((): number => {
    const phaseTypes = phases.map((p) => p.type);
    const hasQuestions = phaseTypes.some((t) =>
      t === 'arithmetic-add' || t === 'arithmetic-sub' || t === 'arithmetic-mixed' || t === 'challenge'
    );
    if (!hasQuestions) return 100;
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  }, [phases, score, total]);

  const handlePhaseComplete = useCallback(() => {
    stopTimer();
    if (isLastPhase) {
      const pct    = computeScore();
      const earned = completeLevel(levelIndex, pct);
      setNewBadgeIds(earned);
      setShowSummary(true);
    } else {
      advancePhase();
    }
  }, [isLastPhase, levelIndex, stopTimer, computeScore, completeLevel, advancePhase]);

  const handleNext = useCallback(() => {
    if (phase.type === 'observe' || (phase.type === 'guided' && guidedComplete) || phase.type === 'free-explore') {
      if (isLastPhase) {
        handlePhaseComplete();
      } else {
        advancePhase();
      }
    }
  }, [phase.type, guidedComplete, isLastPhase, handlePhaseComplete, advancePhase]);

  const handleArithmeticNext = useCallback(() => {
    if (!problem || !arithmeticStepComplete) return;
    const ptype = phase.type as 'arithmetic-add' | 'arithmetic-sub' | 'arithmetic-mixed';
    const maxQ  = phase.questionCount ?? 8;

    if (stepIdx < problem.steps.length - 1) {
      setStepIdx((i) => i + 1);
      reset();
      setHintVisible(false);
    } else {
      const newScore = score + 1;
      const newTotal = total + 1;
      setScore(newScore);
      setTotal(newTotal);
      reset();

      if (newTotal >= maxQ) {
        stopTimer();
        setQuestionsDone(true);
      } else {
        const next = buildArithmeticProblem(ptype);
        setProblem(next);
        setStepIdx(0);
        setHintVisible(false);
        setTimeout(() => setShowDemo(true), 300);
      }
    }
  }, [problem, arithmeticStepComplete, stepIdx, score, total, phase, reset, stopTimer]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChallengeSubmit = useCallback(() => {
    if (answerSubmitted) return;
    const correct = liveTotal === challengeTarget;
    setLastCorrect(correct);
    if (correct) setScore((s) => s + 1);
    setTotal((t) => t + 1);
    setAnswerSubmitted(true);
  }, [answerSubmitted, liveTotal, challengeTarget]);

  const handleChallengeNext = useCallback(() => {
    const maxQ = phase.questionCount ?? 5;
    if (total + 1 >= maxQ) {
      stopTimer();
      setQuestionsDone(true);
    } else {
      const target = makeChallengeProblem(phase.challengeMax ?? 9);
      setChallengeTarget(target);
      setAnswerSubmitted(false);
      setLastCorrect(false);
      reset();
    }
  }, [total, phase, reset, stopTimer]);

  // ─── Timer display bar ────────────────────────────────────────────────────
  const renderTimer = () => {
    if (timeLeft === null) return null;
    const limit = phase.timeLimitSeconds ?? 60;
    const pct   = Math.max(0, (timeLeft / limit) * 100);
    const isLow = timeLeft <= 10;

    return (
      <div className={`ls-timer${isLow ? ' ls-timer--low' : ''}`} aria-live="assertive" aria-label={`Time remaining: ${formatTime(timeLeft)}`}>
        <span className="ls-timer-icon" aria-hidden="true">{isLow ? '⚠️' : '⏱'}</span>
        <div className="ls-timer-bar-wrap">
          <div
            className={`ls-timer-bar${isLow ? ' ls-timer-bar--low' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="ls-timer-value">{formatTime(timeLeft)}</span>
      </div>
    );
  };

  // ─── Bottom panel ─────────────────────────────────────────────────────────
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
              <button className="ls-btn ls-btn--secondary" onClick={reset}>🔄</button>
              <button className={`ls-btn ls-btn--secondary${!canUndo ? ' ls-btn--disabled' : ''}`} onClick={undo} disabled={!canUndo}>↩</button>
              <button className={`ls-btn ls-btn--secondary${!canRedo ? ' ls-btn--disabled' : ''}`} onClick={redo} disabled={!canRedo}>↪</button>
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
      const act        = lessonStep.activity;
      const isComplete = guidedComplete;
      return (
        <div className={`ls-panel${isComplete ? ' ls-panel--success' : ''}`}>
          <div className="ls-guided-instruction">
            <span className="ls-guided-en">{act?.instruction ?? lessonStep.explanation}</span>
            {act?.tamilInstruction && <span className="ls-guided-ta">{act.tamilInstruction}</span>}
          </div>

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
            </div>
          )}

          <button
            className={`ls-next-btn${isComplete ? ' ls-next-btn--success' : ' ls-next-btn--locked'}`}
            onClick={isComplete ? handleNext : undefined}
            disabled={!isComplete}
          >
            {isComplete ? '✅ அடுத்தது / Next →' : '🔒 மணிகளை நகர்த்துங்கள் / Move beads first'}
          </button>
        </div>
      );
    }

    // ── CHALLENGE ──
    if (phase.type === 'challenge') {
      if (questionsDone) {
        const pct = phase.questionCount ? Math.round((score / phase.questionCount) * 100) : 100;
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
          {renderTimer()}
          <div className="ls-challenge-row">
            <div className="ls-challenge-target">
              <span className="ls-challenge-label">Show / காட்டு</span>
              <span className="ls-challenge-number">{challengeTarget}</span>
            </div>
            <div className="ls-challenge-live">
              <span className="ls-challenge-label">Soroban</span>
              <span className={`ls-challenge-number${liveTotal === challengeTarget ? ' ls-challenge-number--match' : ''}`}>{liveTotal}</span>
            </div>
            <div className="ls-challenge-qcount" aria-label={`Question ${total + 1} of ${phase.questionCount ?? 5}`}>
              {Array.from({ length: phase.questionCount ?? 5 }, (_, i) => (
                <span key={i} className={`ls-qpip${i < total ? ' ls-qpip--done' : i === total && answerSubmitted ? (lastCorrect ? ' ls-qpip--correct' : ' ls-qpip--wrong') : ''}`} />
              ))}
            </div>
          </div>

          {!answerSubmitted && (
            <div className="ls-challenge-hint" aria-live="polite">
              {liveTotal === challengeTarget
                ? '✓ Ready! / தயார்!'
                : liveTotal < challengeTarget
                  ? `Need ${challengeTarget - liveTotal} more`
                  : `Over by ${liveTotal - challengeTarget}`
              }
            </div>
          )}
          {answerSubmitted && (
            <div className={`ls-feedback${lastCorrect ? ' ls-feedback--correct' : ' ls-feedback--wrong'}`} role="alert">
              {lastCorrect ? '🎉 Correct! சரியாக!' : `❌ Answer: ${challengeTarget}`}
            </div>
          )}

          <div className="ls-btn-row">
            <button className="ls-btn ls-btn--secondary" onClick={reset}>🔄</button>
            {!answerSubmitted && (
              <button className="ls-btn ls-btn--primary" onClick={handleChallengeSubmit}>
                ✓ Submit / சமர்ப்பி
              </button>
            )}
            {answerSubmitted && (
              <button className="ls-next-btn ls-next-btn--ready" onClick={handleChallengeNext}>
                {total >= (phase.questionCount ?? 5) - 1 ? 'Results / முடிவுகள்' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      );
    }

    // ── ARITHMETIC ──
    if (
      (phase.type === 'arithmetic-add' || phase.type === 'arithmetic-sub' || phase.type === 'arithmetic-mixed') &&
      problem
    ) {
      const currentStep = problem.steps[stepIdx]!;
      const isStepDone  = arithmeticStepComplete;

      if (questionsDone) {
        const pct = phase.questionCount ? Math.round((score / phase.questionCount) * 100) : 100;
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
          {renderTimer()}
          <div className="ls-arith-header">
            <span className="ls-arith-expr">{problem.operandA} {problem.operator} {problem.operandB} = ?</span>
            <span className="ls-arith-step">{stepIdx + 1}/{problem.steps.length}</span>
            <span className="ls-qprogress-inline">{total}/{phase.questionCount ?? 8}</span>
          </div>
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
            <button className="ls-btn ls-btn--secondary" onClick={reset}>🔄</button>
            <button
              className={`ls-next-btn${isStepDone ? ' ls-next-btn--success' : ' ls-next-btn--locked'}`}
              onClick={handleArithmeticNext}
              disabled={!isStepDone}
            >
              {stepIdx < problem.steps.length - 1
                ? (isStepDone ? '✅ Next Step →' : '🔒 Move beads first')
                : (isStepDone ? '✅ Done! →' : '🔒 Move beads first')
              }
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Level complete summary ───────────────────────────────────────────────
  if (showSummary) {
    const finalScore = computeScore();
    const isLastLevel = levelIndex >= totalLevels - 1;
    const mins = Math.floor(timeTakenSecs / 60);
    const secs = timeTakenSecs % 60;
    const timeStr = timeTakenSecs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : '—';

    return (
      <div className="ls-root">
        <div className="ls-summary-overlay">
          <div className="ls-summary-card">
            <div className="ls-summary-emoji">{finalScore >= 80 ? '🏆' : finalScore >= 60 ? '🌟' : '🎯'}</div>

            <h2 className="ls-summary-title">Level {level.id} Complete!</h2>
            <p className="ls-summary-title-ta">நிலை {level.id} முடிந்தது!</p>

            {/* Score + time */}
            <div className="ls-summary-stats">
              <div className="ls-summary-stat">
                <span className="ls-summary-stat-val">{finalScore}%</span>
                <span className="ls-summary-stat-lbl">Score · மதிப்பெண்</span>
              </div>
              {timeTakenSecs > 0 && (
                <div className="ls-summary-stat">
                  <span className="ls-summary-stat-val">{timeStr}</span>
                  <span className="ls-summary-stat-lbl">Time · நேரம்</span>
                </div>
              )}
            </div>

            {/* Stars */}
            <div className="ls-summary-stars">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`ls-sum-star${finalScore >= n * 34 ? ' ls-sum-star--lit' : ''}`}>⭐</span>
              ))}
            </div>

            {/* New badges */}
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

            {/* Level progress indicator */}
            <div className="ls-summary-level-progress">
              <span className="ls-summary-level-label">Level {level.id} of {totalLevels}</span>
              <div className="ls-summary-level-bar">
                <div className="ls-summary-level-fill" style={{ width: `${(level.id / totalLevels) * 100}%` }} />
              </div>
            </div>

            {/* CTA buttons */}
            <div className="ls-summary-actions">
              {!isLastLevel ? (
                <button
                  className="ls-summary-next-btn"
                  onClick={() => onLevelComplete(levelIndex)}
                  autoFocus
                >
                  <span className="ls-summary-next-en">NEXT LEVEL →</span>
                  <span className="ls-summary-next-ta">அடுத்த நிலை →</span>
                </button>
              ) : (
                <button
                  className="ls-summary-next-btn ls-summary-next-btn--finish"
                  onClick={() => onLevelComplete(levelIndex)}
                  autoFocus
                >
                  <span className="ls-summary-next-en">🎉 All Levels Complete!</span>
                  <span className="ls-summary-next-ta">அனைத்து நிலைகளும் முடிந்தன!</span>
                </button>
              )}
              <button className="ls-summary-back-btn" onClick={onBack}>
                ← Menu · பட்டியல்
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Safety guard — phaseIndex out of bounds ─────────────────────────────
  // This should never happen after the handleNext fix, but prevents a blank
  // screen if something else ever pushes phaseIndex past the phases array.
  if (!phase) {
    return (
      <div className="ls-root">
        <div className="ls-header">
          <button className="practice-back-btn" onClick={onBack} aria-label="Back to menu">
            ← Menu
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '1rem', padding: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ fontSize: '1.1rem', textAlign: 'center' }}>
            Something went wrong loading this phase.<br />
            <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.</span>
          </p>
          <button className="ls-summary-back-btn" onClick={onBack}>← Menu · பட்டியல்</button>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="ls-root">

      {/* ── Header ── */}
      <div className="ls-header">
        <button className="practice-back-btn" onClick={onBack} aria-label="Back to menu">
          ← Menu
        </button>
        <div className="ls-header-center">
          <span className="ls-level-badge">Level {level.id} of {totalLevels}</span>
          <span className="ls-level-title">{level.emoji} {level.titleEn}</span>
          <span className="ls-level-title-ta">{level.titleTa}</span>
        </div>
        {/* Phase progress dots */}
        <div className="ls-phase-dots" aria-label={`Phase ${phaseIndex + 1} of ${phases.length}`}>
          {phases.map((_, i) => (
            <span
              key={i}
              className={`ls-phase-dot${i < phaseIndex ? ' ls-phase-dot--done' : i === phaseIndex ? ' ls-phase-dot--active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="ls-canvas-area">
        <AbacusScene
          highlightRods={
            phase.type === 'guided' && lessonStep?.highlightRods ? lessonStep.highlightRods :
            (phase.type === 'arithmetic-add' || phase.type === 'arithmetic-sub' || phase.type === 'arithmetic-mixed') && problem
              ? [problem.steps[stepIdx]?.rodIndex ?? 4]
              : phase.type === 'observe' && lessonStep?.highlightRods ? lessonStep.highlightRods
              : []
          }
        />
        <PlaceValueOverlay
          highlightRods={
            phase.type === 'guided' && lessonStep?.highlightRods ? lessonStep.highlightRods : []
          }
        />

        {phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit' && !guidedComplete && (
          <BeadGuideOverlay
            rodIndex={lessonStep.activity.rodIndex ?? 4}
            guideType={guideType}
            targetDigit={lessonStep.activity.targetDigit}
            complete={guidedComplete}
          />
        )}

        {showDemo && (
          <DemoAnimation
            targetDigit={
              phase.type === 'guided' && lessonStep?.activity?.type === 'set-digit'
                ? lessonStep.activity.targetDigit
                : undefined
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

      {/* ── Bottom panel ── */}
      {renderBottomPanel()}
    </div>
  );
}
