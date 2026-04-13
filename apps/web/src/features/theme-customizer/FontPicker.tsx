import { useEffect } from 'react';
import { FONT_OPTIONS } from '../../config/presets';
import { useTheme } from '../../contexts/ThemeContext';

/** Preload a Google Font on hover so the preview feels instant. */
function preloadFont(fontId: string) {
  const font = FONT_OPTIONS.find(f => f.id === fontId);
  if (!font?.url) return;
  const linkId = `gfont-${fontId}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = font.url;
  document.head.appendChild(link);
}

export default function FontPicker() {
  const { fontId, setFont } = useTheme();

  // Preload all Google Fonts when the panel opens so previews are ready.
  useEffect(() => {
    FONT_OPTIONS.forEach(f => preloadFont(f.id));
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {FONT_OPTIONS.map(option => {
        const isActive = fontId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setFont(option.id)}
            onMouseEnter={() => preloadFont(option.id)}
            className={[
              'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition-all',
              isActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50',
            ].join(' ')}
          >
            <span
              className="text-xl font-semibold leading-none"
              style={{ fontFamily: option.value }}
            >
              Aa
            </span>
            <span className="text-xs font-medium text-[var(--color-text-muted)]">{option.name}</span>
          </button>
        );
      })}
    </div>
  );
}
