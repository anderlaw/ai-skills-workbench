import { useQuery } from "@tanstack/react-query";

import { getAuditLogs } from "../../api/auditLogApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { formatDateTime } from "../../lib/format";

export function AuditLogListPage() {
  const logs = useQuery({ queryKey: ["audit-logs"], queryFn: () => getAuditLogs({ pageSize: 50 }) });

  return (
    <>
      <PageHeader title="操作记录" description="查看项目、成员、任务和项目成员关系的关键变更。" />
      <Card>
        <CardHeader>
          <div className="font-semibold">最近操作</div>
          <div className="mt-1 text-sm text-muted-foreground">共 {logs.data?.total ?? "-"} 条记录</div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>时间</th>
                <th>操作人</th>
                <th>动作</th>
                <th>对象类型</th>
                <th>对象 ID</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {logs.data?.items.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>{log.actorName}</td>
                  <td>{log.action}</td>
                  <td>{log.targetType}</td>
                  <td>{log.targetId ?? "-"}</td>
                  <td>{log.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs.data?.items.length ? <EmptyState /> : null}
        </CardContent>
      </Card>
    </>
  );
}
