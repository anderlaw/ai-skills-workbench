/**
 * 用户账号表单页面模块，负责管理员新增登录账号。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { createUser } from "../../api/userApi";
import { FormSection } from "../../components/common/FormSection";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Field";
import { useAuth } from "../../state/auth";

const schema = z.object({
  username: z.string().min(1, "登录账号必填"),
  password: z.string().min(1, "密码必填"),
  displayName: z.string().min(1, "显示名必填"),
  roleCodes: z.array(z.string()).min(1, "至少选择一个角色"),
  status: z.string(),
  email: z.string().email("请输入合法邮箱").or(z.literal("")).optional(),
  phone: z.string().optional(),
  githubUsername: z.string().optional(),
  skillDirection: z.string().optional(),
  skillLevel: z.string().optional(),
  remark: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function UserFormPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "", displayName: "", roleCodes: ["CONTRIBUTOR"], status: "ACTIVE" }
  });

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate("/admin/users");
    }
  });

  if (!isAdmin) {
    return <PageHeader title="无权访问" description="新增用户仅管理员可用。" />;
  }

  return (
    <>
      <PageHeader title="新增用户" actions={<Link to="/admin/users"><Button variant="secondary">返回列表</Button></Link>} />
      <form className="grid gap-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FormSection title="登录信息" description="账号密码按当前 MVP 明文保存和校验。">
          <div className="form-grid">
            <Field label="登录账号" error={form.formState.errors.username?.message}><Input {...form.register("username")} /></Field>
            <Field label="显示名" error={form.formState.errors.displayName?.message}><Input {...form.register("displayName")} /></Field>
            <Field label="登录密码" error={form.formState.errors.password?.message}><Input type="password" {...form.register("password")} /></Field>
            <Field label="状态">
              <Select {...form.register("status")}>
                <option value="ACTIVE">启用</option>
                <option value="DISABLED">禁用</option>
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection title="角色" description="用户可同时拥有多个角色，权限取并集。">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium">
              <input type="checkbox" value="CONTRIBUTOR" {...form.register("roleCodes")} />
              CONTRIBUTOR
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm font-medium">
              <input type="checkbox" value="ADMIN" {...form.register("roleCodes")} />
              ADMIN
            </label>
          </div>
          {form.formState.errors.roleCodes?.message ? <div className="text-sm text-red-600">{form.formState.errors.roleCodes.message}</div> : null}
        </FormSection>

        <FormSection title="人员信息" description="用于项目分配和需求池协作时识别用户。">
          <div className="form-grid">
            <Field label="邮箱" error={form.formState.errors.email?.message}><Input {...form.register("email")} /></Field>
            <Field label="手机 / 微信"><Input {...form.register("phone")} /></Field>
            <Field label="GitHub 用户名"><Input {...form.register("githubUsername")} /></Field>
            <Field label="技术方向"><Input {...form.register("skillDirection")} placeholder="前端 / 后端 / AI / 测试 / 部署" /></Field>
            <Field label="技术水平"><Input {...form.register("skillLevel")} placeholder="初级 / 中级 / 高级" /></Field>
          </div>
        </FormSection>

        <FormSection title="备注" description="记录账号来源、协作信息或其他补充说明。">
          <Field label="备注"><Textarea {...form.register("remark")} /></Field>
        </FormSection>

        {mutation.error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">创建失败，请检查账号是否重复。</div> : null}

        <div className="flex justify-end rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <Button type="submit" disabled={mutation.isPending}><Save size={16} />保存</Button>
        </div>
      </form>
    </>
  );
}
