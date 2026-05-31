/**
 * 用户角色分配页面模块，负责给账号勾选角色。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getRoles } from "../../api/roleApi";
import { getUserRoles, getUsers, updateUserRoles } from "../../api/userApi";
import { errorMessage } from "../../api/http";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useAuth } from "../../state/auth";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function UserRolePage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: ["roles"], queryFn: getRoles, enabled: isAdmin });
  const users = useQuery({ queryKey: ["users"], queryFn: () => getUsers({ pageSize: 100 }), enabled: isAdmin });
  const userRoles = useQuery({ queryKey: ["user-roles", id], queryFn: () => getUserRoles(id!), enabled: isAdmin && Boolean(id) });
  const [checkedRoleCodes, setCheckedRoleCodes] = useState<Set<string>>(new Set());
  const currentUser = users.data?.items.find((item) => String(item.id) === String(id));

  useEffect(() => {
    if (userRoles.data) {
      setCheckedRoleCodes(new Set(userRoles.data.roleCodes));
    }
  }, [userRoles.data]);

  const mutation = useMutation({
    mutationFn: () => updateUserRoles(id!, Array.from(checkedRoleCodes)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["user-roles", id] });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="用户角色分配仅管理员可用。" />;
  }

  /**
   * 业务意义：切换用户角色勾选状态。
   * 参数：`code` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  function toggleRole(code: string) {
    setCheckedRoleCodes((current) => {
      const next = new Set(current);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  return (
    <>
      <PageHeader
        title="用户角色"
        description={currentUser ? `给 ${currentUser.displayName}（${currentUser.username}）分配角色。角色权限会在 token 校验时实时读取。` : "给用户分配角色。"}
        actions={<Link to="/admin/users"><Button variant="secondary">返回用户</Button></Link>}
      />
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">角色分配</div>
            <div className="mt-1 text-sm text-muted-foreground">至少保留一个角色。</div>
          </div>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || checkedRoleCodes.size === 0}>
            <Save size={16} />
            保存角色
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {mutation.error ? (
            <div className="rounded-lg border border-danger-line bg-danger-muted px-4 py-3 text-sm font-medium text-danger">
              {errorMessage(mutation.error)}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            {roles.data?.items.map((role) => (
              <label key={role.id} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 text-sm shadow-sm">
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checkedRoleCodes.has(role.code)}
                    onChange={() => toggleRole(role.code)}
                  />
                  <span>
                    <span className="font-semibold">{role.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{role.code}</span>
                  </span>
                </span>
                <Badge tone={role.status === "ACTIVE" ? "green" : "slate"}>{role.status}</Badge>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
