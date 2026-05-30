import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { FolderKanban, LogIn } from "lucide-react";

import { errorMessage } from "../../api/http";
import { useAuth } from "../../state/auth";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";

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
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <form onSubmit={handleSubmit} className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-500 text-slate-950">
              <FolderKanban size={22} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-950">项目进度跟踪</h1>
              <p className="text-sm text-slate-500">登录后进入工作台</p>
            </div>
          </div>
          <div className="grid gap-4">
            <Input name="username" placeholder="用户名" required autoComplete="username" />
            <Input name="password" placeholder="密码" type="password" required autoComplete="current-password" />
            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
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
