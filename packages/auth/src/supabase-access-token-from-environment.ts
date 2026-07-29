import type { JWK } from "jose";
import { z } from "zod";

import { createSupabaseAccessToken } from "./supabase-access-token";
import type { SupabaseAccessIdentity } from "./supabase-access-token";

const privateJwkSchema = z.object({
  alg: z.literal("ES256").optional(),
  crv: z.literal("P-256"),
  d: z.string().min(1),
  kid: z.string().min(1),
  kty: z.literal("EC"),
  x: z.string().min(1),
  y: z.string().min(1),
});

const parsePrivateJwk = (value: string): JWK & { kid: string } => {
  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    throw new Error("SUPABASE_JWT_PRIVATE_JWK must be valid JSON.");
  }

  return privateJwkSchema.parse(parsedValue);
};

export const createSupabaseAccessTokenFromEnvironment = async (
  identity: SupabaseAccessIdentity
): Promise<string> => {
  const { env } = await import("@avin/env/server");
  const privateJwk = parsePrivateJwk(env.SUPABASE_JWT_PRIVATE_JWK);

  return await createSupabaseAccessToken(identity, {
    keyId: privateJwk.kid,
    privateJwk,
  });
};
