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

export async function login(payload: LoginPayload) {
  const response = await http.post<LoginResult>("/auth/login", payload);
  return response.data;
}

export async function getCurrentUser() {
  const response = await http.get<CurrentUserContext>("/auth/me");
  return response.data;
}
