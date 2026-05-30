export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-teal-600" style={{ width: `${safeValue}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-slate-500">{safeValue}%</span>
    </div>
  );
}
