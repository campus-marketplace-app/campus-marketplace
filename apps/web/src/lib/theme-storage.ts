/** Storage abstraction for theme preferences.
 *
 * Today: LocalStoragePreferences (no backend required).
 * Later: implement SupabasePreferences with the same interface and swap it in ThemeContext.
 */

export interface StoredThemePrefs {
  presetId: string;
  mode: 'system' | 'light' | 'dark';
  radius: 'sharp' | 'default' | 'rounded';
  fontId: string;
}

export interface PreferencesStorage {
  load(): StoredThemePrefs | null;
  save(prefs: StoredThemePrefs): void;
}

const PREFS_KEY = 'campus-marketplace-theme-prefs';
/** Legacy key written by the old ThemeContext — only stored the dark mode preference. */
const LEGACY_MODE_KEY = 'campus-marketplace-theme-mode';
const USER_PREFS_KEY_PREFIX = 'campus-marketplace-theme-prefs-user';

export class LocalStoragePreferences implements PreferencesStorage {
  load(): StoredThemePrefs | null {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) return JSON.parse(raw) as StoredThemePrefs;

      // Migrate the legacy mode-only key on first load.
      const legacyMode = localStorage.getItem(LEGACY_MODE_KEY);
      if (legacyMode === 'light' || legacyMode === 'dark' || legacyMode === 'system') {
        const migrated: StoredThemePrefs = {
          presetId: 'njit-classic',
          mode: legacyMode,
          radius: 'default',
          fontId: 'inter',
        };
        this.save(migrated);
        localStorage.removeItem(LEGACY_MODE_KEY);
        return migrated;
      }
    } catch {
      // Ignore storage errors (private browsing, quota exceeded, etc.)
    }
    return null;
  }

  save(prefs: StoredThemePrefs): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
  }
}

/** Per-user prefs stored under a user-specific key so each account has its own theme. */
export class UserLocalStoragePreferences implements PreferencesStorage {
  private readonly key: string;

  constructor(userId: string) {
    this.key = `${USER_PREFS_KEY_PREFIX}-${userId}`;
  }

  load(): StoredThemePrefs | null {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) return JSON.parse(raw) as StoredThemePrefs;
    } catch {
      // Ignore storage errors
    }
    return null;
  }

  save(prefs: StoredThemePrefs): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(prefs));
    } catch {
      // Ignore storage errors
    }
  }
}
