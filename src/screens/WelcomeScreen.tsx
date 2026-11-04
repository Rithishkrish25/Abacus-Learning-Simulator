import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import { LEVEL_DEFINITIONS } from '../levels/levelDefinitions';

interface WelcomeScreenProps {
  onStart: () => void;
  onReviewProgress: () => void;
}

export function WelcomeScreen({ onStart, onReviewProgress }: WelcomeScreenProps) {
  const levelStatus    = useProgressStore((s) => s.levelStatus);
  const unlockedBadges = useProgressStore((s) => s.unlockedBadges);
  const resetProgress  = useProgressStore((s) => s.resetProgress);

  const completedCount = levelStatus.filter((s) => s === 2).length;
  const totalLevels    = LEVEL_DEFINITIONS.length;
  const badgeCount     = unlockedBadges.length;
  const hasProgress    = completedCount > 0;

  // Find the next level to continue from
  const nextLevelIdx = levelStatus.findIndex((s) => s === 1);
  const resumeLabel  = nextLevelIdx > 0
    ? `Continue from Level ${nextLevelIdx + 1}`
    : 'Start Learning';
  const resumeLabelTa = nextLevelIdx > 0
    ? `நிலை ${nextLevelIdx + 1} இலிருந்து தொடரவும்`
    : 'கற்றலை தொடங்குங்கள்';

  return (
    <div className="welcome-root">
      {/* Background decoration */}
      <div className="welcome-bg" aria-hidden="true">
        <span className="welcome-bg-emoji welcome-bg-emoji--1">🧮</span>
        <span className="welcome-bg-emoji welcome-bg-emoji--2">算</span>
        <span className="welcome-bg-emoji welcome-bg-emoji--3">⭐</span>
        <span className="welcome-bg-emoji welcome-bg-emoji--4">🏆</span>
        <span className="welcome-bg-emoji welcome-bg-emoji--5">✨</span>
      </div>

      <div className="welcome-content">

        {/* ── Logo & Title ── */}
        <div className="welcome-hero">
          <div className="welcome-abacus-icon" aria-hidden="true">🧮</div>
          <h1 className="welcome-title">Soroban</h1>
          <h1 className="welcome-title welcome-title--ta">சோரோபன்</h1>
          <p className="welcome-subtitle">Learning Simulator · கற்றல்</p>
          <p className="welcome-tagline">Grade 1 · Japanese Abacus · 算盤</p>
        </div>

        {/* ── Progress summary (shown after first play) ── */}
        {hasProgress && (
          <div className="welcome-progress">
            <div className="welcome-progress-row">
              <span className="welcome-progress-item">
                <span className="welcome-progress-num">{completedCount}</span>
                <span className="welcome-progress-lbl">/ {totalLevels} Levels</span>
              </span>
              <span className="welcome-progress-divider">·</span>
              <span className="welcome-progress-item">
                <span className="welcome-progress-num">{badgeCount}</span>
                <span className="welcome-progress-lbl">/ {ALL_BADGES.length} Badges</span>
              </span>
            </div>
          </div>
        )}

        {/* ── Level journey pills ── */}
        <div className="welcome-levels" aria-label="Level overview">
          {LEVEL_DEFINITIONS.map((level, idx) => {
            const status = levelStatus[idx] ?? 0;
            return (
              <div
                key={level.id}
                className={`welcome-level-pip${status === 2 ? ' welcome-level-pip--done' : status === 1 ? ' welcome-level-pip--active' : ' welcome-level-pip--locked'}`}
                aria-label={`Level ${level.id}: ${status === 2 ? 'complete' : status === 1 ? 'available' : 'locked'}`}
              >
                <span className="welcome-level-pip-num">{status === 2 ? '✓' : status === 0 ? '🔒' : level.id}</span>
                <span className="welcome-level-pip-emoji">{level.emoji}</span>
              </div>
            );
          })}
        </div>

        {/* ── Main CTA ── */}
        <button
          className="welcome-start-btn"
          onClick={onStart}
          aria-label={resumeLabel}
        >
          <span className="welcome-start-en">{hasProgress ? resumeLabel : 'START'}</span>
          <span className="welcome-start-ta">{hasProgress ? resumeLabelTa : 'தொடங்கு'}</span>
        </button>

        {/* ── Secondary actions ── */}
        <div className="welcome-secondary">
          {hasProgress && (
            <button
              className="welcome-secondary-btn"
              onClick={onReviewProgress}
              aria-label="Review all levels"
            >
              📊 My Journey · என் பயணம்
            </button>
          )}
          {hasProgress && (
            <button
              className="welcome-secondary-btn welcome-secondary-btn--danger"
              onClick={() => {
                if (window.confirm('Reset all progress? This cannot be undone.')) {
                  resetProgress();
                }
              }}
              aria-label="Reset progress"
            >
              🗑 Reset
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
