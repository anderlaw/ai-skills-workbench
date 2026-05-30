/**
 * 按钮基础组件模块，统一按钮 variant、尺寸和交互样式。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "focus-ring inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "border-teal-700 bg-teal-700 text-primary-foreground hover:bg-teal-800",
        variant === "secondary" && "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-600 shadow-none hover:bg-slate-100",
        variant === "danger" && "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
        className
      )}
      {...props}
    />
  );
}
