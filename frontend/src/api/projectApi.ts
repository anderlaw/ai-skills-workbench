/**
 * 项目 API 封装模块，负责项目、项目人员和需求池请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ListResponse, Project, ProjectMember, Requirement } from "../types";
import { http } from "./http";

export type ProjectInput = Record<string, unknown> & { name: string; techStack?: string[] };

/**
 * 业务意义：查询项目列表并返回分页数据。
 * 参数：`params?` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getProjects(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Project>>("/projects", { params });
  return response.data;
}

/**
 * 业务意义：查询单个项目详情。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getProject(id: string | number) {
  const response = await http.get<Project>(`/projects/${id}`);
  return response.data;
}

/**
 * 业务意义：创建项目基础信息。
 * 参数：`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createProject(data: ProjectInput) {
  const response = await http.post<Project>("/projects", data);
  return response.data;
}

/**
 * 业务意义：更新项目基础信息。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateProject(id: string | number, data: Record<string, unknown>) {
  const response = await http.put<Project>(`/projects/${id}`, data);
  return response.data;
}

/**
 * 业务意义：更新项目进度和当前进展说明。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateProjectProgress(
  id: string | number,
  data: { progress: number; currentProgress?: string; currentIssues?: string; nextSteps?: string }
) {
  const response = await http.patch<Project>(`/projects/${id}/progress`, data);
  return response.data;
}

/**
 * 业务意义：更新项目状态。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateProjectStatus(id: string | number, data: { status: string; description?: string }) {
  const response = await http.patch<Project>(`/projects/${id}/status`, data);
  return response.data;
}

/**
 * 业务意义：查询项目下的项目人员关系。
 * 参数：`projectId` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getProjectMembers(projectId: string | number) {
  const response = await http.get<ListResponse<ProjectMember>>(`/projects/${projectId}/members`);
  return response.data;
}

/**
 * 业务意义：把项目人员分配到指定项目。
 * 参数：`projectId` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function addProjectMember(
  projectId: string | number,
  data: { memberId: number; role: string; responsibility?: string; status?: string }
) {
  const response = await http.post<ProjectMember>(`/projects/${projectId}/members`, data);
  return response.data;
}

/**
 * 业务意义：从项目中移出指定项目人员。
 * 参数：`projectId` 表示调用方传入的业务参数；`memberId` 表示调用方传入的业务参数。
 * 返回：无返回值；请求成功表示后端已将关系标记为移出。
 */
export async function removeProjectMember(projectId: string | number, memberId: string | number) {
  await http.delete(`/projects/${projectId}/members/${memberId}`);
}

/**
 * 业务意义：查询指定项目的需求池列表。
 * 参数：`projectId` 表示调用方传入的业务参数；`params?` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getProjectRequirements(projectId: string | number, params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Requirement>>(`/projects/${projectId}/requirements`, { params });
  return response.data;
}

/**
 * 业务意义：在指定项目需求池新增需求。
 * 参数：`projectId` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createProjectRequirement(
  projectId: string | number,
  data: { title: string; description?: string; priority?: string; remark?: string }
) {
  const response = await http.post<Requirement>(`/projects/${projectId}/requirements`, data);
  return response.data;
}
