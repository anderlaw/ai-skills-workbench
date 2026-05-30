/**
 * HTTP 基础封装模块，负责 API baseURL、token 注入和统一错误消息。
 *
 * 本模块注释说明业务边界、主要输入输出和维护约束。
 */
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("dazi-workshop-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("dazi-workshop-token");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

/**
 * 业务意义：把接口错误转换为前端可展示的中文消息。
 * 参数：`error` 表示调用方传入的业务参数；`fallback` 表示调用方传入的业务参数。
 * 返回：返回格式化后的展示文本、字段值或可提交数据。
 */
export function errorMessage(error: unknown, fallback = "请求失败，请稍后重试") {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
