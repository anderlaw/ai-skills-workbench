/**
 * 权限配置页面模块，负责权限树展示和右侧抽屉式节点配置。
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
  ListTree,
  Plus,
  Save,
  Search,
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
import { errorMessage } from "../../api/http";
import { Badge } from "../../components/common/Badge";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Field, Input, Select } from "../../components/ui/Field";
import { useAuth } from "../../state/auth";
import type { PermissionNode } from "../../types";

type DrawerState =
  | { mode: "detail"; node: PermissionNode }
  | { mode: "create"; parent: PermissionNode | null; nodeType: PermissionNode["nodeType"] }
  | { mode: "edit"; node: PermissionNode };

interface TreeStats {
  directories: number;
  menus: number;
  permissions: number;
  disabled: number;
}

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function PermissionNodePage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const tree = useQuery({ queryKey: ["permission-nodes", "tree"], queryFn: getPermissionTree, enabled: isAdmin });
  const treeItems = tree.data?.items ?? [];
  const flatNodes = useMemo(() => flattenNodes(treeItems), [treeItems]);
  const nodeById = useMemo(() => new Map(flatNodes.map((node) => [node.id, node])), [flatNodes]);
  const stats = useMemo(() => getTreeStats(flatNodes), [flatNodes]);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [treeInitialized, setTreeInitialized] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [drawerState, setDrawerState] = useState<DrawerState | null>(null);

  const filteredTree = useMemo(() => filterTree(treeItems, keyword), [treeItems, keyword]);
  const searchActive = keyword.trim().length > 0;

  useEffect(() => {
    if (!treeInitialized && flatNodes.length) {
      // 初次进入只展开到目录层，让权限树保持可扫读而不是一次铺开全部权限项。
      setExpandedIds(new Set(flatNodes.filter((node) => node.nodeType === "DIRECTORY").map((node) => node.id)));
      setTreeInitialized(true);
    }
  }, [flatNodes, treeInitialized]);

  useEffect(() => {
    if (selectedNodeId && !nodeById.has(selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodeById, selectedNodeId]);

  const createMutation = useMutation({
    mutationFn: createPermissionNode,
    onSuccess: async (node) => {
      setSelectedNodeId(node.id);
      setDrawerState({ mode: "detail", node });
      if (node.parentId) {
        setExpandedIds((current) => new Set(current).add(node.parentId!));
      }
      await queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ nodeId, data }: { nodeId: number; data: PermissionNodeUpdateInput }) => updatePermissionNode(nodeId, data),
    onSuccess: async (node) => {
      setSelectedNodeId(node.id);
      setDrawerState({ mode: "detail", node });
      if (node.parentId) {
        setExpandedIds((current) => new Set(current).add(node.parentId!));
      }
      await queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePermissionNode,
    onSuccess: async (node) => {
      setSelectedNodeId(node.id);
      setDrawerState({ mode: "detail", node });
      await queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] });
    }
  });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="权限配置仅管理员可用。" />;
  }

  /**
   * 业务意义：打开节点详情抽屉。
   * 参数：`node` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function openDetail(node: PermissionNode) {
    setSelectedNodeId(node.id);
    setDrawerState({ mode: "detail", node });
  }

  /**
   * 业务意义：按父节点和节点类型打开新增节点抽屉。
   * 参数：`parent` 表示调用方传入的业务参数；`nodeType` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function startCreate(parent: PermissionNode | null, nodeType: PermissionNode["nodeType"]) {
    if (parent) {
      setSelectedNodeId(parent.id);
    }
    setDrawerState({ mode: "create", parent, nodeType });
  }

  /**
   * 业务意义：打开节点编辑抽屉。
   * 参数：`node` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function startEdit(node: PermissionNode) {
    setSelectedNodeId(node.id);
    setDrawerState({ mode: "edit", node });
  }

  /**
   * 业务意义：确认后软删除权限节点。
   * 参数：`node` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleDelete(node: PermissionNode) {
    if (node.status !== "ACTIVE") {
      return;
    }
    if (window.confirm(`确认删除权限节点「${node.name}」？删除后会置为 DISABLED。`)) {
      deleteMutation.mutate(node.id);
    }
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
   * 业务意义：把权限树展开到菜单层。
   * 参数：无。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function expandToMenus() {
    setExpandedIds(new Set(flatNodes.filter((node) => node.nodeType === "DIRECTORY").map((node) => node.id)));
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

  const pageError = deleteMutation.error;

  return (
    <>
      <PageHeader
        title="权限配置"
        description="权限树常驻展示；新增、编辑和节点详情在右侧抽屉中完成。"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => startCreate(null, "DIRECTORY")}>
              <Plus size={16} />
              新增根目录
            </Button>
            <Button type="button" variant="secondary" onClick={() => startCreate(null, "MENU")}>
              <Plus size={16} />
              新增根菜单
            </Button>
          </div>
        }
      />

      {pageError ? <ErrorBox error={pageError} className="mb-4" /> : null}

      <Card>
        <CardHeader className="grid gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="font-semibold">权限树</div>
              <div className="mt-1 text-sm text-muted-foreground">
                默认展开到菜单层；点击任意节点可在右侧抽屉查看和配置。
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="secondary" onClick={expandToMenus}>
                <ListTree size={16} />
                展开到菜单
              </Button>
              <Button type="button" variant="secondary" onClick={expandAll}>
                <ChevronsDown size={16} />
                全部展开
              </Button>
              <Button type="button" variant="secondary" onClick={collapseAll}>
                <ChevronsUp size={16} />
                全部收起
              </Button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="w-full pl-9"
                placeholder="搜索节点名称、code 或 routePath"
              />
            </label>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <StatPill label="目录" value={stats.directories} />
              <StatPill label="菜单" value={stats.menus} />
              <StatPill label="权限项" value={stats.permissions} />
              <StatPill label="禁用" value={stats.disabled} />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredTree.length ? (
            <div className="grid gap-2">
              {filteredTree.map((node) => (
                <PermissionTreeNode
                  key={node.id}
                  node={node}
                  selectedNodeId={selectedNodeId}
                  expandedIds={expandedIds}
                  searchActive={searchActive}
                  onSelect={openDetail}
                  onToggleExpanded={toggleExpanded}
                  onCreate={startCreate}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  depth={0}
                />
              ))}
            </div>
          ) : (
            <EmptyState text={searchActive ? "没有匹配的权限节点" : "暂无权限节点"} />
          )}
        </CardContent>
      </Card>

      {drawerState ? (
        <NodeDrawer
          state={drawerState}
          nodeById={nodeById}
          createPending={createMutation.isPending}
          updatePending={updateMutation.isPending}
          createError={createMutation.error}
          updateError={updateMutation.error}
          onClose={() => setDrawerState(null)}
          onCreate={startCreate}
          onEdit={startEdit}
          onDelete={handleDelete}
          onSubmitCreate={(data) => createMutation.mutate(data)}
          onSubmitUpdate={(nodeId, data) => updateMutation.mutate({ nodeId, data })}
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
function NodeDrawer({
  state,
  nodeById,
  createPending,
  updatePending,
  createError,
  updateError,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  onSubmitCreate,
  onSubmitUpdate
}: {
  state: DrawerState;
  nodeById: Map<number, PermissionNode>;
  createPending: boolean;
  updatePending: boolean;
  createError: unknown;
  updateError: unknown;
  onClose: () => void;
  onCreate: (parent: PermissionNode | null, nodeType: PermissionNode["nodeType"]) => void;
  onEdit: (node: PermissionNode) => void;
  onDelete: (node: PermissionNode) => void;
  onSubmitCreate: (data: PermissionNodeInput) => void;
  onSubmitUpdate: (nodeId: number, data: PermissionNodeUpdateInput) => void;
}) {
  if (state.mode === "detail") {
    const node = state.node;
    return (
      <SideDrawer title="节点详情" description={getNodePath(node, nodeById)} onClose={onClose}>
        <div className="grid gap-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <NodeIcon nodeType={node.nodeType} className="text-teal-700" />
              <span className="font-semibold text-slate-900">{node.name}</span>
              <NodeTypeBadge type={node.nodeType} />
              <NodeStatusBadge status={node.status} />
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
              <InfoLine label="code" value={node.code} />
              <InfoLine label="routePath" value={node.routePath ? `/${node.routePath}` : "-"} />
              <InfoLine label="操作级别" value={node.operationLevel} />
              <InfoLine label="排序" value={String(node.sortOrder)} />
              <InfoLine label="图标" value={node.icon || "-"} />
            </div>
          </div>

          <div className="grid gap-2">
            {node.status === "ACTIVE" && node.nodeType === "DIRECTORY" ? (
              <>
                <Button type="button" onClick={() => onCreate(node, "DIRECTORY")}>
                  <Plus size={16} />
                  新增子目录
                </Button>
                <Button type="button" variant="secondary" onClick={() => onCreate(node, "MENU")}>
                  <Plus size={16} />
                  新增菜单
                </Button>
              </>
            ) : null}
            {node.status === "ACTIVE" && node.nodeType === "MENU" ? (
              <Button type="button" onClick={() => onCreate(node, "PERMISSION")}>
                <Plus size={16} />
                新增权限项
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => onEdit(node)}>
              <Edit2 size={16} />
              编辑节点
            </Button>
            <Button type="button" variant="danger" onClick={() => onDelete(node)} disabled={node.status !== "ACTIVE"}>
              <Trash2 size={16} />
              删除节点
            </Button>
          </div>
        </div>
      </SideDrawer>
    );
  }

  return (
    <SideDrawer
      title={state.mode === "create" ? "新增权限节点" : "编辑权限节点"}
      description={state.mode === "create" ? "父级已由权限树上下文确定。" : "code 和节点类型创建后不可修改。"}
      onClose={onClose}
    >
      <NodeEditorForm
        editorState={state}
        nodeById={nodeById}
        pending={state.mode === "create" ? createPending : updatePending}
        error={state.mode === "create" ? createError : updateError}
        onCancel={onClose}
        onSubmitCreate={onSubmitCreate}
        onSubmitUpdate={onSubmitUpdate}
      />
    </SideDrawer>
  );
}

/**
 * 业务意义：把权限节点类型转换为中文展示名称。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function NodeEditorForm({
  editorState,
  nodeById,
  pending,
  error,
  onCancel,
  onSubmitCreate,
  onSubmitUpdate
}: {
  editorState: Extract<DrawerState, { mode: "create" | "edit" }>;
  nodeById: Map<number, PermissionNode>;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onSubmitCreate: (data: PermissionNodeInput) => void;
  onSubmitUpdate: (nodeId: number, data: PermissionNodeUpdateInput) => void;
}) {
  const editingNode = editorState.mode === "edit" ? editorState.node : null;
  const nodeType = editorState.mode === "create" ? editorState.nodeType : editingNode!.nodeType;
  const parent =
    editorState.mode === "create"
      ? editorState.parent
      : editingNode?.parentId
        ? nodeById.get(editingNode.parentId) ?? null
        : null;
  const parentPath = parent ? getNodePath(parent, nodeById) : "根节点";
  const showRoutePath = nodeType !== "PERMISSION";
  const showOperationLevel = nodeType === "PERMISSION";
  const showIcon = nodeType !== "PERMISSION";

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const routePath = showRoutePath ? normalizeOptionalString(form.get("routePath")) : null;
    const operationLevel = showOperationLevel ? String(form.get("operationLevel") ?? "POST") : "GET";
    const sortOrder = Number(form.get("sortOrder") ?? 0);
    const icon = showIcon ? normalizeOptionalString(form.get("icon")) : null;

    if (editorState.mode === "create") {
      onSubmitCreate({
        parentId: parent?.id ?? null,
        nodeType,
        name: String(form.get("name") ?? ""),
        code: String(form.get("code") ?? ""),
        routePath,
        operationLevel,
        sortOrder,
        icon,
        status: "ACTIVE"
      });
      return;
    }

    onSubmitUpdate(editingNode!.id, {
      parentId: editingNode!.parentId ?? null,
      name: String(form.get("name") ?? ""),
      routePath,
      operationLevel,
      sortOrder,
      icon,
      status: String(form.get("status") ?? "ACTIVE")
    });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? <ErrorBox error={error} /> : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <div className="text-xs font-semibold text-slate-500">父级</div>
        <div className="mt-1 font-medium text-slate-900">{parentPath}</div>
      </div>

      <Field label="节点类型">
        <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
          <NodeIcon nodeType={nodeType} className="text-teal-700" />
          <span>{nodeTypeLabel(nodeType)}</span>
        </div>
      </Field>

      <Field label="名称">
        <Input name="name" required maxLength={120} placeholder="例如：新增项目" defaultValue={editingNode?.name ?? ""} />
      </Field>

      <Field label="权限 code">
        <Input
          name="code"
          required
          maxLength={160}
          placeholder="例如：project:create"
          defaultValue={editingNode?.code ?? ""}
          disabled={Boolean(editingNode)}
        />
      </Field>

      {showRoutePath ? (
        <Field label="routePath">
          <Input name="routePath" placeholder="例如：projects" defaultValue={editingNode?.routePath ?? ""} />
        </Field>
      ) : null}

      {showOperationLevel ? (
        <Field label="操作级别">
          <Select name="operationLevel" defaultValue={editingNode?.operationLevel ?? "POST"}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="BOTH">GET + POST</option>
          </Select>
        </Field>
      ) : null}

      <Field label="排序">
        <Input name="sortOrder" type="number" defaultValue={editingNode?.sortOrder ?? 0} />
      </Field>

      {showIcon ? (
        <Field label="图标">
          <Input name="icon" placeholder="lucide 图标 code，可选" defaultValue={editingNode?.icon ?? ""} />
        </Field>
      ) : null}

      {editingNode ? (
        <Field label="状态">
          <Select name="status" defaultValue={editingNode.status}>
            <option value="ACTIVE">启用</option>
            <option value="DISABLED">禁用</option>
          </Select>
        </Field>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={pending}>
          <Save size={16} />
          保存
        </Button>
      </div>
    </form>
  );
}

/**
 * 业务意义：递归渲染权限树节点，并提供节点详情、编辑、新增子节点和删除入口。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function PermissionTreeNode({
  node,
  selectedNodeId,
  expandedIds,
  searchActive,
  onSelect,
  onToggleExpanded,
  onCreate,
  onEdit,
  onDelete,
  depth
}: {
  node: PermissionNode;
  selectedNodeId: number | null;
  expandedIds: Set<number>;
  searchActive: boolean;
  onSelect: (node: PermissionNode) => void;
  onToggleExpanded: (nodeId: number) => void;
  onCreate: (parent: PermissionNode | null, nodeType: PermissionNode["nodeType"]) => void;
  onEdit: (node: PermissionNode) => void;
  onDelete: (node: PermissionNode) => void;
  depth: number;
}) {
  const hasChildren = Boolean(node.children?.length);
  const expanded = searchActive || expandedIds.has(node.id);
  const selected = selectedNodeId === node.id;
  const inactive = node.status !== "ACTIVE";

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node);
          }
        }}
        className={clsx(
          "grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm shadow-sm transition",
          selected ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50",
          inactive && "opacity-70"
        )}
        style={{ marginLeft: depth * 18 }}
      >
        <span className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded(node.id);
              }}
              aria-label={expanded ? "收起节点" : "展开节点"}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="h-7 w-7" />
          )}
          <NodeIcon nodeType={node.nodeType} className={inactive ? "text-slate-400" : "text-teal-700"} />
        </span>

        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{node.name}</span>
            <NodeTypeBadge type={node.nodeType} />
            <NodeStatusBadge status={node.status} />
          </span>
          <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{node.code}</span>
            {node.routePath ? <span>/{node.routePath}</span> : null}
            {node.nodeType === "PERMISSION" ? <span>{node.operationLevel}</span> : null}
            {hasChildren ? <span>{countDescendants(node)} 个子节点</span> : null}
          </span>
        </span>

        <span className="flex flex-wrap justify-end gap-1">
          {node.status === "ACTIVE" && node.nodeType === "DIRECTORY" ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreate(node, "DIRECTORY");
                }}
              >
                <Plus size={14} />
                子目录
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-8 px-2"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreate(node, "MENU");
                }}
              >
                <Plus size={14} />
                菜单
              </Button>
            </>
          ) : null}
          {node.status === "ACTIVE" && node.nodeType === "MENU" ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2"
              onClick={(event) => {
                event.stopPropagation();
                onCreate(node, "PERMISSION");
              }}
            >
              <Plus size={14} />
              权限项
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="h-8 px-2"
            title="编辑节点"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(node);
            }}
          >
            <Edit2 size={14} />
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-8 px-2"
            title="删除节点"
            disabled={inactive}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(node);
            }}
          >
            <Trash2 size={14} />
          </Button>
        </span>
      </div>

      {hasChildren && expanded ? (
        <div className="mt-2 grid gap-2">
          {node.children!.map((child) => (
            <PermissionTreeNode
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              expandedIds={expandedIds}
              searchActive={searchActive}
              onSelect={onSelect}
              onToggleExpanded={onToggleExpanded}
              onCreate={onCreate}
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
function SideDrawer({
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            </div>
            <button
              type="button"
              className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
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
 * 业务意义：渲染权限树统计徽标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
      {label} {value}
    </span>
  );
}

/**
 * 业务意义：渲染抽屉详情中的标签和值。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="break-all text-slate-800">{value}</span>
    </div>
  );
}

/**
 * 业务意义：渲染权限配置页的错误提示。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function ErrorBox({ error, className }: { error: unknown; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700", className)}>
      {errorMessage(error)}
    </div>
  );
}

/**
 * 业务意义：根据权限节点类型选择对应图标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function NodeIcon({ nodeType, className }: { nodeType: PermissionNode["nodeType"]; className?: string }) {
  const Icon = nodeType === "PERMISSION" ? ShieldCheck : nodeType === "MENU" ? KeyRound : FolderTree;
  return <Icon size={16} className={className} />;
}

/**
 * 业务意义：根据业务状态渲染中文状态徽标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function NodeTypeBadge({ type }: { type: PermissionNode["nodeType"] }) {
  if (type === "DIRECTORY") {
    return <Badge tone="slate">目录</Badge>;
  }
  if (type === "MENU") {
    return <Badge tone="teal">菜单</Badge>;
  }
  return <Badge tone="blue">权限项</Badge>;
}

/**
 * 业务意义：根据业务状态渲染中文状态徽标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function NodeStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <Badge tone="green">启用</Badge>;
  }
  if (status === "DISABLED") {
    return <Badge tone="red">禁用</Badge>;
  }
  return <Badge>{status}</Badge>;
}

/**
 * 业务意义：把权限节点类型转换为中文展示名称。
 * 参数：`type` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
function nodeTypeLabel(type: PermissionNode["nodeType"]) {
  if (type === "DIRECTORY") {
    return "目录";
  }
  if (type === "MENU") {
    return "菜单";
  }
  return "权限项";
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
 * 业务意义：统计权限树中目录、菜单、权限项和停用节点数量。
 * 参数：`nodes` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function getTreeStats(nodes: PermissionNode[]): TreeStats {
  return nodes.reduce(
    (stats, node) => {
      if (node.nodeType === "DIRECTORY") {
        stats.directories += 1;
      } else if (node.nodeType === "MENU") {
        stats.menus += 1;
      } else {
        stats.permissions += 1;
      }
      if (node.status !== "ACTIVE") {
        stats.disabled += 1;
      }
      return stats;
    },
    { directories: 0, menus: 0, permissions: 0, disabled: 0 }
  );
}

/**
 * 业务意义：根据搜索关键字过滤权限树，同时保留命中的祖先节点。
 * 参数：`nodes` 表示调用方传入的业务参数；`keyword` 表示调用方传入的业务参数。
 * 返回：返回转换后的树、列表、映射或统计数据，供页面继续渲染。
 */
