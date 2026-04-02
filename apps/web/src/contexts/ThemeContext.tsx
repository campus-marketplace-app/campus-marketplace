import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SchoolTheme } from '@campus-marketplace/backend';
import { NJIT_THEME } from '../config/njit-theme';

const THEME_MODE_KEY = 'campus-marketplace-theme-mode';
const LIGHT_BG = '#ececec';
const DARK_BG = '#111318';

export type ThemeModePreference = 'system' | 'light' | 'dark';
export type ResolvedThemeMode = 'light' | 'dark';

// --- Hex <-> HSL color helpers ---

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
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
  h /= 360; s /= 100; l /= 100;
  const hue = (p: number, q: number, t: number) => {
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
    r = hue(p, q, h + 1 / 3);
    g = hue(p, q, h);
    b = hue(p, q, h - 1 / 3);
  }
  const hex = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function adjustLightness(hex: string, delta: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l + delta)));
}

function desaturate(hex: string, amount: number): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.max(0, s - amount), l);
}

function blendColors(a: string, b: string, ratio: number): string {
  const rA = parseInt(a.slice(1, 3), 16), gA = parseInt(a.slice(3, 5), 16), bA = parseInt(a.slice(5, 7), 16);
  const rB = parseInt(b.slice(1, 3), 16), gB = parseInt(b.slice(3, 5), 16), bB = parseInt(b.slice(5, 7), 16);
  const r = Math.round(rA + (rB - rA) * ratio);
  const g = Math.round(gA + (gB - gA) * ratio);
  const bl = Math.round(bA + (bB - bA) * ratio);
  const hex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

// --- Theme mode helpers ---

function getStoredMode(): ThemeModePreference {
  try {
    const v = localStorage.getItem(THEME_MODE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function hasDarkColors(theme: SchoolTheme): boolean {
  return Boolean(theme.primary_color_dark && theme.secondary_color_dark && theme.accent_color_dark);
}

function resolveMode(
  pref: ThemeModePreference,
  sysDark: boolean,
  darkAvail: boolean,
): ResolvedThemeMode {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return darkAvail ? 'dark' : 'light';
  return sysDark && darkAvail ? 'dark' : 'light';
}

// --- Derive all CSS variables from theme + resolved mode ---

function buildCssVars(theme: SchoolTheme, mode: ResolvedThemeMode): Record<string, string> {
  const dark = mode === 'dark';
  const primary = dark ? theme.primary_color_dark ?? theme.primary_color : theme.primary_color;
  const secondary = dark ? theme.secondary_color_dark ?? theme.secondary_color : theme.secondary_color;
  const accent = dark
    ? theme.accent_color_dark ?? theme.accent_color ?? '#f1b7be'
    : theme.accent_color ?? '#f1b7be';
  const bg = dark
    ? theme.background_color ? adjustLightness(theme.background_color, -72) : DARK_BG
    : theme.background_color ?? LIGHT_BG;
  const textOnPrimary = theme.text_on_primary ?? '#FFFFFF';
  const buttonStyle = theme.button_style ?? '#000000';

  const hoverDelta = dark ? 10 : 12;
  const darkDelta = dark ? -10 : -15;

  return {
    '--color-primary': primary,
    '--color-secondary': secondary,
    '--color-accent': accent,
    '--color-background': bg,
    '--color-text-on-primary': textOnPrimary,
    '--color-button-style': buttonStyle,
    '--color-primary-hover': adjustLightness(primary, hoverDelta),
    '--color-primary-dark': adjustLightness(primary, darkDelta),
    '--color-accent-light': adjustLightness(accent, dark ? 6 : 10),
    '--color-accent-muted': desaturate(accent, 30),
    '--color-secondary-muted': blendColors(primary, accent, 0.5),
    '--color-background-alt': adjustLightness(bg, dark ? 6 : -6),
    '--color-border': adjustLightness(bg, dark ? 14 : -22),
    '--color-surface': adjustLightness(bg, dark ? 10 : -10),
    '--color-surface-alt': adjustLightness(bg, dark ? 14 : -15),
    '--font-family': theme.font_family ?? 'Arial, Helvetica, sans-serif',
  };
}

// --- Context ---

type ThemeContextValue = {
  theme: SchoolTheme;
  loading: boolean;
  themeModePreference: ThemeModePreference;
  resolvedThemeMode: ResolvedThemeMode;
  darkModeAvailable: boolean;
  setThemeMode: (mode: ThemeModePreference) => void;
  schoolName: string;
  logoUrl: string | null;
  loginBgUrl: string | null;
  signupBgUrl: string | null;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Static theme — no DB fetch needed
  const theme: SchoolTheme = NJIT_THEME;
  const loading = false;
  const [pref, setPref] = useState<ThemeModePreference>(getStoredMode);
  const [sysDark, setSysDark] = useState(systemPrefersDark);

  // Listen for OS-level dark mode changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const darkModeAvailable = hasDarkColors(theme);
  const resolvedThemeMode = resolveMode(pref, sysDark, darkModeAvailable);

  // Apply dark class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedThemeMode === 'dark');
  }, [resolvedThemeMode]);

  // Apply CSS variables
  useEffect(() => {
    const vars = buildCssVars(theme, resolvedThemeMode);
    for (const [k, v] of Object.entries(vars)) {
      document.documentElement.style.setProperty(k, v);
    }
  }, [theme, resolvedThemeMode]);

  const setThemeMode = useCallback((mode: ThemeModePreference) => {
    setPref(mode);
    try { localStorage.setItem(THEME_MODE_KEY, mode); } catch { /* ignore */ }
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    loading,
    themeModePreference: pref,
    resolvedThemeMode,
    darkModeAvailable,
    setThemeMode,
    schoolName: theme.school_name,
    logoUrl: theme.logo_url ?? null,
    loginBgUrl: theme.login_background_url ?? null,
    signupBgUrl: theme.signup_background_url ?? null,
  }), [pref, resolvedThemeMode, darkModeAvailable, setThemeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
