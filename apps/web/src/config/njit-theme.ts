import type { SchoolTheme } from '@campus-marketplace/backend';

/**
 * Static NJIT branding config.
 *
 * Replaces the school_themes database lookup. All theme values are defined here
 * so the app has no runtime dependency on the theme table.
 *
 * Color palette:
 *   - Primary:       #B81C24  — bright NJIT red (nav bar, main buttons)
 *   - Dark variant:  derived automatically (~#820f15 after -15L adjustment)
 *   - Accent:        #f1b7be  — light rose used for subtle highlights
 *
 * To add a login or signup background image, set the *_url fields below to
 * a publicly accessible image URL (e.g. an NJIT campus photo).
 */
export const NJIT_THEME = {
  school_code: 1,
  school_name: 'NJIT',

  // Light-mode colors
  primary_color: '#B81C24',
  secondary_color: '#FFFFFF',
  accent_color: '#f1b7be',
  background_color: '#ececec',
  text_on_primary: '#FFFFFF',
  button_style: '#820f15',

  // Dark-mode color variants (enables the dark mode toggle)
  primary_color_dark: '#CC2233',
  secondary_color_dark: '#1a1a2e',
  accent_color_dark: '#f1b7be',

  font_family: "'Inter', sans-serif",

  login_background_url: '/login_page.jpg',
  signup_background_url: '/signin_page.png',

  logo_url: undefined,
  email_domain: 'njit.edu',
} satisfies SchoolTheme;
