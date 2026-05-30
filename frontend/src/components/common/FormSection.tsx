/**
 * 表单分组组件模块，统一表单区块标题、说明和布局。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader } from "../ui/Card";

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function FormSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="font-semibold">{title}</div>
        {description ? <div className="mt-1 text-sm text-muted-foreground">{description}</div> : null}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}
