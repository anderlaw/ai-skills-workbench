/**
 * 项目分配页面模块，负责项目与项目人员的分配关系维护。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserMinus, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { addProjectMember, getProjectMembers, getProjects, removeProjectMember } from "../../api/projectApi";
import { getMembers } from "../../api/memberApi";
import { errorMessage } from "../../api/http";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProjectStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Field";
import { useAuth } from "../../state/auth";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function ProjectAssignmentPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ["projects", "assignment"], queryFn: () => getProjects({ pageSize: 100 }), enabled: isAdmin });
  const members = useQuery({ queryKey: ["members"], queryFn: () => getMembers({ pageSize: 100 }), enabled: isAdmin });
  const [projectId, setProjectId] = useState<number | null>(null);
  const selectedProjectId = projectId ?? projects.data?.items[0]?.id ?? null;
  const projectMembers = useQuery({
    queryKey: ["project-members", selectedProjectId],
    queryFn: () => getProjectMembers(selectedProjectId!),
    enabled: isAdmin && Boolean(selectedProjectId)
  });
  const memberById = useMemo(() => new Map((members.data?.items ?? []).map((member) => [member.id, member])), [members.data?.items]);
  const selectedProject = projects.data?.items.find((project) => project.id === selectedProjectId);
  const activeAssignments = projectMembers.data?.items.filter((item) => item.status === "ACTIVE") ?? [];

  const assignMutation = useMutation({
    mutationFn: (payload: { memberId: number; role: string; responsibility?: string }) => addProjectMember(selectedProjectId!, payload),
    onSuccess: invalidateAssignments
  });
  const removeMutation = useMutation({
    mutationFn: (memberId: number) => removeProjectMember(selectedProjectId!, memberId),
    onSuccess: invalidateAssignments
  });

  /**
   * 业务意义：刷新当前项目的分配关系和看板统计。
   * 参数：无。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  async function invalidateAssignments() {
    await queryClient.invalidateQueries({ queryKey: ["project-members", selectedProjectId] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="项目分配仅管理员可用。" />;
  }

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    assignMutation.mutate({
      memberId: Number(form.get("memberId")),
      role: String(form.get("role") ?? "OTHER"),
      responsibility: String(form.get("responsibility") ?? "")
    });
    event.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="项目分配" description="集中维护项目人员与项目的分配关系，项目人员已绑定登录账号后才能参与需求池写入。" />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader className="font-semibold">选择项目</CardHeader>
          <CardContent className="grid gap-3">
            {projects.data?.items.length ? (
              projects.data.items.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setProjectId(project.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedProjectId === project.id ? "border-brand-muted bg-brand-muted" : "border-line bg-surface hover:bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{project.name}</div>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">{project.description || "暂无说明"}</div>
                </button>
              ))
            ) : (
              <EmptyState text="暂无项目" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold">分配项目人员</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedProject ? `当前项目：${selectedProject.name}` : "请选择项目"}</div>
            </div>
            {selectedProject ? <Link className="surface-link text-sm" to={`/projects/${selectedProject.id}`}>查看项目详情</Link> : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            {assignMutation.error || removeMutation.error ? (
              <div className="rounded-lg border border-danger-line bg-danger-muted px-4 py-3 text-sm font-medium text-danger">
                {errorMessage(assignMutation.error ?? removeMutation.error)}
              </div>
            ) : null}
            {selectedProjectId ? (
              <form className="grid gap-3 rounded-lg border border-line bg-surface-muted p-4 md:grid-cols-[1fr_150px_1fr_auto]" onSubmit={handleSubmit}>
                <Select name="memberId" required>
                  <option value="">选择项目人员</option>
                  {members.data?.items.map((member) => <option key={member.id} value={member.id}>{member.name}（{member.user?.username ?? `用户 #${member.userId}`}）</option>)}
                </Select>
                <Select name="role" defaultValue="OTHER">
                  <option value="OWNER">负责人</option>
                  <option value="FRONTEND">前端</option>
                  <option value="BACKEND">后端</option>
                  <option value="FULLSTACK">全栈</option>
                  <option value="AI">AI</option>
                  <option value="TEST">测试</option>
                  <option value="DEPLOY">部署</option>
                  <option value="OTHER">其他</option>
                </Select>
                <Input name="responsibility" placeholder="项目内职责" />
                <Button type="submit" disabled={assignMutation.isPending}>
                  <UserPlus size={15} />
                  分配
                </Button>
              </form>
            ) : null}

            {activeAssignments.length ? (
              <div className="grid gap-3">
                {activeAssignments.map((assignment) => {
                  const assignedMember = assignment.member ?? memberById.get(assignment.memberId);
                  return (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 text-sm shadow-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{assignedMember ? `${assignedMember.name}（${assignedMember.user?.username ?? `用户 #${assignedMember.userId}`}）` : `人员 #${assignment.memberId}`}</div>
                        <div className="mt-1 text-muted-foreground">{assignment.responsibility || "未填写职责"}</div>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => removeMutation.mutate(assignment.memberId)} disabled={removeMutation.isPending}>
                        <UserMinus size={15} />
                        移除
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="该项目暂无分配项目人员" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
