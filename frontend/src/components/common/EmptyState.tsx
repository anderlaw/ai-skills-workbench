/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
/**
 * 空状态组件模块，提供列表或区块无数据时的统一展示。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
export function EmptyState({ text = "暂无数据" }: { text?: string }) {
  return <div className="rounded-lg border border-dashed border-line bg-surface-muted p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
