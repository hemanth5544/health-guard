import crypto from "node:crypto";
import { env } from "../config/env.js";

function key32() {
  // Derive a stable 32-byte key from ENCRYPTION_KEY
  return crypto.createHash("sha256").update(env.ENCRYPTION_KEY).digest();
}

export function encryptAadhaar(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key32(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptAadhaar(ciphertextB64: string): string {
  const buf = Buffer.from(ciphertextB64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key32(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

