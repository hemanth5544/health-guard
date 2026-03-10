import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { getClientIp } from "../security/request.js";
import { writeAuditLog, writeIntrusion } from "../security/audit.js";
import { Severity } from "@prisma/client";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimitLogin(params: { maxAttempts: number; windowMs: number }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const bucket = buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + params.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > params.maxAttempts) {
      await writeIntrusion({
        prisma,
        ipAddress: ip,
        attemptType: "BRUTE_FORCE",
        payload: { count: bucket.count, windowMs: params.windowMs }
      });
      await writeAuditLog({
        prisma,
        action: "LOGIN_RATE_LIMIT",
        resource: "/api/auth/login",
        ipAddress: ip,
        statusCode: 429,
        severity: Severity.WARNING,
        details: { count: bucket.count }
      });
      return res.status(429).json({ success: false, message: "Too many attempts", data: null });
    }
    next();
  };
}

