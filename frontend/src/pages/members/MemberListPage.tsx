import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getMembers } from "../../api/memberApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { MemberStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useAuth } from "../../state/auth";

export function MemberListPage() {
  const { isAdmin } = useAuth();
  const members = useQuery({ queryKey: ["members"], queryFn: () => getMembers({ pageSize: 100 }) });

  return (
    <>
      <PageHeader
        title="成员"
        description="记录参与项目的人、技术方向、状态和联系方式。"
        actions={isAdmin ? <Link to="/members/new"><Button><Plus size={16} />新增成员</Button></Link> : null}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <div className="font-semibold">成员目录</div>
            <div className="mt-1 text-sm text-muted-foreground">共 {members.data?.total ?? "-"} 位成员</div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>成员</th>
                <th>技术方向</th>
                <th>技术水平</th>
                <th>GitHub</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {members.data?.items.map((member) => (
                <tr key={member.id}>
                  <td>
                    <Link className="surface-link" to={`/members/${member.id}`}>{member.name}</Link>
                    <div className="mt-1 text-xs text-muted-foreground">{member.contact ?? member.email ?? "-"}</div>
                  </td>
                  <td>{member.skillDirection ?? "-"}</td>
                  <td>{member.skillLevel ?? "-"}</td>
                  <td>{member.githubUsername ?? "-"}</td>
                  <td><MemberStatusBadge status={member.status} /></td>
                  <td>{isAdmin ? <Link className="surface-link" to={`/members/${member.id}/edit`}>编辑</Link> : <span className="text-muted-foreground">只读</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!members.data?.items.length ? <EmptyState /> : null}
        </CardContent>
      </Card>
    </>
  );
}
