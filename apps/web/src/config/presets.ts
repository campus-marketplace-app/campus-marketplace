/** Theme presets, radius options, and font options.
 *
 * Each preset defines a full light and dark color set.
 * ThemeContext picks the correct half based on the resolved mode.
 * Secondary colors and accents are authored explicitly per preset — not derived.
 */

export interface PresetColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  textOnPrimary: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  category: 'school' | 'generic';
  light: PresetColors;
  dark: PresetColors;
}

export const PRESETS: ThemePreset[] = [
  // --- School-branded ---
  {
    id: 'njit-classic',
    name: 'NJIT Classic',
    category: 'school',
    light: {
      primary: '#B81C24',
      secondary: '#FFFFFF',
      accent: '#f1b7be',
      background: '#ececec',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#CC2233',
      secondary: '#1a1a2e',
      accent: '#f1b7be',
      background: '#111318',
      textOnPrimary: '#FFFFFF',
    },
  },
  {
    id: 'njit-midnight',
    name: 'NJIT Midnight',
    category: 'school',
    light: {
      primary: '#B81C24',
      secondary: '#1a1a2e',
      accent: '#e8a0a8',
      background: '#f0f0f5',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#CC2233',
      secondary: '#0d0d1a',
      accent: '#e8a0a8',
      background: '#0f0f1a',
      textOnPrimary: '#FFFFFF',
    },
  },
  {
    id: 'njit-muted',
    name: 'NJIT Muted',
    category: 'school',
    light: {
      primary: '#8B3A3F',
      secondary: '#FFFFFF',
      accent: '#d4a0a4',
      background: '#efefef',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#A84448',
      secondary: '#1e1a1a',
      accent: '#d4a0a4',
      background: '#131111',
      textOnPrimary: '#FFFFFF',
    },
  },

  // --- Generic ---
  {
    id: 'ocean',
    name: 'Ocean',
    category: 'generic',
    light: {
      primary: '#1a6eb5',
      secondary: '#FFFFFF',
      accent: '#93c5fd',
      background: '#eef4fb',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#2563eb',
      secondary: '#0f172a',
      accent: '#93c5fd',
      background: '#0c1220',
      textOnPrimary: '#FFFFFF',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'generic',
    light: {
      primary: '#2d6a4f',
      secondary: '#FFFFFF',
      accent: '#86efac',
      background: '#eef7f1',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#3a8c65',
      secondary: '#0f1a13',
      accent: '#86efac',
      background: '#0c1510',
      textOnPrimary: '#FFFFFF',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    category: 'generic',
    light: {
      primary: '#475569',
      secondary: '#FFFFFF',
      accent: '#94a3b8',
      background: '#f1f5f9',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#64748b',
      secondary: '#0f172a',
      accent: '#94a3b8',
      background: '#0d1117',
      textOnPrimary: '#FFFFFF',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'generic',
    light: {
      primary: '#c2410c',
      secondary: '#FFFFFF',
      accent: '#fdba74',
      background: '#fdf4ee',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#ea580c',
      secondary: '#1a0f0a',
      accent: '#fdba74',
      background: '#160d08',
      textOnPrimary: '#FFFFFF',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    category: 'generic',
    light: {
      primary: '#6d28d9',
      secondary: '#FFFFFF',
      accent: '#c4b5fd',
      background: '#f5f3ff',
      textOnPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#7c3aed',
      secondary: '#0f0a1a',
      accent: '#c4b5fd',
      background: '#0d0a16',
      textOnPrimary: '#FFFFFF',
    },
  },
];

export const DEFAULT_PRESET_ID = 'njit-classic';

// --- Radius options ---

export type RadiusId = 'sharp' | 'default' | 'rounded' | 'pill';

export interface RadiusOption {
  id: RadiusId;
  name: string;
  vars: Record<string, string>;
}

export const RADIUS_OPTIONS: RadiusOption[] = [
  {
    id: 'sharp',
    name: 'Sharp',
    vars: { '--radius': '0px', '--radius-sm': '0px', '--radius-lg': '0px', '--radius-pill': '0px' },
  },
  {
    id: 'default',
    name: 'Default',
    vars: { '--radius': '6px', '--radius-sm': '3px', '--radius-lg': '10px', '--radius-pill': '9999px' },
  },
  {
    id: 'rounded',
    name: 'Rounded',
    vars: { '--radius': '12px', '--radius-sm': '6px', '--radius-lg': '18px', '--radius-pill': '9999px' },
  },
  {
    id: 'pill',
    name: 'Pill',
    vars: { '--radius': '9999px', '--radius-sm': '9999px', '--radius-lg': '9999px', '--radius-pill': '9999px' },
  },
];

// --- Font options ---

export interface FontOption {
  id: string;
  name: string;
  value: string;
  /** Google Fonts URL to inject, or null for system fonts. */
  url: string | null;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'inter',
    name: 'Inter',
    value: "'Inter', sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    value: "'Roboto', sans-serif",
    url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  },
  {
    id: 'georgia',
    name: 'Georgia',
    value: 'Georgia, serif',
    url: null,
  },
  {
    id: 'system',
    name: 'System UI',
    value: 'system-ui, sans-serif',
    url: null,
  },
];

export const DEFAULT_RADIUS_ID: RadiusId = 'default';
export const DEFAULT_FONT_ID = 'inter';
