import { useAbacusStore } from '../store/useAbacusStore';
import { ROD_META } from '../types/abacus';

interface PlaceValueOverlayProps {
  highlightRods?: number[];
}

export function PlaceValueOverlay({ highlightRods = [] }: PlaceValueOverlayProps) {
  const rods = useAbacusStore((s) => s.rods);

  return (
    <div className="place-value-overlay" aria-hidden="true">
      {ROD_META.map((meta, i) => {
        const [kanji, englishName] = meta.label.split('\n');
        const rod = rods[i];
        const digit = rod ? (rod.heavenActive ? 5 : 0) + rod.earthActive : 0;
        const isHighlighted = highlightRods.includes(meta.rodIndex);

        return (
          <div
            key={meta.rodIndex}
            className={`place-value-col${isHighlighted ? ' place-value-col--highlighted' : ''}`}
          >
            <span className="place-value-kanji">{kanji}</span>
            <span className="place-value-english">{englishName}</span>
            <span className="place-value-digit">{digit}</span>
          </div>
        );
      })}
    </div>
  );
}
