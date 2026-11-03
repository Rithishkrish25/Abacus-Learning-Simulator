export type CompletionAction = 'practice' | 'home';

interface LessonCompleteProps {
  onAction: (action: CompletionAction) => void;
}

export function LessonComplete({ onAction }: LessonCompleteProps) {
  return (
    <div className="lesson-complete-overlay" role="dialog" aria-modal="true" aria-label="Lesson complete">
      {/* Animated star decorations */}
      <span className="lesson-star lesson-star--1" aria-hidden="true">⭐</span>
      <span className="lesson-star lesson-star--2" aria-hidden="true">🌟</span>
      <span className="lesson-star lesson-star--3" aria-hidden="true">⭐</span>

      <div className="lesson-complete-card">
        <div className="lesson-complete-emoji" aria-hidden="true">🎉</div>
        <h2 className="lesson-complete-heading">Lesson Complete!</h2>
        <p className="lesson-complete-sub">You learned about the abacus!</p>

        <div className="lesson-complete-actions">
          <button
            className="lesson-complete-btn lesson-complete-btn--primary"
            onClick={() => onAction('practice')}
            aria-label="Go to practice mode"
          >
            🎯 Practise Now
          </button>
          <button
            className="lesson-complete-btn lesson-complete-btn--secondary"
            onClick={() => onAction('home')}
            aria-label="Back to main menu"
          >
            🏠 Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
