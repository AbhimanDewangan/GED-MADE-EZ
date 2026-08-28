"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { apiUrl } from "@/lib/api";
import { isSuperAdminEmail } from "@/lib/admin";
import { clearToken, getToken, setToken } from "@/lib/auth-storage";

export type AppUser = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  isSuperAdmin: boolean;
  isTeacher: boolean;
};

type AuthContextType = {
  user: AppUser | null;
  loading: boolean;
  googleConfigured: boolean;
  isSuperAdmin: boolean;
  isTeacher: boolean;
  signInWithGoogle: () => void;
  signOut: () => void;
  completeLogin: (token: string) => Promise<AppUser>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(raw: {
  id: string;
  email: string;
  name: string;
  picture?: string;
  isSuperAdmin?: boolean;
  isTeacher?: boolean;
}): AppUser {
  return {
    uid: raw.id,
    email: raw.email,
    displayName: raw.name,
    photoURL: raw.picture || null,
    isSuperAdmin: Boolean(raw.isSuperAdmin ?? isSuperAdminEmail(raw.email)),
    isTeacher: Boolean(raw.isTeacher),
  };
}

async function fetchAuthStatus(): Promise<{ googleConfigured: boolean } | null> {
  try {
    const cvAuth =
      process.env.NEXT_PUBLIC_CV_AUTH_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
    const cvRes = await fetch(`${cvAuth}/api/auth/status`);
    if (cvRes.ok) {
      return cvRes.json();
    }
  } catch {
    // fall through to local status
  }

  try {
    const res = await fetch(apiUrl("/api/auth/status"));
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchMe(token: string): Promise<AppUser | null> {
  try {
    const res = await fetch(apiUrl("/api/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user ? mapUser(data.user) : null;
  } catch {
    return null;
  }
}

async function trackGoogleContinue(token: string): Promise<void> {
  try {
    await fetch(apiUrl("/api/auth/track-signin"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Analytics should not block sign-in
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleConfigured, setGoogleConfigured] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const status = await Promise.race([
        fetchAuthStatus(),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 4000)),
      ]);

      if (status) {
        setGoogleConfigured(Boolean(status.googleConfigured));
      } else {
        setGoogleConfigured(true);
      }

      const token = getToken();
      if (!token) {
        setUser(null);
        return;
      }

      const sessionUser = await fetchMe(token);
      if (sessionUser) {
        setUser(sessionUser);
      } else {
        clearToken();
        setUser(null);
      }
    } catch {
      clearToken();
      setUser(null);
      setGoogleConfigured(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const signInWithGoogle = useCallback(() => {
    // Same-origin route proxies to CV with ?portal=ged (registered Google redirect).
    window.location.href = "/api/auth/google/login";
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    window.location.href = "/auth/signin";
  }, []);

  const completeLogin = useCallback(async (token: string) => {
    setToken(token);
    const me = await fetchMe(token);
    if (!me) {
      clearToken();
      throw new Error("Failed to complete sign-in.");
    }
    await trackGoogleContinue(token);
    setUser(me);
    return me;
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await fetchMe(token);
    if (me) setUser(me);
    else {
      clearToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      googleConfigured,
      isSuperAdmin: Boolean(user?.isSuperAdmin),
      isTeacher: Boolean(user?.isTeacher),
      signInWithGoogle,
      signOut,
      completeLogin,
      refreshSession,
    }),
    [
      user,
      loading,
      googleConfigured,
      signInWithGoogle,
      signOut,
      completeLogin,
      refreshSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
