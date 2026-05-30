import type { ListResponse, Task } from "../types";
import { http } from "./http";

export type TaskInput = Record<string, unknown> & { projectId: number; title: string };

export async function getTasks(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Task>>("/tasks", { params });
  return response.data;
}

export async function getTask(id: string | number) {
  const response = await http.get<Task>(`/tasks/${id}`);
  return response.data;
}

export async function createTask(data: TaskInput) {
  const response = await http.post<Task>("/tasks", data);
  return response.data;
}

export async function updateTask(id: string | number, data: Record<string, unknown>) {
  const response = await http.put<Task>(`/tasks/${id}`, data);
  return response.data;
}

export async function updateTaskProgress(id: string | number, data: { progress: number; currentIssues?: string }) {
  const response = await http.patch<Task>(`/tasks/${id}/progress`, data);
  return response.data;
}

export async function updateTaskStatus(id: string | number, data: { status: string; description?: string }) {
  const response = await http.patch<Task>(`/tasks/${id}/status`, data);
  return response.data;
}

export async function submitTask(id: string | number, data: { prUrl?: string; submissionNote?: string }) {
  const response = await http.patch<Task>(`/tasks/${id}/submit`, data);
  return response.data;
}
