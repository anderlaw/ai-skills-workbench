/**
 * 项目人员 API 封装模块，负责项目人员档案和参与项目请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ListResponse, Member, ProjectMember } from "../types";
import { http } from "./http";

export type MemberInput = Record<string, unknown> & { name: string };

/**
 * 业务意义：查询项目人员档案列表。
 * 参数：`params?` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getMembers(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Member>>("/members", { params });
  return response.data;
}

/**
 * 业务意义：查询项目人员档案详情。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getMember(id: string | number) {
  const response = await http.get<Member>(`/members/${id}`);
  return response.data;
}

/**
 * 业务意义：创建项目人员档案并绑定用户账号。
 * 参数：`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createMember(data: MemberInput) {
  const response = await http.post<Member>("/members", data);
  return response.data;
}

/**
 * 业务意义：更新项目人员档案。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateMember(id: string | number, data: Record<string, unknown>) {
  const response = await http.put<Member>(`/members/${id}`, data);
  return response.data;
}

/**
 * 业务意义：更新项目人员状态。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateMemberStatus(id: string | number, data: { status: string; description?: string }) {
  const response = await http.patch<Member>(`/members/${id}/status`, data);
  return response.data;
}

/**
 * 业务意义：查询项目人员参与过的项目关系。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getMemberProjects(id: string | number) {
  const response = await http.get<ListResponse<ProjectMember>>(`/members/${id}/projects`);
  return response.data;
}
