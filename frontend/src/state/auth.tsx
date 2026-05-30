import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getCurrentUser, login as loginRequest } from "../api/authApi";
import type { CurrentMenuNode, CurrentRole, CurrentUserContext, CurrentUserInfo } from "../types";

const tokenKey = "project-tracker-token";

interface AuthState {
  token: string | null;
  loading: boolean;
  user: CurrentUserInfo | null;
  roles: CurrentRole[];
  menuTree: CurrentMenuNode[];
  permissionScopes: Record<string, string[]>;
  displayName: string | null;
  isAdmin: boolean;
  hasPermission: (scope: string, code: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [context, setContext] = useState<CurrentUserContext | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let alive = true;

    async function loadCurrentUser() {
      if (!token) {
        setLoading(false);
        setContext(null);
        return;
      }

      setLoading(true);
      try {
        const current = await getCurrentUser();
        if (alive) {
          setContext(current);
        }
      } catch {
        localStorage.removeItem(tokenKey);
        if (alive) {
          setToken(null);
          setContext(null);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadCurrentUser();
    return () => {
      alive = false;
    };
  }, [token]);

  const value = useMemo<AuthState>(() => {
    const isAdmin = Boolean(context?.roles.some((role) => role.code === "ADMIN"));
    return {
      token,
      loading,
      user: context?.user ?? null,
      roles: context?.roles ?? [],
      menuTree: context?.menuTree ?? [],
      permissionScopes: context?.permissionScopes ?? {},
      displayName: context?.user.displayName ?? null,
      isAdmin,
      hasPermission(scope, code) {
        if (isAdmin) {
          return true;
        }
        return Boolean(context?.permissionScopes[scope]?.includes(code));
      },
      async login(username, password) {
        const result = await loginRequest({ username, password });
        localStorage.setItem(tokenKey, result.accessToken);
        setToken(result.accessToken);
        const current = await getCurrentUser();
        setContext(current);
      },
      logout() {
        localStorage.removeItem(tokenKey);
        setContext(null);
        setToken(null);
      }
    };
  }, [context, loading, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function useMenuPerm(scope: string) {
  const { isAdmin, permissionScopes } = useAuth();
  return useMemo(() => {
    if (isAdmin) {
      return {
        has: () => true
      };
    }
    const permissions = new Set(permissionScopes[scope] ?? []);
    return {
      has: (code: string) => permissions.has(code)
    };
  }, [isAdmin, permissionScopes, scope]);
}
