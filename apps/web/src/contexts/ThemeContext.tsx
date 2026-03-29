import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getThemeBySchoolCode, type SchoolTheme } from '@campus-marketplace/backend';
import { useAuth } from './AuthContext';

const THEME_MODE_STORAGE_KEY = 'campus-marketplace-theme-mode';
const LIGHT_THEME_BACKGROUND = '#ececec';
const DARK_THEME_BACKGROUND = '#111318';
const DEFAULT_SCHOOL_CODE = 186131; // NJIT's OPE ID as fallback

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

    // Background Image
    '--background-image-url': isDarkMode && theme.background_image_url_dark
      ? `url(${theme.background_image_url_dark})`
      : theme.background_image_url
        ? `url(${theme.background_image_url})`
        : 'none',
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

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [theme, setTheme] = useState<SchoolTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeModePreference, setThemeModePreference] = useState<ThemeModePreference>(getStoredThemeMode);

  const systemPrefersDark = getSystemPrefersDark();
  const darkModeAvailable = hasDarkTheme(theme);
  const resolvedThemeMode = resolveThemeMode(themeModePreference, systemPrefersDark, darkModeAvailable);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedThemeMode === 'dark');
  }, [resolvedThemeMode]);

  useEffect(() => {
    const schoolCode = profile?.school_code ?? DEFAULT_SCHOOL_CODE;

    async function loadTheme() {
      setLoading(true);
      setError(null);
      try {
        const fetchedTheme = await getThemeBySchoolCode(schoolCode);
        setTheme(fetchedTheme);
      } catch (err) {
        setError((err as Error).message);
        console.error('Failed to load theme, loading default');
        try {
          const fallbackTheme = await getThemeBySchoolCode(DEFAULT_SCHOOL_CODE);
          setTheme(fallbackTheme);
        } catch (fallbackErr) {
          setError(`Failed to load theme for school ${schoolCode} and could not load fallback theme either. ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
        }
      } finally {
        setLoading(false);
      }
    }

    void loadTheme();
  }, [profile, user]);

  useEffect(() => {
    if (!theme) return;

    const cssVars = deriveThemeVars(theme, resolvedThemeMode);
    const root = document.documentElement;

    for (const [key, value] of Object.entries(cssVars)) {
      root.style.setProperty(key, value);
    }
  }, [theme, resolvedThemeMode]);

  const setThemeMode = (mode: ThemeModePreference) => {
    setThemeModePreference(mode);
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
  };

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    loading,
    error,
    themeModePreference,
    resolvedThemeMode,
    darkModeAvailable,
    setThemeMode,
    schoolName: theme?.school_name ?? 'Campus Marketplace',
    emailDomain: theme?.email_domain ?? '',
    logoUrl: theme?.logo_url ?? null,
  }), [theme, loading, error, themeModePreference, resolvedThemeMode, darkModeAvailable]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
