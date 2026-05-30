/**
 * 权限节点 API 封装模块，负责权限树和节点 CRUD 请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { ListResponse, PermissionNode } from "../types";
import { http } from "./http";

export type PermissionNodeInput = {
  parentId?: number | null;
  nodeType: "DIRECTORY" | "MENU" | "PERMISSION";
  name: string;
  code: string;
  routePath?: string | null;
  operationLevel?: string;
  sortOrder?: number;
  icon?: string | null;
  status?: string;
};

export type PermissionNodeUpdateInput = {
  parentId?: number | null;
  name: string;
  routePath?: string | null;
  operationLevel?: string;
  sortOrder?: number;
  icon?: string | null;
  status?: string;
};

/**
 * 业务意义：查询权限节点树。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getPermissionTree() {
  const response = await http.get<ListResponse<PermissionNode>>("/permission-nodes/tree");
  return response.data;
}

/**
 * 业务意义：创建权限节点。
 * 参数：`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function createPermissionNode(data: PermissionNodeInput) {
  const response = await http.post<PermissionNode>("/permission-nodes", data);
  return response.data;
}

/**
 * 业务意义：更新权限节点配置。
 * 参数：`nodeId` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updatePermissionNode(nodeId: string | number, data: PermissionNodeUpdateInput) {
  const response = await http.put<PermissionNode>(`/permission-nodes/${nodeId}`, data);
  return response.data;
}

/**
 * 业务意义：软删除权限节点。
 * 参数：`nodeId` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function deletePermissionNode(nodeId: string | number) {
  const response = await http.delete<PermissionNode>(`/permission-nodes/${nodeId}`);
  return response.data;
}
