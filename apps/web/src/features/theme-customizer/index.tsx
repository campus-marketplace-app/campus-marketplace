import { X } from 'lucide-react';
import ThemeModeToggle from '../theme-mode-toggle';
import PresetGrid from './PresetGrid';
import RadiusPicker from './RadiusPicker';
import FontPicker from './FontPicker';

type ThemeCustomizerProps = {
  open: boolean;
  onClose: () => void;
};

export default function ThemeCustomizer({ open, onClose }: ThemeCustomizerProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <div
        className={[
          'fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-[var(--color-background)] shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Appearance settings"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] transition-colors"
            aria-label="Close appearance settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <Section label="Theme">
            <PresetGrid />
          </Section>

          <Section label="Mode">
            {/* ThemeModeToggle uses --color-primary colors so wrap in primary bg */}
            <div className="inline-flex rounded-xl bg-[var(--color-primary)] p-0.5">
              <ThemeModeToggle />
            </div>
          </Section>

          <Section label="Corners">
            <RadiusPicker />
          </Section>

          <Section label="Font">
            <FontPicker />
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      {children}
    </div>
  );
}
