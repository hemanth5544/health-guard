import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@prisma/client";

export type JwtClaims = {
  sub: string;
  email: string;
  role: Role;
  sid: string; // session id
};

export function signJwt(claims: JwtClaims, expiresIn: string) {
  return jwt.sign(claims, env.JWT_SECRET, { algorithm: "HS256", expiresIn });
}

export function verifyJwt(token: string): { ok: true; claims: JwtClaims } | { ok: false; error: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as JwtClaims;
    return { ok: true, claims: decoded };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "invalid token" };
  }
}

