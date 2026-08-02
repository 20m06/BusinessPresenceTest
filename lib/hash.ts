import "server-only";
import { createHash } from "node:crypto";

// SHA-256 of IP + server-side salt. Raw IPs are never stored (CLAUDE.md §5).
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    throw new Error("IP_HASH_SALT is not set. Add it to .env.local and Vercel.");
  }
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex");
}

export function clientIpFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
