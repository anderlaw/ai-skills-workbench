import { Activity, Clock, FolderKanban, Lightbulb, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import {
  getDashboardSummary,
  getRecentAuditLogs,
  getRecentProjects,
} from "../../api/dashboardApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { ProjectStatusBadge } from "../../components/common/StatusBadges";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { formatDateTime } from "../../lib/format";
import type { AuditLog } from "../../types";

export function DashboardPage() {
  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: getDashboardSummary });
  const recentProjects = useQuery({ queryKey: ["dashboard", "recent-projects"], queryFn: getRecentProjects });
  const recentLogs = useQuery({ queryKey: ["dashboard", "recent-audit-logs"], queryFn: getRecentAuditLogs });

  const data = summary.data;
  const projectActivities = (recentLogs.data?.items ?? [])
    .filter((log) => ["PROJECT", "PROJECT_MEMBER", "REQUIREMENT", "TASK"].includes(log.targetType))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="统计看板" description="项目、项目人员、任务和需求的整体视图。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ResourceCard title="项目" value={data?.projectTotal ?? "-"} description="查看项目列表和进度" to="/projects" icon={<FolderKanban size={18} />} disabled={!data?.projectTotal} />
        <ResourceCard title="项目人员" value={data?.memberTotal ?? "-"} description="查看项目参与人员" to="/members" icon={<Users size={18} />} disabled={!data?.memberTotal} />
        <ResourceCard title="任务" value={data?.taskTotal ?? "-"} description="查看任务列表和负责人" to="/tasks" icon={<Activity size={18} />} disabled={!data?.taskTotal} />
        <ResourceCard title="需求" value={data?.requirementTotal ?? "-"} description="进入项目查看需求池" to="/projects" icon={<Lightbulb size={18} />} disabled={!data?.requirementTotal} />
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
    </>
  );
}

function ResourceCard({
  title,
  value,
  description,
  to,
  icon,
  disabled
}: {
  title: string;
  value: string | number;
  description: string;
  to: string;
  icon: ReactNode;
  disabled?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="rounded-lg bg-teal-50 p-2 text-teal-700">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </>
  );

  if (disabled) {
    return <div className="rounded-lg border border-border bg-white p-4 opacity-75 shadow-sm">{content}</div>;
  }
  return (
    <Link to={to} className="rounded-lg border border-border bg-white p-4 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/40">
      {content}
    </Link>
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
