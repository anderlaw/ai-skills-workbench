/**
 * 用户账号 API 封装模块，负责账号创建、列表和角色分配请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ListResponse, User } from "../types";
import { http } from "./http";

export type UserInput = {
  username: string;
  password: string;
  displayName: string;
  roleCodes: string[];
  status: string;
  email?: string;
  phone?: string;
  githubUsername?: string;
  skillDirection?: string;
  skillLevel?: string;
  remark?: string;
};

/**
 * 业务意义：查询用户账号列表。
 * 参数：`params?` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getUsers(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<User>>("/users", { params });
  return response.data;
}

/**
 * 业务意义：创建可登录用户账号并分配初始角色。
 * 参数：`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createUser(data: UserInput) {
  const response = await http.post<User>("/users", data);
  return response.data;
}

/**
 * 业务意义：查询指定用户的角色 code 列表。
 * 参数：`userId` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getUserRoles(userId: string | number) {
  const response = await http.get<{ userId: number; roleCodes: string[] }>(`/users/${userId}/roles`);
  return response.data;
}

/**
 * 业务意义：整体替换指定用户的角色。
 * 参数：`userId` 表示调用方传入的业务参数；`roleCodes` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateUserRoles(userId: string | number, roleCodes: string[]) {
  const response = await http.put<{ userId: number; roleCodes: string[] }>(`/users/${userId}/roles`, { roleCodes });
  return response.data;
}
