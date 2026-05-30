import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1"
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("project-tracker-token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && window.location.pathname !== "/login") {
      localStorage.removeItem("project-tracker-token");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error: unknown, fallback = "请求失败，请稍后重试") {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
