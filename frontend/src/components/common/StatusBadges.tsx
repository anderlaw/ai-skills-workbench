import type { MemberStatus, ProjectStatus, RequirementStatus, TaskPriority, TaskStatus } from "../../types";
import { memberStatusLabels, priorityLabels, projectStatusLabels, requirementStatusLabels, taskStatusLabels } from "../../lib/constants";
import { Badge } from "./Badge";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const tone = status === "DONE" || status === "DEPLOYED" ? "green" : status === "PAUSED" || status === "ARCHIVED" ? "amber" : "teal";
  return <Badge tone={tone}>{projectStatusLabels[status]}</Badge>;
}

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const tone = status === "ACTIVE" ? "green" : status === "LEFT" ? "red" : "amber";
  return <Badge tone={tone}>{memberStatusLabels[status]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone = status === "DONE" ? "green" : status === "BLOCKED" || status === "CANCELLED" ? "red" : status === "SUBMITTED" ? "blue" : "amber";
  return <Badge tone={tone}>{taskStatusLabels[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const tone = priority === "HIGH" ? "red" : priority === "MEDIUM" ? "amber" : "slate";
  return <Badge tone={tone}>{priorityLabels[priority]}</Badge>;
}

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  const tone = status === "OPEN" ? "teal" : status === "CLAIMED" ? "blue" : status === "COMPLETED" ? "green" : "slate";
  return <Badge tone={tone}>{requirementStatusLabels[status]}</Badge>;
}
