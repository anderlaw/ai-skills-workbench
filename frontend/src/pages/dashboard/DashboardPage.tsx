/**
 * 统计看板页面模块，展示项目、项目人员、任务、需求和近期动态。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
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

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
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

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
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
        <span className="rounded-lg bg-accent-muted p-2 text-accent-strong">{icon}</span>
      </div>
      <div className="mt-3 text-3xl font-semibold text-content-strong">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </>
  );

  if (disabled) {
    return <div className="rounded-lg border border-border bg-surface p-4 opacity-75 shadow-sm">{content}</div>;
  }
  return (
    <Link to={to} className="rounded-lg border border-border bg-surface p-4 shadow-sm transition hover:border-brand-muted hover:bg-brand-muted/40">
      {content}
    </Link>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function ActivityItem({ log }: { log: AuditLog }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3 text-sm shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 rounded-full bg-accent-muted p-1.5 text-accent-strong">
          <Clock size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="break-words font-medium text-content-strong">{describeActivity(log)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 业务意义：把审计或业务动作转换为中文描述。
 * 参数：`log` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
function describeActivity(log: AuditLog) {
  const target = `${targetTypeLabel(log.targetType)} #${log.targetId ?? "-"}`;
  if (log.description) {
    return `${log.actorName} ${log.description}（${target}）`;
  }
  return `${log.actorName} ${actionLabel(log.action)} ${target}`;
}

/**
 * 业务意义：把审计目标类型转换为 Dashboard 动态里的中文名称。
 * 参数：`targetType` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
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

/**
 * 业务意义：把审计动作类型转换为 Dashboard 动态里的中文动词。
 * 参数：`action` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
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
