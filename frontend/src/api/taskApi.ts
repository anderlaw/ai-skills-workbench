/**
 * 任务 API 封装模块，负责任务 CRUD、进度、状态和提交请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ListResponse, Task } from "../types";
import { http } from "./http";

export type TaskInput = Record<string, unknown> & { projectId: number; title: string };

/**
 * 业务意义：查询任务列表并返回分页数据。
 * 参数：`params?` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getTasks(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Task>>("/tasks", { params });
  return response.data;
}

/**
 * 业务意义：查询任务详情。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getTask(id: string | number) {
  const response = await http.get<Task>(`/tasks/${id}`);
  return response.data;
}

/**
 * 业务意义：创建任务并可指定项目和负责人。
 * 参数：`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createTask(data: TaskInput) {
  const response = await http.post<Task>("/tasks", data);
  return response.data;
}

/**
 * 业务意义：更新任务基础信息。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateTask(id: string | number, data: Record<string, unknown>) {
  const response = await http.put<Task>(`/tasks/${id}`, data);
  return response.data;
}

/**
 * 业务意义：更新任务进度和当前问题。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateTaskProgress(id: string | number, data: { progress: number; currentIssues?: string }) {
  const response = await http.patch<Task>(`/tasks/${id}/progress`, data);
  return response.data;
}

/**
 * 业务意义：更新任务状态。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateTaskStatus(id: string | number, data: { status: string; description?: string }) {
  const response = await http.patch<Task>(`/tasks/${id}/status`, data);
  return response.data;
}

/**
 * 业务意义：提交任务 PR 和说明。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function submitTask(id: string | number, data: { prUrl?: string; submissionNote?: string }) {
  const response = await http.patch<Task>(`/tasks/${id}/submit`, data);
  return response.data;
}
