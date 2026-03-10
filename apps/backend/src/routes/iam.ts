import { Router } from "express";
import { Role, Severity } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { rbacMiddleware } from "../middleware/rbacMiddleware.js";
import { evaluateIamControls, simulateAttacks } from "@healthguard/iam-evaluator";
import { getClientIp } from "../security/request.js";
import { writeAuditLog } from "../security/audit.js";

export const iamRouter = Router();

iamRouter.use(authMiddleware);

iamRouter.get("/audit-logs", rbacMiddleware([Role.DOCTOR]), async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 20
  });
  return res.json({ success: true, message: "OK", data: logs });
});

iamRouter.get("/intrusion-attempts", rbacMiddleware([Role.DOCTOR]), async (req, res) => {
  const attempts = await prisma.intrusionAttempt.findMany({
    orderBy: { timestamp: "desc" },
    take: 50
  });
  return res.json({ success: true, message: "OK", data: attempts });
});

iamRouter.get("/evaluate", async (req, res) => {
  const ar = req as AuthedRequest;
  const ipAddress = getClientIp(req);
  const result = await evaluateIamControls(prisma);
  await writeAuditLog({
    prisma,
    userId: ar.user.id,
    action: "IAM_EVALUATE",
    resource: "/api/iam/evaluate",
    ipAddress,
    statusCode: 200,
    severity: Severity.INFO,
    details: { complianceScore: result.complianceScore, riskScore: result.riskScore }
  });
  return res.json({ success: true, message: "OK", data: result });
});

iamRouter.get("/session-status", rbacMiddleware([Role.DOCTOR]), async (_req, res) => {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true, role: true } } }
  });
  return res.json({ success: true, message: "OK", data: sessions });
});

iamRouter.post("/simulate-attacks", rbacMiddleware([Role.DOCTOR]), async (req, res) => {
  const ar = req as AuthedRequest;
  const ipAddress = getClientIp(req);
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const report = await simulateAttacks(baseUrl);
  await writeAuditLog({
    prisma,
    userId: ar.user.id,
    action: "SIMULATE_ATTACKS",
    resource: "/api/iam/simulate-attacks",
    ipAddress,
    statusCode: 200,
    severity: Severity.WARNING,
    details: report
  });
  return res.json({ success: true, message: "OK", data: report });
});

