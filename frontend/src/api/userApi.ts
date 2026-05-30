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

export async function getUsers(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<User>>("/users", { params });
  return response.data;
}

export async function createUser(data: UserInput) {
  const response = await http.post<User>("/users", data);
  return response.data;
}

export async function getUserRoles(userId: string | number) {
  const response = await http.get<{ userId: number; roleCodes: string[] }>(`/users/${userId}/roles`);
  return response.data;
}

export async function updateUserRoles(userId: string | number, roleCodes: string[]) {
  const response = await http.put<{ userId: number; roleCodes: string[] }>(`/users/${userId}/roles`, { roleCodes });
  return response.data;
}
