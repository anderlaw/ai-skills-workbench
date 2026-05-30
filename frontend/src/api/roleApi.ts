/**
 * 角色 API 封装模块，负责角色 CRUD 和角色授权请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ListResponse, Role } from "../types";
import { http } from "./http";

export type RoleCreateInput = {
  code: string;
  name: string;
  description?: string | null;
  status: string;
};

export type RoleUpdateInput = {
  name: string;
  description?: string | null;
  status: string;
};

/**
 * 业务意义：查询角色列表及其授权节点。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getRoles() {
  const response = await http.get<ListResponse<Role>>("/roles");
  return response.data;
}

/**
 * 业务意义：创建角色。
 * 参数：`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createRole(data: RoleCreateInput) {
  const response = await http.post<Role>("/roles", data);
  return response.data;
}

/**
 * 业务意义：更新角色名称、描述和状态。
 * 参数：`roleId` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateRole(roleId: string | number, data: RoleUpdateInput) {
  const response = await http.put<Role>(`/roles/${roleId}`, data);
  return response.data;
}

/**
 * 业务意义：软删除角色。
 * 参数：`roleId` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function deleteRole(roleId: string | number) {
  const response = await http.delete<Role>(`/roles/${roleId}`);
  return response.data;
}

/**
 * 业务意义：保存角色权限节点授权。
 * 参数：`roleId` 表示调用方传入的业务参数；`permissionNodeIds` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateRolePermissionNodes(roleId: string | number, permissionNodeIds: number[]) {
  const response = await http.put<Role>(`/roles/${roleId}/permission-nodes`, { permissionNodeIds });
  return response.data;
}
