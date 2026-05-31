/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
/**
 * 进度条组件模块，展示项目或任务进度百分比。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-accent-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${safeValue}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-content-muted">{safeValue}%</span>
    </div>
  );
}
