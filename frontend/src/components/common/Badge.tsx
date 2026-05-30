/**
 * 徽标组件模块，提供统一颜色语义的状态标签。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { clsx } from "clsx";

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" | "teal" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700",
        tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "red" && "border-red-200 bg-red-50 text-red-700",
        tone === "blue" && "border-blue-200 bg-blue-50 text-blue-700",
        tone === "teal" && "border-teal-200 bg-teal-50 text-teal-700"
      )}
    >
      {children}
    </span>
  );
}
