import { Router } from "express";
import { Role, Severity } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { rbacMiddleware } from "../middleware/rbacMiddleware.js";
import { intrusionDetectionMiddleware } from "../middleware/intrusionDetectionMiddleware.js";
import { getClientIp } from "../security/request.js";
import { writeAuditLog, writeIntrusion } from "../security/audit.js";
import { z } from "zod";

export const patientRouter = Router();

patientRouter.use(authMiddleware);
patientRouter.use(intrusionDetectionMiddleware);

patientRouter.get("/profile", async (req, res) => {
  const ar = req as AuthedRequest;
  const user = await prisma.user.findUnique({ where: { id: ar.user.id } });
  if (!user) return res.status(404).json({ success: false, message: "Not found", data: null });

  return res.json({
    success: true,
    message: "OK",
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      aadhaarMasked: user.aadhaarLast4 ? `XXXX-XXXX-${user.aadhaarLast4}` : null,
      createdAt: user.createdAt
    }
  });
});

patientRouter.get("/vitals", async (req, res) => {
  const ar = req as AuthedRequest;
  const ipAddress = getClientIp(req);
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : null;

  if (requestedUserId && ar.user.role === Role.PATIENT && requestedUserId !== ar.user.id) {
    await writeIntrusion({
      prisma,
      ipAddress,
      attemptType: "HORIZONTAL_ESCALATION",
      payload: { userId: ar.user.id, requestedUserId }
    });
    return res.status(403).json({ success: false, message: "Forbidden", data: null });
  }

  const targetUserId =
    ar.user.role === Role.PATIENT ? ar.user.id : requestedUserId ?? ar.user.id;

  const record = await prisma.patientRecord.findUnique({ where: { userId: targetUserId } });
  await writeAuditLog({
    prisma,
    userId: ar.user.id,
    action: "READ_VITALS",
    resource: "/api/patient/vitals",
    ipAddress,
    statusCode: 200,
    severity: Severity.INFO,
    details: { targetUserId }
  });

  return res.json({ success: true, message: "OK", data: record });
});

const vitalsUpdateSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().int().optional(),
  oxygenLevel: z.number().optional(),
  temperature: z.number().optional(),
  weight: z.number().optional(),
  bloodGroup: z.string().optional(),
  techNotes: z.string().optional()
});

patientRouter.put("/vitals", rbacMiddleware([Role.TECHNICIAN]), async (req, res) => {
  const ar = req as AuthedRequest;
  const ipAddress = getClientIp(req);
  const parsed = vitalsUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid payload", data: null });

  const targetUserId =
    typeof req.query.userId === "string" ? req.query.userId : ar.user.id;

  const record = await prisma.patientRecord.upsert({
    where: { userId: targetUserId },
    update: parsed.data,
    create: { userId: targetUserId, ...parsed.data }
  });

  await writeAuditLog({
    prisma,
    userId: ar.user.id,
    action: "UPDATE_VITALS",
    resource: "/api/patient/vitals",
    ipAddress,
    statusCode: 200,
    severity: Severity.INFO,
    details: { targetUserId }
  });

  return res.json({ success: true, message: "Updated", data: record });
});

const diagnosisSchema = z.object({
  diagnosis: z.string().min(1).optional(),
  doctorNotes: z.string().min(1).optional()
});

patientRouter.put("/diagnosis", rbacMiddleware([Role.DOCTOR]), async (req, res) => {
  const ar = req as AuthedRequest;
  const ipAddress = getClientIp(req);
  const parsed = diagnosisSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid payload", data: null });

  const targetUserId =
    typeof req.query.userId === "string" ? req.query.userId : ar.user.id;

  const record = await prisma.patientRecord.upsert({
    where: { userId: targetUserId },
    update: { diagnosis: parsed.data.diagnosis ?? null },
    create: { userId: targetUserId, diagnosis: parsed.data.diagnosis ?? null }
  });

  await writeAuditLog({
    prisma,
    userId: ar.user.id,
    action: "UPDATE_DIAGNOSIS",
    resource: "/api/patient/diagnosis",
    ipAddress,
    statusCode: 200,
    severity: Severity.INFO,
    details: { targetUserId }
  });

  return res.json({ success: true, message: "Updated", data: record });
});

