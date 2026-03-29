import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getThemeBySchoolCode, type SchoolTheme } from '@campus-marketplace/backend';

const THEME_MODE_STORAGE_KEY = 'campus-marketplace-theme-mode';
const LIGHT_THEME_BACKGROUND = '#ececec';
const DARK_THEME_BACKGROUND = '#111318';

export type ThemeModePreference = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

// --- Color utility: hex <-> HSL conversions and simple transforms ---

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Adjust lightness by a delta (positive = lighter, negative = darker)
function adjustLightness(hex: string, delta: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + delta)));
}

// Reduce saturation by a percentage
function desaturate(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.max(0, s - amount), l);
}

// Blend two hex colors at a given ratio (0 = all colorA, 1 = all colorB)
function blendColors(colorA: string, colorB: string, ratio: number): string {
  const rA = parseInt(colorA.slice(1, 3), 16);
  const gA = parseInt(colorA.slice(3, 5), 16);
  const bA = parseInt(colorA.slice(5, 7), 16);
  const rB = parseInt(colorB.slice(1, 3), 16);
  const gB = parseInt(colorB.slice(3, 5), 16);
  const bB = parseInt(colorB.slice(5, 7), 16);

  const r = Math.round(rA + (rB - rA) * ratio);
  const g = Math.round(gA + (gB - gA) * ratio);
  const b = Math.round(bA + (bB - bA) * ratio);

  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function isThemeModePreference(value: string | null): value is ThemeModePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function getStoredThemeMode(): ThemeModePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const value = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return isThemeModePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function hasDarkTheme(theme: SchoolTheme | null): boolean {
  return Boolean(theme?.primary_color_dark && theme.secondary_color_dark && theme.accent_color_dark);
}

function resolveThemeMode(
  modePreference: ThemeModePreference,
  systemPrefersDark: boolean,
  darkThemeAvailable: boolean,
): ResolvedThemeMode {
  if (modePreference === 'light') {
    return 'light';
  }

  if (modePreference === 'dark') {
    return darkThemeAvailable ? 'dark' : 'light';
  }

  return systemPrefersDark && darkThemeAvailable ? 'dark' : 'light';
}

// --- Derive the full set of CSS variables from base theme colors ---

function deriveThemeVars(theme: SchoolTheme, resolvedMode: ResolvedThemeMode) {
  const isDarkMode = resolvedMode === 'dark';
  const primary = isDarkMode ? theme.primary_color_dark ?? theme.primary_color : theme.primary_color;
  const secondary = isDarkMode ? theme.secondary_color_dark ?? theme.secondary_color : theme.secondary_color;
  const accent = isDarkMode ? theme.accent_color_dark ?? theme.accent_color ?? '#f1b7be' : theme.accent_color ?? '#f1b7be';
  const background = isDarkMode
    ? theme.background_color ? adjustLightness(theme.background_color, -72) : DARK_THEME_BACKGROUND
    : theme.background_color ?? LIGHT_THEME_BACKGROUND;
  const textOnPrimary = theme.text_on_primary ?? '#FFFFFF';
  const buttonStyle = theme.button_style ?? '#000000';
  const primaryHoverDelta = isDarkMode ? 10 : 12;
  const primaryDarkDelta = isDarkMode ? -10 : -15;
  const accentLightDelta = isDarkMode ? 6 : 10;
  const backgroundAltDelta = isDarkMode ? 6 : -6;
  const borderDelta = isDarkMode ? 14 : -22;
  const surfaceDelta = isDarkMode ? 10 : -10;
  const surfaceAltDelta = isDarkMode ? 14 : -15;

  return {
    '--color-primary': primary,
    '--color-secondary': secondary,
    '--color-accent': accent,
    '--color-background': background,
    '--color-text-on-primary': textOnPrimary,
    '--color-button-style': buttonStyle,

    // Derived
    '--color-primary-hover': adjustLightness(primary, primaryHoverDelta),
    '--color-primary-dark': adjustLightness(primary, primaryDarkDelta),
    '--color-accent-light': adjustLightness(accent, accentLightDelta),
    '--color-accent-muted': desaturate(accent, 30),
    '--color-background-alt': adjustLightness(background, backgroundAltDelta),
    '--color-border': adjustLightness(background, borderDelta),
    '--color-surface': adjustLightness(background, surfaceDelta),
    '--color-surface-alt': adjustLightness(background, surfaceAltDelta),
    '--color-secondary-muted': blendColors(primary, accent, 0.5),

    // Font
    '--font-family': theme.font_family ?? 'Arial, Helvetica, sans-serif',
  };
}

// --- React context ---

type ThemeContextValue = {
  theme: SchoolTheme | null;
  loading: boolean;
  error: string | null;
  themeModePreference: ThemeModePreference;
  resolvedThemeMode: ResolvedThemeMode;
  darkModeAvailable: boolean;
  setThemeMode: (mode: ThemeModePreference) => void;
  /** School display name, e.g. "New Jersey Institute of Technology" */
  schoolName: string;
  /** Email domain for validation, e.g. "njit.edu" */
  emailDomain: string;
  /** School logo URL if available */
  logoUrl: string | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Validate env var once at module level
const schoolCode = Number(import.meta.env.VITE_SCHOOL_CODE);
const schoolCodeValid = !isNaN(schoolCode) && schoolCode > 0;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SchoolTheme | null>(null);
  const [themeModePreference, setThemeModePreference] = useState<ThemeModePreference>(() => getStoredThemeMode());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemPrefersDark());
  const [loading, setLoading] = useState(schoolCodeValid);
  const [error, setError] = useState<string | null>(
    schoolCodeValid ? null : 'VITE_SCHOOL_CODE is not set or invalid',
  );
  const darkModeAvailable = hasDarkTheme(theme);
  const resolvedThemeMode = resolveThemeMode(themeModePreference, systemPrefersDark, darkModeAvailable);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeModePreference);
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
  }, [themeModePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    setSystemPrefersDark(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const themeVars = useMemo(() => {
    if (!theme) {
      return null;
    }

    return deriveThemeVars(theme, resolvedThemeMode);
  }, [theme, resolvedThemeMode]);

  useEffect(() => {
    if (!schoolCodeValid) return;

    getThemeBySchoolCode(schoolCode)
      .then((data) => {
        setTheme(data);
      })
      .catch((err) => {
        console.error('Failed to load theme:', err);
        setError(err instanceof Error ? err.message : 'Failed to load theme');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeMode = resolvedThemeMode;
    root.style.colorScheme = resolvedThemeMode;

    if (!themeVars) {
      return;
    }

    for (const [key, value] of Object.entries(themeVars)) {
      root.style.setProperty(key, value);
    }
  }, [resolvedThemeMode, themeVars]);

  const value: ThemeContextValue = {
    theme,
    loading,
    error,
    themeModePreference,
    resolvedThemeMode,
    darkModeAvailable,
    setThemeMode: setThemeModePreference,
    schoolName: theme?.school_name ?? 'Campus',
    emailDomain: theme?.email_domain ?? 'university.edu',
    logoUrl: theme?.logo_url ?? null,
  };

  // Show a minimal loading state to prevent flash of wrong colors
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-background)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #b9b9b9',
          borderTopColor: '#B81C24',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook for components that need theme data (school name, email domain, etc.)
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
