import { useTheme } from '../../contexts/ThemeContext';

export default function PresetGrid() {
  const { presets, activePresetId, setPreset, resolvedThemeMode } = useTheme();

  return (
    <div className="flex flex-col gap-2">
      {presets.map(preset => {
        const colors = resolvedThemeMode === 'dark' ? preset.dark : preset.light;
        const isActive = preset.id === activePresetId;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => setPreset(preset.id)}
            className={[
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
              isActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40',
            ].join(' ')}
          >
            {/* Swatch cluster */}
            <span className="relative h-7 w-7 shrink-0">
              <span
                className="absolute inset-0 rounded-full shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: colors.primary }}
              />
              <span
                className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: colors.background }}
              />
            </span>
            <span className="text-sm font-medium text-[var(--color-text)]">{preset.name}</span>
            {isActive && (
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                Active
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
