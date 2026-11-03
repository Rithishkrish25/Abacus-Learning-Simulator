import { useAbacusStore, totalActive, ROD_COUNT } from '../store/useAbacusStore';

const ROD_LABELS = ['R1', 'R2', 'R3', 'R4', 'R5'];
const ROD_LABELS_FULL = ['Row 1', 'Row 2', 'Row 3', 'Row 4', 'Row 5'];

/**
 * HTML overlay HUD.
 *
 * Layout — desktop (≥ 641px):
 *   ┌──────────────────────────────────────────┐
 *   │ [rod counts panel TL]    [total TR]       │
 *   │                                           │
 *   │               (3D canvas)                 │
 *   │                                           │
 *   │         [controls bottom-centre]          │
 *   └──────────────────────────────────────────┘
 *
 * Layout — mobile portrait (≤ 640px):
 *   ┌──────────────────────────────────────────┐
 *   │  [compact row strip top]    [total TR]    │
 *   │                                           │
 *   │               (3D canvas)                 │
 *   │                                           │
 *   │  [challenge banner if active]             │
 *   │  [controls bottom full-width]             │
 *   └──────────────────────────────────────────┘
 */
export function HUD() {
  const rods       = useAbacusStore((s) => s.rods);
  const history    = useAbacusStore((s) => s.history);
  const challenge  = useAbacusStore((s) => s.challenge);
  const showHint   = useAbacusStore((s) => s.showHint);
  const undo           = useAbacusStore((s) => s.undo);
  const reset          = useAbacusStore((s) => s.reset);
  const startChallenge = useAbacusStore((s) => s.startChallenge);
  const clearChallenge = useAbacusStore((s) => s.clearChallenge);
  const toggleHint     = useAbacusStore((s) => s.toggleHint);

  const total            = totalActive(rods);
  const canUndo          = history.length > 0;
  const challengeAchieved = challenge !== null && total === challenge;

  // Hint distribution
  const hintCounts: number[] = Array(ROD_COUNT).fill(0);
  if (challenge !== null) {
    let remaining = challenge;
    for (let i = ROD_COUNT - 1; i >= 0 && remaining > 0; i--) {
      const take = Math.min(10, remaining);
      hintCounts[i] = take;
      remaining -= take;
    }
  }

  return (
    <div className="hud-root" aria-label="Abacus counter display">

      {/* ════════════════════════════════════════════════════════
          TOP BAR  — row counts (left) + total/challenge (right)
          ════════════════════════════════════════════════════════ */}
      <div className="hud-top-bar">

        {/* ── Row counts ── */}
        <div className="hud-rod-counts" aria-label="Beads per row">
          {rods.map((rod, i) => (
            <div key={rod.rodIndex} className="hud-rod-row">
              {/* Desktop: full label + dots + number */}
              <span className="hud-rod-label hud-rod-label--full">{ROD_LABELS_FULL[i]}</span>
              {/* Mobile: short label + number only (no dots — saves space) */}
              <span className="hud-rod-label hud-rod-label--short">{ROD_LABELS[i]}</span>
              {/* Dots — hidden on mobile via CSS */}
              <div className="hud-bead-dots" aria-hidden="true">
                {Array.from({ length: 10 }, (_, j) => (
                  <span key={j} className={`hud-dot${j < rod.activeCount ? ' hud-dot--active' : ''}`} />
                ))}
              </div>
              <span className="hud-rod-count" aria-label={`${rod.activeCount} beads`}>{rod.activeCount}</span>
            </div>
          ))}
        </div>

        {/* ── Total / challenge badge (top-right) ── */}
        <div className="hud-total-badge">
          {challenge !== null ? (
            <div className={`hud-challenge-badge${challengeAchieved ? ' hud-challenge-badge--success' : ''}`}>
              <span className="hud-badge-label">
                {challengeAchieved ? '✓ Done!' : 'Target'}
              </span>
              <span className="hud-badge-number">{challenge}</span>
              <span className="hud-badge-sub">{total} / {challenge}</span>
            </div>
          ) : (
            <div className="hud-total-display">
              <span className="hud-total-label">Total</span>
              <span className="hud-total-number">{total}</span>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MIDDLE spacer — hint panel when visible
          ════════════════════════════════════════════════════════ */}
      {showHint && challenge !== null && (
        <div className="hud-hint-panel" aria-live="polite">
          <span className="hud-hint-title">Hint — set each row to:</span>
          <div className="hud-hint-rows">
            {hintCounts.map((count, i) => (
              <span key={i} className="hud-hint-item">
                {ROD_LABELS_FULL[i]}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Spacer pushes controls to bottom */}
      <div className="hud-spacer" />

      {/* ════════════════════════════════════════════════════════
          BOTTOM  — controls
          ════════════════════════════════════════════════════════ */}
      <div className="hud-bottom-bar">
        <div className="hud-controls" role="group" aria-label="Abacus controls">
          <button
            className="hud-btn hud-btn--secondary"
            onClick={reset}
            aria-label="Reset all beads to zero"
          >
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
            <button
              className="hud-btn hud-btn--primary"
              onClick={startChallenge}
              aria-label="Start a random number challenge"
            >
              Challenge
            </button>
          ) : (
            <>
              <button
                className="hud-btn hud-btn--secondary"
                onClick={clearChallenge}
                aria-label="End challenge"
              >
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
