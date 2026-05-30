import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getPermissionTree } from "../../api/permissionNodeApi";
import { getRoles, updateRolePermissionNodes } from "../../api/roleApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { errorMessage } from "../../api/http";
import { useAuth } from "../../state/auth";
import type { PermissionNode, Role } from "../../types";

export function RoleListPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: getRoles, enabled: isAdmin });
  const permissionTree = useQuery({ queryKey: ["permission-nodes", "tree"], queryFn: getPermissionTree, enabled: isAdmin });
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());

  const selectedRole = roles.data?.items.find((role) => role.id === selectedRoleId) ?? roles.data?.items[0] ?? null;
  const flatNodes = useMemo(() => flattenNodes(permissionTree.data?.items ?? []), [permissionTree.data?.items]);
  const nodeById = useMemo(() => new Map(flatNodes.map((node) => [node.id, node])), [flatNodes]);
  const parentById = useMemo(() => new Map(flatNodes.map((node) => [node.id, node.parentId ?? null])), [flatNodes]);

  useEffect(() => {
    if (selectedRole && selectedRole.id !== selectedRoleId) {
      setSelectedRoleId(selectedRole.id);
    }
  }, [selectedRole, selectedRoleId]);

  useEffect(() => {
    if (selectedRole) {
      setCheckedIds(new Set(selectedRole.permissionNodeIds));
    }
  }, [selectedRole]);

  const mutation = useMutation({
    mutationFn: () => updateRolePermissionNodes(selectedRole!.id, Array.from(checkedIds)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["roles"] });
    }
  });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="角色管理仅管理员可用。" />;
  }

  function toggleNode(node: PermissionNode) {
    setCheckedIds((current) => {
      const next = new Set(current);
      const relatedIds = [node.id, ...collectDescendantIds(node)];
      const shouldCheck = !next.has(node.id);
      relatedIds.forEach((id) => {
        if (shouldCheck) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      if (shouldCheck) {
        collectAncestorIds(node.id, parentById).forEach((id) => next.add(id));
      }
      return next;
    });
  }

  return (
    <>
      <PageHeader title="角色管理" description="给角色分配目录、菜单和权限项，用户权限由其角色权限取并集。" />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="font-semibold">角色</CardHeader>
          <CardContent className="grid gap-3">
            {roles.data?.items.length ? (
              roles.data.items.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedRole?.id === role.id ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{role.name}</div>
                    <Badge tone={role.status === "ACTIVE" ? "green" : "slate"}>{role.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{role.code}</div>
                  <div className="mt-3 text-sm text-muted-foreground">{role.permissionNodeIds.length} 个权限节点</div>
                </button>
              ))
            ) : (
              <EmptyState text="暂无角色" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold">权限授权</div>
              <div className="mt-1 text-sm text-muted-foreground">{selectedRole ? `当前角色：${selectedRole.name}` : "请选择角色"}</div>
            </div>
            <Button type="button" onClick={() => mutation.mutate()} disabled={!selectedRole || selectedRole.code === "ADMIN" || mutation.isPending}>
              <Save size={16} />
              保存授权
            </Button>
          </CardHeader>
          <CardContent>
            {mutation.error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage(mutation.error)}
              </div>
            ) : null}
            {selectedRole?.code === "ADMIN" ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                ADMIN 角色固定拥有全部权限，不允许在这里修改。
              </div>
            ) : null}
            {permissionTree.data?.items.length ? (
              <div className="grid gap-2">
                {permissionTree.data.items.map((node) => (
                  <PermissionNodeCheckbox
                    key={node.id}
                    node={node}
                    checkedIds={checkedIds}
                    nodeById={nodeById}
                    onToggle={toggleNode}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text="暂无权限节点" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function PermissionNodeCheckbox({
  node,
  checkedIds,
  nodeById,
  onToggle,
  depth = 0
}: {
  node: PermissionNode;
  checkedIds: Set<number>;
  nodeById: Map<number, PermissionNode>;
  onToggle: (node: PermissionNode) => void;
  depth?: number;
}) {
  const descendants = collectDescendantIds(node);
  const checked = checkedIds.has(node.id);
  const partiallyChecked = !checked && descendants.some((id) => checkedIds.has(id) && nodeById.has(id));

  return (
    <div>
      <label
        className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        style={{ marginLeft: depth * 18 }}
      >
        <input
          type="checkbox"
          checked={checked}
          ref={(input) => {
            if (input) {
              input.indeterminate = partiallyChecked;
            }
          }}
          onChange={() => onToggle(node)}
        />
        <ShieldCheck size={15} className="text-teal-700" />
        <span className="font-medium">{node.name}</span>
        <span className="text-xs text-muted-foreground">{node.code}</span>
      </label>
      {node.children?.length ? (
        <div className="mt-2 grid gap-2">
          {node.children.map((child) => (
            <PermissionNodeCheckbox
              key={child.id}
              node={child}
              checkedIds={checkedIds}
              nodeById={nodeById}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function flattenNodes(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
}

function collectDescendantIds(node: PermissionNode): number[] {
  return (node.children ?? []).flatMap((child) => [child.id, ...collectDescendantIds(child)]);
}

function collectAncestorIds(nodeId: number, parentById: Map<number, number | null>): number[] {
  const ids: number[] = [];
  let parentId = parentById.get(nodeId);
  while (parentId) {
    ids.push(parentId);
    parentId = parentById.get(parentId);
  }
  return ids;
}
