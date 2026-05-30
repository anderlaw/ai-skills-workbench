import { clsx } from "clsx";
import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, children, error }: { label: string; children: ReactNode; error?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={clsx(
        "focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-foreground shadow-sm transition placeholder:text-slate-400 hover:border-slate-300",
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
        "focus-ring min-h-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-foreground shadow-sm transition placeholder:text-slate-400 hover:border-slate-300",
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
        "focus-ring h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-foreground shadow-sm transition hover:border-slate-300",
        props.className
      )}
    />
  );
});
