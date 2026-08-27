import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";

import { AUTH_STATE_PATHS } from "../support/auth-state";
import { resolveStorefrontTestAccount } from "../support/environment";

setup("authenticate the storefront account", async ({ request }) => {
  const account = resolveStorefrontTestAccount();

  if (!account) {
    throw new Error("Storefront auth setup requires E2E user credentials.");
  }

  const signInResponse = await request.post("/api/auth/sign-in/email", {
    data: account,
  });

  if (!signInResponse.ok()) {
    throw new Error(
      `Storefront sign-in failed with HTTP ${signInResponse.status()}: ${await signInResponse.text()}`
    );
  }

  const sessionResponse = await request.get("/api/auth/get-session");
  await expect(sessionResponse).toBeOK();
  const session: unknown = await sessionResponse.json();
  expect(session).toMatchObject({ user: { email: account.email } });

  await mkdir(path.dirname(AUTH_STATE_PATHS.storefront), { recursive: true });
  await request.storageState({ path: AUTH_STATE_PATHS.storefront });
});
