import type { ListResponse, Member, ProjectMember } from "../types";
import { http } from "./http";

export type MemberInput = Record<string, unknown> & { name: string };

export async function getMembers(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<Member>>("/members", { params });
  return response.data;
}

export async function getMember(id: string | number) {
  const response = await http.get<Member>(`/members/${id}`);
  return response.data;
}

export async function createMember(data: MemberInput) {
  const response = await http.post<Member>("/members", data);
  return response.data;
}

export async function updateMember(id: string | number, data: Record<string, unknown>) {
  const response = await http.put<Member>(`/members/${id}`, data);
  return response.data;
}

export async function updateMemberStatus(id: string | number, data: { status: string; description?: string }) {
  const response = await http.patch<Member>(`/members/${id}/status`, data);
  return response.data;
}

export async function getMemberProjects(id: string | number) {
  const response = await http.get<ListResponse<ProjectMember>>(`/members/${id}/projects`);
  return response.data;
}
