import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const SELLER_LOGO_FILE_URL = new URL(
  "../../../../apps/web/public/images/seed-listings/youtube-services.png",
  import.meta.url
);

const waitForPost = (page: Page, endpoint: string) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(endpoint)
  );

test.describe(
  "seller onboarding",
  { tag: ["@seller-onboarding", "@critical"] },
  () => {
    test("submits seller onboarding through storefront and banking steps", async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000);

      const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
      const storefrontName = `E2E Onboarding ${runId}`;
      const phone = `09${String(Date.now()).slice(-8)}`;
      const accountNumber = `9${String(Date.now()).slice(-9)}`;
      const bio = `E2E seller onboarding ${runId}.`;
      const accountName = "AVIN E2E ONBOARDING";
      const bankName = "Vietcombank";
      const logoBuffer = await readFile(SELLER_LOGO_FILE_URL);

      await test.step("open the fresh onboarding form", async () => {
        await page.goto("/seller/onboarding");
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: "Thiết lập thông tin gian hàng",
          })
        ).toBeVisible();
      });

      await test.step("save storefront details and move to banking", async () => {
        await page.getByLabel(/^Tên gian hàng/u).fill(storefrontName);
        await page.getByLabel(/^Số điện thoại liên hệ/u).fill(phone);
        await page
          .getByLabel("Mô tả gian hàng (Bio)", { exact: true })
          .fill(bio);

        const uploadResponse = page.waitForResponse(
          (response) =>
            response.request().method() === "POST" &&
            response.url().includes("/api/upload")
        );
        await page
          .getByLabel("Chọn logo gian hàng", { exact: true })
          .setInputFiles({
            buffer: logoBuffer,
            mimeType: "image/png",
            name: "seller-onboarding-logo.png",
          });
        const upload = await uploadResponse;
        expect(upload.ok()).toBe(true);
        await expect(
          page.getByRole("img", { name: "Logo seller-onboarding-logo.png" })
        ).toBeVisible();

        const updateRequest = page.waitForRequest(
          (request) =>
            request.method() === "POST" &&
            request.url().includes("/rpc/sellerApplication/updateDraftProfile")
        );
        const updateResponse = waitForPost(
          page,
          "/rpc/sellerApplication/updateDraftProfile"
        );
        const nextButton = page.getByRole("button", {
          exact: true,
          name: "Lưu & Tiếp tục",
        });
        await expect(nextButton).toBeEnabled();
        await nextButton.click();

        const [request, response] = await Promise.all([
          updateRequest,
          updateResponse,
        ]);
        expect(response.ok()).toBe(true);
        expect(request.postDataJSON()).toMatchObject({
          json: {
            avatarUrl: expect.stringMatching(/^https?:\/\//u),
            bio,
            phone,
            storefrontName,
          },
        });
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: "Thông tin Ngân hàng & Điều khoản",
          })
        ).toBeVisible();
      });

      await test.step("submit banking details and seller agreement", async () => {
        await page.getByLabel(/^Tên ngân hàng/u).fill(bankName);
        await page.getByLabel(/^Số tài khoản/u).fill(accountNumber);
        await page.getByLabel(/^Tên chủ tài khoản/u).fill(accountName);
        await page.getByRole("checkbox", { name: /Tôi đã đọc/u }).check();

        const submitRequest = page.waitForRequest(
          (request) =>
            request.method() === "POST" &&
            request.url().includes("/rpc/sellerApplication/submitApplication")
        );
        const submitResponse = waitForPost(
          page,
          "/rpc/sellerApplication/submitApplication"
        );
        const submitButton = page.getByRole("button", {
          exact: true,
          name: "Nộp hồ sơ xét duyệt",
        });
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        const [request, response] = await Promise.all([
          submitRequest,
          submitResponse,
        ]);
        expect(response.ok()).toBe(true);
        expect(request.postDataJSON()).toMatchObject({
          json: {
            bankAccount: {
              accountName,
              accountNumber,
              bankName,
            },
            sellerAgreementAccepted: true,
            sellerAgreementVersion: "v1.0",
          },
        });
      });

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Trạng thái & Kết quả xét duyệt",
        })
      ).toBeVisible();
      await expect(
        page.getByText("Đã gửi hồ sơ xét duyệt người bán thành công!", {
          exact: true,
        })
      ).toBeVisible();
      await expect(
        page.getByText("Đang chờ duyệt", { exact: true })
      ).toBeVisible();
    });
  }
);
