/**
 * 应用布局模块，负责侧边栏、动态菜单、顶部区域和页面出口。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileClock,
  FolderKanban,
  KeyRound,
  LogOut,
  Menu,
  ShieldCheck,
  UserPlus,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import type { CurrentMenuNode } from "../../types";
import { useAuth } from "../../state/auth";
import { Button } from "../ui/Button";

const iconMap = {
  BarChart3,
  ClipboardList,
  FileClock,
  FolderKanban,
  KeyRound,
  LayoutDashboard: BarChart3,
  ShieldCheck,
  UserPlus,
  Users
};

const routeRegistry: Record<string, string> = {
  dashboard: "/dashboard",
  project: "/projects",
  task: "/tasks",
  member: "/members",
  user: "/admin/users",
  role: "/admin/roles",
  "project-assignment": "/admin/project-assignments",
  "permission-node": "/admin/permissions",
  "audit-log": "/audit-logs"
};

interface RenderableMenuNode extends CurrentMenuNode {
  path?: string;
  children: RenderableMenuNode[];
}

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function AppLayout() {
  const { displayName, isAdmin, logout, menuTree, roles } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const location = useLocation();

  const navTree = useMemo(() => buildRenderableMenu(menuTree), [menuTree]);
  const sidebarWidth = sidebarCollapsed ? "w-20" : "w-64";
  const mainOffset = sidebarCollapsed ? "sm:pl-20" : "sm:pl-64";

  /**
   * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
   * 参数：`code` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function toggle(code: string) {
    setExpanded((value) => {
      const next = new Set(value);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  /**
   * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
   * 参数：`node` 表示调用方传入的业务参数；`depth` 表示调用方传入的业务参数。
   * 返回：返回转换后的业务结果或供调用方继续使用的数据。
   */
  function renderNode(node: RenderableMenuNode, depth = 0) {
    const Icon = getIcon(node.icon);
    const hasChildren = node.children.length > 0;
    const active = isActiveNode(node, location.pathname);
    const open = expanded.has(node.code) || active;

    if (hasChildren) {
      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => toggle(node.code)}
            className={`flex h-10 w-full items-center justify-between rounded-lg text-sm font-medium transition ${
              sidebarCollapsed && depth === 0 ? "justify-center px-0" : "gap-3 px-3"
            } ${active ? "text-teal-300" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            title={sidebarCollapsed ? node.name : undefined}
            style={{ paddingLeft: sidebarCollapsed ? undefined : `${12 + depth * 14}px` }}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Icon size={18} className="shrink-0" />
              {!sidebarCollapsed ? <span className="truncate">{node.name}</span> : null}
            </span>
            {!sidebarCollapsed ? <ChevronDown size={15} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} /> : null}
          </button>
          {!sidebarCollapsed && open ? <div className="mt-1 grid gap-1">{node.children.map((child) => renderNode(child, depth + 1))}</div> : null}
        </div>
      );
    }

    if (!node.path) {
      return null;
    }

    return (
      <NavLink
        key={node.id}
        to={node.path}
        title={sidebarCollapsed ? node.name : undefined}
        aria-label={sidebarCollapsed ? node.name : undefined}
        className={({ isActive }) =>
          `flex h-10 items-center rounded-lg text-sm font-medium transition ${
            sidebarCollapsed && depth === 0 ? "justify-center px-0" : "gap-3 px-3"
          } ${isActive ? "bg-teal-500 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
        }
        style={{ paddingLeft: sidebarCollapsed ? undefined : `${12 + depth * 14}px` }}
      >
        <Icon size={18} className="shrink-0" />
        {!sidebarCollapsed ? <span className="truncate">{node.name}</span> : null}
      </NavLink>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden ${sidebarWidth} border-r border-slate-800 bg-slate-950 text-white transition-all duration-200 sm:block`}>
        <div className="border-b border-white/10 px-4 py-5">
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between gap-3"}`}>
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-500 text-slate-950">
                <FolderKanban size={21} />
              </div>
              {!sidebarCollapsed ? (
                <div>
                  <div className="text-base font-semibold">搭子工坊</div>
                  <div className="text-xs text-slate-400">项目共创工作台</div>
                </div>
              ) : null}
            </div>
            {!sidebarCollapsed ? (
              <button
                aria-label="收起菜单"
                title="收起菜单"
                type="button"
                className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setSidebarCollapsed(true)}
              >
                <ChevronLeft size={17} />
              </button>
            ) : null}
          </div>
          {sidebarCollapsed ? (
            <button
              aria-label="展开菜单"
              title="展开菜单"
              type="button"
              className="focus-ring mx-auto mt-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white"
              onClick={() => setSidebarCollapsed(false)}
            >
              <ChevronRight size={17} />
            </button>
          ) : null}
          {!sidebarCollapsed ? (
            <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-medium text-slate-100">
                <ShieldCheck size={15} />
                {isAdmin ? "管理员" : roles.map((role) => role.name).join("、") || "已登录"}
              </div>
              <div className="mt-1 text-slate-400">{displayName}</div>
            </div>
          ) : null}
        </div>
        <nav className="grid gap-1 p-3">{navTree.map((item) => renderNode(item))}</nav>
      </aside>
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950 text-white sm:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <Menu size={20} />
          <span className="font-semibold">搭子工坊</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {flattenMenu(navTree).map((item) =>
            item.path ? (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ) : null
          )}
        </nav>
      </header>
      <main className={`min-h-screen transition-all duration-200 ${mainOffset}`}>
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 backdrop-blur lg:px-7">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
            <div className="hidden text-sm text-muted-foreground sm:block">{displayName} 正在使用工作台</div>
            <Button variant="secondary" onClick={logout}>
              <LogOut size={16} />
              退出登录
            </Button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

/**
 * 业务意义：把原始数据转换为页面可渲染结构。
 * 参数：`nodes` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function buildRenderableMenu(nodes: CurrentMenuNode[]): RenderableMenuNode[] {
  return nodes
    .map((node) => {
      const children = buildRenderableMenu(node.children ?? []);
      const path = node.nodeType === "MENU" ? routeRegistry[node.code] : undefined;
      return { ...node, path, children };
    })
    .filter((node) => Boolean(node.path) || node.children.length > 0);
}

/**
 * 业务意义：把树形结构展开为线性列表。
 * 参数：`nodes` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function flattenMenu(nodes: RenderableMenuNode[]): RenderableMenuNode[] {
  return nodes.flatMap((node) => [node, ...flattenMenu(node.children)]);
}

/**
 * 业务意义：判断当前业务状态是否匹配页面行为。
 * 参数：`node` 表示调用方传入的业务参数；`pathname` 表示调用方传入的业务参数。
 * 返回：返回布尔值，用于控制页面操作权限、展开状态或路由激活状态。
 */
function isActiveNode(node: RenderableMenuNode, pathname: string): boolean {
  if (node.path && pathname.startsWith(node.path)) {
    return true;
  }
  return node.children.some((child) => isActiveNode(child, pathname));
}

/**
 * 业务意义：根据后端菜单图标 code 返回 lucide 图标组件。
 * 参数：`icon?` 表示调用方传入的业务参数。
 * 返回：返回可直接渲染的 lucide 图标组件，未知 code 使用默认图标。
 */
function getIcon(icon?: string | null) {
  if (!icon) {
    return FolderKanban;
  }
  return iconMap[icon as keyof typeof iconMap] ?? FolderKanban;
}
