import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getProjects } from "../../api/projectApi";
import { EmptyState } from "../../components/common/EmptyState";
import { PageHeader } from "../../components/common/PageHeader";
import { ProgressBar } from "../../components/common/ProgressBar";
import { ProjectStatusBadge } from "../../components/common/StatusBadges";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { useAuth } from "../../state/auth";

export function ProjectListPage() {
  const { isAdmin } = useAuth();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => getProjects({ pageSize: 100 }) });

  return (
    <>
      <PageHeader
        title="项目"
        description="维护项目基础信息、当前进展、问题和下一步计划。"
        actions={
          isAdmin ? (
            <Link to="/projects/new">
              <Button>
                <Plus size={16} />
                新增项目
              </Button>
            </Link>
          ) : null
        }
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <div className="font-semibold">项目清单</div>
            <div className="mt-1 text-sm text-muted-foreground">共 {projects.data?.total ?? "-"} 个项目</div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>项目</th>
                <th>类型</th>
                <th>状态</th>
                <th>进度</th>
                <th>当前进展</th>
                <th>下一步</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.data?.items.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link className="surface-link" to={`/projects/${project.id}`}>
                      {project.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">{project.techStack.join(", ")}</div>
                  </td>
                  <td>{project.projectType ?? "-"}</td>
                  <td>
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td>
                    <ProgressBar value={project.progress} />
                  </td>
                  <td>{project.currentProgress ?? "-"}</td>
                  <td>{project.nextSteps ?? "-"}</td>
                  <td>
                    {isAdmin ? (
                      <Link className="surface-link" to={`/projects/${project.id}/edit`}>
                        编辑
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">只读</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!projects.data?.items.length ? <EmptyState /> : null}
        </CardContent>
      </Card>
    </>
  );
}
