import { useCallback } from 'react';
import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import { LEVEL_DEFINITIONS } from '../levels/levelDefinitions';

interface LevelMapScreenProps {
  onSelectLevel: (levelIndex: number) => void;
}

export function LevelMapScreen({ onSelectLevel }: LevelMapScreenProps) {
  const levelStatus  = useProgressStore((s) => s.levelStatus);
  const levelScores  = useProgressStore((s) => s.levelScores);
  const unlockedBadges = useProgressStore((s) => s.unlockedBadges);
  const resetProgress  = useProgressStore((s) => s.resetProgress);

  const totalLevels    = LEVEL_DEFINITIONS.length;
  const completedCount = levelStatus.filter((s) => s === 2).length;
  const badgeCount     = unlockedBadges.length;

  const handleSelect = useCallback((idx: number) => {
    const status = levelStatus[idx] ?? 0;
    if (status >= 1) onSelectLevel(idx); // 1=in-progress, 2=complete — both accessible
  }, [levelStatus, onSelectLevel]);

  return (
    <div className="lvlmap-root">

      {/* ── Header ── */}
      <header className="lvlmap-header">
        <div className="lvlmap-logo" aria-hidden="true">🧮</div>
        <div className="lvlmap-header-text">
          <h1 className="lvlmap-title">Soroban Learning</h1>
          <p className="lvlmap-title-ta">சோரோபன் கற்றல்</p>
          <p className="lvlmap-subtitle">Grade 1 · Japanese Abacus · 算盤</p>
        </div>
        {/* Progress ring summary */}
        <div className="lvlmap-summary" aria-label={`${completedCount} of ${totalLevels} levels complete`}>
          <span className="lvlmap-summary-count">{completedCount}/{totalLevels}</span>
          <span className="lvlmap-summary-label">Levels</span>
        </div>
      </header>

      {/* ── Level path ── */}
      <div className="lvlmap-scroll">
        <div className="lvlmap-path" role="list" aria-label="Seven learning levels">
          {LEVEL_DEFINITIONS.map((level, idx) => {
            const status = levelStatus[idx] ?? 0; // 0=locked, 1=available, 2=complete
            const score  = levelScores[idx] ?? 0;
            const isLocked    = status === 0;
            const isComplete  = status === 2;
            const isAvailable = status === 1;
            const isCurrent   = isAvailable; // highlight the active level

            return (
              <div key={level.id} className="lvlmap-item-wrap" role="listitem">
                {/* Connector line between levels */}
                {idx > 0 && (
                  <div className={`lvlmap-connector${isLocked ? '' : ' lvlmap-connector--active'}`} aria-hidden="true" />
                )}

                <button
                  className={`lvlmap-level${isLocked ? ' lvlmap-level--locked' : ''}${isComplete ? ' lvlmap-level--done' : ''}${isCurrent ? ' lvlmap-level--current' : ''}`}
                  style={{ '--level-color': level.color } as React.CSSProperties}
                  onClick={() => handleSelect(idx)}
                  disabled={isLocked}
                  aria-label={`Level ${level.id}: ${level.titleEn}${isLocked ? ' (locked)' : isComplete ? ` (completed, score ${score}%)` : ' (in progress)'}`}
                >
                  {/* Level number badge */}
                  <div className="lvlmap-level-num" aria-hidden="true">
                    {isComplete ? '✓' : isLocked ? '🔒' : String(level.id)}
                  </div>

                  {/* Emoji */}
                  <div className="lvlmap-level-emoji" aria-hidden="true">{level.emoji}</div>

                  {/* Text */}
                  <div className="lvlmap-level-body">
                    <span className="lvlmap-level-title-en">{level.titleEn}</span>
                    <span className="lvlmap-level-title-ta">{level.titleTa}</span>
                    {isComplete && (
                      <span className="lvlmap-level-score">{score}%</span>
                    )}
                    {isCurrent && (
                      <span className="lvlmap-level-cta">Tap to start →</span>
                    )}
                  </div>

                  {/* Stars (0–3) based on score */}
                  {isComplete && (
                    <div className="lvlmap-stars" aria-hidden="true">
                      {[1, 2, 3].map((n) => (
                        <span
                          key={n}
                          className={`lvlmap-star${score >= n * 34 ? ' lvlmap-star--lit' : ''}`}
                        >⭐</span>
                      ))}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer: badges + reset ── */}
      <footer className="lvlmap-footer">
        <div className="lvlmap-badges-row" aria-label={`${badgeCount} badges earned`}>
          {ALL_BADGES.map((badge) => {
            const earned = unlockedBadges.includes(badge.id);
            return (
              <span
                key={badge.id}
                className={`lvlmap-badge-pip${earned ? ' lvlmap-badge-pip--earned' : ''}`}
                title={badge.name}
                aria-label={`${badge.name}${earned ? ': earned' : ': not yet earned'}`}
              >
                {earned ? badge.emoji : '🔒'}
              </span>
            );
          })}
          <span className="lvlmap-badge-count">{badgeCount}/{ALL_BADGES.length} badges</span>
        </div>
        <button
          className="lvlmap-reset-btn"
          onClick={() => { if (window.confirm('Reset all progress? This cannot be undone.')) resetProgress(); }}
          aria-label="Reset all progress"
        >
          🗑 Reset
        </button>
      </footer>
    </div>
  );
}
