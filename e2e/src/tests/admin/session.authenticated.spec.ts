import { expect, test } from "@playwright/test";

test(
  "opens the dashboard with the verified admin session",
  { tag: "@auth" },
  async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/$/u);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Bảng điều khiển Tổng quan",
      })
    ).toBeVisible();
  }
);
