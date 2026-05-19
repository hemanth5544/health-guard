import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { verifyJwt } from "../security/jwt.js";
import { getClientIp, getUserAgent } from "../security/request.js";
import { writeAuditLog, writeIntrusion } from "../security/audit.js";
import { Severity } from "@prisma/client";

export type AuthedRequest = Request & {
  user: { id: string; email: string; role: string };
  session: { id: string; token: string; ipAddress: string; expiresAt: Date };
};

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const ipAddress = getClientIp(req);
  const userAgent = getUserAgent(req);
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;

  if (!token) {
    await writeAuditLog({
      prisma,
      action: "AUTH_MISSING",
      resource: req.path,
      ipAddress,
      statusCode: 401,
      severity: Severity.WARNING,
      details: { userAgent }
    });
    return res.status(401).json({ success: false, message: "Missing token", data: null });
  }

  const verified = verifyJwt(token);
  if (!verified.ok) {
    await writeIntrusion({
      prisma,
      ipAddress,
      attemptType: "INVALID_TOKEN",
      payload: { error: verified.error, userAgent }
    });
    await writeAuditLog({
      prisma,
      action: "ACCESS_DENIED",
      resource: req.path,
      ipAddress,
      statusCode: 401,
      severity: Severity.WARNING,
      details: { reason: "invalid_jwt", error: verified.error }
    });
    return res.status(401).json({ success: false, message: "Invalid token", data: null });
  }

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) {
    await writeIntrusion({
      prisma,
      ipAddress,
      attemptType: "SESSION_HIJACK",
      payload: { reason: "token_not_in_db", userAgent }
    });
    return res.status(401).json({ success: false, message: "Unknown session", data: null });
  }

  if (session.invalidated) {
    await writeIntrusion({
      prisma,
      ipAddress,
      attemptType: "REPLAY_INVALIDATED_TOKEN",
      payload: { sessionId: session.id, userAgent }
    });
    return res.status(401).json({ success: false, message: "Session invalidated", data: null });
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.update({ where: { id: session.id }, data: { invalidated: true } });
    return res.status(401).json({ success: false, message: "Session expired", data: null });
  }

  // if (session.ipAddress !== ipAddress) {
  //   await writeIntrusion({
  //     prisma,
  //     ipAddress,
  //     attemptType: "IP_MISMATCH",
  //     payload: { sessionId: session.id, expected: session.ipAddress, got: ipAddress, userAgent }
  //   });
  //   return res.status(401).json({ success: false, message: "Session IP mismatch", data: null });
  // }

  const user = await prisma.user.findUnique({ where: { id: verified.claims.sub } });
  if (!user) return res.status(401).json({ success: false, message: "User not found", data: null });

  (req as AuthedRequest).user = { id: user.id, email: user.email, role: user.role };
  (req as AuthedRequest).session = {
    id: session.id,
    token: session.token,
    ipAddress: session.ipAddress,
    expiresAt: session.expiresAt
  };

  next();
}

