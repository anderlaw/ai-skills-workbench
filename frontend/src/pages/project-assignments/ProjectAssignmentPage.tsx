import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserMinus, UserPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { assignProjectUser, getProjectUsers, getProjects, removeProjectUser } from "../../api/projectApi";
import { getUsers } from "../../api/userApi";
import { errorMessage } from "../../api/http";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProjectStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Field";
import { useAuth } from "../../state/auth";

export function ProjectAssignmentPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const projects = useQuery({ queryKey: ["projects", "assignment"], queryFn: () => getProjects({ pageSize: 100 }), enabled: isAdmin });
  const users = useQuery({ queryKey: ["users"], queryFn: () => getUsers({ pageSize: 100 }), enabled: isAdmin });
  const [projectId, setProjectId] = useState<number | null>(null);
  const selectedProjectId = projectId ?? projects.data?.items[0]?.id ?? null;
  const projectUsers = useQuery({
    queryKey: ["project-users", selectedProjectId],
    queryFn: () => getProjectUsers(selectedProjectId!),
    enabled: isAdmin && Boolean(selectedProjectId)
  });
  const userById = useMemo(() => new Map((users.data?.items ?? []).map((user) => [user.id, user])), [users.data?.items]);
  const selectedProject = projects.data?.items.find((project) => project.id === selectedProjectId);
  const activeAssignments = projectUsers.data?.items.filter((item) => item.status === "ACTIVE") ?? [];

  const assignMutation = useMutation({
    mutationFn: (payload: { userId: number; responsibility?: string }) => assignProjectUser(selectedProjectId!, payload),
    onSuccess: invalidateAssignments
  });
  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeProjectUser(selectedProjectId!, userId),
    onSuccess: invalidateAssignments
  });

  async function invalidateAssignments() {
    await queryClient.invalidateQueries({ queryKey: ["project-users", selectedProjectId] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="项目分配仅管理员可用。" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    assignMutation.mutate({
      userId: Number(form.get("userId")),
      responsibility: String(form.get("responsibility") ?? "")
    });
    event.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="项目分配" description="集中维护系统用户与项目的分配关系，分配后贡献者才能在项目需求池中写入。" />
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
                    selectedProjectId === project.id ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"
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
              <div className="font-semibold">分配用户</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedProject ? `当前项目：${selectedProject.name}` : "请选择项目"}</div>
            </div>
            {selectedProject ? <Link className="surface-link text-sm" to={`/projects/${selectedProject.id}`}>查看项目详情</Link> : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            {assignMutation.error || removeMutation.error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage(assignMutation.error ?? removeMutation.error)}
              </div>
            ) : null}
            {selectedProjectId ? (
              <form className="grid gap-3 rounded-lg border border-teal-100 bg-teal-50/40 p-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleSubmit}>
                <Select name="userId" required>
                  <option value="">选择用户</option>
                  {users.data?.items.map((user) => <option key={user.id} value={user.id}>{user.displayName}（{user.username}）</option>)}
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
                  const assignedUser = userById.get(assignment.userId);
                  return (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{assignedUser ? `${assignedUser.displayName}（${assignedUser.username}）` : `用户 #${assignment.userId}`}</div>
                        <div className="mt-1 text-muted-foreground">{assignment.responsibility || "未填写职责"}</div>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => removeMutation.mutate(assignment.userId)} disabled={removeMutation.isPending}>
                        <UserMinus size={15} />
                        移除
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="该项目暂无分配用户" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
