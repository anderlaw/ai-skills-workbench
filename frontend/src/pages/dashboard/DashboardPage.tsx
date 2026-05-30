import { Activity, AlertTriangle, Clock, FolderKanban, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import {
  getBlockedTasks,
  getDashboardSummary,
  getPendingTasks,
  getRecentAuditLogs,
  getRecentProjects,
} from "../../api/dashboardApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { StatCard } from "../../components/common/StatCard";
import { ProjectStatusBadge, TaskStatusBadge } from "../../components/common/StatusBadges";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { formatDateTime } from "../../lib/format";
import type { AuditLog } from "../../types";

export function DashboardPage() {
  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: getDashboardSummary });
  const recentProjects = useQuery({ queryKey: ["dashboard", "recent-projects"], queryFn: getRecentProjects });
  const blockedTasks = useQuery({ queryKey: ["dashboard", "blocked-tasks"], queryFn: getBlockedTasks });
  const pendingTasks = useQuery({ queryKey: ["dashboard", "pending-tasks"], queryFn: getPendingTasks });
  const recentLogs = useQuery({ queryKey: ["dashboard", "recent-audit-logs"], queryFn: getRecentAuditLogs });

  const data = summary.data;
  const projectActivities = (recentLogs.data?.items ?? [])
    .filter((log) => ["PROJECT", "PROJECT_MEMBER", "REQUIREMENT", "TASK"].includes(log.targetType))
    .slice(0, 6);
  const peopleActivities = (recentLogs.data?.items ?? [])
    .filter((log) => ["USER", "MEMBER", "PROJECT_MEMBER"].includes(log.targetType))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="统计看板" description="项目、人员、任务和近期动态的整体视图。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="项目" value={data?.projectTotal ?? "-"} icon={<FolderKanban size={18} />} />
        <StatCard title="人员" value={data?.memberTotal ?? "-"} icon={<Users size={18} />} />
        <StatCard title="任务" value={data?.taskTotal ?? "-"} icon={<Activity size={18} />} />
        <StatCard title="阻塞任务" value={data?.blockedTaskTotal ?? "-"} icon={<AlertTriangle size={18} />} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="font-semibold">最近更新项目</div>
            <div className="mt-1 text-sm text-muted-foreground">按项目更新时间排序</div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {recentProjects.data?.items.length ? (
              recentProjects.data.items.map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="soft-list-item grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{project.name}</span>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <ProgressBar value={project.progress} />
                  <div className="text-xs text-muted-foreground">更新于 {formatDateTime(project.updatedAt)}</div>
                </Link>
              ))
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="font-semibold">项目动态</div>
            <div className="mt-1 text-sm text-muted-foreground">需求、认领、分配和项目进展</div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {projectActivities.length ? (
              projectActivities.map((log) => <ActivityItem key={log.id} log={log} />)
            ) : (
              <EmptyState text="暂无项目动态" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader className="font-semibold">人员更新</CardHeader>
          <CardContent className="grid gap-3">
            {peopleActivities.length ? (
              peopleActivities.map((log) => <ActivityItem key={log.id} log={log} />)
            ) : (
              <EmptyState text="暂无人员更新" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="font-semibold">阻塞任务</CardHeader>
          <CardContent className="grid gap-3">
            {blockedTasks.data?.items.length ? (
              blockedTasks.data.items.map((task) => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="soft-list-item grid gap-2">
                  <div className="font-medium">{task.title}</div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{task.project?.name ?? "-"}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState text="暂无阻塞任务" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="font-semibold">待提交任务</CardHeader>
          <CardContent className="grid gap-3">
            {pendingTasks.data?.items.length ? (
              pendingTasks.data.items.map((task) => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="soft-list-item grid gap-2">
                  <div className="font-medium">{task.title}</div>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <span>{task.assignee?.name ?? "未分配"}</span>
                    <ProgressBar value={task.progress} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState text="暂无待提交任务" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ActivityItem({ log }: { log: AuditLog }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 rounded-full bg-teal-50 p-1.5 text-teal-700">
          <Clock size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="break-words font-medium text-slate-900">{describeActivity(log)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

function describeActivity(log: AuditLog) {
  const target = `${targetTypeLabel(log.targetType)} #${log.targetId ?? "-"}`;
  if (log.description) {
    return `${log.actorName} ${log.description}（${target}）`;
  }
  return `${log.actorName} ${actionLabel(log.action)} ${target}`;
}

function targetTypeLabel(targetType: string) {
  const labels: Record<string, string> = {
    PROJECT: "项目",
    MEMBER: "成员",
    PROJECT_MEMBER: "项目成员",
    TASK: "任务",
    USER: "用户",
    ROLE: "角色",
    REQUIREMENT: "需求",
    PERMISSION_NODE: "权限"
  };
  return labels[targetType] ?? targetType;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE: "创建了",
    UPDATE: "更新了",
    STATUS_CHANGE: "调整状态",
    PROGRESS_CHANGE: "更新进度",
    ASSIGN: "分配了",
    SUBMIT: "提交了",
    ARCHIVE: "归档了",
    REMOVE: "移除了",
    CLAIM: "认领了"
  };
  return labels[action] ?? action;
}
