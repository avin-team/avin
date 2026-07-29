import { importJWK, SignJWT } from "jose";
import type { JWK } from "jose";

import { ACCOUNT_ROLE } from "./permissions";

export const SUPABASE_ACCESS_TOKEN_LIFETIME_SECONDS = 10 * 60;

export type SupabaseAccessRole =
  | typeof ACCOUNT_ROLE.BUYER
  | typeof ACCOUNT_ROLE.SELLER;

export const isSupabaseAccessRole = (
  role: string | null | undefined
): role is SupabaseAccessRole =>
  role === ACCOUNT_ROLE.BUYER || role === ACCOUNT_ROLE.SELLER;

export interface SupabaseAccessIdentity {
  accountRole: SupabaseAccessRole;
  userId: string;
}

export interface SupabaseSigningKey {
  issuedAt?: Date;
  keyId: string;
  privateJwk: JWK;
}

export const createSupabaseAccessToken = async (
  identity: SupabaseAccessIdentity,
  signingKey: SupabaseSigningKey
): Promise<string> => {
  const issuedAtSeconds = Math.floor(
    (signingKey.issuedAt ?? new Date()).getTime() / 1000
  );
  const privateKey = await importJWK(signingKey.privateJwk, "ES256");

  return new SignJWT({
    account_role: identity.accountRole,
    role: "authenticated",
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: signingKey.keyId,
      typ: "JWT",
    })
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(issuedAtSeconds + SUPABASE_ACCESS_TOKEN_LIFETIME_SECONDS)
    .setSubject(identity.userId)
    .sign(privateKey);
};
