import { useTheme, type ThemeModePreference } from '../contexts/ThemeContext';

const MODES: Array<{ value: ThemeModePreference; label: string; shortLabel: string }> = [
  { value: 'system', label: 'System theme', shortLabel: 'System' },
  { value: 'light', label: 'Light mode', shortLabel: 'Light' },
  { value: 'dark', label: 'Dark mode', shortLabel: 'Dark' },
];

export default function ThemeModeToggle() {
  const { themeModePreference, setThemeMode, darkModeAvailable } = useTheme();

  return (
    <div className="inline-flex rounded-full border border-white/25 bg-white/15 p-1 shadow-sm backdrop-blur-sm">
      {MODES.map((mode) => {
        const active = themeModePreference === mode.value;
        const disabled = mode.value === 'dark' && !darkModeAvailable;

        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={active}
            title={mode.label}
            disabled={disabled}
            onClick={() => setThemeMode(mode.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${active
              ? 'bg-white text-[var(--color-primary)] shadow-sm'
              : 'text-[var(--color-text-on-primary)] hover:bg-white/15'
              } ${disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}
          >
            <span className="sm:hidden">{mode.shortLabel}</span>
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}