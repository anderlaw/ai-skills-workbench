/**
 * 角色管理页面模块，负责角色 CRUD、权限树授权和权限节点维护。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Edit2,
  FolderTree,
  KeyRound,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import {
  createPermissionNode,
  deletePermissionNode,
  getPermissionTree,
  updatePermissionNode,
  type PermissionNodeInput,
  type PermissionNodeUpdateInput
} from "../../api/permissionNodeApi";
import { createRole, deleteRole, getRoles, updateRole, updateRolePermissionNodes } from "../../api/roleApi";
import { errorMessage } from "../../api/http";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { useAuth } from "../../state/auth";
import type { PermissionNode, Role } from "../../types";

type RolePanelState = { mode: "create" } | { mode: "edit"; role: Role };
type NodePanelState =
  | { mode: "create"; parent?: PermissionNode | null }
  | { mode: "edit"; node: PermissionNode };

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function RoleListPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: getRoles, enabled: isAdmin });
  const permissionTree = useQuery({ queryKey: ["permission-nodes", "tree"], queryFn: getPermissionTree, enabled: isAdmin });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  const [rolePanel, setRolePanel] = useState<RolePanelState | null>(null);
  const [nodePanel, setNodePanel] = useState<NodePanelState | null>(null);

  const selectedRole = roles.data?.items.find((role) => role.id === selectedRoleId) ?? null;
  const treeItems = permissionTree.data?.items ?? [];
  const flatNodes = useMemo(() => flattenNodes(treeItems), [treeItems]);
  const flatNodesWithDepth = useMemo(() => flattenNodesWithDepth(treeItems), [treeItems]);
  const nodeById = useMemo(() => new Map(flatNodes.map((node) => [node.id, node])), [flatNodes]);
  const parentById = useMemo(() => new Map(flatNodes.map((node) => [node.id, node.parentId ?? null])), [flatNodes]);
  const activeNodeIds = useMemo(() => new Set(flatNodes.filter((node) => node.status === "ACTIVE").map((node) => node.id)), [flatNodes]);

  useEffect(() => {
    if (!roles.data?.items.length) {
      setSelectedRoleId(null);
      return;
    }
    if (!selectedRoleId || !roles.data.items.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roles.data.items[0].id);
    }
  }, [roles.data?.items, selectedRoleId]);

  useEffect(() => {
    if (selectedRole) {
      const ids = flatNodes.length
        ? selectedRole.permissionNodeIds.filter((id) => activeNodeIds.has(id))
        : selectedRole.permissionNodeIds;
      setCheckedIds(new Set(ids));
    }
  }, [activeNodeIds, flatNodes.length, selectedRole, selectedRole?.permissionNodeIds]);

  useEffect(() => {
    if (!treeInitialized && flatNodes.length) {
      setExpandedIds(new Set(flatNodes.filter((node) => node.children?.length).map((node) => node.id)));
      setTreeInitialized(true);
    }
  }, [flatNodes, treeInitialized]);

  const savePermissionsMutation = useMutation({
    mutationFn: () => updateRolePermissionNodes(selectedRole!.id, Array.from(checkedIds)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: createRole,
    onSuccess: async (role) => {
      setRolePanel(null);
      setSelectedRoleId(role.id);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, data }: { roleId: number; data: { name: string; description?: string | null; status: string } }) =>
      updateRole(roleId, data),
    onSuccess: async (role) => {
      setRolePanel(null);
      setSelectedRoleId(role.id);
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: async (role) => {
      if (selectedRoleId === role.id) {
        setSelectedRoleId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  const createNodeMutation = useMutation({
    mutationFn: createPermissionNode,
    onSuccess: async (node) => {
      setNodePanel(null);
      if (node.parentId) {
        setExpandedIds((current) => new Set(current).add(node.parentId!));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      ]);
    }
  });

  const updateNodeMutation = useMutation({
    mutationFn: ({ nodeId, data }: { nodeId: number; data: PermissionNodeUpdateInput }) => updatePermissionNode(nodeId, data),
    onSuccess: async (node) => {
      setNodePanel(null);
      if (node.parentId) {
        setExpandedIds((current) => new Set(current).add(node.parentId!));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      ]);
    }
  });

  const deleteNodeMutation = useMutation({
    mutationFn: deletePermissionNode,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] }),
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      ]);
    }
  });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="角色管理仅管理员可用。" />;
  }

  /**
   * 业务意义：切换角色授权树中某个节点的勾选状态。
   * 参数：`node` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function toggleNode(node: PermissionNode) {
    if (node.status !== "ACTIVE" || selectedRole?.code === "ADMIN") {
      return;
    }
    setCheckedIds((current) => {
      const next = new Set(current);
      // 勾选父节点会级联勾选所有启用子节点，取消父节点则级联取消。
      const relatedIds = [node.id, ...collectDescendantIds(node)].filter((id) => activeNodeIds.has(id));
      const shouldCheck = !next.has(node.id);
      relatedIds.forEach((id) => {
        if (shouldCheck) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      if (shouldCheck) {
        // 勾选子节点时自动带上启用父节点，保证后端返回菜单树时路径完整。
        collectAncestorIds(node.id, parentById)
          .filter((id) => activeNodeIds.has(id))
          .forEach((id) => next.add(id));
      }
      return next;
    });
  }

  /**
   * 业务意义：展开或收起权限树中的单个节点。
   * 参数：`nodeId` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function toggleExpanded(nodeId: number) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }

  /**
   * 业务意义：展开权限树中的所有可展开节点。
   * 参数：无。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function expandAll() {
    setExpandedIds(new Set(flatNodes.filter((node) => node.children?.length).map((node) => node.id)));
  }

  /**
   * 业务意义：收起权限树中的所有节点。
   * 参数：无。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function collapseAll() {
    setExpandedIds(new Set());
  }

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`role` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleDeleteRole(role: Role) {
    if (role.code === "ADMIN") {
      return;
    }
    if (window.confirm(`确认删除角色「${role.name}」？删除后会置为 DISABLED。`)) {
      deleteRoleMutation.mutate(role.id);
    }
  }

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`node` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleDeleteNode(node: PermissionNode) {
    if (node.status !== "ACTIVE") {
      return;
    }
    if (window.confirm(`确认删除权限节点「${node.name}」？删除后会置为 DISABLED。`)) {
      deleteNodeMutation.mutate(node.id);
    }
  }

  const pageError = savePermissionsMutation.error || deleteRoleMutation.error || deleteNodeMutation.error;

  return (
    <>
      <PageHeader
        title="角色管理"
        description="维护角色、权限节点和角色授权。安全配置仅管理员可操作。"
        actions={
          <Button type="button" onClick={() => setRolePanel({ mode: "create" })}>
            <Plus size={16} />
            新增角色
          </Button>
        }
      />

      {pageError ? (
        <div className="mb-4 rounded-lg border border-danger-line bg-danger-muted px-4 py-3 text-sm font-medium text-danger">
          {errorMessage(pageError)}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <div className="font-semibold">角色</div>
              <div className="mt-1 text-sm text-muted-foreground">共 {roles.data?.total ?? "-"} 个角色</div>
            </div>
            <Button type="button" variant="secondary" onClick={() => setRolePanel({ mode: "create" })}>
              <Plus size={16} />
              新增
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {roles.data?.items.length ? (
              roles.data.items.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  selected={selectedRole?.id === role.id}
                  onSelect={() => setSelectedRoleId(role.id)}
                  onEdit={() => setRolePanel({ mode: "edit", role })}
                  onDelete={() => handleDeleteRole(role)}
                  deletePending={deleteRoleMutation.isPending}
                />
              ))
            ) : (
              <EmptyState text="暂无角色" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-semibold">权限树授权</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedRole ? `当前角色：${selectedRole.name}` : "请选择角色"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={expandAll}>
                <ChevronsDown size={16} />
                全部展开
              </Button>
              <Button type="button" variant="secondary" onClick={collapseAll}>
                <ChevronsUp size={16} />
                全部收起
              </Button>
              <Button
                type="button"
                onClick={() => savePermissionsMutation.mutate()}
                disabled={!selectedRole || selectedRole.code === "ADMIN" || savePermissionsMutation.isPending}
              >
                <Save size={16} />
                保存授权
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedRole?.code === "ADMIN" ? (
              <div className="mb-4 rounded-lg border border-accent-muted bg-accent-muted px-4 py-3 text-sm font-medium text-accent-strong">
                ADMIN 角色固定拥有全部权限，不允许在这里修改。
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-muted px-4 py-3">
              <div className="text-sm text-muted-foreground">
                权限节点 {permissionTree.data?.total ?? "-"} 个，已选择 {checkedIds.size} 个
              </div>
              <Button type="button" variant="secondary" onClick={() => setNodePanel({ mode: "create", parent: null })}>
                <Plus size={16} />
                新增根节点
              </Button>
            </div>
            {treeItems.length ? (
              <div className="grid gap-2">
                {treeItems.map((node) => (
                  <PermissionNodeTreeRow
                    key={node.id}
                    node={node}
                    checkedIds={checkedIds}
                    expandedIds={expandedIds}
                    nodeById={nodeById}
                    selectedRole={selectedRole}
                    onToggleCheck={toggleNode}
                    onToggleExpand={toggleExpanded}
                    onAddChild={(parent) => setNodePanel({ mode: "create", parent })}
                    onEdit={(target) => setNodePanel({ mode: "edit", node: target })}
                    onDelete={handleDeleteNode}
                    depth={0}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text="暂无权限节点" />
            )}
          </CardContent>
        </Card>
      </div>

      {rolePanel ? (
        <RoleEditorPanel
          panel={rolePanel}
          error={rolePanel.mode === "create" ? createRoleMutation.error : updateRoleMutation.error}
          pending={rolePanel.mode === "create" ? createRoleMutation.isPending : updateRoleMutation.isPending}
          onClose={() => setRolePanel(null)}
          onSubmit={(data) => {
            if (rolePanel.mode === "create") {
              createRoleMutation.mutate(data);
            } else {
              updateRoleMutation.mutate({
                roleId: rolePanel.role.id,
                data: { name: data.name, description: data.description, status: data.status }
              });
            }
          }}
        />
      ) : null}

      {nodePanel ? (
        <PermissionNodeEditorPanel
          panel={nodePanel}
          nodes={flatNodesWithDepth}
          error={nodePanel.mode === "create" ? createNodeMutation.error : updateNodeMutation.error}
          pending={nodePanel.mode === "create" ? createNodeMutation.isPending : updateNodeMutation.isPending}
          onClose={() => setNodePanel(null)}
          onSubmit={(data) => {
            if (nodePanel.mode === "create") {
              createNodeMutation.mutate(data as PermissionNodeInput);
            } else {
              updateNodeMutation.mutate({ nodeId: nodePanel.node.id, data: data as PermissionNodeUpdateInput });
            }
          }}
        />
      ) : null}
    </>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function RoleCard({
  role,
  selected,
  onSelect,
  onEdit,
  onDelete,
  deletePending
}: {
  role: Role;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const fixedAdmin = role.code === "ADMIN";
  return (
    <div
      className={clsx(
        "rounded-lg border p-4 transition",
        selected ? "border-brand-muted bg-brand-muted" : "border-line bg-surface hover:bg-surface-muted",
        role.status !== "ACTIVE" && "opacity-75"
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-content-strong">{role.name}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{role.code}</div>
          </div>
          <RoleStatusBadge status={role.status} />
        </div>
        <div className="mt-3 text-sm text-muted-foreground">{role.permissionNodeIds.length} 个权限节点</div>
        {role.description ? <div className="mt-2 line-clamp-2 text-sm text-content">{role.description}</div> : null}
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="h-8 px-2" onClick={onEdit} disabled={fixedAdmin}>
          <Edit2 size={14} />
          编辑
        </Button>
        <Button
          type="button"
          variant="danger"
          className="h-8 px-2"
          onClick={onDelete}
          disabled={fixedAdmin || role.status !== "ACTIVE" || deletePending}
        >
          <Trash2 size={14} />
          删除
        </Button>
      </div>
    </div>
  );
}

/**
 * 业务意义：渲染角色管理页的错误提示。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function PermissionNodeTreeRow({
  node,
  checkedIds,
  expandedIds,
  nodeById,
  selectedRole,
  onToggleCheck,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
  depth
}: {
  node: PermissionNode;
  checkedIds: Set<number>;
  expandedIds: Set<number>;
  nodeById: Map<number, PermissionNode>;
  selectedRole: Role | null;
  onToggleCheck: (node: PermissionNode) => void;
  onToggleExpand: (nodeId: number) => void;
  onAddChild: (node: PermissionNode) => void;
  onEdit: (node: PermissionNode) => void;
  onDelete: (node: PermissionNode) => void;
  depth: number;
}) {
  const descendants = collectDescendantIds(node);
  const checked = checkedIds.has(node.id);
  const partiallyChecked = !checked && descendants.some((id) => checkedIds.has(id) && nodeById.has(id));
  const inactive = node.status !== "ACTIVE";
  const hasChildren = Boolean(node.children?.length);
  const expanded = expandedIds.has(node.id);
  const authDisabled = inactive || selectedRole?.code === "ADMIN";
  const Icon = node.nodeType === "PERMISSION" ? ShieldCheck : node.nodeType === "MENU" ? KeyRound : FolderTree;

  return (
    <div>
      <div
        className={clsx(
          "grid min-h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-sm",
          inactive ? "border-line bg-surface-muted text-content-muted" : "border-line bg-surface text-content"
        )}
        style={{ marginLeft: depth * 18 }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-content-muted hover:bg-background"
              onClick={() => onToggleExpand(node.id)}
              aria-label={expanded ? "收起节点" : "展开节点"}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="h-7 w-7" />
          )}
          <input
            type="checkbox"
            checked={checked}
            disabled={authDisabled}
            ref={(input) => {
              if (input) {
                input.indeterminate = partiallyChecked;
              }
            }}
            onChange={() => onToggleCheck(node)}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Icon size={15} className={inactive ? "text-content-muted" : "text-accent-strong"} />
            <span className="font-semibold">{node.name}</span>
            <PermissionNodeTypeBadge type={node.nodeType} />
            <RoleStatusBadge status={node.status} />
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{node.code}</span>
            {node.routePath ? <span>/{node.routePath}</span> : null}
            <span>{node.operationLevel}</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-1">
          {node.nodeType !== "PERMISSION" ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              title="新增子节点"
              onClick={() => onAddChild(node)}
              disabled={inactive}
            >
              <Plus size={14} />
            </Button>
          ) : null}
          <Button type="button" variant="ghost" className="h-8 px-2" title="编辑节点" onClick={() => onEdit(node)}>
            <Edit2 size={14} />
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-8 px-2"
            title="删除节点"
            onClick={() => onDelete(node)}
            disabled={inactive}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      {hasChildren && expanded ? (
        <div className="mt-2 grid gap-2">
          {node.children!.map((child) => (
            <PermissionNodeTreeRow
              key={child.id}
              node={child}
              checkedIds={checkedIds}
              expandedIds={expandedIds}
              nodeById={nodeById}
              selectedRole={selectedRole}
              onToggleCheck={onToggleCheck}
              onToggleExpand={onToggleExpand}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function RoleEditorPanel({
  panel,
  pending,
  error,
  onClose,
  onSubmit
}: {
  panel: RolePanelState;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (data: { code: string; name: string; description?: string | null; status: string }) => void;
}) {
  const role = panel.mode === "edit" ? panel.role : null;

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      code: role?.code ?? String(form.get("code") ?? ""),
      name: String(form.get("name") ?? ""),
      description: normalizeOptionalString(form.get("description")),
      status: String(form.get("status") ?? "ACTIVE")
    });
  }

  return (
    <SidePanel
      title={panel.mode === "create" ? "新增角色" : "编辑角色"}
      description="角色 code 是系统标识，创建后不可修改。"
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error ? <ErrorBox error={error} /> : null}
        <Field label="角色 code">
          <Input name="code" required maxLength={80} defaultValue={role?.code ?? ""} disabled={Boolean(role)} />
        </Field>
        <Field label="角色名称">
          <Input name="name" required maxLength={120} defaultValue={role?.name ?? ""} />
        </Field>
        <Field label="描述">
          <Textarea name="description" defaultValue={role?.description ?? ""} />
        </Field>
        <Field label="状态">
          <Select name="status" defaultValue={role?.status ?? "ACTIVE"}>
            <option value="ACTIVE">启用</option>
            <option value="DISABLED">禁用</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={pending}>
            <Save size={16} />
            保存
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function PermissionNodeEditorPanel({
  panel,
  nodes,
  pending,
  error,
  onClose,
  onSubmit
}: {
  panel: NodePanelState;
  nodes: Array<{ node: PermissionNode; depth: number }>;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (data: PermissionNodeInput | PermissionNodeUpdateInput) => void;
}) {
  const editingNode = panel.mode === "edit" ? panel.node : null;
  const defaultParentId = panel.mode === "create" ? panel.parent?.id ?? "" : editingNode?.parentId ?? "";
  const [nodeType, setNodeType] = useState<PermissionNode["nodeType"]>(
    editingNode?.nodeType ?? (panel.mode === "create" && panel.parent?.nodeType === "MENU" ? "PERMISSION" : "MENU")
  );
  const excludedIds = editingNode ? new Set([editingNode.id, ...collectDescendantIds(editingNode)]) : new Set<number>();
  const parentOptions = nodes.filter(
    ({ node }) => node.nodeType !== "PERMISSION" && node.status === "ACTIVE" && !excludedIds.has(node.id)
  );

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedNodeType = editingNode?.nodeType ?? (String(form.get("nodeType") ?? "MENU") as PermissionNode["nodeType"]);
    const routePath = selectedNodeType === "PERMISSION" ? null : normalizeOptionalString(form.get("routePath"));
    const base = {
      parentId: form.get("parentId") ? Number(form.get("parentId")) : null,
      name: String(form.get("name") ?? ""),
      routePath,
      operationLevel: String(form.get("operationLevel") ?? "GET"),
      sortOrder: Number(form.get("sortOrder") ?? 0),
      icon: normalizeOptionalString(form.get("icon")),
      status: String(form.get("status") ?? "ACTIVE")
    };
    if (editingNode) {
      onSubmit(base);
    } else {
      onSubmit({
        ...base,
        nodeType: selectedNodeType,
        code: String(form.get("code") ?? "")
      });
    }
  }

  return (
    <SidePanel
      title={editingNode ? "编辑权限节点" : "新增权限节点"}
      description="目录和菜单可配置 routePath；权限项必须挂在菜单下。"
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {error ? <ErrorBox error={error} /> : null}
        <Field label="父节点">
          <Select name="parentId" defaultValue={defaultParentId}>
            <option value="">无父节点</option>
            {parentOptions.map(({ node, depth }) => (
              <option key={node.id} value={node.id}>
                {"　".repeat(depth)}
                {node.name}（{node.code}）
              </option>
            ))}
          </Select>
        </Field>
        <Field label="节点类型">
          <Select
            name="nodeType"
            value={nodeType}
            disabled={Boolean(editingNode)}
            onChange={(event) => setNodeType(event.target.value as PermissionNode["nodeType"])}
          >
            <option value="DIRECTORY">目录</option>
            <option value="MENU">菜单</option>
            <option value="PERMISSION">权限项</option>
          </Select>
        </Field>
        <Field label="节点名称">
          <Input name="name" required maxLength={120} defaultValue={editingNode?.name ?? ""} />
        </Field>
        <Field label="权限 code">
          <Input name="code" required maxLength={160} defaultValue={editingNode?.code ?? ""} disabled={Boolean(editingNode)} />
        </Field>
        <Field label="routePath">
          <Input
            name="routePath"
            placeholder="权限项留空"
            defaultValue={editingNode?.routePath ?? ""}
            disabled={nodeType === "PERMISSION"}
          />
        </Field>
        <Field label="操作级别">
          <Select name="operationLevel" defaultValue={editingNode?.operationLevel ?? "GET"}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="BOTH">GET + POST</option>
          </Select>
        </Field>
        <Field label="排序">
          <Input name="sortOrder" type="number" defaultValue={editingNode?.sortOrder ?? 0} />
        </Field>
        <Field label="图标">
          <Input name="icon" placeholder="lucide 图标 code，可选" defaultValue={editingNode?.icon ?? ""} />
        </Field>
        <Field label="状态">
          <Select name="status" defaultValue={editingNode?.status ?? "ACTIVE"}>
            <option value="ACTIVE">启用</option>
            <option value="DISABLED">禁用</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={pending}>
            <Save size={16} />
            保存
          </Button>
        </div>
      </form>
    </SidePanel>
  );
}

/**
 * 业务意义：渲染页面局部业务区块，并承接父组件传入的操作回调。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function SidePanel({
  title,
  description,
  children,
  onClose
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-brand-strong/30">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-line bg-surface shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-line bg-surface px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-content-strong">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            </div>
            <button
              type="button"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-content-muted hover:bg-background"
              onClick={onClose}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

/**
 * 业务意义：渲染角色管理页的错误提示。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="rounded-lg border border-danger-line bg-danger-muted px-4 py-3 text-sm font-medium text-danger">
      {errorMessage(error)}
    </div>
  );
}

/**
 * 业务意义：根据业务状态渲染中文状态徽标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function RoleStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <Badge tone="green">启用</Badge>;
  }
  if (status === "DISABLED") {
    return <Badge tone="red">禁用</Badge>;
  }
  return <Badge>{status}</Badge>;
}

/**
 * 业务意义：根据业务状态渲染中文状态徽标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function PermissionNodeTypeBadge({ type }: { type: PermissionNode["nodeType"] }) {
  if (type === "DIRECTORY") {
    return <Badge tone="slate">目录</Badge>;
  }
  if (type === "MENU") {
    return <Badge tone="teal">菜单</Badge>;
  }
  return <Badge tone="blue">权限项</Badge>;
}

/**
 * 业务意义：把树形结构展开为线性列表。
 * 参数：`nodes` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function flattenNodes(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
}

/**
 * 业务意义：把树形结构展开为线性列表。
 * 参数：`nodes` 表示调用方传入的业务参数；`depth` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function flattenNodesWithDepth(nodes: PermissionNode[], depth = 0): Array<{ node: PermissionNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenNodesWithDepth(node.children ?? [], depth + 1)]);
}

/**
 * 业务意义：从树形或关联结构收集所需 id 集合。
 * 参数：`node` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function collectDescendantIds(node: PermissionNode): number[] {
  return (node.children ?? []).flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

/**
 * 业务意义：从树形或关联结构收集所需 id 集合。
 * 参数：`nodeId` 表示调用方传入的业务参数；`parentById` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function collectAncestorIds(nodeId: number, parentById: Map<number, number | null>): number[] {
  const ids: number[] = [];
  let parentId = parentById.get(nodeId);
  while (parentId) {
    // 从当前节点向上收集父节点，用于勾选子权限时补齐菜单链路。
    ids.push(parentId);
    parentId = parentById.get(parentId);
  }
  return ids;
}

/**
 * 业务意义：规范化表单字段值，便于提交给后端。
 * 参数：`value` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
function normalizeOptionalString(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
