import { useEffect, useState } from 'react';

interface DemoAnimationProps {
  targetDigit?: number;     // for set-digit demos
  targetNumber?: number;    // for set-number demos
  rodIndex?: number;        // which rod to demonstrate (0-4)
  guideType: 'heaven-down' | 'heaven-up' | 'earth-up' | 'both-for-digit' | 'observe' | null;
  onDone: () => void;
}

export function DemoAnimation({ targetDigit, guideType, onDone }: DemoAnimationProps) {
  const [phase, setPhase] = useState<'show' | 'animating' | 'done'>('show');

  useEffect(() => {
    // Show "Watch carefully..." for 1.2 s, animate for 2 s, then call onDone
    const t1 = setTimeout(() => setPhase('animating'), 1200);
    const t2 = setTimeout(() => {
      setPhase('done');
      onDone();
    }, 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'done') return null;

  // Bead state for the diagram
  const needsHeaven = (targetDigit ?? 0) >= 5;
  const earthCount  = (targetDigit ?? 0) % 5;

  // Only render if we have a meaningful guide
  if (!guideType || guideType === 'observe') return null;

  return (
    <div className="demo-overlay">
      <div className="demo-card">
        <div className="demo-watch-label">
          {phase === 'show'
            ? '👀 பாருங்கள் / Watch carefully…'
            : '✨ இப்படி செய்யுங்கள் / Do this!'}
        </div>

        {/* Bead diagram */}
        <div className="demo-bead-diagram">
          {/* Heaven zone */}
          <div className="demo-zone demo-zone--heaven">
            <div
              className={`demo-bead demo-bead--heaven${
                phase === 'animating' && needsHeaven ? ' demo-bead--moving-down' : ''
              }`}
            >
              ⬜
            </div>
            {phase === 'animating' && needsHeaven && (
              <div className="demo-arrow demo-arrow--down">↓ 5</div>
            )}
          </div>

          {/* Reckoning bar */}
          <div className="demo-bar">━━━ கணக்கு பட்டை / Reckoning Bar ━━━</div>

          {/* Earth zone */}
          <div className="demo-zone demo-zone--earth">
            {Array.from({ length: 4 }, (_, i) => {
              const isActive = i < earthCount;
              return (
                <div
                  key={i}
                  className={`demo-bead demo-bead--earth${
                    isActive && phase === 'animating' ? ' demo-bead--moving-up' : ''
                  }`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  🟤
                </div>
              );
            })}
            {phase === 'animating' && earthCount > 0 && (
              <div className="demo-arrow demo-arrow--up">
                ↑ {earthCount} × 1
              </div>
            )}
          </div>
        </div>

        <div className="demo-result-label">
          {phase === 'animating' && targetDigit !== undefined && (
            <span>
              = <strong>{targetDigit}</strong>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
