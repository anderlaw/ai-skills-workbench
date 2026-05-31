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
        tone === "slate" && "border-line bg-surface-muted text-content",
        tone === "green" && "border-brand-muted bg-brand-muted text-brand",
        tone === "amber" && "border-accent-muted bg-accent-muted text-accent-strong",
        tone === "red" && "border-danger-line bg-danger-muted text-danger",
        tone === "blue" && "border-info-line bg-info-muted text-info",
        tone === "teal" && "border-accent-muted bg-accent-muted text-accent-strong"
      )}
    >
      {children}
    </span>
  );
}
