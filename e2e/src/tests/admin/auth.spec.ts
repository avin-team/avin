import { expect, test } from "@playwright/test";

test.describe("admin authentication", { tag: ["@auth", "@prod-safe"] }, () => {
  test("shows the admin sign-in form", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("heading", { level: 1, name: "Avin Admin" })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mật khẩu")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Đăng nhập Admin" })
    ).toBeVisible();
  });

  test("redirects an anonymous user to admin sign-in", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/sign-in(?:\?|$)/u);
    const currentURL = new URL(page.url());
    expect(currentURL.searchParams.get("redirect")).toContain("/");
  });
});
