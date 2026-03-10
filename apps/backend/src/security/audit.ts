import type { PrismaClient, Severity } from "@prisma/client";

export async function writeAuditLog(params: {
  prisma: PrismaClient;
  userId?: string;
  action: string;
  resource?: string;
  ipAddress: string;
  statusCode: number;
  severity: Severity;
  details?: unknown;
}) {
  const { prisma, details, ...rest } = params;
  await prisma.auditLog.create({
    data: {
      ...rest,
      details: details as any
    }
  });
}

export async function writeIntrusion(params: {
  prisma: PrismaClient;
  ipAddress: string;
  attemptType: string;
  payload?: unknown;
  blocked?: boolean;
}) {
  const { prisma, payload, blocked = true, ...rest } = params;
  await prisma.intrusionAttempt.create({
    data: {
      ...rest,
      blocked,
      payload: payload as any
    }
  });
}

