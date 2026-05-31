/**
 * 任务表单页面模块，负责任务新增和编辑。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { z } from "zod";

import { getMembers } from "../../api/memberApi";
import { getProjects } from "../../api/projectApi";
import { createTask, getTask, updateTask } from "../../api/taskApi";
import { FormSection } from "../../components/common/FormSection";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { priorityOptions, taskStatusOptions, taskTypeOptions } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import { useAuth } from "../../state/auth";

const schema = z.object({
  projectId: z.coerce.number().min(1, "请选择项目"),
  assigneeId: z.coerce.number().optional(),
  title: z.string().min(1, "任务标题必填"),
  description: z.string().optional(),
  taskType: z.string(),
  priority: z.string(),
  status: z.string(),
  progress: z.coerce.number().min(0).max(100),
  githubIssueUrl: z.string().url("请输入合法 URL").or(z.literal("")).optional(),
  prUrl: z.string().url("请输入合法 URL").or(z.literal("")).optional(),
  submissionNote: z.string().optional(),
  currentIssues: z.string().optional(),
  dueDate: z.string().optional(),
  remark: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function TaskFormPage() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const task = useQuery({ queryKey: ["task", id], queryFn: () => getTask(id!), enabled: isEdit });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => getProjects({ pageSize: 100 }) });
  const members = useQuery({ queryKey: ["members"], queryFn: () => getMembers({ pageSize: 100 }) });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectId: Number(searchParams.get("projectId") ?? 0),
      title: "",
      taskType: "OTHER",
      priority: "MEDIUM",
      status: "TODO",
      progress: 0
    }
  });

  useEffect(() => {
    if (task.data) {
      form.reset({
        projectId: task.data.projectId,
        assigneeId: task.data.assigneeId ?? undefined,
        title: task.data.title,
        description: task.data.description ?? "",
        taskType: task.data.taskType,
        priority: task.data.priority,
        status: task.data.status,
        progress: task.data.progress,
        githubIssueUrl: task.data.githubIssueUrl ?? "",
        prUrl: task.data.prUrl ?? "",
        submissionNote: task.data.submissionNote ?? "",
        currentIssues: task.data.currentIssues ?? "",
        dueDate: formatDate(task.data.dueDate),
        remark: task.data.remark ?? ""
      });
    }
  }, [form, task.data]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        assigneeId: values.assigneeId || null,
        dueDate: values.dueDate || null
      };
      return isEdit ? updateTask(id!, payload) : createTask(payload);
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/tasks/${result.id}`);
    }
  });

  if (!isAdmin) {
    return <PageHeader title="需要管理员登录" description="公开模式只能查看任务。" />;
  }

  return (
    <>
      <PageHeader title={isEdit ? "编辑任务" : "新增任务"} actions={<Link to="/tasks"><Button variant="secondary">返回列表</Button></Link>} />
      <form className="grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormSection title="任务归属" description="关联项目、负责人和任务基本属性。">
          <div className="form-grid">
            <Field label="所属项目" error={form.formState.errors.projectId?.message}>
              <Select {...form.register("projectId")}>
                <option value={0}>选择项目</option>
                {projects.data?.items.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </Select>
            </Field>
            <Field label="负责人">
              <Select {...form.register("assigneeId")}>
                <option value="">未分配</option>
                {members.data?.items.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </Select>
            </Field>
            <Field label="任务标题" error={form.formState.errors.title?.message}><Input {...form.register("title")} /></Field>
            <Field label="任务类型">
              <Select {...form.register("taskType")}>{taskTypeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            </Field>
          </div>
          <Field label="任务说明"><Textarea {...form.register("description")} /></Field>
        </FormSection>
        <FormSection title="状态与排期" description="用于跟踪进度、阻塞和交付节奏。">
          <div className="form-grid">
            <Field label="优先级">
              <Select {...form.register("priority")}>{priorityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            </Field>
            <Field label="状态">
              <Select {...form.register("status")}>{taskStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
            </Field>
            <Field label="进度百分比" error={form.formState.errors.progress?.message}><Input type="number" min={0} max={100} {...form.register("progress")} /></Field>
            <Field label="截止时间"><Input type="date" {...form.register("dueDate")} /></Field>
          </div>
          <Field label="当前问题"><Textarea {...form.register("currentIssues")} /></Field>
        </FormSection>
        <FormSection title="提交与备注" description="记录 Issue、PR、提交说明和补充信息。">
          <div className="form-grid">
            <Field label="GitHub Issue 地址" error={form.formState.errors.githubIssueUrl?.message}><Input {...form.register("githubIssueUrl")} /></Field>
            <Field label="PR 地址" error={form.formState.errors.prUrl?.message}><Input {...form.register("prUrl")} /></Field>
          </div>
          <Field label="提交说明"><Textarea {...form.register("submissionNote")} /></Field>
          <Field label="备注"><Textarea {...form.register("remark")} /></Field>
        </FormSection>
        <div className="flex justify-end rounded-lg border border-line bg-surface p-4 shadow-sm">
          <Button type="submit" disabled={mutation.isPending}><Save size={16} />保存</Button>
        </div>
      </form>
    </>
  );
}
