import type { AuditLog, DashboardSummary, ListResponse, Project, StatusCount, Task } from "../types";
import { http } from "./http";

export async function getDashboardSummary() {
  const response = await http.get<DashboardSummary>("/dashboard/summary");
  return response.data;
}

export async function getProjectStatusCounts() {
  const response = await http.get<ListResponse<StatusCount>>("/dashboard/project-status");
  return response.data;
}

export async function getTaskStatusCounts() {
  const response = await http.get<ListResponse<StatusCount>>("/dashboard/task-status");
  return response.data;
}

export async function getRecentProjects() {
  const response = await http.get<ListResponse<Project>>("/dashboard/recent-projects");
  return response.data;
}

export async function getBlockedTasks() {
  const response = await http.get<ListResponse<Task>>("/dashboard/blocked-tasks");
  return response.data;
}

export async function getPendingTasks() {
  const response = await http.get<ListResponse<Task>>("/dashboard/pending-tasks");
  return response.data;
}

export async function getRecentAuditLogs() {
  const response = await http.get<ListResponse<AuditLog>>("/dashboard/recent-audit-logs");
  return response.data;
}
