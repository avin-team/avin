import { expect, test } from "@playwright/test";

test.describe("public entry points", { tag: ["@smoke", "@prod-safe"] }, () => {
  test("opens Avin Check lookup", async ({ page }) => {
    await page.goto("/avin-check");

    await expect(page).toHaveTitle(/Avin Check/u);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Kiểm tra dấu hiệu lừa đảo.",
      })
    ).toBeVisible();
  });

  test("opens the login entry point", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { level: 1, name: "Chào mừng đến Avin" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tiếp tục với Google" })
    ).toBeVisible();
  });
});
