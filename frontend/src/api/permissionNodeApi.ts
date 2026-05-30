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

export async function getPermissionTree() {
  const response = await http.get<ListResponse<PermissionNode>>("/permission-nodes/tree");
  return response.data;
}

export async function createPermissionNode(data: PermissionNodeInput) {
  const response = await http.post<PermissionNode>("/permission-nodes", data);
  return response.data;
}
