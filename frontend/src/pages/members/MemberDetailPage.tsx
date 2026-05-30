/**
 * 项目人员详情页面模块，展示绑定账号、参与项目和负责任务。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit } from "lucide-react";
import { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import { getMember, getMemberProjects, updateMemberStatus } from "../../api/memberApi";
import { getTasks } from "../../api/taskApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { MemberStatusBadge, ProjectStatusBadge, TaskStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Field";
import { memberStatusOptions, roleLabels } from "../../lib/constants";
import { formatDateTime } from "../../lib/format";
import { useAuth } from "../../state/auth";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function MemberDetailPage() {
  const { id } = useParams();
  const memberId = id!;
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const member = useQuery({ queryKey: ["member", memberId], queryFn: () => getMember(memberId) });
  const projects = useQuery({ queryKey: ["member-projects", memberId], queryFn: () => getMemberProjects(memberId) });
  const tasks = useQuery({ queryKey: ["tasks", "member", memberId], queryFn: () => getTasks({ assigneeId: memberId, pageSize: 100 }) });
  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; description?: string }) => updateMemberStatus(memberId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["member", memberId] });
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    }
  });

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    statusMutation.mutate({ status: String(form.get("status")), description: String(form.get("description") ?? "") });
  }

  const data = member.data;

  return (
    <>
      <PageHeader
        title={data?.name ?? "项目人员详情"}
        description="查看项目人员绑定账号、参与项目和负责任务。"
        actions={isAdmin && data ? <Link to={`/members/${data.id}/edit`}><Button><Edit size={16} />编辑成员</Button></Link> : null}
      />
      {data ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <span className="font-semibold">项目人员信息</span>
              <MemberStatusBadge status={data.status} />
            </CardHeader>
            <CardContent>
              <dl className="detail-grid">
                <div className="detail-item"><dt className="detail-label">绑定账号</dt><dd className="detail-value">{data.user ? `${data.user.displayName}（${data.user.username}）` : `用户 #${data.userId}`}</dd></div>
                <div className="detail-item"><dt className="detail-label">联系方式</dt><dd className="detail-value">{data.contact ?? "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">邮箱</dt><dd className="detail-value">{data.email ?? "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">GitHub</dt><dd className="detail-value">{data.githubUsername ?? "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">技术方向</dt><dd className="detail-value">{data.skillDirection ?? "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">技术水平</dt><dd className="detail-value">{data.skillLevel ?? "-"}</dd></div>
                <div className="detail-item"><dt className="detail-label">更新时间</dt><dd className="detail-value">{formatDateTime(data.updatedAt)}</dd></div>
              </dl>
              {data.remark ? <p className="muted-panel mt-4 text-sm text-muted-foreground">{data.remark}</p> : null}
            </CardContent>
          </Card>
          {isAdmin ? (
            <Card>
              <CardHeader className="font-semibold">修改状态</CardHeader>
              <CardContent>
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleStatus}>
                  <Select name="status" defaultValue={data.status}>
                    {memberStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                  <Input name="description" placeholder="修改说明" />
                  <Button type="submit" disabled={statusMutation.isPending}>更新状态</Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="font-semibold">参与项目</CardHeader>
          <CardContent className="grid gap-3">
            {projects.data?.items.length ? projects.data.items.map((relation) => (
              <Link key={relation.id} to={`/projects/${relation.projectId}`} className="soft-list-item grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{relation.project?.name ?? relation.projectId}</span>
                  {relation.project ? <ProjectStatusBadge status={relation.project.status} /> : null}
                </div>
                <div className="text-muted-foreground">{roleLabels[relation.role]} · {relation.responsibility ?? "-"}</div>
              </Link>
            )) : <EmptyState text="暂无参与项目" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="font-semibold">负责任务</CardHeader>
          <CardContent className="grid gap-3">
            {tasks.data?.items.length ? tasks.data.items.map((task) => (
              <Link key={task.id} to={`/tasks/${task.id}`} className="soft-list-item grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{task.title}</span>
                  <TaskStatusBadge status={task.status} />
                </div>
                <ProgressBar value={task.progress} />
              </Link>
            )) : <EmptyState text="暂无负责任务" />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
