import { useState, useEffect, useCallback } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { LessonOverlay } from '../components/LessonOverlay';
import { LessonComplete, CompletionAction } from '../components/LessonComplete';
import { ABACUS_BASICS_STEPS } from '../lessons/abacusBasicsSteps';
import { useAbacusStore } from '../store/useAbacusStore';
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

  const setRodCount = useAbacusStore((s) => s.setRodCount);
  const reset = useAbacusStore((s) => s.reset);
  const rods = useAbacusStore((s) => s.rods);

  const recordLessonComplete = useProgressStore((s) => s.recordLessonComplete);

  const totalSteps = ABACUS_BASICS_STEPS.length;
  const step = ABACUS_BASICS_STEPS[currentStepIndex]!;

  // Apply the step's targetState to the abacus whenever the step changes
  useEffect(() => {
    if (!step.targetState) {
      reset();
      return;
    }
    reset();
    const id = setTimeout(() => {
      step.targetState!.forEach((rod) => {
        if (rod.activeCount > 0) {
          setRodCount(rod.rodIndex as RodIndex, rod.activeCount);
        }
      });
    }, 50);
    return () => clearTimeout(id);
  }, [currentStepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine if the current activity is complete
  const activityComplete = (() => {
    const activity = step.activity;
    if (!activity) return true;
    if (activity.type === 'observe') return true;
    if (activity.type === 'set-number') {
      const rodIdx = activity.rodIndex ?? 0;
      const currentCount = rods[rodIdx]?.activeCount ?? 0;
      return currentCount === (activity.targetCount ?? 0);
    }
    if (activity.type === 'count-beads') return true;
    return true;
  })();

  const handleNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      // Lesson finished — record it and check for new badges
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
      <AbacusScene />
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
          {/* New badge toast notifications */}
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
