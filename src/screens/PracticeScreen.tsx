import { useState, useCallback, useRef, useEffect } from 'react';
import { AbacusScene } from '../components/AbacusScene';
import { PlaceValueOverlay } from '../components/PlaceValueOverlay';
import { useAbacusStore, sorobanValue } from '../store/useAbacusStore';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import type { AppScreen } from '../types/app';

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
  const setNumber = useAbacusStore((s) => s.setNumber);

  const total    = sorobanValue(rods);
  const canUndo  = history.length > 0;
  const canRedo  = redoStack.length > 0;

  const recordPracticeSession = useProgressStore((s) => s.recordPracticeSession);

  const interactedRef = useRef(false);
  const maxNumberRef  = useRef(0);
  const [newBadgeIds, setNewBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    if (history.length > 0) interactedRef.current = true;
    if (total > maxNumberRef.current) maxNumberRef.current = total;
  }, [history.length, total]);

  const [targetRaw, setTargetRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const target      = targetRaw === '' ? null : parseInt(targetRaw, 10);
  const targetValid = target !== null && !isNaN(target) && target >= 0 && target <= 99999;
  const matched     = targetValid && total === target;

  const handleTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || /^\d{1,5}$/.test(raw)) {
        if (raw === '' || parseInt(raw, 10) <= 99999) {
          setTargetRaw(raw);
        }
      }
    },
    [],
  );

  const handleShowOnAbacus = useCallback(() => {
    if (targetValid && target !== null) {
      setNumber(target);
    }
  }, [targetValid, target, setNumber]);

  const handleClearTarget = useCallback(() => {
    setTargetRaw('');
    inputRef.current?.focus();
  }, []);

  const handleBack = useCallback(() => {
    if (interactedRef.current) {
      const earned = recordPracticeSession(maxNumberRef.current);
      if (earned.length > 0) {
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

  const diff = targetValid && target !== null ? total - target : 0;

  return (
    <div className="practice-root">
      <AbacusScene />
      <PlaceValueOverlay />

      <div className="practice-hud" aria-label="Practice controls">
        {/* Top bar */}
        <div className="practice-top-bar">
          <button className="practice-back-btn" onClick={handleBack} aria-label="Back to main menu">
            ← Menu
          </button>
          <span className="practice-screen-label" aria-hidden="true">🎯 Free Practice</span>
          <div className="practice-top-spacer" />
        </div>

        <div className="practice-mid-spacer" />

        {/* Bottom panel */}
        <div className="practice-bottom-panel">
          <div className="practice-info-row">

            {/* Live total */}
            <div className={`practice-total${matched ? ' practice-total--matched' : ''}`}>
              <span className="practice-total-label">Soroban shows</span>
              <span className="practice-total-number">{total}</span>
            </div>

            {/* Target section */}
            <div className="practice-target-section">
              <label className="practice-target-label" htmlFor="practice-target-input">
                Target (0–99999):
              </label>
              <div className="practice-target-row">
                <input
                  id="practice-target-input"
                  ref={inputRef}
                  className={`practice-target-input${targetValid && !matched ? ' practice-target-input--active' : ''}${matched ? ' practice-target-input--matched' : ''}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99999}
                  placeholder="0–99999"
                  value={targetRaw}
                  onChange={handleTargetChange}
                  aria-label="Enter a target number from 0 to 99999"
                />
                {targetRaw !== '' && (
                  <button className="practice-clear-btn" onClick={handleClearTarget} aria-label="Clear target">✕</button>
                )}
              </div>

              {targetValid && (
                <>
                  <div
                    className={`practice-match-feedback${matched ? ' practice-match-feedback--yes' : ' practice-match-feedback--no'}`}
                    aria-live="polite"
                  >
                    {matched
                      ? `🎉 Yes! You made ${target}!`
                      : diff < 0
                        ? `Need ${-diff} more`
                        : `Remove ${diff}`
                    }
                  </div>
                  {!matched && (
                    <button
                      className="practice-btn practice-btn--hint"
                      onClick={handleShowOnAbacus}
                      aria-label="Show target number on Soroban"
                    >
                      👁 Show me
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="practice-btn-row" role="group" aria-label="Soroban controls">
            <button className="practice-btn practice-btn--secondary" onClick={reset} aria-label="Reset">
              🔄 Reset
            </button>
            <button
              className={`practice-btn practice-btn--secondary${!canUndo ? ' practice-btn--disabled' : ''}`}
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              ↩ Undo
            </button>
            <button
              className={`practice-btn practice-btn--secondary${!canRedo ? ' practice-btn--disabled' : ''}`}
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              ↪ Redo
            </button>
          </div>
        </div>
      </div>

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
