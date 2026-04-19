import { Monitor, Sun, Moon } from 'lucide-react';
import { useTheme, type ThemeModePreference } from '../contexts/ThemeContext';

const MODES: { value: ThemeModePreference; label: string; Icon: typeof Monitor }[] = [
    { value: 'system', label: 'System', Icon: Monitor },
    { value: 'light',  label: 'Light',  Icon: Sun    },
    { value: 'dark',   label: 'Dark',   Icon: Moon   },
];

export default function ThemeModeToggle() {
    const { themeModePreference, setThemeMode, darkModeAvailable } = useTheme();

    return (
        <div className="inline-flex rounded-lg bg-white/10 p-1 gap-0.5">
            {MODES.map(({ value, label, Icon }) => {
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
                            'relative rounded-md p-2 transition-all group',
                            active
                                ? 'bg-white text-[var(--color-primary)] shadow-sm'
                                : 'text-[var(--color-text-on-primary)]/70 hover:text-[var(--color-text-on-primary)]',
                            disabled ? 'cursor-not-allowed opacity-40' : '',
                        ].join(' ')}
                    >
                        <Icon size={16} />
                        {/* Tooltip */}
                        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
