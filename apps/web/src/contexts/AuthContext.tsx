import { getProfile, type UserProfile as BackendUserProfile } from '@campus-marketplace/backend';
import {
  getSessionFromTokens,
  signInWithEmail,
  signOutWithTokens,
  type AuthResult,
  type SignInInput,
} from '@campus-marketplace/backend';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@campus-marketplace/backend';

// Frontend's view of the UserProfile, which should match the backend definition.
export type UserProfile = BackendUserProfile;

const AUTH_TOKEN_STORAGE_KEY = 'campus-marketplace-auth-token';

interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

function getStoredAuthToken(): AuthToken | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const value = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (value) {
      const { accessToken, refreshToken } = JSON.parse(value);
      if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
        return { accessToken, refreshToken };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function setStoredAuthToken(session: Session | null) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (session) {
      const value = JSON.stringify({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to store auth token:', error);
  }
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (input: SignInInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      setError(null);
      const token = getStoredAuthToken();
      if (token) {
        const { session: newSession, user: newUser } = await getSessionFromTokens(
          token.accessToken,
          token.refreshToken,
        );
        setSession(newSession);
        setUser(newUser);
        if (newUser) {
          const userProfile = await getProfile(newUser.id);
          setProfile(userProfile);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setSession(null);
      setUser(null);
      setProfile(null);
      setStoredAuthToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const signIn = async (input: SignInInput) => {
    setLoading(true);
    try {
      const { session: newSession, user: newUser } = await signInWithEmail(input);
      setSession(newSession);
      setUser(newUser);
      setStoredAuthToken(newSession);
      if (newUser) {
        const userProfile = await getProfile(newUser.id);
        setProfile(userProfile);
      }
      return { session: newSession, user: newUser };
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const token = getStoredAuthToken();
      if (token) {
        await signOutWithTokens(token.accessToken, token.refreshToken);
      }
    } catch (err) {
      // Even if server-side signout fails, clear client-side session
      console.warn(`An error occurred during server-side signout: ${(err as Error).message}`);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      setStoredAuthToken(null);
      setLoading(false);
    }
  };

  const value = { session, user, profile, loading, error, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
