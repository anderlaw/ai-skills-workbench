import { Navigate, createBrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { AppLayout } from "./components/layout/AppLayout";
import { AuditLogListPage } from "./pages/audit-logs/AuditLogListPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { MemberDetailPage } from "./pages/members/MemberDetailPage";
import { MemberFormPage } from "./pages/members/MemberFormPage";
import { MemberListPage } from "./pages/members/MemberListPage";
import { LoginPage } from "./pages/login/LoginPage";
import { PermissionNodePage } from "./pages/permissions/PermissionNodePage";
import { ProjectAssignmentPage } from "./pages/project-assignments/ProjectAssignmentPage";
import { ProjectDetailPage } from "./pages/projects/ProjectDetailPage";
import { ProjectFormPage } from "./pages/projects/ProjectFormPage";
import { ProjectListPage } from "./pages/projects/ProjectListPage";
import { RoleListPage } from "./pages/roles/RoleListPage";
import { ForbiddenPage } from "./pages/system/ForbiddenPage";
import { NotFoundPage } from "./pages/system/NotFoundPage";
import { TaskDetailPage } from "./pages/tasks/TaskDetailPage";
import { TaskFormPage } from "./pages/tasks/TaskFormPage";
import { TaskListPage } from "./pages/tasks/TaskListPage";
import { UserFormPage } from "./pages/users/UserFormPage";
import { UserListPage } from "./pages/users/UserListPage";
import { UserRolePage } from "./pages/users/UserRolePage";
import { useAuth } from "./state/auth";

function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        正在加载用户信息...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequirePermission({ scope, code, children }: { scope: string; code: string; children: ReactNode }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(scope, code)) {
    return <ForbiddenPage />;
  }
  return children;
}

function allow(scope: string, code: string, element: ReactNode) {
  return <RequirePermission scope={scope} code={code}>{element}</RequirePermission>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: allow("dashboard", "dashboard:view", <DashboardPage />) },
      { path: "projects", element: allow("project", "project:list", <ProjectListPage />) },
      { path: "projects/new", element: allow("project", "project:create", <ProjectFormPage />) },
      { path: "projects/:id", element: allow("project", "project:view", <ProjectDetailPage />) },
      { path: "projects/:id/edit", element: allow("project", "project:update", <ProjectFormPage />) },
      { path: "members", element: allow("member", "member:list", <MemberListPage />) },
      { path: "members/new", element: allow("member", "member:create", <MemberFormPage />) },
      { path: "members/:id", element: allow("member", "member:view", <MemberDetailPage />) },
      { path: "members/:id/edit", element: allow("member", "member:update", <MemberFormPage />) },
      { path: "admin/users", element: allow("user", "user:list", <UserListPage />) },
      { path: "admin/users/new", element: allow("user", "user:create", <UserFormPage />) },
      { path: "admin/users/:id/roles", element: allow("user", "user:assign-roles", <UserRolePage />) },
      { path: "admin/roles", element: allow("role", "role:list", <RoleListPage />) },
      { path: "admin/permissions", element: allow("permission-node", "permission-node:list", <PermissionNodePage />) },
      { path: "admin/project-assignments", element: allow("project-assignment", "project-assignment:list", <ProjectAssignmentPage />) },
      { path: "tasks", element: allow("task", "task:list", <TaskListPage />) },
      { path: "tasks/new", element: allow("task", "task:create", <TaskFormPage />) },
      { path: "tasks/:id", element: allow("task", "task:view", <TaskDetailPage />) },
      { path: "tasks/:id/edit", element: allow("task", "task:update", <TaskFormPage />) },
      { path: "audit-logs", element: allow("audit-log", "audit-log:list", <AuditLogListPage />) },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);
