import { http } from "../api/http";
import type { LoginResponse, MeResponse } from "./auth.types";

export async function apiLogin(username: string, password: string) {
  const { data } = await http.post<LoginResponse>("/auth/login", {
    username,
    password,
  });
  return data;
}

export async function apiMe() {
  const { data } = await http.get<MeResponse>("/auth/me");
  return data;
}
