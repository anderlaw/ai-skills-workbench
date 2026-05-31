/**
 * 表单字段基础组件模块，统一 label、错误提示和字段布局。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { clsx } from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-content">{label}</span>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={clsx(
        "focus-ring h-10 rounded-lg border border-line bg-surface px-3 text-sm text-foreground shadow-sm transition placeholder:text-content-muted hover:border-brand-muted",
        props.className
      )}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  props,
  ref
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={clsx(
        "focus-ring min-h-28 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-content-muted hover:border-brand-muted",
        props.className
      )}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  return (
    <select
      {...props}
      ref={ref}
      className={clsx(
        "focus-ring h-10 rounded-lg border border-line bg-surface px-3 text-sm text-foreground shadow-sm transition hover:border-brand-muted",
        props.className
      )}
    />
  );
});
