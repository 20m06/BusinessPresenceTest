import "server-only";
import { randomBytes } from "node:crypto";

// URL-safe random token, 32 chars — makes /report/[token] unguessable.
export function newPublicToken(): string {
  return randomBytes(24).toString("base64url");
}
