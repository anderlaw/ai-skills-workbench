export type ProjectStatus =
  | "PLANNING"
  | "DEVELOPING"
  | "TESTING"
  | "DEPLOYED"
  | "DONE"
  | "PAUSED"
  | "ARCHIVED";

export type MemberStatus = "ACTIVE" | "INACTIVE" | "PAUSED" | "LEFT";
export type ProjectRole =
  | "OWNER"
  | "FRONTEND"
  | "BACKEND"
  | "FULLSTACK"
  | "AI"
  | "TEST"
  | "DEPLOY"
  | "OTHER";
export type ProjectMemberStatus = "ACTIVE" | "LEFT";
export type TaskType = "FRONTEND" | "BACKEND" | "AI" | "DATABASE" | "DEPLOY" | "TEST" | "DOC" | "OTHER";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "SUBMITTED"
  | "REVIEWING"
  | "DONE"
  | "CANCELLED";
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "STATUS_CHANGE"
  | "PROGRESS_CHANGE"
  | "ASSIGN"
  | "SUBMIT"
  | "ARCHIVE"
  | "REMOVE"
  | "CLAIM";
export type TargetType = "PROJECT" | "MEMBER" | "PROJECT_MEMBER" | "TASK" | "USER" | "ROLE" | "REQUIREMENT" | "PERMISSION_NODE";
export type RequirementStatus = "OPEN" | "CLAIMED" | "COMPLETED" | "CANCELLED";

export interface CurrentUserInfo {
  id: number;
  username: string;
  displayName: string;
  status: string;
}

export interface CurrentRole {
  id: number;
  code: string;
  name: string;
}

export interface CurrentMenuNode {
  id: number;
  parentId?: number | null;
  nodeType: "DIRECTORY" | "MENU" | "PERMISSION";
  name: string;
  code: string;
  routePath?: string | null;
  scope?: string | null;
  icon?: string | null;
  sortOrder: number;
  children: CurrentMenuNode[];
}

export interface CurrentUserContext {
  user: CurrentUserInfo;
  roles: CurrentRole[];
  menuTree: CurrentMenuNode[];
  permissionScopes: Record<string, string[]>;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface PermissionNode {
  id: number;
  parentId?: number | null;
  nodeType: "DIRECTORY" | "MENU" | "PERMISSION";
  name: string;
  code: string;
  routePath?: string | null;
  operationLevel: "GET" | "POST" | "BOTH" | string;
  sortOrder: number;
  icon?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  children?: PermissionNode[];
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  status: string;
  permissionNodeIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  projectType?: string | null;
  techStack: string[];
  featurePoints?: string | null;
  githubUrl?: string | null;
  deployUrl?: string | null;
  status: ProjectStatus;
  progress: number;
  currentProgress?: string | null;
  currentIssues?: string | null;
  nextSteps?: string | null;
  startDate?: string | null;
  expectedFinishDate?: string | null;
  actualFinishDate?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: number;
  name: string;
  contact?: string | null;
  githubUsername?: string | null;
  email?: string | null;
  skillDirection?: string | null;
  skillLevel?: string | null;
  status: MemberStatus;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  memberId: number;
  role: ProjectRole;
  responsibility?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
  status: ProjectMemberStatus;
  createdAt: string;
  updatedAt: string;
  member?: Member | null;
  project?: Project | null;
}

export interface User {
  id: number;
  username: string;
  displayName: string;
  status: string;
  email?: string | null;
  phone?: string | null;
  githubUsername?: string | null;
  skillDirection?: string | null;
  skillLevel?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUser {
  id: number;
  projectId: number;
  userId: number;
  responsibility?: string | null;
  status: "ACTIVE" | "REMOVED";
  assignedAt?: string | null;
  removedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Requirement {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  status: RequirementStatus;
  priority: TaskPriority;
  createdByUserId: number;
  claimedByUserId?: number | null;
  claimedAt?: string | null;
  completedAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  assigneeId?: number | null;
  title: string;
  description?: string | null;
  taskType: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  githubIssueUrl?: string | null;
  prUrl?: string | null;
  submissionNote?: string | null;
  currentIssues?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project | null;
  assignee?: Member | null;
}

export interface AuditLog {
  id: number;
  actorId?: number | null;
  actorName: string;
  action: AuditAction;
  targetType: TargetType;
  targetId?: number | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
  description?: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  projectTotal: number;
  developingProjectTotal: number;
  deployedProjectTotal: number;
  doneProjectTotal: number;
  pausedProjectTotal: number;
  memberTotal: number;
  activeMemberTotal: number;
  taskTotal: number;
  inProgressTaskTotal: number;
  blockedTaskTotal: number;
  doneTaskTotal: number;
  pendingSubmissionTaskTotal: number;
  submittedTaskTotal: number;
  averageProjectProgress: number;
}

export interface StatusCount {
  status: string;
  total: number;
}
