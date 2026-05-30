import type { ReactNode } from "react";

export function StatCard({ title, value, icon }: { title: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon ? <span className="rounded-lg bg-teal-50 p-2 text-teal-700">{icon}</span> : null}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
