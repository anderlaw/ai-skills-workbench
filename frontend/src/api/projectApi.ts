import type { ListResponse, Project, ProjectMember, Requirement } from "../types";
import { http } from "./http";

export type ProjectInput = Record<string, unknown> & { name: string; techStack?: string[] };

export async function getProjects(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Project>>("/projects", { params });
  return response.data;
}

export async function getProject(id: string | number) {
  const response = await http.get<Project>(`/projects/${id}`);
  return response.data;
}

export async function createProject(data: ProjectInput) {
  const response = await http.post<Project>("/projects", data);
  return response.data;
}

export async function updateProject(id: string | number, data: Record<string, unknown>) {
  const response = await http.put<Project>(`/projects/${id}`, data);
  return response.data;
}

export async function updateProjectProgress(id: string | number, data: { progress: number; currentProgress?: string }) {
  const response = await http.patch<Project>(`/projects/${id}/progress`, data);
  return response.data;
}

export async function updateProjectStatus(id: string | number, data: { status: string; description?: string }) {
  const response = await http.patch<Project>(`/projects/${id}/status`, data);
  return response.data;
}

export async function getProjectMembers(projectId: string | number) {
  const response = await http.get<ListResponse<ProjectMember>>(`/projects/${projectId}/members`);
  return response.data;
}

export async function addProjectMember(
  projectId: string | number,
  data: { memberId: number; role: string; responsibility?: string; status?: string }
) {
  const response = await http.post<ProjectMember>(`/projects/${projectId}/members`, data);
  return response.data;
}

export async function removeProjectMember(projectId: string | number, memberId: string | number) {
  await http.delete(`/projects/${projectId}/members/${memberId}`);
}

export async function getProjectRequirements(projectId: string | number, params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Requirement>>(`/projects/${projectId}/requirements`, { params });
  return response.data;
}

export async function createProjectRequirement(
  projectId: string | number,
  data: { title: string; description?: string; priority?: string; remark?: string }
) {
  const response = await http.post<Requirement>(`/projects/${projectId}/requirements`, data);
  return response.data;
}
