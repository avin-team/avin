import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test as setup } from "@playwright/test";
import * as OTPAuth from "otpauth";

import { AUTH_STATE_PATHS } from "../support/auth-state";
import { resolveAdminTestAccount } from "../support/environment";

setup("authenticate the admin account with 2FA", async ({ page }) => {
  const account = resolveAdminTestAccount();

  if (!account) {
    throw new Error("Admin auth setup requires E2E admin credentials.");
  }

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Mật khẩu").fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập Admin" }).click();

  await expect(page).toHaveURL(/\/two-factor(?:\?|$)/u);
  await expect(
    page.getByText("Xác thực hai lớp (2FA)", { exact: true })
  ).toBeVisible();

  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(account.totpSecret),
  });

  await page.getByLabel("Mã xác thực 2FA").fill(totp.generate());
  await page.getByRole("button", { name: "Xác minh" }).click();

  await expect(page).toHaveURL(/\/$/u);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Bảng điều khiển Tổng quan",
    })
  ).toBeVisible();

  await mkdir(path.dirname(AUTH_STATE_PATHS.admin), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE_PATHS.admin });
});
