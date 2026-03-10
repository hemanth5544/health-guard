export enum Role {
  PATIENT = "PATIENT",
  TECHNICIAN = "TECHNICIAN",
  DOCTOR = "DOCTOR"
}

export enum Severity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL"
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  aadhaarLast4?: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  invalidated: boolean;
}

export interface PatientRecord {
  id: string;
  userId: string;
  bloodPressure?: string | null;
  heartRate?: number | null;
  oxygenLevel?: number | null;
  temperature?: number | null;
  weight?: number | null;
  bloodGroup?: string | null;
  diagnosis?: string | null;
  techNotes?: string | null;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  resource?: string | null;
  ipAddress: string;
  statusCode: number;
  details?: unknown;
  timestamp: string;
  severity: Severity;
}

export interface IntrusionAttempt {
  id: string;
  ipAddress: string;
  attemptType: string;
  payload?: unknown;
  timestamp: string;
  blocked: boolean;
}

export interface ThreatEntry {
  name: string;
  score: number; // 0-20
  evidence?: string;
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  passed: boolean;
  details?: unknown;
}

export interface IntrusionSummary {
  attemptType: string;
  count: number;
  lastSeen: string;
}

export interface IAMControlResult {
  controlId: string;
  controlName: string;
  complianceScore: number; // 0-100
  riskScore: number; // Bayesian weighted
  checksApplied: number;
  checksPassed: number;
  checksFailed: number;
  topThreats: ThreatEntry[];
  findings: Finding[];
  privilegeEscalationAttempts: number;
  sessionInvalidationCompliance: boolean;
  rbacBypassAttempts: number;
  intrusionAttempts: IntrusionSummary[];
}

export interface AttackResultEntry {
  name: string;
  blocked: boolean;
  status?: number;
  details?: string;
}

export interface AttackReport {
  blocked: number;
  succeeded: number;
  results: AttackResultEntry[];
}

