import { useProgressStore, ALL_BADGES } from '../store/useProgressStore';
import type { AppScreen } from '../App';

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
}

const MODE_CARDS: ModeCard[] = [
  {
    id: 'basics',
    emoji: '🧮',
    title: 'Abacus Basics',
    description: 'Learn what an abacus is, discover the rods and beads, and try counting for the first time!',
    buttonLabel: 'Start Learning',
    isPrimary: true,
  },
  {
    id: 'practice',
    emoji: '🎯',
    title: 'Free Practice',
    description: 'Explore the abacus freely — move beads, try counting, and build your confidence!',
    buttonLabel: 'Free Play',
    isPrimary: false,
  },
  {
    id: 'challenge',
    emoji: '⭐',
    title: 'Challenge',
    description: 'Get a random number and set the abacus to match it. How fast can you do it?',
    buttonLabel: 'Play',
    isPrimary: false,
  },
];

export function ModeSelectScreen({ onNavigate }: ModeSelectScreenProps) {
  const unlockedBadges = useProgressStore((s) => s.unlockedBadges);
  const lessonsCompleted = useProgressStore((s) => s.lessonsCompleted);
  const challengeSessionsPlayed = useProgressStore((s) => s.challengeSessionsPlayed);
  const practiceSessions = useProgressStore((s) => s.practiceSessions);

  // Quick summary stats for the home screen badge
  const totalBadges = ALL_BADGES.length;
  const earned = unlockedBadges.length;
  const hasActivity = lessonsCompleted > 0 || challengeSessionsPlayed > 0 || practiceSessions > 0;

  return (
    <div className="mode-select-root">
      {/* ── Header ── */}
      <header className="mode-select-header">
        <div className="mode-select-logo" aria-hidden="true">🧮</div>
        <h1 className="mode-select-title">Abacus Learning Simulator</h1>
        <p className="mode-select-subtitle">Grade 1 · Counting &amp; Number Skills</p>
      </header>

      {/* ── Mode cards ── */}
      <div className="mode-select-cards" role="list">
        {MODE_CARDS.map((card) => (
          <div
            key={card.id}
            className={`mode-card${card.isPrimary ? ' mode-card--primary' : ''}`}
            role="listitem"
          >
            <div className="mode-card-emoji" aria-hidden="true">
              {card.emoji}
            </div>
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

      {/* ── Progress banner ── */}
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

      {/* ── Footer ── */}
      <footer className="mode-select-footer">
        <p>Use the abacus with beads to count and learn numbers!</p>
      </footer>
    </div>
  );
}
