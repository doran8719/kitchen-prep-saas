// src/lib/secret-box.ts
// SERVER ONLY. Encrypts store API keys before they're saved to the database.
// STORE_KEY_SECRET is 32 random bytes, base64 (make one with: openssl rand -base64 32).
// If it's lost or changed, saved connections can't be read and stores must reconnect.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(): Buffer {
  const raw = process.env.STORE_KEY_SECRET;
  if (!raw) throw new Error("STORE_KEY_SECRET isn't set on the server.");
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("STORE_KEY_SECRET must be 32 bytes, base64 encoded.");
  return k;
}

/** "v1.<iv>.<tag>.<ciphertext>", all base64url. */
export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), enc.toString("base64url")].join(".");
}

export function open(sealed: string): string {
  const [v, iv, tag, enc] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("Saved store key is in an unknown format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64url")), decipher.final()]).toString("utf8");
}
