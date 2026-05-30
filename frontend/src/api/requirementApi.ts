/**
 * 需求 API 封装模块，负责需求编辑、删除和认领请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import type { Requirement } from "../types";
import { http } from "./http";

/**
 * 业务意义：更新需求池中的单条需求。
 * 参数：`id` 表示调用方传入的业务参数；`data` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function updateRequirement(
  id: string | number,
  data: { title?: string; description?: string; priority?: string; remark?: string }
) {
  const response = await http.put<Requirement>(`/requirements/${id}`, data);
  return response.data;
}

/**
 * 业务意义：删除需求池中的单条需求。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：无返回值；请求成功表示需求已被删除。
 */
export async function deleteRequirement(id: string | number) {
  await http.delete(`/requirements/${id}`);
}

/**
 * 业务意义：认领需求池中的单条需求。
 * 参数：`id` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function claimRequirement(id: string | number) {
  const response = await http.post<Requirement>(`/requirements/${id}/claim`);
  return response.data;
}
