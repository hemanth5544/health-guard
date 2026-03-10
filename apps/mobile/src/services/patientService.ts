import { http } from "./http";
import type { ApiResponse, PatientRecord } from "@healthguard/shared-types";

export async function getProfile() {
  const res = await http.get<ApiResponse<any>>("/api/patient/profile");
  return res.data;
}

export async function getVitals(params?: { userId?: string }) {
  const res = await http.get<ApiResponse<PatientRecord | null>>("/api/patient/vitals", {
    params
  });
  return res.data;
}

export async function updateVitals(payload: Partial<PatientRecord>, params?: { userId?: string }) {
  const res = await http.put<ApiResponse<PatientRecord>>("/api/patient/vitals", payload, { params });
  return res.data;
}

export async function updateDiagnosis(payload: { diagnosis: string }, params?: { userId?: string }) {
  const res = await http.put<ApiResponse<PatientRecord>>("/api/patient/diagnosis", payload, { params });
  return res.data;
}

