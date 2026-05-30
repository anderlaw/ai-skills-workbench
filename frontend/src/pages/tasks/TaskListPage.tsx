/**
 * 任务列表页面模块，展示任务目录和状态。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getTasks } from "../../api/taskApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { PriorityBadge, TaskStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { taskTypeLabels } from "../../lib/constants";
import { useAuth } from "../../state/auth";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function TaskListPage() {
  const { isAdmin } = useAuth();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: () => getTasks({ pageSize: 100 }) });

  return (
    <>
      <PageHeader
        title="任务"
        description="跟踪项目中的开发事项、负责人、进度和提交结果。"
        actions={isAdmin ? <Link to="/tasks/new"><Button><Plus size={16} />新增任务</Button></Link> : null}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <div className="font-semibold">任务队列</div>
            <div className="mt-1 text-sm text-muted-foreground">共 {tasks.data?.total ?? "-"} 个任务</div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table min-w-[920px]">
            <thead>
              <tr>
                <th>任务</th>
                <th>项目</th>
                <th>负责人</th>
                <th>类型</th>
                <th>优先级</th>
                <th>状态</th>
                <th>进度</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.data?.items.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link className="surface-link" to={`/tasks/${task.id}`}>{task.title}</Link>
                    <div className="mt-1 text-xs text-muted-foreground">{task.currentIssues ?? task.description ?? "-"}</div>
                  </td>
                  <td>{task.project?.name ?? task.projectId}</td>
                  <td>{task.assignee?.name ?? "未分配"}</td>
                  <td>{taskTypeLabels[task.taskType]}</td>
                  <td><PriorityBadge priority={task.priority} /></td>
                  <td><TaskStatusBadge status={task.status} /></td>
                  <td><ProgressBar value={task.progress} /></td>
                  <td>{isAdmin ? <Link className="surface-link" to={`/tasks/${task.id}/edit`}>编辑</Link> : <span className="text-muted-foreground">只读</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!tasks.data?.items.length ? <EmptyState /> : null}
        </CardContent>
      </Card>
    </>
  );
}
