import { useAbacusStore, sorobanValue, rodDigit, ROD_COUNT, numberToState } from '../store/useAbacusStore';

// Rod labels (most significant first)
const ROD_LABELS_SHORT = ['万', '千', '百', '十', '一'];
const ROD_LABELS_FULL  = ['Ten-Thousands', 'Thousands', 'Hundreds', 'Tens', 'Ones'];

/**
 * Soroban HUD — shows per-rod digits + total value, challenge badge, controls.
 */
export function HUD() {
  const rods        = useAbacusStore((s) => s.rods);
  const history     = useAbacusStore((s) => s.history);
  const challenge   = useAbacusStore((s) => s.challenge);
  const showHint    = useAbacusStore((s) => s.showHint);
  const undo            = useAbacusStore((s) => s.undo);
  const reset           = useAbacusStore((s) => s.reset);
  const startChallenge  = useAbacusStore((s) => s.startChallenge);
  const clearChallenge  = useAbacusStore((s) => s.clearChallenge);
  const toggleHint      = useAbacusStore((s) => s.toggleHint);

  const total             = sorobanValue(rods);
  const canUndo           = history.length > 0;
  const challengeAchieved = challenge !== null && total === challenge;

  // Hint: decompose challenge into per-rod digits
  const hintDigits: number[] = Array(ROD_COUNT).fill(0);
  if (challenge !== null) {
    const hintState = numberToState(challenge);
    hintState.forEach((rod, i) => {
      hintDigits[i] = rodDigit(rod);
    });
  }

  return (
    <div className="hud-root" aria-label="Soroban counter display">

      {/* ════ TOP BAR ════ */}
      <div className="hud-top-bar">

        {/* Rod digit panel */}
        <div className="hud-rod-counts" aria-label="Digits per rod">
          {rods.map((rod, i) => {
            const digit = rodDigit(rod);
            return (
              <div key={rod.rodIndex} className="hud-rod-row">
                <span className="hud-rod-label hud-rod-label--full">{ROD_LABELS_FULL[i]}</span>
                <span className="hud-rod-label hud-rod-label--short">{ROD_LABELS_SHORT[i]}</span>
                {/* Heaven/earth mini-indicator */}
                <div className="hud-bead-dots" aria-hidden="true">
                  {/* Heaven dot */}
                  <span className={`hud-dot hud-dot--heaven${rod.heavenActive ? ' hud-dot--active' : ''}`} />
                  <span className="hud-dot-divider" />
                  {/* Earth dots */}
                  {Array.from({ length: 4 }, (_, j) => (
                    <span key={j} className={`hud-dot${j < rod.earthActive ? ' hud-dot--active' : ''}`} />
                  ))}
                </div>
                <span className="hud-rod-count" aria-label={`digit ${digit}`}>{digit}</span>
              </div>
            );
          })}
        </div>

        {/* Total / challenge badge */}
        <div className="hud-total-badge">
          {challenge !== null ? (
            <div className={`hud-challenge-badge${challengeAchieved ? ' hud-challenge-badge--success' : ''}`}>
              <span className="hud-badge-label">{challengeAchieved ? '✓ Done!' : 'Target'}</span>
              <span className="hud-badge-number">{challenge}</span>
              <span className="hud-badge-sub">{total} / {challenge}</span>
            </div>
          ) : (
            <div className="hud-total-display">
              <span className="hud-total-label">Value</span>
              <span className="hud-total-number">{total}</span>
            </div>
          )}
        </div>
      </div>

      {/* ════ HINT ════ */}
      {showHint && challenge !== null && (
        <div className="hud-hint-panel" aria-live="polite">
          <span className="hud-hint-title">Hint — set each rod to:</span>
          <div className="hud-hint-rows">
            {hintDigits.map((d, i) => (
              <span key={i} className="hud-hint-item">
                {ROD_LABELS_FULL[i]}: <strong>{d}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="hud-spacer" />

      {/* ════ BOTTOM BAR ════ */}
      <div className="hud-bottom-bar">
        <div className="hud-controls" role="group" aria-label="Abacus controls">
          <button className="hud-btn hud-btn--secondary" onClick={reset} aria-label="Reset all beads to zero">
            Reset
          </button>
          <button
            className={`hud-btn hud-btn--secondary${!canUndo ? ' hud-btn--disabled' : ''}`}
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo last move"
          >
            Undo
          </button>
          {challenge === null ? (
            <button className="hud-btn hud-btn--primary" onClick={startChallenge} aria-label="Start a challenge">
              Challenge
            </button>
          ) : (
            <>
              <button className="hud-btn hud-btn--secondary" onClick={clearChallenge} aria-label="End challenge">
                End
              </button>
              <button
                className={`hud-btn hud-btn--hint${showHint ? ' hud-btn--hint-active' : ''}`}
                onClick={toggleHint}
                aria-label="Show hint"
              >
                Hint
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
