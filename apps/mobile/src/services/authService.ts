import { http } from "./http";
import type { ApiResponse, Role } from "@healthguard/shared-types";

export async function register(payload: {
  email: string;
  password: string;
  role: Role;
  aadhaar?: string;
}) {
  const res = await http.post<ApiResponse<{ id: string; email: string; role: Role }>>(
    "/api/auth/register",
    payload
  );
  return res.data;
}

export async function login(payload: { email: string; password: string }) {
  const res = await http.post<
    ApiResponse<{
      token: string;
      user: { id: string; email: string; role: Role; aadhaarLast4?: string | null };
    }>
  >("/api/auth/login", payload);
  return res.data;
}

export async function logout() {
  const res = await http.post<ApiResponse<{ invalidated: boolean }>>("/api/auth/logout");
  return res.data;
}

export async function me() {
  const res = await http.get<ApiResponse<any>>("/api/auth/me");
  return res.data;
}

