import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

import { createMember, getMember, updateMember } from "../../api/memberApi";
import { getUsers } from "../../api/userApi";
import { FormSection } from "../../components/common/FormSection";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { memberStatusOptions } from "../../lib/constants";
import { useAuth } from "../../state/auth";

const schema = z.object({
  userId: z.coerce.number().min(1, "必须绑定登录账号"),
  name: z.string().min(1, "成员名称必填"),
  contact: z.string().optional(),
  githubUsername: z.string().optional(),
  email: z.string().email("请输入合法邮箱").or(z.literal("")).optional(),
  skillDirection: z.string().optional(),
  skillLevel: z.string().optional(),
  status: z.string(),
  remark: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export function MemberFormPage() {
  const { isAdmin } = useAuth();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const member = useQuery({ queryKey: ["member", id], queryFn: () => getMember(id!), enabled: isEdit });
  const users = useQuery({ queryKey: ["users", "member-form"], queryFn: () => getUsers({ pageSize: 100 }), enabled: isAdmin });
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: 0, name: "", status: "ACTIVE" }
  });

  useEffect(() => {
    if (member.data) {
      form.reset({
        userId: member.data.userId,
        name: member.data.name,
        contact: member.data.contact ?? "",
        githubUsername: member.data.githubUsername ?? "",
        email: member.data.email ?? "",
        skillDirection: member.data.skillDirection ?? "",
        skillLevel: member.data.skillLevel ?? "",
        status: member.data.status,
        remark: member.data.remark ?? ""
      });
    }
  }, [form, member.data]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => (isEdit ? updateMember(id!, values) : createMember(values)),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate(`/members/${result.id}`);
    }
  });

  if (!isAdmin) {
    return <PageHeader title="需要管理员登录" description="公开模式只能查看成员信息。" />;
  }

  return (
    <>
      <PageHeader title={isEdit ? "编辑成员" : "新增成员"} actions={<Link to="/members"><Button variant="secondary">返回列表</Button></Link>} />
      <form className="grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormSection title="账号绑定" description="项目人员必须绑定一个系统登录账号，账号和角色仍在用户管理维护。">
          <Field label="登录账号" error={form.formState.errors.userId?.message}>
            <Select {...form.register("userId")}>
              <option value={0}>选择登录账号</option>
              {users.data?.items.map((user) => (
                <option key={user.id} value={user.id}>{user.displayName}（{user.username}）</option>
              ))}
            </Select>
          </Field>
        </FormSection>
        <FormSection title="基础信息" description="项目人员身份、联系方式和公开资料。">
          <div className="form-grid">
            <Field label="姓名 / 昵称" error={form.formState.errors.name?.message}><Input {...form.register("name")} /></Field>
            <Field label="联系方式"><Input {...form.register("contact")} /></Field>
            <Field label="GitHub 用户名"><Input {...form.register("githubUsername")} /></Field>
            <Field label="邮箱" error={form.formState.errors.email?.message}><Input {...form.register("email")} /></Field>
          </div>
        </FormSection>
        <FormSection title="能力与状态" description="用于项目分工、任务分配和看板筛选。">
          <div className="form-grid">
            <Field label="技术方向"><Input {...form.register("skillDirection")} placeholder="前端 / 后端 / AI / 测试 / 部署" /></Field>
            <Field label="技术水平"><Input {...form.register("skillLevel")} placeholder="初级 / 中级 / 高级" /></Field>
            <Field label="状态">
              <Select {...form.register("status")}>
                {memberStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
          </div>
        </FormSection>
        <FormSection title="备注" description="记录成员背景、协作偏好或其他补充信息。">
          <Field label="备注"><Textarea {...form.register("remark")} /></Field>
        </FormSection>
        <div className="flex justify-end rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Button type="submit" disabled={mutation.isPending}><Save size={16} />保存</Button>
        </div>
      </form>
    </>
  );
}
