/**
 * 认证 API 封装模块，负责登录和当前用户信息请求。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import { http } from "./http";
import type { CurrentUserContext } from "../types";

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  displayName: string;
}

/**
 * 业务意义：提交账号密码并获取登录 token。
 * 参数：`payload` 表示调用方传入的业务参数。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function login(payload: LoginPayload) {
  const response = await http.post<LoginResult>("/auth/login", payload);
  return response.data;
}

/**
 * 业务意义：查询当前登录用户、角色、菜单树和权限 scope。
 * 参数：无。
 * 返回：返回转换后的业务结果或供调用方继续使用的数据。
 */
export async function getCurrentUser() {
  const response = await http.get<CurrentUserContext>("/auth/me");
  return response.data;
}
