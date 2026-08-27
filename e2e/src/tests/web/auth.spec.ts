import { expect, test } from "@playwright/test";

test.describe(
  "storefront authentication",
  { tag: ["@auth", "@prod-safe"] },
  () => {
    test("redirects an anonymous user to login", async ({ page }) => {
      await page.goto("/orders");

      await expect(page).toHaveURL(/\/login(?:\?|$)/u);
    });

    test("starts Google OAuth with safe callback URLs", async ({ page }) => {
      await page.route("https://accounts.google.com/**", async (route) => {
        await route.fulfill({
          body: "<!doctype html><title>Google OAuth boundary</title>",
          contentType: "text/html",
          status: 200,
        });
      });
      await page.goto("/login?redirectTo=%2Forders");

      const signInRequestPromise = page.waitForRequest((request) =>
        request.url().includes("/api/auth/sign-in/social")
      );
      await page.getByRole("button", { name: "Tiếp tục với Google" }).click();
      const signInRequest = await signInRequestPromise;
      const requestBody: unknown = signInRequest.postDataJSON();

      expect(requestBody).toMatchObject({
        callbackURL: expect.stringMatching(/\/orders$/u),
        newUserCallbackURL: expect.stringMatching(
          /\/onboarding\?redirectTo=%2Forders$/u
        ),
        provider: "google",
      });
      await expect(page).toHaveURL(/^https:\/\/accounts\.google\.com\//u);
    });
  }
);
