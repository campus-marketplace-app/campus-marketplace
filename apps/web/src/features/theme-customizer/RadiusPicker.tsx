import { RADIUS_OPTIONS } from '../../config/presets';
import { useTheme } from '../../contexts/ThemeContext';

export default function RadiusPicker() {
  const { radiusId, setRadius } = useTheme();

  return (
    <div className="flex gap-2">
      {RADIUS_OPTIONS.map(option => {
        const isActive = radiusId === option.id;
        /** Preview radius: cap at 12px so the visual box stays readable. */
        const previewRadius = option.id === 'pill' ? '12px' : option.vars['--radius'];
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setRadius(option.id)}
            className={[
              'flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-2 transition-all',
              isActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50',
            ].join(' ')}
          >
            {/* Visual preview box */}
            <span
              className="h-6 w-8 border-2 border-current opacity-60"
              style={{ borderRadius: previewRadius }}
            />
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{option.name}</span>
          </button>
        );
      })}
    </div>
  );
}
