/**
 * 看板 API 封装模块，负责统计、近期项目和动态请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { AuditLog, DashboardSummary, ListResponse, Project, StatusCount, Task } from "../types";
import { http } from "./http";

/**
 * 业务意义：查询 Dashboard 顶部统计汇总。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getDashboardSummary() {
  const response = await http.get<DashboardSummary>("/dashboard/summary");
  return response.data;
}

/**
 * 业务意义：查询项目状态分布统计。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getProjectStatusCounts() {
  const response = await http.get<ListResponse<StatusCount>>("/dashboard/project-status");
  return response.data;
}

/**
 * 业务意义：查询任务状态分布统计。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getTaskStatusCounts() {
  const response = await http.get<ListResponse<StatusCount>>("/dashboard/task-status");
  return response.data;
}

/**
 * 业务意义：查询最近更新的项目列表。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getRecentProjects() {
  const response = await http.get<ListResponse<Project>>("/dashboard/recent-projects");
  return response.data;
}

/**
 * 业务意义：查询阻塞任务列表。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getBlockedTasks() {
  const response = await http.get<ListResponse<Task>>("/dashboard/blocked-tasks");
  return response.data;
}

/**
 * 业务意义：查询待提交任务列表。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getPendingTasks() {
  const response = await http.get<ListResponse<Task>>("/dashboard/pending-tasks");
  return response.data;
}

/**
 * 业务意义：查询最近审计日志用于看板动态。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getRecentAuditLogs() {
  const response = await http.get<ListResponse<AuditLog>>("/dashboard/recent-audit-logs");
  return response.data;
}
