import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";

import { AUTH_STATE_PATHS } from "../support/auth-state";
import { resolveSellerOnboardingTestAccount } from "../support/environment";

setup("authenticate the seller onboarding account", async ({ request }) => {
  const account = resolveSellerOnboardingTestAccount();

  if (!account) {
    throw new Error(
      "Seller onboarding auth setup requires E2E onboarding seller credentials."
    );
  }

  const signInResponse = await request.post("/api/auth/sign-in/email", {
    data: account,
  });

  if (!signInResponse.ok()) {
    throw new Error(
      `Seller onboarding sign-in failed with HTTP ${signInResponse.status()}: ${await signInResponse.text()}`
    );
  }

  const sessionResponse = await request.get("/api/auth/get-session");
  await expect(sessionResponse).toBeOK();
  const session: unknown = await sessionResponse.json();
  expect(session).toMatchObject({ user: { email: account.email } });

  await mkdir(path.dirname(AUTH_STATE_PATHS.sellerOnboarding), {
    recursive: true,
  });
  await request.storageState({ path: AUTH_STATE_PATHS.sellerOnboarding });
});
