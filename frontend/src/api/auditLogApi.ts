/**
 * 审计日志 API 封装模块，负责审计列表和详情请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { AuditLog, ListResponse } from "../types";
import { http } from "./http";

/**
 * 业务意义：查询审计日志列表。
 * 参数：`params?` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getAuditLogs(params?: Record<string, unknown>) {
  const response = await http.get<ListResponse<AuditLog>>("/audit-logs", { params });
  return response.data;
}

/**
 * 业务意义：查询审计日志详情。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getAuditLog(id: string | number) {
  const response = await http.get<AuditLog>(`/audit-logs/${id}`);
  return response.data;
}
