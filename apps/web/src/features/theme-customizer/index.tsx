import { Monitor, Sun, Moon, X, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme, type ThemeModePreference } from '../../contexts/ThemeContext';
import PresetGrid from './PresetGrid';
import RadiusPicker from './RadiusPicker';
import FontPicker from './FontPicker';

type ThemeCustomizerProps = {
  open: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
};

const MODES: { value: ThemeModePreference; label: string; Icon: typeof Monitor }[] = [
  { value: 'light',  label: 'Light',  Icon: Sun     },
  { value: 'dark',   label: 'Dark',   Icon: Moon    },
  { value: 'system', label: 'System', Icon: Monitor },
];

export default function ThemeCustomizer({ open, onClose, isLoggedIn }: ThemeCustomizerProps) {
  const { themeModePreference, setThemeMode } = useTheme();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          'fixed left-0 top-0 z-50 flex h-full w-80 flex-col bg-[var(--color-background)] shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Appearance settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">Appearance</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {isLoggedIn ? 'Customize how the app looks' : 'Log in to unlock customization'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Mode — always available */}
          <Section label="Mode">
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(({ value, label, Icon }) => {
                const active = themeModePreference === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setThemeMode(value)}
                    className={[
                      'flex flex-col items-center gap-2 rounded-xl border py-3 transition-all',
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]',
                    ].join(' ')}
                  >
                    <Icon size={17} />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Locked sections — require login */}
          {isLoggedIn ? (
            <>
              <Section label="Theme">
                <PresetGrid />
              </Section>

              <Section label="Corners">
                <RadiusPicker />
              </Section>

              <Section label="Font">
                <FontPicker />
              </Section>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-6 flex flex-col items-center gap-3 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface)]">
                <Lock size={18} className="text-[var(--color-text-muted)]" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Theme customization locked</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Log in to change themes, corners, and fonts</p>
              </div>
              <Link
                to="/login"
                onClick={onClose}
                className="mt-1 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-text-on-primary)] hover:opacity-90 transition-opacity"
              >
                Log in
              </Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}
