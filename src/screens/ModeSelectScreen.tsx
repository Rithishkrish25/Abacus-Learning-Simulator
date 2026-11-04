import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import type { AppScreen } from '../types/app';

interface ModeSelectScreenProps {
  onNavigate: (screen: AppScreen) => void;
}

interface ModeCard {
  id: AppScreen;
  emoji: string;
  title: string;
  description: string;
  buttonLabel: string;
  isPrimary: boolean;
  badge?: string;
}

const MODE_CARDS: ModeCard[] = [
  {
    id: 'basics',
    emoji: '🧮',
    title: 'Soroban Basics',
    description: 'Learn Heaven & Earth beads, place values, and form numbers up to 99,999 on the Japanese Soroban!',
    buttonLabel: 'Start Learning',
    isPrimary: true,
    badge: 'START HERE',
  },
  {
    id: 'practice',
    emoji: '🎯',
    title: 'Free Practice',
    description: 'Move beads freely, set any number, and see it appear on the Soroban instantly.',
    buttonLabel: 'Free Play',
    isPrimary: false,
  },
  {
    id: 'challenge',
    emoji: '⭐',
    title: 'Challenge',
    description: 'A number appears — set the Soroban to match! Difficulty increases as you progress.',
    buttonLabel: 'Play',
    isPrimary: false,
  },
  {
    id: 'arithmetic',
    emoji: '🔢',
    title: 'Arithmetic',
    description: 'Learn addition and subtraction using Soroban complement techniques, step by step.',
    buttonLabel: 'Start Arithmetic',
    isPrimary: false,
  },
];

export function ModeSelectScreen({ onNavigate }: ModeSelectScreenProps) {
  const unlockedBadges         = useProgressStore((s) => s.unlockedBadges);
  const lessonsCompleted       = useProgressStore((s) => s.lessonsCompleted);
  const challengeSessionsPlayed = useProgressStore((s) => s.challengeSessionsPlayed);
  const practiceSessions       = useProgressStore((s) => s.practiceSessions);

  const totalBadges  = ALL_BADGES.length;
  const earned       = unlockedBadges.length;
  const hasActivity  = lessonsCompleted > 0 || challengeSessionsPlayed > 0 || practiceSessions > 0;

  return (
    <div className="mode-select-root">
      {/* Header */}
      <header className="mode-select-header">
        <div className="mode-select-logo" aria-hidden="true">🧮</div>
        <h1 className="mode-select-title">Soroban Learning Simulator</h1>
        <p className="mode-select-subtitle">Grade 1 · Japanese Abacus · 算盤</p>
      </header>

      {/* Mode cards */}
      <div className="mode-select-cards" role="list">
        {MODE_CARDS.map((card) => (
          <div
            key={card.id}
            className={`mode-card${card.isPrimary ? ' mode-card--primary' : ''}`}
            role="listitem"
          >
            {card.badge && (
              <div className="mode-card-badge-pill" aria-label={card.badge}>{card.badge}</div>
            )}
            <div className="mode-card-emoji" aria-hidden="true">{card.emoji}</div>
            <div className="mode-card-body">
              <h2 className="mode-card-title">{card.title}</h2>
              <p className="mode-card-description">{card.description}</p>
              <button
                className={`mode-card-btn${card.isPrimary ? ' mode-card-btn--primary' : ' mode-card-btn--secondary'}`}
                onClick={() => onNavigate(card.id)}
                aria-label={`${card.buttonLabel} — ${card.title}`}
              >
                {card.buttonLabel}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Progress banner */}
      <div className="mode-progress-banner">
        <button
          className="mode-progress-btn"
          onClick={() => onNavigate('progress')}
          aria-label="Open my progress dashboard"
        >
          <span className="mode-progress-btn-icon" aria-hidden="true">📊</span>
          <span className="mode-progress-btn-text">My Progress</span>
          {hasActivity && (
            <span className="mode-progress-btn-badge" aria-label={`${earned} of ${totalBadges} badges earned`}>
              {earned}/{totalBadges} badges
            </span>
          )}
          <span className="mode-progress-btn-arrow" aria-hidden="true">›</span>
        </button>
      </div>

      {/* Footer */}
      <footer className="mode-select-footer">
        <p>天珠 = 5 · 地珠 = 1 · Heaven + Earth = Your Number!</p>
      </footer>
    </div>
  );
}
