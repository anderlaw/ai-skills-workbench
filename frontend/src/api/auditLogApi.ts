import type { AuditLog, ListResponse } from "../types";
import { http } from "./http";

export async function getAuditLogs(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<AuditLog>>("/audit-logs", { params });
  return response.data;
}

export async function getAuditLog(id: string | number) {
  const response = await http.get<AuditLog>(`/audit-logs/${id}`);
  return response.data;
}
