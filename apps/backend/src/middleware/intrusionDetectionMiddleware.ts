import type { NextFunction, Request, Response } from "express";
import type { AuthedRequest } from "./authMiddleware.js";
import { prisma } from "../db/prisma.js";
import { getClientIp } from "../security/request.js";
import { writeIntrusion } from "../security/audit.js";

const SUSPICIOUS_FIELDS = ["role", "permissions", "isAdmin", "userId", "patientId"];

export async function intrusionDetectionMiddleware(req: Request, _res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const user = (req as AuthedRequest).user;

  if (req.body && typeof req.body === "object") {
    for (const field of SUSPICIOUS_FIELDS) {
      if (field in (req.body as Record<string, unknown>)) {
        await writeIntrusion({
          prisma,
          ipAddress: ip,
          attemptType: "PRIV_ESCALATION",
          payload: { field, path: req.path, userId: user?.id }
        });
        break;
      }
    }
  }

  next();
}

