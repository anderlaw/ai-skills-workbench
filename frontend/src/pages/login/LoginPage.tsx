/**
 * 登录页面模块，负责账号密码输入、登录提交和已登录跳转。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import { errorMessage } from "../../api/http";
import { useAuth } from "../../state/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";

/**
 * 业务意义：渲染业务页面并组织数据查询、权限判断和用户交互。
 * 参数：无。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function LoginPage() {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * 业务意义：处理页面交互事件并触发对应业务动作。
   * 参数：`event` 表示调用方传入的业务参数。
   * 返回：无返回值，主要通过状态更新、请求提交或事件副作用完成处理。
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get("username") ?? ""), String(form.get("password") ?? ""));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "登录失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <form onSubmit={handleSubmit} className="w-full rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-12 w-12" />
            <h1 className="text-xl font-semibold text-brand-strong">搭子工坊</h1>
          </div>
          <div className="grid gap-4">
            <Input name="username" placeholder="用户名" required autoComplete="username" />
            <Input name="password" placeholder="密码" type="password" required autoComplete="current-password" />
            {error ? <div className="rounded-lg border border-danger-line bg-danger-muted px-3 py-2 text-sm text-danger">{error}</div> : null}
            <Button type="submit" disabled={submitting || loading}>
              <LogIn size={16} />
              {submitting ? "登录中" : "登录"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
