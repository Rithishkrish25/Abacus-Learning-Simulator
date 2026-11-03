import { useState, useCallback, useRef, useEffect } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { useAbacusStore, totalActive } from '../store/useAbacusStore';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import type { AppScreen } from '../App';

interface PracticeScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

export function PracticeScreen({ onNavigate }: PracticeScreenProps) {
  const rods      = useAbacusStore((s) => s.rods);
  const history   = useAbacusStore((s) => s.history);
  const redoStack = useAbacusStore((s) => s.redoStack);
  const reset     = useAbacusStore((s) => s.reset);
  const undo      = useAbacusStore((s) => s.undo);
  const redo      = useAbacusStore((s) => s.redo);

  const total    = totalActive(rods);
  const canUndo  = history.length > 0;
  const canRedo  = redoStack.length > 0;

  const recordPracticeSession = useProgressStore((s) => s.recordPracticeSession);

  // Track whether the user interacted (moved at least one bead)
  const interactedRef = useRef(false);
  // Track the highest bead count seen this session
  const maxNumberRef = useRef(0);

  // New badges to show as toast
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  // Watch for any bead moves
  useEffect(() => {
    if (history.length > 0) {
      interactedRef.current = true;
    }
    if (total > maxNumberRef.current) {
      maxNumberRef.current = total;
    }
  }, [history.length, total]);

  const [targetRaw, setTargetRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const target = targetRaw === '' ? null : parseInt(targetRaw, 10);
  const targetValid = target !== null && !isNaN(target) && target >= 0 && target <= 50;
  const matched = targetValid && total === target;

  const handleTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || /^\d{1,2}$/.test(raw)) {
        if (raw === '' || parseInt(raw, 10) <= 50) {
          setTargetRaw(raw);
        }
      }
    },
    [],
  );

  const handleClearTarget = useCallback(() => {
    setTargetRaw('');
    inputRef.current?.focus();
  }, []);

  const handleBack = useCallback(() => {
    // Record session only if the user actually moved beads
    if (interactedRef.current) {
      const earned = recordPracticeSession(maxNumberRef.current);
      if (earned.length > 0) {
        // Show badge toasts briefly before navigating
        setNewBadgeIds(earned);
        setTimeout(() => {
          reset();
          onNavigate('home');
        }, 1800);
        return;
      }
    }
    reset();
    onNavigate('home');
  }, [reset, onNavigate, recordPracticeSession]);

  return (
    <div className="practice-root">
      <AbacusScene />

      <div className="practice-hud" aria-label="Practice controls">

        {/* Top bar */}
        <div className="practice-top-bar">
          <button
            className="practice-back-btn"
            onClick={handleBack}
            aria-label="Back to main menu"
          >
            ← Menu
          </button>
          <span className="practice-screen-label" aria-hidden="true">
            🎯 Free Practice
          </span>
          <div className="practice-top-spacer" />
        </div>

        <div className="practice-mid-spacer" />

        {/* Bottom panel */}
        <div className="practice-bottom-panel">

          <div className="practice-info-row">

            {/* Live total */}
            <div className={`practice-total${matched ? ' practice-total--matched' : ''}`}>
              <span className="practice-total-label">You have</span>
              <span className="practice-total-number">{total}</span>
              <span className="practice-total-label">beads</span>
            </div>

            {/* Target number section */}
            <div className="practice-target-section">
              <label className="practice-target-label" htmlFor="practice-target-input">
                Show this number:
              </label>
              <div className="practice-target-row">
                <input
                  id="practice-target-input"
                  ref={inputRef}
                  className={`practice-target-input${targetValid && !matched ? ' practice-target-input--active' : ''}${matched ? ' practice-target-input--matched' : ''}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={50}
                  placeholder="0–50"
                  value={targetRaw}
                  onChange={handleTargetChange}
                  aria-label="Enter a target number from 0 to 50"
                />
                {targetRaw !== '' && (
                  <button
                    className="practice-clear-btn"
                    onClick={handleClearTarget}
                    aria-label="Clear target number"
                  >
                    ✕
                  </button>
                )}
              </div>

              {targetValid && (
                <div
                  className={`practice-match-feedback${matched ? ' practice-match-feedback--yes' : ' practice-match-feedback--no'}`}
                  aria-live="polite"
                >
                  {matched
                    ? '🎉 Yes! You made ' + target + '!'
                    : total < target
                      ? `Add ${target - total} more bead${target - total !== 1 ? 's' : ''}`
                      : `Remove ${total - target} bead${total - target !== 1 ? 's' : ''}`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="practice-btn-row" role="group" aria-label="Abacus controls">
            <button
              className="practice-btn practice-btn--secondary"
              onClick={reset}
              aria-label="Reset all beads to zero"
            >
              🔄 Reset
            </button>
            <button
              className={`practice-btn practice-btn--secondary${!canUndo ? ' practice-btn--disabled' : ''}`}
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo last move"
            >
              ↩ Undo
            </button>
            <button
              className={`practice-btn practice-btn--secondary${!canRedo ? ' practice-btn--disabled' : ''}`}
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo last undone move"
            >
              ↪ Redo
            </button>
          </div>

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
