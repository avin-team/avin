import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";

import { AUTH_STATE_PATHS } from "../support/auth-state";
import { resolveSellerTestAccount } from "../support/environment";

setup("authenticate the seller account", async ({ request }) => {
  const account = resolveSellerTestAccount();

  if (!account) {
    throw new Error("Seller auth setup requires E2E seller credentials.");
  }

  const signInResponse = await request.post("/api/auth/sign-in/email", {
    data: account,
  });

  if (!signInResponse.ok()) {
    throw new Error(
      `Seller sign-in failed with HTTP ${signInResponse.status()}: ${await signInResponse.text()}`
    );
  }

  const sessionResponse = await request.get("/api/auth/get-session");
  await expect(sessionResponse).toBeOK();
  const session: unknown = await sessionResponse.json();
  expect(session).toMatchObject({ user: { email: account.email } });

  await mkdir(path.dirname(AUTH_STATE_PATHS.seller), { recursive: true });
  await request.storageState({ path: AUTH_STATE_PATHS.seller });

  // Clean up any stale E2E test listings from previous aborted test runs
  const listResponse = await request.post(
    "/rpc/listing/sellerWorkspace/listMine",
    { data: { json: {} } }
  );

  if (listResponse.ok()) {
    const listBody: unknown = await listResponse.json();
    const listings =
      (listBody as { json?: { id: string; title?: string | null }[] })?.json ??
      [];

    for (const item of listings) {
      if (item.title?.startsWith("E2E ")) {
        await request.post("/rpc/listing/sellerWorkspace/delete", {
          data: { json: { id: item.id } },
        });
      }
    }
  }
});
