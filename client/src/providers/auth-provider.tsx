"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, ensureSeeded } from "@/lib/api";
import { setSessionExpiredHandler } from "@/lib/http";
import type { PublicUser } from "@/lib/types";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<PublicUser>;
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<PublicUser>;
  loginWithGoogle: () => Promise<PublicUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const u = await api.auth.currentUser();
    setUser(u);
  }, []);

  useEffect(() => {
    ensureSeeded();
    api.auth
      .currentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  // When a token refresh fails mid-session (@/lib/http), drop the user and send
  // them to sign in. Returns the unsubscribe so the handler is swapped cleanly.
  useEffect(
    () =>
      setSessionExpiredHandler(() => {
        setUser(null);
        router.push("/login");
      }),
    [router],
  );

  const login = useCallback(
    async (email: string, password: string, rememberMe?: boolean) => {
      const u = await api.auth.login(email, password, rememberMe);
      setUser(u);
      return u;
    },
    [],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const u = await api.auth.register(name, email, password);
      setUser(u);
      return u;
    },
    [],
  );

  const loginWithGoogle = useCallback(async () => {
    const u = await api.auth.loginWithGoogle();
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      loginWithGoogle,
      logout,
      refresh,
      setUser,
    }),
    [user, loading, login, register, loginWithGoogle, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
