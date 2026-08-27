import { expect, test } from "@playwright/test";

test(
  "opens a protected page with the storefront session",
  { tag: "@auth" },
  async ({ page }) => {
    await page.goto("/orders");

    await expect(page).toHaveURL(/\/orders(?:\?|$)/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Đơn hàng của tôi" })
    ).toBeVisible();
  }
);
