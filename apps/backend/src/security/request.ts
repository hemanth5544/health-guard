import type { Request } from "express";

export function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}

export function getUserAgent(req: Request): string {
  return (req.headers["user-agent"] as string | undefined) ?? "unknown";
}

