/**
 * 业务状态徽标模块，按项目、人员、任务、需求等状态输出中文标签。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { MemberStatus, ProjectStatus, RequirementStatus, TaskPriority, TaskStatus } from "../../types";
import { memberStatusLabels, priorityLabels, projectStatusLabels, requirementStatusLabels, taskStatusLabels } from "../../lib/constants";
import { Badge } from "./Badge";

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const tone = status === "DONE" || status === "DEPLOYED" ? "green" : status === "PAUSED" || status === "ARCHIVED" ? "amber" : "teal";
  return <Badge tone={tone}>{projectStatusLabels[status]}</Badge>;
}

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const tone = status === "ACTIVE" ? "green" : status === "LEFT" ? "red" : "amber";
  return <Badge tone={tone}>{memberStatusLabels[status]}</Badge>;
}

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone = status === "DONE" ? "green" : status === "BLOCKED" || status === "CANCELLED" ? "red" : status === "SUBMITTED" ? "blue" : "amber";
  return <Badge tone={tone}>{taskStatusLabels[status]}</Badge>;
}

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone = priority === "HIGH" ? "red" : priority === "MEDIUM" ? "amber" : "slate";
  return <Badge tone={tone}>{priorityLabels[priority]}</Badge>;
}

/**
 * 业务意义：渲染可复用 UI 组件，统一页面展示和交互体验。
 * 参数：解构 props 参数，包含组件渲染和业务交互所需字段。
 * 返回：返回 React 元素，用于页面或组件渲染。
 */
export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const tone = status === "OPEN" ? "teal" : status === "CLAIMED" ? "blue" : status === "COMPLETED" ? "green" : "slate";
  return <Badge tone={tone}>{requirementStatusLabels[status]}</Badge>;
}
