import type { Requirement } from "../types";
import { http } from "./http";

export async function updateRequirement(
  id: string | number,
  data: { title?: string; description?: string; priority?: string; remark?: string }
) {
  const response = await http.put<Requirement>(`/requirements/${id}`, data);
  return response.data;
}

export async function deleteRequirement(id: string | number) {
  await http.delete(`/requirements/${id}`);
}

export async function claimRequirement(id: string | number) {
  const response = await http.post<Requirement>(`/requirements/${id}/claim`);
  return response.data;
}
