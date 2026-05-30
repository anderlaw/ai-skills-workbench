/**
 * 统计卡片组件模块，展示看板核心指标。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ReactNode } from "react";

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
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
