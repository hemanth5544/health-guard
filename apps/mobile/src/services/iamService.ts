import { http } from "./http";
import type { ApiResponse, AttackReport, AuditLog, IAMControlResult, IntrusionAttempt } from "@healthguard/shared-types";

export async function evaluate() {
  const res = await http.get<ApiResponse<IAMControlResult>>("/api/iam/evaluate");
  return res.data;
}

export async function getAuditLogs() {
  const res = await http.get<ApiResponse<AuditLog[]>>("/api/iam/audit-logs");
  return res.data;
}

export async function getIntrusionAttempts() {
  const res = await http.get<ApiResponse<IntrusionAttempt[]>>("/api/iam/intrusion-attempts");
  return res.data;
}

export async function simulateAttacks() {
  const res = await http.post<ApiResponse<AttackReport>>("/api/iam/simulate-attacks");
  return res.data;
}

