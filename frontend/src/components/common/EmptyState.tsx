export function EmptyState({ text = "暂无数据" }: { text?: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
