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

export async function getPermissionTree() {
  const response = await http.get<ListResponse<PermissionNode>>("/permission-nodes/tree");
  return response.data;
}

export async function createPermissionNode(data: PermissionNodeInput) {
  const response = await http.post<PermissionNode>("/permission-nodes", data);
  return response.data;
}

export async function updatePermissionNode(nodeId: string | number, data: PermissionNodeUpdateInput) {
  const response = await http.put<PermissionNode>(`/permission-nodes/${nodeId}`, data);
  return response.data;
}

export async function deletePermissionNode(nodeId: string | number) {
  const response = await http.delete<PermissionNode>(`/permission-nodes/${nodeId}`);
  return response.data;
}
