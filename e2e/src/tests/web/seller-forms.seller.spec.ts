import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { resolveE2EEnvironment } from "../../support/environment";

const SELLER_WITHDRAWAL_MINIMUM_AMOUNT = 5000;
const WITHDRAWAL_ENDPOINT = "/rpc/wallet/seller/requestWithdrawal";

interface SellerProfileSnapshot {
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  storeSlug: string;
  storefrontName: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const unwrapRpcPayload = (payload: unknown): unknown =>
  isRecord(payload) && "json" in payload ? payload.json : payload;

const getSellerProfileSnapshot = async (
  page: Page,
  apiBaseURL: string
): Promise<SellerProfileSnapshot> => {
  const response = await page.request.post(
    `${apiBaseURL}/rpc/sellerStore/getProfile`,
    { data: {} }
  );

  if (!response.ok()) {
    throw new Error(
      `Unable to load the seller profile: HTTP ${response.status()} ${await response.text()}`
    );
  }

  const payload: unknown = unwrapRpcPayload(await response.json());
  const profile = isRecord(payload) ? payload.profile : undefined;

  if (!isRecord(profile)) {
    throw new Error("The E2E seller account does not have a store profile.");
  }

  const { avatarUrl } = profile;
  const { bannerUrl } = profile;
  const { bio } = profile;
  const { storeSlug } = profile;
  const { storefrontName } = profile;

  if (
    typeof avatarUrl !== "string" ||
    typeof bio !== "string" ||
    typeof storeSlug !== "string" ||
    typeof storefrontName !== "string"
  ) {
    throw new TypeError(
      "The E2E seller profile response is missing form values."
    );
  }

  return {
    avatarUrl,
    bannerUrl: typeof bannerUrl === "string" ? bannerUrl : "",
    bio,
    storeSlug,
    storefrontName,
  };
};

const restoreSellerProfile = async (
  page: Page,
  apiBaseURL: string,
  snapshot: SellerProfileSnapshot
): Promise<void> => {
  const response = await page.request.post(
    `${apiBaseURL}/rpc/sellerStore/updateProfile`,
    {
      data: {
        json: snapshot,
      },
    }
  );

  if (!response.ok()) {
    throw new Error(
      `Unable to restore the E2E seller profile: HTTP ${response.status()} ${await response.text()}`
    );
  }
};

test.describe(
  "seller profile and withdrawal forms",
  { tag: ["@seller", "@critical"] },
  () => {
    test("persists a seller profile edit after reload", async ({
      page,
    }, testInfo) => {
      test.setTimeout(60_000);

      const environment = resolveE2EEnvironment();
      const originalProfile = await getSellerProfileSnapshot(
        page,
        environment.apiBaseURL
      );
      const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
      const storefrontName = `E2E Store ${runId}`;
      const bio = `E2E profile update ${runId}.`;

      try {
        await test.step("open the seller profile form", async () => {
          await page.goto("/seller/store?section=profile");
          await expect(
            page.getByRole("heading", { level: 2, name: "Hồ sơ gian hàng" })
          ).toBeVisible();
        });

        await test.step("save the changed profile fields", async () => {
          const nameField = page.getByLabel(/^Tên gian hàng/u);
          const bioField = page.getByLabel(/^Mô tả gian hàng/u);
          const saveButton = page.getByRole("button", {
            exact: true,
            name: "Lưu thay đổi",
          });

          await nameField.fill(storefrontName);
          await bioField.fill(bio);
          await expect(saveButton).toBeEnabled();

          const updateRequestPromise = page.waitForRequest(
            (request) =>
              request.method() === "POST" &&
              request.url().includes("/rpc/sellerStore/updateProfile")
          );
          const updateResponsePromise = page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              response.url().includes("/rpc/sellerStore/updateProfile")
          );

          await saveButton.click();
          const [updateRequest, updateResponse] = await Promise.all([
            updateRequestPromise,
            updateResponsePromise,
          ]);

          expect(updateResponse.ok()).toBe(true);
          expect(updateRequest.postDataJSON()).toMatchObject({
            json: {
              avatarUrl: originalProfile.avatarUrl,
              bannerUrl: originalProfile.bannerUrl,
              bio,
              storeSlug: originalProfile.storeSlug,
              storefrontName,
            },
          });
          await expect(
            page.getByText("Đã lưu hồ sơ gian hàng", { exact: true })
          ).toBeVisible();
        });

        await test.step("verify the saved values survive a reload", async () => {
          await page.reload();
          await expect(page.getByLabel(/^Tên gian hàng/u)).toHaveValue(
            storefrontName
          );
          await expect(page.getByLabel(/^Mô tả gian hàng/u)).toHaveValue(bio);
        });
      } finally {
        await restoreSellerProfile(
          page,
          environment.apiBaseURL,
          originalProfile
        );
      }
    });

    test("blocks withdrawal amounts below the minimum", async ({ page }) => {
      await page.goto("/seller/store?section=finance");
      await expect(
        page.getByRole("heading", { level: 2, name: "Rút Tiền" })
      ).toBeVisible();

      const amountField = page.getByLabel("Số tiền rút (VND)", { exact: true });
      await expect(amountField).toHaveAttribute(
        "min",
        String(SELLER_WITHDRAWAL_MINIMUM_AMOUNT)
      );
      await amountField.fill(String(SELLER_WITHDRAWAL_MINIMUM_AMOUNT - 1));

      const isRangeUnderflow = await amountField.evaluate(
        (element) =>
          (
            element as unknown as {
              validity?: { rangeUnderflow?: boolean };
            }
          ).validity?.rangeUnderflow ?? false
      );
      expect(isRangeUnderflow).toBe(true);
    });

    test("submits a valid withdrawal amount and surfaces an API error", async ({
      page,
    }) => {
      await page.goto("/seller/store?section=finance");
      await expect(
        page.getByRole("heading", { level: 2, name: "Rút Tiền" })
      ).toBeVisible();

      await page.route(`**${WITHDRAWAL_ENDPOINT}`, async (route) => {
        await route.fulfill({
          body: JSON.stringify({
            json: {
              code: "INTERNAL_SERVER_ERROR",
              defined: false,
              message: "E2E withdrawal rejected",
              status: 500,
            },
          }),
          contentType: "application/json",
          status: 500,
        });
      });

      try {
        const amountField = page.getByLabel("Số tiền rút (VND)", {
          exact: true,
        });
        const submitButton = page.getByRole("button", {
          exact: true,
          name: "Gửi yêu cầu rút",
        });
        await amountField.fill(String(SELLER_WITHDRAWAL_MINIMUM_AMOUNT));
        await expect(submitButton).toBeEnabled();

        const withdrawalRequestPromise = page.waitForRequest(
          (request) =>
            request.method() === "POST" &&
            request.url().includes(WITHDRAWAL_ENDPOINT)
        );
        const withdrawalResponsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response.url().includes(WITHDRAWAL_ENDPOINT)
        );

        await submitButton.click();
        const [withdrawalRequest, withdrawalResponse] = await Promise.all([
          withdrawalRequestPromise,
          withdrawalResponsePromise,
        ]);

        expect(withdrawalResponse.status()).toBe(500);
        expect(withdrawalRequest.postDataJSON()).toMatchObject({
          json: { amount: SELLER_WITHDRAWAL_MINIMUM_AMOUNT },
        });
        await expect(
          page.getByText(
            /E2E withdrawal rejected|Internal server error|Không thể tạo yêu cầu rút tiền/u
          )
        ).toBeVisible();
      } finally {
        await page.unroute(`**${WITHDRAWAL_ENDPOINT}`);
      }
    });
  }
);
