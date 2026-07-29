import { exportJWK, generateKeyPair, jwtVerify } from "jose";
import { expect, it } from "vitest";

import { ACCOUNT_ROLE } from "./permissions";
import {
  createSupabaseAccessToken,
  isSupabaseAccessRole,
  SUPABASE_ACCESS_TOKEN_LIFETIME_SECONDS,
} from "./supabase-access-token";

it("denies generic Supabase access tokens to administrators", () => {
  expect(isSupabaseAccessRole(ACCOUNT_ROLE.ADMIN)).toBe(false);
  expect(isSupabaseAccessRole(ACCOUNT_ROLE.BUYER)).toBe(true);
  expect(isSupabaseAccessRole(ACCOUNT_ROLE.SELLER)).toBe(true);
});

it("creates a verifiable Supabase access token for a Better Auth identity", async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256", {
    extractable: true,
  });
  const privateJwk = await exportJWK(privateKey);
  const issuedAt = new Date("2026-07-29T12:00:00.000Z");

  const token = await createSupabaseAccessToken(
    {
      accountRole: ACCOUNT_ROLE.SELLER,
      userId: "seller_123",
    },
    {
      issuedAt,
      keyId: "test-key",
      privateJwk,
    }
  );

  const { payload, protectedHeader } = await jwtVerify(token, publicKey, {
    algorithms: ["ES256"],
    currentDate: issuedAt,
  });

  expect(protectedHeader).toMatchObject({
    alg: "ES256",
    kid: "test-key",
    typ: "JWT",
  });
  expect(payload).toMatchObject({
    account_role: "SELLER",
    iat: Math.floor(issuedAt.getTime() / 1000),
    role: "authenticated",
    sub: "seller_123",
  });
  expect(payload.exp).toBe(
    Math.floor(issuedAt.getTime() / 1000) +
      SUPABASE_ACCESS_TOKEN_LIFETIME_SECONDS
  );
});
