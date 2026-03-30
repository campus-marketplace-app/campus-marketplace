import { useTheme, type ThemeModePreference } from '../contexts/ThemeContext';

const MODES: { value: ThemeModePreference; label: string; short: string }[] = [
  { value: 'system', label: 'System', short: 'Sys' },
  { value: 'light',  label: 'Light',  short: 'Light' },
  { value: 'dark',   label: 'Dark',   short: 'Dark' },
];

export default function ThemeModeToggle() {
  const { themeModePreference, setThemeMode, darkModeAvailable } = useTheme();

  return (
    <div className="inline-flex rounded-full border border-white/30 bg-white/15 p-0.5 backdrop-blur-sm">
      {MODES.map(({ value, label, short }) => {
        const active = themeModePreference === value;
        const disabled = value === 'dark' && !darkModeAvailable;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => setThemeMode(value)}
            className={[
              'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition',
              active
                ? 'bg-white text-primary shadow-sm'
                : 'text-on-primary hover:bg-white/20',
              disabled ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : '',
            ].join(' ')}
          >
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
