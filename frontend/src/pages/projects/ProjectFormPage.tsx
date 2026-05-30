/**
 * 项目表单页面模块，负责项目新增和编辑。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { createProject, getProject, updateProject } from "../../api/projectApi";
import { FormSection } from "../../components/common/FormSection";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { projectStatusOptions } from "../../lib/constants";
import { formatDate, joinTechStack, splitTechStack } from "../../lib/format";
import { useAuth } from "../../state/auth";

const schema = z.object({
  name: z.string().min(1, "项目名称必填"),
  description: z.string().optional(),
  projectType: z.string().optional(),
  techStackText: z.string().optional(),
  featurePoints: z.string().optional(),
  githubUrl: z.string().url("请输入合法 URL").or(z.literal("")).optional(),
  deployUrl: z.string().url("请输入合法 URL").or(z.literal("")).optional(),
  status: z.string(),
  progress: z.coerce.number().min(0).max(100),
  currentProgress: z.string().optional(),
  currentIssues: z.string().optional(),
  nextSteps: z.string().optional(),
  startDate: z.string().optional(),
  expectedFinishDate: z.string().optional(),
  actualFinishDate: z.string().optional(),
  remark: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function ProjectFormPage() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const project = useQuery({ queryKey: ["project", id], queryFn: () => getProject(id!), enabled: isEdit });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      status: "PLANNING",
      progress: 0,
      techStackText: ""
    }
  });

  useEffect(() => {
    if (project.data) {
      form.reset({
        ...project.data,
        projectType: project.data.projectType ?? "",
        description: project.data.description ?? "",
        techStackText: joinTechStack(project.data.techStack),
        featurePoints: project.data.featurePoints ?? "",
        githubUrl: project.data.githubUrl ?? "",
        deployUrl: project.data.deployUrl ?? "",
        currentProgress: project.data.currentProgress ?? "",
        currentIssues: project.data.currentIssues ?? "",
        nextSteps: project.data.nextSteps ?? "",
        startDate: formatDate(project.data.startDate),
        expectedFinishDate: formatDate(project.data.expectedFinishDate),
        actualFinishDate: formatDate(project.data.actualFinishDate),
        remark: project.data.remark ?? ""
      });
    }
  }, [form, project.data]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        techStack: splitTechStack(values.techStackText ?? ""),
        projectType: values.projectType || undefined,
        startDate: values.startDate || null,
        expectedFinishDate: values.expectedFinishDate || null,
        actualFinishDate: values.actualFinishDate || null
      };
      const { techStackText, ...data } = payload;
      return isEdit ? updateProject(id!, data) : createProject(data);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/projects/${result.id}`);
    }
  });

  if (!isAdmin) {
    return <PageHeader title="需要管理员登录" description="公开模式只能查看数据，登录后可新增或编辑项目。" />;
  }

  return (
    <>
      <PageHeader title={isEdit ? "编辑项目" : "新增项目"} actions={<Link to="/projects"><Button variant="secondary">返回列表</Button></Link>} />
      <form className="grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormSection title="基础信息" description="项目定位、技术栈和核心功能。">
          <div className="form-grid">
            <Field label="项目名称" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </Field>
            <Field label="项目类型">
              <Input {...form.register("projectType")} placeholder="AI 应用 / 全栈项目 / 工具项目" />
            </Field>
          </div>
          <Field label="技术栈">
            <Input {...form.register("techStackText")} placeholder="React, FastAPI, PostgreSQL" />
          </Field>
          <Field label="项目简介">
            <Textarea {...form.register("description")} />
          </Field>
          <Field label="功能要点">
            <Textarea {...form.register("featurePoints")} />
          </Field>
        </FormSection>
        <FormSection title="状态与时间" description="用于看板聚合和项目节奏跟踪。">
          <div className="form-grid">
            <Field label="项目状态">
              <Select {...form.register("status")}>
                {projectStatusOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
            <Field label="进度百分比" error={form.formState.errors.progress?.message}>
              <Input type="number" min={0} max={100} {...form.register("progress")} />
            </Field>
            <Field label="开始时间">
              <Input type="date" {...form.register("startDate")} />
            </Field>
            <Field label="预计完成时间">
              <Input type="date" {...form.register("expectedFinishDate")} />
            </Field>
            <Field label="实际完成时间">
              <Input type="date" {...form.register("actualFinishDate")} />
            </Field>
          </div>
        </FormSection>
        <FormSection title="进展记录" description="记录当前状态、风险和下一步计划。">
          <div className="form-grid">
            <Field label="当前进展">
              <Textarea {...form.register("currentProgress")} />
            </Field>
            <Field label="当前问题">
              <Textarea {...form.register("currentIssues")} />
            </Field>
          </div>
          <Field label="下一步计划">
            <Textarea {...form.register("nextSteps")} />
          </Field>
        </FormSection>
        <FormSection title="链接与备注" description="关联仓库、发布地址和其他补充信息。">
          <div className="form-grid">
            <Field label="GitHub 地址" error={form.formState.errors.githubUrl?.message}>
              <Input {...form.register("githubUrl")} />
            </Field>
            <Field label="发布地址" error={form.formState.errors.deployUrl?.message}>
              <Input {...form.register("deployUrl")} />
            </Field>
          </div>
          <Field label="备注">
            <Textarea {...form.register("remark")} />
          </Field>
        </FormSection>
        <div className="flex justify-end rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Button type="submit" disabled={mutation.isPending}>
            <Save size={16} />
            保存
          </Button>
        </div>
      </form>
    </>
  );
}
