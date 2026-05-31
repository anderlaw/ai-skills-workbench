/**
 * 用户账号列表页面模块，展示账号目录和角色分配入口。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getUsers } from "../../api/userApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { formatDateTime } from "../../lib/format";
import { useAuth } from "../../state/auth";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function UserListPage() {
  const { isAdmin } = useAuth();
  const users = useQuery({ queryKey: ["users"], queryFn: () => getUsers({ pageSize: 100 }), enabled: isAdmin });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="用户管理仅管理员可见。" />;
  }

  return (
    <>
      <PageHeader
        title="用户管理"
        description="管理可登录系统的账号、状态和基础信息。"
        actions={<Link to="/admin/users/new"><Button><Plus size={16} />新增用户</Button></Link>}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <div className="font-semibold">系统用户</div>
            <div className="mt-1 text-sm text-muted-foreground">共 {users.data?.total ?? "-"} 个账号</div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>用户</th>
                <th>联系信息</th>
                <th>能力方向</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.data?.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="font-medium text-content-strong">{item.displayName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.username}</div>
                  </td>
                  <td>
                    <div>{item.email || "-"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.phone || item.githubUsername || "-"}</div>
                  </td>
                  <td>
                    <div>{item.skillDirection || "-"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.skillLevel || "-"}</div>
                  </td>
                  <td><UserStatusBadge status={item.status} /></td>
                  <td>{formatDateTime(item.createdAt)}</td>
                  <td><Link className="surface-link" to={`/admin/users/${item.id}/roles`}>分配角色</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!users.data?.items.length ? <EmptyState /> : null}
        </CardContent>
      </Card>
    </>
  );
}

/**
 * 业务意义：根据业务状态渲染中文状态徽标。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
function UserStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE") {
    return <Badge tone="green">启用</Badge>;
  }
  if (status === "DISABLED") {
    return <Badge tone="red">禁用</Badge>;
  }
  return <Badge>{status}</Badge>;
}
