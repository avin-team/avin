import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

import { env } from "@avin/env/server";

const CIPHER_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY = createHash("sha256").update(env.BETTER_AUTH_SECRET).digest();

export const normalizeCitizenId = (value: string): string => value.trim();

export const hashCitizenId = (value: string): string =>
  createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(normalizeCitizenId(value))
    .digest("hex");

export const encryptCitizenId = (value: string): string => {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(CIPHER_ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizeCitizenId(value), "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
};

export const decryptCitizenId = (value: string): string => {
  const [ivValue, authTagValue, encryptedValue] = value.split(".");
  if (!ivValue || !authTagValue || !encryptedValue) {
    throw new Error("Stored CCCD value is invalid");
  }
  const decipher = createDecipheriv(
    CIPHER_ALGORITHM,
    KEY,
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf-8");
};

export const protectCitizenId = (value: string) => {
  const normalized = normalizeCitizenId(value);
  return {
    citizenIdCiphertext: encryptCitizenId(normalized),
    citizenIdHash: hashCitizenId(normalized),
    citizenIdLast4: normalized.slice(-4),
  };
};
