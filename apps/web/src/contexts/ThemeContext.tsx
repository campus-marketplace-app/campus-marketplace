import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getThemeBySchoolCode, type SchoolTheme } from '@campus-marketplace/backend';

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

// --- Derive the full set of CSS variables from base theme colors ---

function deriveThemeVars(theme: SchoolTheme) {
  const primary = theme.primary_color;
  const secondary = theme.secondary_color;
  const accent = theme.accent_color ?? '#f1b7be';
  const background = theme.background_color ?? '#ececec';
  const textOnPrimary = theme.text_on_primary ?? '#FFFFFF';
  const buttonStyle = theme.button_style ?? '#000000';

  return {
    '--color-primary': primary,
    '--color-secondary': secondary,
    '--color-accent': accent,
    '--color-background': background,
    '--color-text-on-primary': textOnPrimary,
    '--color-button-style': buttonStyle,

    // Derived
    '--color-primary-hover': adjustLightness(primary, 12),
    '--color-primary-dark': adjustLightness(primary, -15),
    '--color-accent-light': adjustLightness(accent, 10),
    '--color-accent-muted': desaturate(accent, 30),
    '--color-background-alt': adjustLightness(background, -6),
    '--color-border': adjustLightness(background, -22),
    '--color-surface': adjustLightness(background, -10),
    '--color-surface-alt': adjustLightness(background, -15),
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
  const [loading, setLoading] = useState(schoolCodeValid);
  const [error, setError] = useState<string | null>(
    schoolCodeValid ? null : 'VITE_SCHOOL_CODE is not set or invalid',
  );

  useEffect(() => {
    if (!schoolCodeValid) return;

    getThemeBySchoolCode(schoolCode)
      .then((data) => {
        setTheme(data);

        // Apply CSS variables to :root
        const vars = deriveThemeVars(data);
        const root = document.documentElement;
        for (const [key, value] of Object.entries(vars)) {
          root.style.setProperty(key, value);
        }
      })
      .catch((err) => {
        console.error('Failed to load theme:', err);
        setError(err instanceof Error ? err.message : 'Failed to load theme');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const value: ThemeContextValue = {
    theme,
    loading,
    error,
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
        background: '#ececec',
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
