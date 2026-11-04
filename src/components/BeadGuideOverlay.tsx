interface BeadGuideOverlayProps {
  /** Which rod to focus on (0=Ten-Thousands, 4=Ones). Undefined = no guide. */
  rodIndex?: number;
  /** Guide type describing which beads to animate */
  guideType?: 'heaven-down' | 'heaven-up' | 'earth-up' | 'earth-down' | 'both-for-digit';
  /** The target digit (for 'both-for-digit') */
  targetDigit?: number;
  /** If true, don't show the overlay (step complete) */
  complete?: boolean;
}

export function BeadGuideOverlay({ rodIndex, guideType, targetDigit, complete }: BeadGuideOverlayProps) {
  if (complete || rodIndex === undefined || !guideType) return null;

  // Rod horizontal centre positions as CSS percentages (5 rods, evenly spaced).
  // Slightly offset to the RIGHT of the rod so the label doesn't sit on the bead.
  const rodPercents = [10, 27.5, 45, 62.5, 80];
  const rodCentreX = rodPercents[rodIndex] ?? 80;
  // Place arrow 4 percentage-points to the right of the rod centre so it
  // never overlaps the bead geometry.
  const arrowX = `${rodCentreX + 4}%`;

  // Vertical anchors:
  //   Heaven zone occupies roughly 5% – 33% of canvas height.
  //   Earth zone occupies roughly 42% – 70% of canvas height.
  // We put arrows at the OUTER edge of each zone (above heaven, below earth)
  // so they point toward the beads but don't sit on top of them.
  const HEAVEN_ARROW_TOP = '4%';   // above heaven bead, pointing down
  const EARTH_ARROW_TOP  = '68%';  // below earth beads, pointing up

  type ArrowDef = {
    top: string;
    left: string;
    label: string;
    direction: 'down' | 'up';
    pulse: boolean;
  };

  const arrows: ArrowDef[] = [];

  if (guideType === 'heaven-down') {
    arrows.push({
      top: HEAVEN_ARROW_TOP,
      left: arrowX,
      label: '▼ கீழே\nDown',
      direction: 'down',
      pulse: true,
    });
  } else if (guideType === 'heaven-up') {
    arrows.push({
      top: HEAVEN_ARROW_TOP,
      left: arrowX,
      label: '▲ மேலே\nUp',
      direction: 'up',
      pulse: true,
    });
  } else if (guideType === 'earth-up') {
    arrows.push({
      top: EARTH_ARROW_TOP,
      left: arrowX,
      label: '▲ மேலே\nUp',
      direction: 'up',
      pulse: true,
    });
  } else if (guideType === 'earth-down') {
    arrows.push({
      top: EARTH_ARROW_TOP,
      left: arrowX,
      label: '▼ கீழே\nDown',
      direction: 'down',
      pulse: true,
    });
  } else if (guideType === 'both-for-digit' && targetDigit !== undefined) {
    if (targetDigit >= 5) {
      arrows.push({
        top: HEAVEN_ARROW_TOP,
        left: arrowX,
        label: '▼ 5=சொர்க்கம்\n5=Heaven',
        direction: 'down',
        pulse: true,
      });
    }
    if (targetDigit % 5 > 0) {
      const earthCount = targetDigit % 5;
      arrows.push({
        top: EARTH_ARROW_TOP,
        left: arrowX,
        label: `▲ ${earthCount} மணி\n${earthCount} bead${earthCount > 1 ? 's' : ''}`,
        direction: 'up',
        pulse: true,
      });
    }
    if (targetDigit === 0) {
      arrows.push({
        top: '38%',   // near the reckoning bar
        left: arrowX,
        label: '↕ ஓய்வு\nAll rest',
        direction: 'down',
        pulse: false,
      });
    }
  }

  return (
    <div className="bead-guide-overlay" aria-hidden="true">
      {arrows.map((arrow, idx) => (
        <div
          key={idx}
          className={`bead-guide-arrow bead-guide-arrow--${arrow.direction}${arrow.pulse ? ' bead-guide-arrow--pulse' : ''}`}
          style={{ top: arrow.top, left: arrow.left }}
        >
          <span className="bead-guide-arrow-text">{arrow.label}</span>
          <span className="bead-guide-arrow-icon">{arrow.direction === 'down' ? '↓' : '↑'}</span>
        </div>
      ))}
    </div>
  );
}