function filterTree(nodes: PermissionNode[], keyword: string): PermissionNode[] {
  const query = keyword.trim().toLowerCase();
  if (!query) {
    return nodes;
  }
  return nodes.flatMap((node) => {
    const children = filterTree(node.children ?? [], keyword);
    // 子节点命中时保留父节点，确保搜索结果仍然呈现完整层级。
    const selfMatches = [node.name, node.code, node.routePath ?? ""].some((value) => value.toLowerCase().includes(query));
    if (selfMatches || children.length) {
      return [{ ...node, children }];
    }
    return [];
  });
}

/**
 * 业务意义：计算权限节点在树中的中文路径。
 * 参数：`node` 表示调用方传入的业务参数；`nodeById` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
function getNodePath(node: PermissionNode, nodeById: Map<number, PermissionNode>): string {
  const names = [node.name];
  let parentId = node.parentId ?? null;
  while (parentId) {
    const parent = nodeById.get(parentId);
    if (!parent) {
      break;
    }
    names.unshift(parent.name);
    parentId = parent.parentId ?? null;
  }
  return names.join(" / ");
}

/**
 * 业务意义：统计某个权限节点下的全部后代节点数量。
 * 参数：`node` 表示调用方传入的业务参数。
 * 返回：返回数字统计结果，用于页面展示或业务判断。
 */
function countDescendants(node: PermissionNode): number {
  return (node.children ?? []).reduce((total, child) => total + 1 + countDescendants(child), 0);
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
