import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit } from "lucide-react";
import { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import { getTask, submitTask, updateTaskProgress, updateTaskStatus } from "../../api/taskApi";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { PriorityBadge, TaskStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { taskStatusOptions, taskTypeLabels } from "../../lib/constants";
import { formatDateTime } from "../../lib/format";
import { useAuth } from "../../state/auth";

export function TaskDetailPage() {
  const { id } = useParams();
  const taskId = id!;
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const task = useQuery({ queryKey: ["task", taskId], queryFn: () => getTask(taskId) });
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["task", taskId] });
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const progressMutation = useMutation({ mutationFn: (payload: { progress: number; currentIssues?: string }) => updateTaskProgress(taskId, payload), onSuccess: invalidate });
  const statusMutation = useMutation({ mutationFn: (payload: { status: string; description?: string }) => updateTaskStatus(taskId, payload), onSuccess: invalidate });
  const submitMutation = useMutation({ mutationFn: (payload: { prUrl?: string; submissionNote?: string }) => submitTask(taskId, payload), onSuccess: invalidate });

  function handleProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    progressMutation.mutate({ progress: Number(form.get("progress")), currentIssues: String(form.get("currentIssues") ?? "") });
  }

  function handleStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    statusMutation.mutate({ status: String(form.get("status")), description: String(form.get("description") ?? "") });
  }

  function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submitMutation.mutate({ prUrl: String(form.get("prUrl") ?? ""), submissionNote: String(form.get("submissionNote") ?? "") });
  }

  const data = task.data;

  return (
    <>
      <PageHeader
        title={data?.title ?? "任务详情"}
        description="查看任务负责人、状态、提交说明和当前问题。"
        actions={isAdmin && data ? <Link to={`/tasks/${data.id}/edit`}><Button><Edit size={16} />编辑任务</Button></Link> : null}
      />
      {data ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <span className="font-semibold">任务信息</span>
              <TaskStatusBadge status={data.status} />
            </CardHeader>
            <CardContent className="grid gap-5">
              <ProgressBar value={data.progress} />
              <dl className="detail-grid">
                <div className="detail-item"><dt className="detail-label">项目</dt><dd className="detail-value">{data.project ? <Link className="surface-link" to={`/projects/${data.project.id}`}>{data.project.name}</Link> : data.projectId}</dd></div>
                <div className="detail-item"><dt className="detail-label">负责人</dt><dd className="detail-value">{data.assignee ? <Link className="surface-link" to={`/members/${data.assignee.id}`}>{data.assignee.name}</Link> : "未分配"}</dd></div>
                <div className="detail-item"><dt className="detail-label">类型</dt><dd className="detail-value">{taskTypeLabels[data.taskType]}</dd></div>
                <div className="detail-item"><dt className="detail-label">优先级</dt><dd className="detail-value"><PriorityBadge priority={data.priority} /></dd></div>
                <div className="detail-item"><dt className="detail-label">截止时间</dt><dd className="detail-value">{data.dueDate ?? "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">更新时间</dt><dd className="detail-value">{formatDateTime(data.updatedAt)}</dd></div>
                <div className="detail-item"><dt className="detail-label">Issue</dt><dd className="detail-value">{data.githubIssueUrl ? <a className="surface-link" href={data.githubIssueUrl}>{data.githubIssueUrl}</a> : "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">PR</dt><dd className="detail-value">{data.prUrl ? <a className="surface-link" href={data.prUrl}>{data.prUrl}</a> : "-"}</dd></div>
              </dl>
              <section className="muted-panel text-sm"><h3 className="font-semibold">任务说明</h3><p className="mt-2 text-muted-foreground">{data.description || "-"}</p></section>
              <section className="muted-panel text-sm"><h3 className="font-semibold">提交说明</h3><p className="mt-2 text-muted-foreground">{data.submissionNote || "-"}</p></section>
              <section className="muted-panel text-sm"><h3 className="font-semibold">当前问题</h3><p className="mt-2 text-muted-foreground">{data.currentIssues || "-"}</p></section>
            </CardContent>
          </Card>

          {isAdmin ? (
            <Card>
              <CardHeader className="font-semibold">快速操作</CardHeader>
              <CardContent className="grid gap-4">
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleProgress}>
                  <Input name="progress" type="number" min={0} max={100} defaultValue={data.progress} />
                  <Textarea name="currentIssues" defaultValue={data.currentIssues ?? ""} />
                  <Button type="submit" disabled={progressMutation.isPending}>更新进度</Button>
                </form>
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleStatus}>
                  <Select name="status" defaultValue={data.status}>
                    {taskStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                  <Input name="description" placeholder="修改说明" />
                  <Button type="submit" variant="secondary" disabled={statusMutation.isPending}>更新状态</Button>
                </form>
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleSubmitTask}>
                  <Input name="prUrl" placeholder="PR 地址" defaultValue={data.prUrl ?? ""} />
                  <Textarea name="submissionNote" placeholder="提交说明" defaultValue={data.submissionNote ?? ""} />
                  <Button type="submit" variant="secondary" disabled={submitMutation.isPending}>提交任务结果</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
