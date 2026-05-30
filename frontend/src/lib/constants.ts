import type { MemberStatus, ProjectRole, ProjectStatus, RequirementStatus, TaskPriority, TaskStatus, TaskType } from "../types";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  PLANNING: "规划中",
  DEVELOPING: "开发中",
  TESTING: "测试中",
  DEPLOYED: "已发布",
  DONE: "完成",
  PAUSED: "暂停",
  ARCHIVED: "归档"
};

export const memberStatusLabels: Record<MemberStatus, string> = {
  ACTIVE: "活跃",
  INACTIVE: "不活跃",
  PAUSED: "暂停参与",
  LEFT: "已退出"
};

export const roleLabels: Record<ProjectRole, string> = {
  OWNER: "负责人",
  FRONTEND: "前端",
  BACKEND: "后端",
  FULLSTACK: "全栈",
  AI: "AI 开发",
  TEST: "测试",
  DEPLOY: "部署",
  OTHER: "其他"
};

export const taskTypeLabels: Record<TaskType, string> = {
  FRONTEND: "前端",
  BACKEND: "后端",
  AI: "AI 功能",
  DATABASE: "数据库",
  DEPLOY: "部署",
  TEST: "测试",
  DOC: "文档",
  OTHER: "其他"
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  TODO: "待处理",
  IN_PROGRESS: "进行中",
  BLOCKED: "阻塞",
  SUBMITTED: "已提交",
  REVIEWING: "检查中",
  DONE: "完成",
  CANCELLED: "取消"
};

export const requirementStatusLabels: Record<RequirementStatus, string> = {
  OPEN: "待认领",
  CLAIMED: "已认领",
  COMPLETED: "已完成",
  CANCELLED: "已取消"
};

export const projectStatusOptions = Object.entries(projectStatusLabels);
export const memberStatusOptions = Object.entries(memberStatusLabels);
export const roleOptions = Object.entries(roleLabels);
export const taskTypeOptions = Object.entries(taskTypeLabels);
export const priorityOptions = Object.entries(priorityLabels);
export const taskStatusOptions = Object.entries(taskStatusLabels);
export const requirementStatusOptions = Object.entries(requirementStatusLabels);
