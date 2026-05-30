import type { ListResponse, Role } from "../types";
import { http } from "./http";

export async function getRoles() {
  const response = await http.get<ListResponse<Role>>("/roles");
  return response.data;
}

export async function updateRolePermissionNodes(roleId: string | number, permissionNodeIds: number[]) {
  const response = await http.put<Role>(`/roles/${roleId}/permission-nodes`, { permissionNodeIds });
  return response.data;
}
