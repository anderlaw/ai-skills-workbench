import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { FormEvent } from "react";

import { createPermissionNode, getPermissionTree } from "../../api/permissionNodeApi";
import { errorMessage } from "../../api/http";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { Input, Select } from "../../components/ui/Field";
import { useAuth } from "../../state/auth";
import type { PermissionNode } from "../../types";

export function PermissionNodePage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const tree = useQuery({ queryKey: ["permission-nodes", "tree"], queryFn: getPermissionTree, enabled: isAdmin });
  const flatNodes = flattenNodes(tree.data?.items ?? []);
  const parentCandidates = flatNodes.filter((node) => node.nodeType !== "PERMISSION");
  const mutation = useMutation({
    mutationFn: createPermissionNode,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["permission-nodes", "tree"] });
    }
  });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="权限配置仅管理员可用。" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nodeType = String(form.get("nodeType")) as "DIRECTORY" | "MENU" | "PERMISSION";
    mutation.mutate({
      parentId: form.get("parentId") ? Number(form.get("parentId")) : null,
      nodeType,
      name: String(form.get("name") ?? ""),
      code: String(form.get("code") ?? ""),
      routePath: nodeType === "PERMISSION" ? null : String(form.get("routePath") ?? ""),
      operationLevel: String(form.get("operationLevel") ?? "GET"),
      sortOrder: Number(form.get("sortOrder") ?? 0),
      icon: String(form.get("icon") ?? ""),
      status: "ACTIVE"
    });
    event.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="权限配置" description="维护目录、菜单和权限项。权限 code 全局唯一，菜单 routePath 由前端路由注册表映射。" />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader className="font-semibold">新增权限节点</CardHeader>
          <CardContent>
            {mutation.error ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage(mutation.error)}
              </div>
            ) : null}
            <form className="grid gap-3" onSubmit={handleSubmit}>
              <Select name="parentId">
                <option value="">无父节点</option>
                {parentCandidates.map((node) => (
                  <option key={node.id} value={node.id}>{node.name}（{node.code}）</option>
                ))}
              </Select>
              <Select name="nodeType" defaultValue="MENU">
                <option value="DIRECTORY">目录</option>
                <option value="MENU">菜单</option>
                <option value="PERMISSION">权限项</option>
              </Select>
              <Input name="name" placeholder="权限名" required />
              <Input name="code" placeholder="权限 code，例如 project:create" required />
              <Input name="routePath" placeholder="目录/菜单 routePath，权限项留空" />
              <Select name="operationLevel" defaultValue="GET">
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="BOTH">GET + POST</option>
              </Select>
              <Input name="sortOrder" type="number" defaultValue={0} />
              <Input name="icon" placeholder="lucide 图标 code，可选" />
              <Button type="submit" disabled={mutation.isPending}>
                <Plus size={16} />
                新增节点
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <span className="font-semibold">权限树</span>
            <span className="text-xs font-medium text-muted-foreground">{tree.data?.total ?? 0} 个节点</span>
          </CardHeader>
          <CardContent>
            {tree.data?.items.length ? (
              <div className="grid gap-2">
                {tree.data.items.map((node) => <PermissionTreeNode key={node.id} node={node} />)}
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

function PermissionTreeNode({ node, depth = 0 }: { node: PermissionNode; depth?: number }) {
  return (
    <div>
      <div
        className="flex min-h-10 flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        style={{ marginLeft: depth * 18 }}
      >
        <KeyRound size={15} className="text-teal-700" />
        <span className="font-semibold">{node.name}</span>
        <Badge tone={node.nodeType === "PERMISSION" ? "blue" : node.nodeType === "MENU" ? "teal" : "slate"}>{node.nodeType}</Badge>
        <span className="text-xs text-muted-foreground">{node.code}</span>
        {node.routePath ? <span className="text-xs text-muted-foreground">/{node.routePath}</span> : null}
      </div>
      {node.children?.length ? (
        <div className="mt-2 grid gap-2">
          {node.children.map((child) => <PermissionTreeNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
      ) : null}
    </div>
  );
}

function flattenNodes(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])]);
}
