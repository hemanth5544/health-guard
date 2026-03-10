import type { NextFunction, Request, Response } from "express";
import { Severity, type Role as DbRole } from "@prisma/client";
import type { AuthedRequest } from "./authMiddleware.js";
import { prisma } from "../db/prisma.js";
import { getClientIp } from "../security/request.js";
import { writeAuditLog, writeIntrusion } from "../security/audit.js";

export function rbacMiddleware(allowedRoles: DbRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ipAddress = getClientIp(req);
    const role = (req as AuthedRequest).user?.role as DbRole | undefined;
    if (!role || !allowedRoles.includes(role)) {
      const userId = (req as AuthedRequest).user?.id;
      await writeAuditLog({
        prisma,
        userId,
        action: "ACCESS_DENIED",
        resource: req.path,
        ipAddress,
        statusCode: 403,
        severity: Severity.WARNING,
        details: { allowedRoles, role }
      });
      await writeIntrusion({
        prisma,
        ipAddress,
        attemptType: "PRIV_ESCALATION",
        payload: { userId, role, path: req.path, allowedRoles }
      });
      return res.status(403).json({ success: false, message: "Forbidden", data: null });
    }
    next();
  };
}

