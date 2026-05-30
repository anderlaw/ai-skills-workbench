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

export async function getRoles() {
  const response = await http.get<ListResponse<Role>>("/roles");
  return response.data;
}

export async function createRole(data: RoleCreateInput) {
  const response = await http.post<Role>("/roles", data);
  return response.data;
}

export async function updateRole(roleId: string | number, data: RoleUpdateInput) {
  const response = await http.put<Role>(`/roles/${roleId}`, data);
  return response.data;
}

export async function deleteRole(roleId: string | number) {
  const response = await http.delete<Role>(`/roles/${roleId}`);
  return response.data;
}

export async function updateRolePermissionNodes(roleId: string | number, permissionNodeIds: number[]) {
  const response = await http.put<Role>(`/roles/${roleId}/permission-nodes`, { permissionNodeIds });
  return response.data;
}
