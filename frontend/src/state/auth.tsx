/**
 * 认证状态模块，负责 token、当前用户、菜单树和权限判断。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
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

/**
 * 业务意义：维护全局认证状态并向子组件提供登录、退出和权限判断能力。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey));
  const [context, setContext] = useState<CurrentUserContext | null>(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let alive = true;

    /**
     * 业务意义：根据本地 token 拉取当前用户上下文。
     * 参数：无。
     * 返回：无返回值，通过更新 AuthProvider 状态刷新页面登录态。
     */
    async function loadCurrentUser() {
      if (!token) {
        setLoading(false);
        setContext(null);
        return;
      }

      setLoading(true);
      try {
        // token 只保存在本地，真正的用户状态、角色和权限每次通过 /auth/me 刷新。
        const current = await getCurrentUser();
        if (alive) {
          setContext(current);
        }
      } catch {
        // token 失效或账号被禁用时清理本地登录态，交给路由守卫跳转登录页。
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
        // permissionScopes 的 key 是菜单 code，value 是该菜单下的权限项 code。
        return Boolean(context?.permissionScopes[scope]?.includes(code));
      },
      async login(username, password) {
        const result = await loginRequest({ username, password });
        localStorage.setItem(tokenKey, result.accessToken);
        setToken(result.accessToken);
        // 登录后立即刷新 /auth/me，确保菜单树和按钮权限与服务端一致。
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

/**
 * 业务意义：读取认证上下文，供页面和组件访问当前用户与权限。
 * 参数：无。
 * 返回：AuthState，上层页面可读取用户、角色、菜单和权限判断方法。
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

/**
 * 业务意义：按菜单 scope 生成权限判断器，控制按钮和操作显隐。
 * 参数：`scope` 表示菜单节点 code，例如 `project`、`requirement`。
 * 返回：包含 `has(code)` 的权限判断对象，ADMIN 永远返回 true。
 */
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
