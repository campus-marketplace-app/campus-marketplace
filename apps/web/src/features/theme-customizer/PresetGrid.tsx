import { useTheme } from '../../contexts/ThemeContext';

export default function PresetGrid() {
  const { presets, activePresetId, setPreset, resolvedThemeMode } = useTheme();

  const school = presets.filter(p => p.category === 'school');
  const generic = presets.filter(p => p.category === 'generic');

  return (
    <div className="space-y-3">
      <PresetSection label="NJIT" presets={school} activeId={activePresetId} mode={resolvedThemeMode} onSelect={setPreset} />
      <PresetSection label="Generic" presets={generic} activeId={activePresetId} mode={resolvedThemeMode} onSelect={setPreset} />
    </div>
  );
}

function PresetSection({
  label,
  presets,
  activeId,
  mode,
  onSelect,
}: {
  label: string;
  presets: ReturnType<typeof useTheme>['presets'];
  activeId: string;
  mode: 'light' | 'dark';
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {presets.map(preset => {
          const colors = mode === 'dark' ? preset.dark : preset.light;
          const isActive = preset.id === activeId;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={[
                'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all',
                isActive
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/8 ring-1 ring-[var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50',
              ].join(' ')}
            >
              {/* Color swatch */}
              <span
                className="h-6 w-6 shrink-0 rounded-full shadow-sm ring-1 ring-black/10"
                style={{ backgroundColor: colors.primary }}
              />
              <span className="truncate text-xs font-medium text-[var(--color-text-on-primary-surface,#111)]" style={{ color: 'inherit' }}>
                {preset.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
