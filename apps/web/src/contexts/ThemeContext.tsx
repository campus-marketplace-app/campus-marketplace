import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { adjustLightness, blendColors, desaturate } from '../lib/color-utils';
import {
  LocalStoragePreferences,
  type PreferencesStorage,
  type StoredThemePrefs,
} from '../lib/theme-storage';
import {
  DEFAULT_FONT_ID,
  DEFAULT_PRESET_ID,
  DEFAULT_RADIUS_ID,
  FONT_OPTIONS,
  PRESETS,
  RADIUS_OPTIONS,
  type ThemePreset,
} from '../config/presets';
import { NJIT_THEME } from '../config/njit-theme';

export type ThemeModePreference = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

// --- Helpers ---

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveMode(pref: ThemeModePreference, sysDark: boolean): ResolvedThemeMode {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return sysDark ? 'dark' : 'light';
}

function loadInitialPrefs(storage: PreferencesStorage): StoredThemePrefs {
  return storage.load() ?? {
    presetId: DEFAULT_PRESET_ID,
    mode: 'system',
    radius: DEFAULT_RADIUS_ID,
    fontId: DEFAULT_FONT_ID,
  };
}

function findPreset(id: string): ThemePreset {
  return PRESETS.find(p => p.id === id) ?? PRESETS[0];
}

/** Inject a Google Fonts <link> tag if the font has a URL and isn't already loaded. */
function ensureFontLoaded(fontId: string): void {
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

/** Compute all CSS variables from the active preset, mode, radius, and font. */
function buildCssVars(
  preset: ThemePreset,
  mode: ResolvedThemeMode,
  radiusId: string,
  fontId: string,
): Record<string, string> {
  const dark = mode === 'dark';
  const colors = dark ? preset.dark : preset.light;
  const { primary, secondary, accent, background, textOnPrimary } = colors;

  const hoverDelta = dark ? 10 : 12;
  const darkDelta = dark ? -10 : -15;

  const radiusOption = RADIUS_OPTIONS.find(r => r.id === radiusId) ?? RADIUS_OPTIONS[1];
  const fontOption = FONT_OPTIONS.find(f => f.id === fontId) ?? FONT_OPTIONS[0];

  return {
    '--color-primary': primary,
    '--color-primary-hover': adjustLightness(primary, hoverDelta),
    '--color-primary-dark': adjustLightness(primary, darkDelta),
    '--color-secondary': secondary,
    '--color-accent': accent,
    '--color-accent-light': adjustLightness(accent, dark ? 6 : 10),
    '--color-accent-muted': desaturate(accent, 30),
    '--color-secondary-muted': blendColors(primary, accent, 0.5),
    '--color-background': background,
    '--color-background-alt': adjustLightness(background, dark ? 6 : -6),
    '--color-surface': adjustLightness(background, dark ? 10 : -10),
    '--color-surface-alt': adjustLightness(background, dark ? 14 : -15),
    '--color-border': adjustLightness(background, dark ? 14 : -22),
    '--color-text-on-primary': textOnPrimary,
    '--color-text': dark ? '#f3f4f6' : '#111827',
    '--color-text-muted': dark ? '#9ca3af' : '#6b7280',
    '--color-button-style': adjustLightness(primary, darkDelta),
    '--font-family': fontOption.value,
    ...radiusOption.vars,
  };
}

// --- Context ---

type ThemeContextValue = {
  // School identity (static, from NJIT_THEME)
  schoolName: string;
  logoUrl: string | null;
  loginBgUrl: string | null;
  signupBgUrl: string | null;

  // Mode
  themeModePreference: ThemeModePreference;
  resolvedThemeMode: ResolvedThemeMode;
  /** All presets have dark colors, so this is always true. Kept for toggle compatibility. */
  darkModeAvailable: boolean;
  setThemeMode: (mode: ThemeModePreference) => void;

  // Preset
  activePresetId: string;
  presets: ThemePreset[];
  setPreset: (id: string) => void;

  // Style controls
  radiusId: string;
  setRadius: (radius: 'sharp' | 'default' | 'rounded' | 'pill') => void;
  fontId: string;
  setFont: (id: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const storage: PreferencesStorage = new LocalStoragePreferences();

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Read prefs synchronously so useState is initialized with the right values —
  // prevents a flash of the default theme on load.
  const [prefs, setPrefs] = useState<StoredThemePrefs>(() => loadInitialPrefs(storage));
  const [sysDark, setSysDark] = useState(systemPrefersDark);

  // Listen for OS dark mode changes.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedThemeMode = resolveMode(prefs.mode, sysDark);
  const activePreset = findPreset(prefs.presetId);

  // Set page title from school name.
  useEffect(() => {
    document.title = `${NJIT_THEME.school_name} Marketplace`;
  }, []);

  // Apply dark class to <html>.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedThemeMode === 'dark');
  }, [resolvedThemeMode]);

  // Apply all CSS variables.
  useEffect(() => {
    ensureFontLoaded(prefs.fontId);
    const vars = buildCssVars(activePreset, resolvedThemeMode, prefs.radius, prefs.fontId);
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }, [activePreset, resolvedThemeMode, prefs.radius, prefs.fontId]);

  /** Persist a partial prefs update and re-render. */
  const updatePrefs = useCallback((patch: Partial<StoredThemePrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      storage.save(next);
      return next;
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeModePreference) => updatePrefs({ mode }), [updatePrefs]);
  const setPreset = useCallback((presetId: string) => updatePrefs({ presetId }), [updatePrefs]);
  const setRadius = useCallback((radius: StoredThemePrefs['radius']) => updatePrefs({ radius }), [updatePrefs]);
  const setFont = useCallback((fontId: string) => updatePrefs({ fontId }), [updatePrefs]);

  const value = useMemo<ThemeContextValue>(() => ({
    schoolName: NJIT_THEME.school_name,
    logoUrl: NJIT_THEME.logo_url ?? null,
    loginBgUrl: NJIT_THEME.login_background_url ?? null,
    signupBgUrl: NJIT_THEME.signup_background_url ?? null,
    themeModePreference: prefs.mode,
    resolvedThemeMode,
    darkModeAvailable: true,
    setThemeMode,
    activePresetId: prefs.presetId,
    presets: PRESETS,
    setPreset,
    radiusId: prefs.radius,
    setRadius,
    fontId: prefs.fontId,
    setFont,
  }), [prefs, resolvedThemeMode, setThemeMode, setPreset, setRadius, setFont]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
