import { useState, useEffect, useCallback } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { PlaceValueOverlay } from '../components/PlaceValueOverlay';
import { LessonOverlay } from '../components/LessonOverlay';
import { LessonComplete, CompletionAction } from '../components/LessonComplete';
import { BeadGuideOverlay } from '../components/BeadGuideOverlay';
import { DemoAnimation } from '../components/DemoAnimation';
import { SOROBAN_BASICS_STEPS } from '../lessons/sorobanLearningSteps';
import { useAbacusStore, rodDigit, sorobanValue } from '../store/useAbacusStore';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import { RodIndex } from '../types/abacus';
import type { AppScreen } from '../App';

interface BasicsLessonProps {
  onNavigate: (screen: AppScreen) => void;
}

export function BasicsLesson({ onNavigate }: BasicsLessonProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  const setRodDigit  = useAbacusStore((s) => s.setRodDigit);
  const reset        = useAbacusStore((s) => s.reset);
  const rods         = useAbacusStore((s) => s.rods);

  const recordLessonComplete = useProgressStore((s) => s.recordLessonComplete);

  const totalSteps = SOROBAN_BASICS_STEPS.length;
  const step = SOROBAN_BASICS_STEPS[currentStepIndex]!;

  // Apply targetState when step changes
  useEffect(() => {
    reset();
    if (!step.targetState) return;
    const id = setTimeout(() => {
      step.targetState!.forEach((rod) => {
        if (rod.heavenActive || rod.earthActive > 0) {
          const digit = (rod.heavenActive ? 5 : 0) + rod.earthActive;
          setRodDigit(rod.rodIndex as RodIndex, digit);
        }
      });
    }, 80);
    return () => clearTimeout(id);
  }, [currentStepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show demo animation when entering a set-digit interactive step
  useEffect(() => {
    const activity = step.activity;
    if (activity && activity.type === 'set-digit' && activity.targetDigit !== undefined) {
      // Small delay so the abacus resets first
      const t = setTimeout(() => setShowDemo(true), 400);
      return () => clearTimeout(t);
    }
    setShowDemo(false);
  }, [currentStepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine if the current activity is complete
  const activityComplete = (() => {
    const activity = step.activity;
    if (!activity) return true;
    switch (activity.type) {
      case 'observe':
        return true;
      case 'set-digit': {
        const rodIdx = activity.rodIndex ?? 4;
        const currentDigit = rodDigit(rods[rodIdx] ?? { rodIndex: 0, heavenActive: false, earthActive: 0 });
        return currentDigit === (activity.targetDigit ?? 0);
      }
      case 'set-number': {
        return sorobanValue(rods) === (activity.targetNumber ?? 0);
      }
      case 'toggle-heaven': {
        const rodIdx = activity.rodIndex ?? 4;
        return (rods[rodIdx]?.heavenActive ?? false) === (activity.targetDigit === 1);
      }
      case 'count-earth': {
        const rodIdx = activity.rodIndex ?? 4;
        return (rods[rodIdx]?.earthActive ?? 0) === (activity.targetDigit ?? 0);
      }
      default:
        return true;
    }
  })();

  // Compute guide type for BeadGuideOverlay
  const guideType = (() => {
    const activity = step.activity;
    if (!activity || activity.type === 'observe') return undefined;
    if (activity.type === 'set-digit') {
      return 'both-for-digit' as const;
    }
    if (activity.type === 'set-number') return undefined; // multi-rod, no single guide
    if (activity.type === 'toggle-heaven') return 'heaven-down' as const;
    if (activity.type === 'count-earth') return 'earth-up' as const;
    return undefined;
  })();

  const handleNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      const earned = recordLessonComplete();
      setNewBadgeIds(earned);
      setShowComplete(true);
    }
  }, [currentStepIndex, totalSteps, recordLessonComplete]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((i) => i - 1);
    }
  }, [currentStepIndex]);

  const handleExit = useCallback(() => {
    reset();
    onNavigate('home');
  }, [onNavigate, reset]);

  const handleComplete = useCallback(
    (action: CompletionAction) => {
      reset();
      if (action === 'practice') {
        onNavigate('practice');
      } else {
        onNavigate('home');
      }
    },
    [onNavigate, reset],
  );

  return (
    <div className="canvas-container">
      <AbacusScene highlightRods={step.highlightRods} />
      <PlaceValueOverlay highlightRods={step.highlightRods} />
      <BeadGuideOverlay
        rodIndex={step.activity?.rodIndex}
        guideType={guideType}
        targetDigit={step.activity?.targetDigit}
        complete={activityComplete}
      />
      {showDemo && step.activity?.type === 'set-digit' && (
        <DemoAnimation
          targetDigit={step.activity.targetDigit}
          rodIndex={step.activity.rodIndex ?? 4}
          guideType="both-for-digit"
          onDone={() => setShowDemo(false)}
        />
      )}
      {!showComplete && (
        <LessonOverlay
          step={step}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onPrev={handlePrev}
          onNext={handleNext}
          onExit={handleExit}
          isLastStep={currentStepIndex === totalSteps - 1}
          activityComplete={activityComplete}
        />
      )}
      {showComplete && (
        <>
          <LessonComplete onAction={handleComplete} />
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
        </>
      )}
    </div>
  );
}
