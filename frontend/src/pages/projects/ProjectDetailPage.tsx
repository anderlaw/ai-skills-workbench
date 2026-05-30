/**
 * 项目详情页面模块，按“项目推进 + 项目资料侧栏”的结构展示项目跟踪信息。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  Edit,
  ExternalLink,
  Lightbulb,
  ListChecks,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getAuditLogs } from "../../api/auditLogApi";
import { errorMessage } from "../../api/http";
import { getMembers } from "../../api/memberApi";
import {
  addProjectMember,
  createProjectRequirement,
  getProject,
  getProjectMembers,
  getProjectRequirements,
  removeProjectMember,
  updateProjectProgress,
  updateProjectStatus
} from "../../api/projectApi";
import { claimRequirement, deleteRequirement, updateRequirement } from "../../api/requirementApi";
import { getTasks } from "../../api/taskApi";
import { EmptyState } from "../../components/common/EmptyState";
import { ProgressBar } from "../../components/common/ProgressBar";
import { PriorityBadge, ProjectStatusBadge, RequirementStatusBadge, TaskStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { priorityOptions, projectStatusOptions, roleLabels, taskStatusOptions } from "../../lib/constants";
import { formatDate, formatDateTime } from "../../lib/format";
import { useAuth, useMenuPerm } from "../../state/auth";
import type { ProjectMember, Requirement, Task, User } from "../../types";

/**
 * 业务意义：渲染项目详情页并组织项目推进、任务、需求池和侧栏资料。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = id!;
  const { isAdmin, user } = useAuth();
  const requirementPerm = useMenuPerm("requirement");
  const queryClient = useQueryClient();
  const [editingRequirementId, setEditingRequirementId] = useState<number | null>(null);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState("");

  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const projectMembers = useQuery({ queryKey: ["project-members", projectId], queryFn: () => getProjectMembers(projectId) });
  const allMembers = useQuery({ queryKey: ["members"], queryFn: () => getMembers({ pageSize: 100 }), enabled: isAdmin });
  const requirements = useQuery({ queryKey: ["project-requirements", projectId], queryFn: () => getProjectRequirements(projectId) });
  const tasks = useQuery({ queryKey: ["tasks", "project", projectId], queryFn: () => getTasks({ projectId, pageSize: 100 }) });
  const projectLogs = useQuery({
    queryKey: ["audit-logs", "project", projectId],
    queryFn: () => getAuditLogs({ targetType: "PROJECT", targetId: projectId, pageSize: 1 })
  });

  const userById = useMemo(() => {
    const map = new Map<number, User>();
    allMembers.data?.items.forEach((item) => {
      if (item.user) {
        map.set(item.userId, item.user);
      }
    });
    projectMembers.data?.items.forEach((item) => {
      if (item.member?.user) {
        map.set(item.member.userId, item.member.user);
      }
    });
    if (user) {
      map.set(user.id, {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        status: user.status,
        createdAt: "",
        updatedAt: ""
      });
    }
    return map;
  }, [allMembers.data?.items, projectMembers.data?.items, user]);

  const activeProjectMembers = useMemo(
    () => projectMembers.data?.items.filter((item) => item.status === "ACTIVE") ?? [],
    [projectMembers.data?.items]
  );
  const filteredTasks = useMemo(() => {
    const items = tasks.data?.items ?? [];
    return taskStatusFilter ? items.filter((task) => task.status === taskStatusFilter) : items;
  }, [taskStatusFilter, tasks.data?.items]);
  // 普通用户是否能写需求取决于“账号是否绑定为当前项目的启用项目人员”。
  const isAssignedToProject = Boolean(user && activeProjectMembers.some((item) => item.member?.userId === user.id));
  // 新增需求需要同时满足项目分配和菜单权限；ADMIN 保留全局写权限。
  const canCreateRequirement = isAdmin || (isAssignedToProject && requirementPerm.has("requirement:create"));
  const latestProjectLog = projectLogs.data?.items[0] ?? null;

  /**
   * 业务意义：刷新项目详情页涉及的项目、人员、需求、任务、审计和看板缓存。
   * 参数：无。
   * 返回：无返回值，通过 TanStack Query 缓存失效触发数据重新加载。
   */
  const invalidateProjectSurface = async () => {
    await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["project-requirements", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["audit-logs", "project", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const progressMutation = useMutation({
    mutationFn: async (payload: {
      progress: number;
      status?: string;
      currentProgress?: string;
      currentIssues?: string;
      nextSteps?: string;
    }) => {
      const updated = await updateProjectProgress(projectId, {
        progress: payload.progress,
        currentProgress: payload.currentProgress,
        currentIssues: payload.currentIssues,
        nextSteps: payload.nextSteps
      });
      if (payload.status && payload.status !== updated.status) {
        return updateProjectStatus(projectId, { status: payload.status, description: "提交进展更新" });
      }
      return updated;
    },
    onSuccess: async () => {
      setShowProgressForm(false);
      await invalidateProjectSurface();
    }
  });
  const assignMemberMutation = useMutation({
    mutationFn: (payload: { memberId: number; role: string; responsibility?: string }) => addProjectMember(projectId, payload),
    onSuccess: invalidateProjectSurface
  });
  const removeMemberMutation = useMutation({
    mutationFn: (memberId: number) => removeProjectMember(projectId, memberId),
    onSuccess: invalidateProjectSurface
  });
  const createRequirementMutation = useMutation({
    mutationFn: (payload: { title: string; description?: string; priority?: string; remark?: string }) =>
      createProjectRequirement(projectId, payload),
    onSuccess: async () => {
      setShowRequirementForm(false);
      await invalidateProjectSurface();
    }
  });
  const updateRequirementMutation = useMutation({
    mutationFn: (payload: { id: number; title: string; description?: string; priority?: string; remark?: string }) =>
      updateRequirement(payload.id, payload),
    onSuccess: async () => {
      setEditingRequirementId(null);
      await invalidateProjectSurface();
    }
  });
  const deleteRequirementMutation = useMutation({
    mutationFn: (requirementId: number) => deleteRequirement(requirementId),
    onSuccess: invalidateProjectSurface
  });
  const claimRequirementMutation = useMutation({
    mutationFn: (requirementId: number) => claimRequirement(requirementId),
    onSuccess: invalidateProjectSurface
  });

  const data = project.data;
  const mutationError =
    progressMutation.error ??
    assignMemberMutation.error ??
    removeMemberMutation.error ??
    createRequirementMutation.error ??
    updateRequirementMutation.error ??
    deleteRequirementMutation.error ??
    claimRequirementMutation.error;

  /**
   * 业务意义：提交项目进展更新表单。
   * 参数：`event` 表示表单提交事件。
   * 返回：无返回值，主要通过接口请求和缓存刷新完成处理。
   */
  function handleProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    progressMutation.mutate({
      progress: Number(form.get("progress")),
      status: String(form.get("status") ?? data?.status ?? "PLANNING"),
      currentProgress: String(form.get("currentProgress") ?? ""),
      currentIssues: String(form.get("currentIssues") ?? ""),
      nextSteps: String(form.get("nextSteps") ?? "")
    });
  }

  /**
   * 业务意义：把选中的项目人员分配到当前项目。
   * 参数：`event` 表示表单提交事件。
   * 返回：无返回值，主要通过接口请求和缓存刷新完成处理。
   */
  function handleAssignMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    assignMemberMutation.mutate({
      memberId: Number(form.get("memberId")),
      role: String(form.get("role") ?? "OTHER"),
      responsibility: String(form.get("responsibility") ?? "")
    });
    event.currentTarget.reset();
  }

  /**
   * 业务意义：在当前项目需求池创建需求。
   * 参数：`event` 表示表单提交事件。
   * 返回：无返回值，主要通过接口请求和缓存刷新完成处理。
   */
  function handleCreateRequirement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createRequirementMutation.mutate({
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      priority: String(form.get("priority") ?? "MEDIUM"),
      remark: String(form.get("remark") ?? "")
    });
    event.currentTarget.reset();
  }

  /**
   * 业务意义：保存需求池中某条需求的编辑结果。
   * 参数：`event` 表示表单提交事件；`requirement` 表示正在编辑的需求。
   * 返回：无返回值，主要通过接口请求和缓存刷新完成处理。
   */
  function handleUpdateRequirement(event: FormEvent<HTMLFormElement>, requirement: Requirement) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    updateRequirementMutation.mutate({
      id: requirement.id,
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      priority: String(form.get("priority") ?? "MEDIUM"),
      remark: String(form.get("remark") ?? "")
    });
  }

  /**
   * 业务意义：判断当前登录用户是否可以编辑某条需求。
   * 参数：`requirement` 表示需求池记录。
   * 返回：返回布尔值，用于控制编辑按钮显隐。
   */
  function canEditRequirement(requirement: Requirement) {
    if (isAdmin) {
      return true;
    }
    // CONTRIBUTOR 只能编辑自己创建、仍未认领、且属于已分配项目的需求。
    return Boolean(
      user &&
        isAssignedToProject &&
        requirementPerm.has("requirement:update-own") &&
        requirement.createdByUserId === user.id &&
        requirement.status === "OPEN" &&
        !requirement.claimedByUserId
    );
  }

  /**
   * 业务意义：判断当前登录用户是否可以删除某条需求。
   * 参数：`requirement` 表示需求池记录。
   * 返回：返回布尔值，用于控制删除按钮显隐。
   */
  function canDeleteRequirement(requirement: Requirement) {
    if (isAdmin) {
      return true;
    }
    // 删除权限与编辑权限保持一致，避免需求被认领后仍被创建人移除。
    return Boolean(
      user &&
        isAssignedToProject &&
        requirementPerm.has("requirement:delete-own") &&
        requirement.createdByUserId === user.id &&
        requirement.status === "OPEN" &&
        !requirement.claimedByUserId
    );
  }

  /**
   * 业务意义：判断当前登录用户是否可以认领某条需求。
   * 参数：`requirement` 表示需求池记录。
   * 返回：返回布尔值，用于控制认领按钮显隐。
   */
  function canClaimRequirement(requirement: Requirement) {
    if (requirement.status !== "OPEN" || requirement.claimedByUserId) {
      return false;
    }
    // 认领不要求创建人，但要求仍是项目成员并具备认领权限。
    return isAdmin || (isAssignedToProject && requirementPerm.has("requirement:claim"));
  }

  /**
   * 业务意义：把用户 id 转换为项目详情页使用的中文显示名。
   * 参数：`userId` 表示需求创建人或认领人账号 id。
   * 返回：返回展示用的用户名；找不到用户资料时回退为用户编号。
   */
  function displayUserName(userId?: number | null) {
    if (!userId) {
      return "未指定";
    }
    const matched = userById.get(userId);
    return matched ? `${matched.displayName}（${matched.username}）` : `用户 #${userId}`;
  }

  if (!data) {
    return <EmptyState text="正在加载项目详情" />;
  }

  return (
    <>
      <section className="mb-5 rounded-lg border border-border bg-white px-5 py-5 shadow-sm">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-semibold text-slate-950">{data.name}</h1>
              <ProjectStatusBadge status={data.status} />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{data.description || "暂无项目描述"}</p>
            <div className="mt-5 grid max-w-3xl gap-2">
              <div className="text-sm">
                <span className="font-medium text-slate-700">项目进度</span>
              </div>
              <ProgressBar value={data.progress} />
            </div>
          </div>
          <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
            {isAdmin ? (
              <>
                <Link to={`/projects/${data.id}/edit`}>
                  <Button variant="secondary">
                    <Edit size={16} />
                    编辑项目信息
                  </Button>
                </Link>
                <Link to={`/tasks/new?projectId=${data.id}`}>
                  <Button variant="secondary">
                    <ListChecks size={16} />
                    新增任务
                  </Button>
                </Link>
                <Button type="button" onClick={() => setShowProgressForm((value) => !value)}>
                  <RefreshCw size={16} />
                  提交进展
                </Button>
              </>
            ) : null}
            {canCreateRequirement ? (
              <Button type="button" variant={isAdmin ? "secondary" : "primary"} onClick={() => setShowRequirementForm((value) => !value)}>
                <Lightbulb size={16} />
                新增需求
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {mutationError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage(mutationError)}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="grid min-w-0 gap-5">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">最新项目状态</div>
                <div className="mt-1 text-sm text-muted-foreground">持续记录当前进展、问题和下一步计划。</div>
              </div>
              {isAdmin ? (
                <Button type="button" variant="secondary" onClick={() => setShowProgressForm((value) => !value)}>
                  <RefreshCw size={16} />
                  提交进展更新
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4">
              {showProgressForm ? (
                <form className="grid gap-4 rounded-lg border border-teal-100 bg-teal-50/40 p-4" onSubmit={handleProgress}>
                  <div className="grid gap-3 md:grid-cols-[140px_180px_1fr]">
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-semibold text-slate-700">进度</span>
                      <Input name="progress" type="number" min={0} max={100} defaultValue={data.progress} />
                    </label>
                    <label className="grid gap-1.5 text-sm">
                      <span className="font-semibold text-slate-700">状态</span>
                      <Select name="status" defaultValue={data.status}>
                        {projectStatusOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <div className="hidden items-end text-xs text-muted-foreground md:flex">
                      提交后会写入审计日志，后续可扩展为历史进展记录。
                    </div>
                  </div>
                  <StatusUpdateField label="当前进展" name="currentProgress" defaultValue={data.currentProgress ?? ""} />
                  <StatusUpdateField label="当前问题" name="currentIssues" defaultValue={data.currentIssues ?? ""} />
                  <StatusUpdateField label="下一步计划" name="nextSteps" defaultValue={data.nextSteps ?? ""} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowProgressForm(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={progressMutation.isPending}>
                      提交进展
                    </Button>
                  </div>
                </form>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                <StatusBlock title="当前进展" value={data.currentProgress} />
                <StatusBlock title="当前问题" value={data.currentIssues} tone="warning" />
                <StatusBlock title="下一步计划" value={data.nextSteps} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 size={14} />
                  更新时间：{formatDateTime(data.updatedAt)}
                </span>
                <span>更新人：{latestProjectLog?.actorName ?? "-"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">项目任务</div>
                <div className="mt-1 text-sm text-muted-foreground">跟踪负责人、状态、优先级、截止时间和更新时间。</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select className="w-36" value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value)}>
                  <option value="">全部状态</option>
                  {taskStatusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                {isAdmin ? (
                  <Link to={`/tasks/new?projectId=${data.id}`}>
                    <Button>
                      <Plus size={16} />
                      新增任务
                    </Button>
                  </Link>
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {filteredTasks.length ? (
                <div className="overflow-x-auto">
                  <table className="data-table min-w-[760px]">
                    <thead>
                      <tr>
                        <th>任务标题</th>
                        <th>负责人</th>
                        <th>状态</th>
                        <th>优先级</th>
                        <th>截止时间</th>
                        <th>关联需求</th>
                        <th>更新时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
                  <EmptyState text={taskStatusFilter ? "当前筛选下暂无任务" : "暂无项目任务"} />
                  {isAdmin ? (
                    <Link to={`/tasks/new?projectId=${data.id}`} className="mt-4 inline-flex">
                      <Button>
                        <Plus size={16} />
                        新增第一条任务
                      </Button>
                    </Link>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">需求池</div>
                <div className="mt-1 text-sm text-muted-foreground">贡献者只能维护自己创建且未被认领的需求，认领后自动锁定。</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">{requirements.data?.total ?? 0} 条需求</span>
                {canCreateRequirement ? (
                  <Button type="button" variant="secondary" onClick={() => setShowRequirementForm((value) => !value)}>
                    <Plus size={16} />
                    新增需求
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {canCreateRequirement && showRequirementForm ? (
                <form className="grid gap-3 rounded-lg border border-teal-100 bg-teal-50/40 p-4" onSubmit={handleCreateRequirement}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
                    <Lightbulb size={16} />
                    新增需求
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                    <Input name="title" placeholder="需求标题" required />
                    <Select name="priority" defaultValue="MEDIUM">
                      {priorityOptions.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Textarea name="description" placeholder="需求说明" />
                  <Input name="remark" placeholder="备注" />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowRequirementForm(false)}>
                      取消
                    </Button>
                    <Button type="submit" disabled={createRequirementMutation.isPending}>
                      提交需求
                    </Button>
                  </div>
                </form>
              ) : null}

              {requirements.data?.items.length ? (
                <div className="grid gap-3">
                  {requirements.data.items.map((requirement) => (
                    <RequirementItem
                      key={requirement.id}
                      requirement={requirement}
                      creatorName={displayUserName(requirement.createdByUserId)}
                      claimedName={displayUserName(requirement.claimedByUserId)}
                      editing={editingRequirementId === requirement.id}
                      canEdit={canEditRequirement(requirement)}
                      canDelete={canDeleteRequirement(requirement)}
                      canClaim={canClaimRequirement(requirement)}
                      onEdit={() => setEditingRequirementId(requirement.id)}
                      onCancelEdit={() => setEditingRequirementId(null)}
                      onSubmitEdit={(event) => handleUpdateRequirement(event, requirement)}
                      onDelete={() => deleteRequirementMutation.mutate(requirement.id)}
                      onClaim={() => claimRequirementMutation.mutate(requirement.id)}
                      busy={
                        updateRequirementMutation.isPending ||
                        deleteRequirementMutation.isPending ||
                        claimRequirementMutation.isPending
                      }
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="暂无需求" />
              )}
            </CardContent>
          </Card>
        </main>

        <aside className="grid content-start gap-5">
          <Card>
            <CardHeader className="font-semibold">我的权限</CardHeader>
            <CardContent>
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <ShieldCheck size={18} className={isAssignedToProject || isAdmin ? "mt-0.5 text-emerald-600" : "mt-0.5 text-slate-400"} />
                <div>
                  <div className="font-semibold text-slate-900">
                    {isAdmin ? "管理员，拥有全部权限" : isAssignedToProject ? "已分配，可参与需求池" : "未分配，只读查看"}
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {isAdmin
                      ? "可以维护项目资料、任务、成员分配和需求池。"
                      : isAssignedToProject
                        ? "可以新增需求、认领需求，并在认领前维护自己创建的需求。"
                        : "可以查看项目进度、任务和需求，不能写入需求。"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-3">
              <span className="font-semibold">项目成员</span>
              <span className="text-xs font-medium text-muted-foreground">{activeProjectMembers.length} 人</span>
            </CardHeader>
            <CardContent className="grid gap-3">
              {isAdmin ? (
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleAssignMember}>
                  <Select name="memberId" required>
                    <option value="">选择项目人员</option>
                    {allMembers.data?.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}（{item.user?.username ?? `用户 #${item.userId}`}）
                      </option>
                    ))}
                  </Select>
                  <Select name="role" defaultValue="OTHER">
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <Input name="responsibility" placeholder="项目内职责，例如需求整理" />
                  <Button type="submit" disabled={assignMemberMutation.isPending}>
                    <UserPlus size={15} />
                    分配到项目
                  </Button>
                </form>
              ) : null}
              {activeProjectMembers.length ? (
                activeProjectMembers.map((assignment) => (
                  <ProjectMemberItem
                    key={assignment.id}
                    assignment={assignment}
                    displayName={
                      assignment.member
                        ? `${assignment.member.name}（${assignment.member.user?.username ?? `用户 #${assignment.member.userId}`}）`
                        : `人员 #${assignment.memberId}`
                    }
                    canRemove={isAdmin}
                    onRemove={() => removeMemberMutation.mutate(assignment.memberId)}
                  />
                ))
              ) : (
                <EmptyState text="暂无项目人员" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="font-semibold">项目信息</CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <SidebarItem label="类型" value={data.projectType ?? "-"} />
              <SidebarItem label="技术栈" value={data.techStack.join(", ") || "-"} />
              <SidebarItem label="GitHub" value={<ProjectLink href={data.githubUrl} />} />
              <SidebarItem label="发布地址" value={<ProjectLink href={data.deployUrl} />} />
              <SidebarItem label="开始时间" value={formatDate(data.startDate) || "-"} />
              <SidebarItem label="预计完成" value={data.expectedFinishDate ?? "-"} />
              <SidebarItem label="更新时间" value={formatDateTime(data.updatedAt)} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

/**
 * 业务意义：渲染提交进展表单里的文本区域。
 * 参数：解构 props 参数，包含字段标题、字段名和默认值。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function StatusUpdateField({ label, name, defaultValue }: { label: string; name: string; defaultValue: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <Textarea name={name} defaultValue={defaultValue} />
    </label>
  );
}

/**
 * 业务意义：渲染最新项目状态中的一个状态块。
 * 参数：解构 props 参数，包含标题、内容和视觉语义。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function StatusBlock({ title, value, tone = "default" }: { title: string; value?: string | null; tone?: "default" | "warning" }) {
  return (
    <section className={tone === "warning" ? "rounded-lg border border-amber-100 bg-amber-50/60 p-4" : "muted-panel"}>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 min-h-12 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{value || "-"}</p>
    </section>
  );
}

/**
 * 业务意义：渲染项目任务表格行。
 * 参数：`task` 表示任务列表中的单条任务。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function TaskRow({ task }: { task: Task }) {
  return (
    <tr>
      <td>
        <Link className="surface-link" to={`/tasks/${task.id}`}>
          {task.title}
        </Link>
      </td>
      <td>{task.assignee?.name ?? "未分配"}</td>
      <td>
        <TaskStatusBadge status={task.status} />
      </td>
      <td>
        <PriorityBadge priority={task.priority} />
      </td>
      <td>{task.dueDate ?? "-"}</td>
      <td>-</td>
      <td>{formatDateTime(task.updatedAt)}</td>
    </tr>
  );
}

/**
 * 业务意义：渲染项目资料侧栏的单行信息。
 * 参数：解构 props 参数，包含标题和值。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function SidebarItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium text-slate-800">{value}</div>
    </div>
  );
}

/**
 * 业务意义：渲染项目资料侧栏中的外部链接。
 * 参数：`href` 表示 GitHub 或发布地址。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function ProjectLink({ href }: { href?: string | null }) {
  if (!href) {
    return <>-</>;
  }
  return (
    <a className="surface-link inline-flex items-center gap-1" href={href} target="_blank" rel="noreferrer">
      打开
      <ExternalLink size={13} />
    </a>
  );
}

/**
 * 业务意义：渲染项目成员侧栏条目。
 * 参数：解构 props 参数，包含成员分配关系、显示名和移除回调。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function ProjectMemberItem({
  assignment,
  displayName,
  canRemove,
  onRemove
}: {
  assignment: ProjectMember;
  displayName: string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm">
      <div className="min-w-0">
        <div className="truncate font-medium">{displayName}</div>
        <div className="mt-1 text-muted-foreground">
          {roleLabels[assignment.role]}{assignment.responsibility ? ` · ${assignment.responsibility}` : ""}
        </div>
      </div>
      {canRemove ? (
        <Button variant="ghost" type="button" onClick={onRemove} title="移除项目人员">
          <UserMinus size={15} />
        </Button>
      ) : null}
    </div>
  );
}

/**
 * 业务意义：渲染需求池条目或条目的编辑表单。
 * 参数：解构 props 参数，包含需求记录、权限状态和操作回调。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function RequirementItem({
  requirement,
  creatorName,
  claimedName,
  editing,
  canEdit,
  canDelete,
  canClaim,
  onEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onClaim,
  busy
}: {
  requirement: Requirement;
  creatorName: string;
  claimedName: string;
  editing: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canClaim: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSubmitEdit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: () => void;
  onClaim: () => void;
  busy: boolean;
}) {
  if (editing) {
    return (
      <form className="grid gap-3 rounded-lg border border-teal-200 bg-white p-4 shadow-sm" onSubmit={onSubmitEdit}>
        <div className="grid gap-3 md:grid-cols-[1fr_150px]">
          <Input name="title" defaultValue={requirement.title} required />
          <Select name="priority" defaultValue={requirement.priority}>
            {priorityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <Textarea name="description" defaultValue={requirement.description ?? ""} />
        <Input name="remark" defaultValue={requirement.remark ?? ""} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancelEdit}>
            取消
          </Button>
          <Button type="submit" disabled={busy}>
            保存
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words font-semibold text-slate-900">{requirement.title}</h3>
            <RequirementStatusBadge status={requirement.status} />
            <PriorityBadge priority={requirement.priority} />
          </div>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{requirement.description || "暂无说明"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canClaim ? (
            <Button type="button" variant="secondary" onClick={onClaim} disabled={busy}>
              <CheckCircle2 size={15} />
              认领
            </Button>
          ) : null}
          {canEdit ? (
            <Button type="button" variant="ghost" onClick={onEdit} disabled={busy}>
              <Edit size={15} />
              编辑
            </Button>
          ) : null}
          {canDelete ? (
            <Button type="button" variant="danger" onClick={onDelete} disabled={busy}>
              <Trash2 size={15} />
              删除
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground md:grid-cols-3">
        <span>创建人：{creatorName}</span>
        <span>认领人：{requirement.claimedByUserId ? claimedName : "未认领"}</span>
        <span>更新：{formatDateTime(requirement.updatedAt)}</span>
      </div>
    </div>
  );
}
