import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../db/prisma.js";
import { Role, Severity } from "@prisma/client";
import { encryptAadhaar } from "../security/crypto.js";
import { getClientIp, getUserAgent } from "../security/request.js";
import { signJwt } from "../security/jwt.js";
import { authMiddleware, type AuthedRequest } from "../middleware/authMiddleware.js";
import { rateLimitLogin } from "../middleware/rateLimitMiddleware.js";
import { writeAuditLog, writeIntrusion } from "../security/audit.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role).default(Role.PATIENT),
  aadhaar: z.string().min(8).max(16).optional()
});

authRouter.post("/register", async (req, res) => {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    await writeAuditLog({
      prisma,
      action: "REGISTER_FAILED",
      resource: "/api/auth/register",
      ipAddress,
      statusCode: 400,
      severity: Severity.WARNING,
      details: parsed.error.flatten()
    });
    return res.status(400).json({ success: false, message: "Invalid payload", data: null });
  }

  const { email, password, role, aadhaar } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const aadhaarLast4 = aadhaar ? aadhaar.slice(-4) : null;
  const aadhaarEnc = aadhaar ? encryptAadhaar(aadhaar) : null;

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, role, aadhaarLast4, aadhaarEnc }
    });
    await writeAuditLog({
      prisma,
      userId: user.id,
      action: "REGISTER",
      resource: "/api/auth/register",
      ipAddress,
      statusCode: 201,
      severity: Severity.INFO,
      details: { userAgent, role }
    });
    return res.status(201).json({
      success: true,
      message: "Registered",
      data: { id: user.id, email: user.email, role: user.role }
    });
  } catch (e: any) {
    await writeAuditLog({
      prisma,
      action: "REGISTER_FAILED",
      resource: "/api/auth/register",
      ipAddress,
      statusCode: 409,
      severity: Severity.WARNING,
      details: { error: e?.message ?? "conflict" }
    });
    return res.status(409).json({ success: false, message: "User exists", data: null });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post(
  "/login",
  rateLimitLogin({ maxAttempts: 5, windowMs: 15 * 60 * 1000 }),
  async (req, res) => {
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid payload", data: null });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      await writeIntrusion({
        prisma,
        ipAddress,
        attemptType: "INVALID_CREDENTIALS",
        payload: { email: parsed.data.email }
      });
      await writeAuditLog({
        prisma,
        action: "LOGIN_FAILED",
        resource: "/api/auth/login",
        ipAddress,
        statusCode: 401,
        severity: Severity.WARNING,
        details: { reason: "no_user" }
      });
      return res.status(401).json({ success: false, message: "Invalid credentials", data: null });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      await writeIntrusion({
        prisma,
        ipAddress,
        attemptType: "INVALID_CREDENTIALS",
        payload: { email: user.email }
      });
      await writeAuditLog({
        prisma,
        userId: user.id,
        action: "LOGIN_FAILED",
        resource: "/api/auth/login",
        ipAddress,
        statusCode: 401,
        severity: Severity.WARNING,
        details: { reason: "bad_password" }
      });
      return res.status(401).json({ success: false, message: "Invalid credentials", data: null });
    }

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: "pending",
        ipAddress,
        userAgent,
        expiresAt
      }
    });

    const token = signJwt(
      { sub: user.id, email: user.email, role: user.role, sid: session.id },
      "2h"
    );
    await prisma.session.update({ where: { id: session.id }, data: { token } });

    await writeAuditLog({
      prisma,
      userId: user.id,
      action: "LOGIN",
      resource: "/api/auth/login",
      ipAddress,
      statusCode: 200,
      severity: Severity.INFO,
      details: { userAgent, sessionId: session.id }
    });

    return res.json({
      success: true,
      message: "Logged in",
      data: {
        token,
        user: { id: user.id, email: user.email, role: user.role, aadhaarLast4: user.aadhaarLast4 }
      }
    });
  }
);

authRouter.post("/logout", authMiddleware, async (req, res) => {
  const ipAddress = getClientIp(req);
  const ar = req as AuthedRequest;
  await prisma.session.update({
    where: { id: ar.session.id },
    data: { invalidated: true }
  });
  await writeAuditLog({
    prisma,
    userId: ar.user.id,
    action: "LOGOUT",
    resource: "/api/auth/logout",
    ipAddress,
    statusCode: 200,
    severity: Severity.INFO,
    details: { sessionId: ar.session.id }
  });
  return res.json({ success: true, message: "Logged out", data: { invalidated: true } });
});

authRouter.get("/me", authMiddleware, async (req, res) => {
  const ar = req as AuthedRequest;
  return res.json({
    success: true,
    message: "OK",
    data: {
      id: ar.user.id,
      email: ar.user.email,
      role: ar.user.role,
      session: { id: ar.session.id, expiresAt: ar.session.expiresAt, invalidated: false }
    }
  });
});

