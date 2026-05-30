/**
 * 项目详情页面模块，展示项目概况、项目人员、任务和需求池。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Edit, Lightbulb, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import { getMembers } from "../../api/memberApi";
import { getTasks } from "../../api/taskApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { PriorityBadge, ProjectStatusBadge, RequirementStatusBadge, TaskStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select, Textarea } from "../../components/ui/Field";
import { priorityOptions, projectStatusOptions } from "../../lib/constants";
import { formatDateTime } from "../../lib/format";
import { useAuth, useMenuPerm } from "../../state/auth";
import type { ProjectMember, Requirement, User } from "../../types";
import { errorMessage } from "../../api/http";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
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

  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const projectMembers = useQuery({ queryKey: ["project-members", projectId], queryFn: () => getProjectMembers(projectId) });
  const allMembers = useQuery({ queryKey: ["members"], queryFn: () => getMembers({ pageSize: 100 }), enabled: isAdmin });
  const requirements = useQuery({ queryKey: ["project-requirements", projectId], queryFn: () => getProjectRequirements(projectId) });
  const tasks = useQuery({ queryKey: ["tasks", "project", projectId], queryFn: () => getTasks({ projectId, pageSize: 100 }) });

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
  // 普通用户是否能写需求取决于“账号是否绑定为当前项目的启用项目人员”。
  const isAssignedToProject = Boolean(user && activeProjectMembers.some((item) => item.member?.userId === user.id));
  // 新增需求需要同时满足项目分配和菜单权限；ADMIN 保留全局写权限。
  const canCreateRequirement = isAdmin || (isAssignedToProject && requirementPerm.has("requirement:create"));

  /**
   * 业务意义：刷新项目详情页涉及的项目、人员、需求、任务和看板缓存。
   * 参数：无。
   * 返回：无返回值，通过 TanStack Query 缓存失效触发数据重新加载。
   */
  const invalidateProjectSurface = async () => {
    await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["project-requirements", projectId] });
    await queryClient.invalidateQueries({ queryKey: ["tasks"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const progressMutation = useMutation({
    mutationFn: (payload: { progress: number; currentProgress?: string }) => updateProjectProgress(projectId, payload),
    onSuccess: invalidateProjectSurface
  });
  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; description?: string }) => updateProjectStatus(projectId, payload),
    onSuccess: invalidateProjectSurface
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
    onSuccess: invalidateProjectSurface
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
    statusMutation.error ??
    assignMemberMutation.error ??
    removeMemberMutation.error ??
    createRequirementMutation.error ??
    updateRequirementMutation.error ??
    deleteRequirementMutation.error ??
    claimRequirementMutation.error;

  /**
   * 业务意义：提交项目进度更新表单。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    progressMutation.mutate({
      progress: Number(form.get("progress")),
      currentProgress: String(form.get("currentProgress") ?? "")
    });
  }

  /**
   * 业务意义：提交项目状态更新表单。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    statusMutation.mutate({ status: String(form.get("status")), description: String(form.get("description") ?? "") });
  }

  /**
   * 业务意义：把选中的项目人员分配到当前项目。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
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
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
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
   * 参数：`event` 表示调用方传入的业务参数；`requirement` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
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
   * 业务意义：判断当前登录用户是否可以执行指定业务操作。
   * 参数：`requirement` 表示调用方传入的业务参数。
   * 返回：返回布尔值，用于控制页面操作权限、展开状态或路由激活状态。
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
   * 业务意义：判断当前登录用户是否可以执行指定业务操作。
   * 参数：`requirement` 表示调用方传入的业务参数。
   * 返回：返回布尔值，用于控制页面操作权限、展开状态或路由激活状态。
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
   * 业务意义：判断当前登录用户是否可以执行指定业务操作。
   * 参数：`requirement` 表示调用方传入的业务参数。
   * 返回：返回布尔值，用于控制页面操作权限、展开状态或路由激活状态。
   */
  function canClaimRequirement(requirement: Requirement) {
    if (requirement.status !== "OPEN" || requirement.claimedByUserId) {
      return false;
    }
    // 认领不要求创建人，但要求仍是项目成员并具备认领权限。
    return isAdmin || (isAssignedToProject && requirementPerm.has("requirement:claim"));
  }

  /**
   * 业务意义：把业务 id 或对象转换为页面展示文本。
   * 参数：`userId?` 表示调用方传入的业务参数。
   * 返回：返回格式化后的展示文本、字段值或可提交数据。
   */
  function displayUserName(userId?: number | null) {
    if (!userId) {
      return "未指定";
    }
    const matched = userById.get(userId);
    return matched ? `${matched.displayName}（${matched.username}）` : `用户 #${userId}`;
  }

  return (
    <>
      <PageHeader
        title={data?.name ?? "项目详情"}
        description={data?.description ?? "查看项目进度、项目用户、需求池和任务执行情况。"}
        actions={
          isAdmin && data ? (
            <>
              <Link to={`/tasks/new?projectId=${data.id}`}>
                <Button variant="secondary">
                  <Plus size={16} />
                  新建任务
                </Button>
              </Link>
              <Link to={`/projects/${data.id}/edit`}>
                <Button>
                  <Edit size={16} />
                  编辑项目
                </Button>
              </Link>
            </>
          ) : null
        }
      />

      {mutationError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage(mutationError)}
        </div>
      ) : null}

      {data ? (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <span className="font-semibold">项目概况</span>
              <ProjectStatusBadge status={data.status} />
            </CardHeader>
            <CardContent className="grid gap-5">
              <ProgressBar value={data.progress} />
              <dl className="detail-grid">
                <DetailItem label="类型" value={data.projectType ?? "-"} />
                <DetailItem label="技术栈" value={data.techStack.join(", ") || "-"} />
                <DetailItem label="GitHub" value={data.githubUrl ? <a className="surface-link" href={data.githubUrl}>{data.githubUrl}</a> : "-"} />
                <DetailItem label="发布地址" value={data.deployUrl ? <a className="surface-link" href={data.deployUrl}>{data.deployUrl}</a> : "-"} />
                <DetailItem label="更新时间" value={formatDateTime(data.updatedAt)} />
                <DetailItem label="预计完成" value={data.expectedFinishDate ?? "-"} />
              </dl>
              <div className="grid gap-3 text-sm">
                <section className="muted-panel"><h3 className="font-semibold">当前进展</h3><p className="mt-2 text-muted-foreground">{data.currentProgress || "-"}</p></section>
                <section className="muted-panel"><h3 className="font-semibold">当前问题</h3><p className="mt-2 text-muted-foreground">{data.currentIssues || "-"}</p></section>
                <section className="muted-panel"><h3 className="font-semibold">下一步计划</h3><p className="mt-2 text-muted-foreground">{data.nextSteps || "-"}</p></section>
              </div>
            </CardContent>
          </Card>

          {isAdmin ? (
            <Card>
              <CardHeader className="font-semibold">快速更新</CardHeader>
              <CardContent className="grid gap-4">
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleProgress}>
                  <Input name="progress" type="number" min={0} max={100} defaultValue={data.progress} />
                  <Textarea name="currentProgress" defaultValue={data.currentProgress ?? ""} />
                  <Button type="submit" disabled={progressMutation.isPending}>更新进度</Button>
                </form>
                <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleStatus}>
                  <Select name="status" defaultValue={data.status}>
                    {projectStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                  <Input name="description" placeholder="修改说明" />
                  <Button type="submit" variant="secondary" disabled={statusMutation.isPending}>更新状态</Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="font-semibold">我的项目权限</CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <CheckCircle2 size={17} className={isAssignedToProject ? "text-emerald-600" : "text-slate-400"} />
                    {isAssignedToProject ? "已分配，可参与需求池" : "未分配，只读查看"}
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    {isAssignedToProject ? "你可以新增需求、认领需求，并在认领前维护自己创建的需求。" : "你可以查看项目进度、任务和需求，但不能在该项目中写入需求。"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <span className="font-semibold">项目人员</span>
            <span className="text-xs font-medium text-muted-foreground">{activeProjectMembers.length} 人已分配</span>
          </CardHeader>
          <CardContent className="grid gap-3">
            {isAdmin ? (
              <form className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3" onSubmit={handleAssignMember}>
                <Select name="memberId" required>
                  <option value="">选择项目人员</option>
                  {allMembers.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.user?.username ?? `用户 #${item.userId}`}）</option>)}
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
                  displayName={assignment.member ? `${assignment.member.name}（${assignment.member.user?.username ?? `用户 #${assignment.member.userId}`}）` : `人员 #${assignment.memberId}`}
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
          <CardHeader className="font-semibold">项目任务</CardHeader>
          <CardContent className="grid gap-3">
            {tasks.data?.items.length ? (
              tasks.data.items.map((task) => (
                <Link key={task.id} to={`/tasks/${task.id}`} className="soft-list-item grid gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{task.title}</span>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{task.assignee?.name ?? "未分配"}</span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <ProgressBar value={task.progress} />
                </Link>
              ))
            ) : (
              <EmptyState text="暂无项目任务" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">需求池</div>
            <div className="mt-1 text-xs text-muted-foreground">贡献者只能维护自己创建且未被认领的需求，认领后自动锁定。</div>
          </div>
          <div className="text-xs font-medium text-muted-foreground">{requirements.data?.total ?? 0} 条需求</div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {canCreateRequirement ? (
            <form className="grid gap-3 rounded-lg border border-teal-100 bg-teal-50/40 p-4" onSubmit={handleCreateRequirement}>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
                <Lightbulb size={16} />
                新增需求
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_150px]">
                <Input name="title" placeholder="需求标题" required />
                <Select name="priority" defaultValue="MEDIUM">
                  {priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </div>
              <Textarea name="description" placeholder="需求说明" />
              <Input name="remark" placeholder="备注" />
              <div className="flex justify-end">
                <Button type="submit" disabled={createRequirementMutation.isPending}>
                  <Plus size={15} />
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
    </>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-item">
      <dt className="detail-label">{label}</dt>
      <dd className="detail-value">{value}</dd>
    </div>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
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
        <div className="mt-1 text-muted-foreground">{assignment.responsibility || "未填写职责"}</div>
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
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
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
            {priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <Textarea name="description" defaultValue={requirement.description ?? ""} />
        <Input name="remark" defaultValue={requirement.remark ?? ""} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancelEdit}>取消</Button>
          <Button type="submit" disabled={busy}>保存</Button>
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
          {canClaim ? <Button type="button" variant="secondary" onClick={onClaim} disabled={busy}>认领</Button> : null}
          {canEdit ? <Button type="button" variant="ghost" onClick={onEdit} disabled={busy}><Edit size={15} />编辑</Button> : null}
          {canDelete ? <Button type="button" variant="danger" onClick={onDelete} disabled={busy}><Trash2 size={15} />删除</Button> : null}
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
