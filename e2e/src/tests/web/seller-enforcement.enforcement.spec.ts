import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { AUTH_STATE_PATHS } from "../../support/auth-state";
import {
  resolveE2EEnvironment,
  resolveSellerEnforcementTestAccount,
} from "../../support/environment";

const EVIDENCE_FILE_URL = new URL(
  "../../../../apps/web/public/images/seed-listings/youtube-services.png",
  import.meta.url
);
const ADMIN_APPLY_ENDPOINT = "/rpc/sellerEnforcement/admin/apply";
const ADMIN_REVIEW_ENDPOINT = "/rpc/sellerEnforcement/admin/reviewAppeal";
const SELLER_APPEAL_ENDPOINT = "/rpc/sellerEnforcement/seller/submitAppeal";
const EVIDENCE_UPLOAD_ENDPOINT =
  "/api/seller-enforcement-appeal-evidence-upload";

const waitForPost = (page: Page, endpoint: string) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(endpoint)
  );

const waitForPostRequest = (page: Page, endpoint: string) =>
  page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes(endpoint)
  );

test.describe(
  "seller enforcement and appeal",
  { tag: ["@seller-enforcement", "@critical"] },
  () => {
    test("submits a seller appeal and restores the storefront after admin review", async ({
      browser,
      page,
    }, testInfo) => {
      test.setTimeout(120_000);

      const environment = resolveE2EEnvironment();
      if (!environment.adminBaseURL) {
        throw new Error(
          "Seller enforcement E2E requires an authenticated admin base URL."
        );
      }
      const sellerAccount = resolveSellerEnforcementTestAccount();
      if (!sellerAccount) {
        throw new Error(
          "Seller enforcement E2E requires enforcement seller credentials."
        );
      }
      const storefrontName = "Avin E2E Enforcement Store";
      const enforcementReason = `E2E enforcement suspension ${Date.now()}-${testInfo.workerIndex}.`;
      const appealReason = `E2E appeal explanation ${Date.now()}-${testInfo.workerIndex}.`;
      const evidenceDescription =
        "Ảnh đối chứng cho thấy Seller đã hoàn thành nghĩa vụ bàn giao.";
      const outcomeReason =
        "Bằng chứng hợp lệ; quyết định tạm dừng được hủy và gian hàng được khôi phục.";
      const evidenceFileName = "e2e-seller-appeal-proof.png";
      const evidenceBuffer = await readFile(EVIDENCE_FILE_URL);
      const adminContext = await browser.newContext({
        baseURL: environment.adminBaseURL,
        storageState: AUTH_STATE_PATHS.admin,
      });
      const adminPage = await adminContext.newPage();

      try {
        await test.step("admin applies a suspension to the isolated seller", async () => {
          await adminPage.goto("/sellers");
          await expect(
            adminPage.getByRole("heading", {
              level: 1,
              name: "Seller Governance",
            })
          ).toBeVisible();

          await adminPage
            .getByRole("textbox", { exact: true, name: "Search sellers" })
            .fill(storefrontName);
          const sellerRow = adminPage
            .locator("tbody tr")
            .filter({ hasText: sellerAccount.email });
          await expect(sellerRow).toHaveCount(1, { timeout: 20_000 });
          await expect(sellerRow).toContainText(storefrontName);
          await sellerRow
            .getByRole("link", { exact: true, name: "Chi tiết" })
            .click();

          await expect(
            adminPage.getByRole("heading", {
              level: 1,
              name: storefrontName,
            })
          ).toBeVisible();
          await adminPage
            .getByRole("button", {
              exact: true,
              name: "Tạm dừng gian hàng",
            })
            .click();
          await expect(
            adminPage.getByRole("heading", {
              name: "Tạm dừng hoạt động gian hàng",
            })
          ).toBeVisible();

          await adminPage
            .getByLabel(/Lý do gửi tới Người bán/u)
            .fill(enforcementReason);
          const applyRequestPromise = waitForPostRequest(
            adminPage,
            ADMIN_APPLY_ENDPOINT
          );
          const applyResponsePromise = waitForPost(
            adminPage,
            ADMIN_APPLY_ENDPOINT
          );
          await adminPage
            .getByRole("button", { exact: true, name: "Tạm dừng" })
            .click();

          const [applyRequest, applyResponse] = await Promise.all([
            applyRequestPromise,
            applyResponsePromise,
          ]);
          expect(applyResponse.ok()).toBe(true);
          expect(applyRequest.postDataJSON()).toMatchObject({
            json: {
              reasonCode: "POLICY_VIOLATION",
              sellerReason: enforcementReason,
              state: "SUSPENDED",
            },
          });
          await expect(
            adminPage.getByText("Cập nhật trạng thái gian hàng thành công", {
              exact: true,
            })
          ).toBeVisible();

          await adminPage.reload();
          await expect(
            adminPage.getByRole("heading", {
              level: 1,
              name: storefrontName,
            })
          ).toBeVisible();
          await expect(
            adminPage.getByText("SUSPENDED", { exact: true }).first()
          ).toBeVisible();
        });

        await test.step("seller submits an appeal with evidence", async () => {
          await page.goto("/seller/store");
          await expect(
            page.getByText("Gian hàng đang bị tạm dừng hoạt động (Suspended)", {
              exact: true,
            })
          ).toBeVisible();
          await expect(
            page.getByText(enforcementReason, { exact: false })
          ).toBeVisible();
          await page
            .getByRole("button", {
              exact: true,
              name: "Gửi khiếu nại quyết định (Appeal)",
            })
            .click();
          await expect(
            page.getByRole("heading", {
              name: "Gửi khiếu nại quyết định xử lý (Appeal)",
            })
          ).toBeVisible();

          await page
            .getByLabel(/Nội dung giải trình khiếu nại/u)
            .fill(appealReason);
          await page
            .getByLabel("Mô tả tài liệu / bằng chứng đính kèm", {
              exact: true,
            })
            .fill(evidenceDescription);

          const evidenceUploadResponsePromise = waitForPost(
            page,
            EVIDENCE_UPLOAD_ENDPOINT
          );
          await page
            .getByLabel("Chọn tài liệu đối chứng", { exact: true })
            .setInputFiles({
              buffer: evidenceBuffer,
              mimeType: "image/png",
              name: evidenceFileName,
            });
          const evidenceUploadResponse = await evidenceUploadResponsePromise;
          expect(evidenceUploadResponse.ok()).toBe(true);
          await expect(
            page.getByRole("img", { exact: true, name: evidenceFileName })
          ).toBeVisible();

          const appealRequestPromise = waitForPostRequest(
            page,
            SELLER_APPEAL_ENDPOINT
          );
          const appealResponsePromise = waitForPost(
            page,
            SELLER_APPEAL_ENDPOINT
          );
          const submitButton = page.getByRole("button", {
            exact: true,
            name: "Gửi khiếu nại",
          });
          await expect(submitButton).toBeEnabled();
          await submitButton.click();

          const [appealRequest, appealResponse] = await Promise.all([
            appealRequestPromise,
            appealResponsePromise,
          ]);
          expect(appealResponse.ok()).toBe(true);
          expect(appealRequest.postDataJSON()).toMatchObject({
            json: {
              evidence: [
                {
                  contentType: "image/png",
                  description: evidenceDescription,
                  fileName: evidenceFileName,
                },
              ],
              sellerReason: appealReason,
            },
          });
          await expect(
            page.getByText("Gửi khiếu nại thành công", { exact: true })
          ).toBeVisible();
          await expect(
            page.getByRole("button", {
              exact: true,
              name: "Xem trạng thái khiếu nại đã gửi",
            })
          ).toBeVisible();
          await page
            .getByRole("button", {
              exact: true,
              name: "Xem trạng thái khiếu nại đã gửi",
            })
            .click();
          await expect(
            page.getByText("Trạng thái đơn khiếu nại (Appeal)", {
              exact: true,
            })
          ).toBeVisible();
          await expect(
            page.getByText("Đã gửi khiếu nại (Chờ xem xét)", { exact: true })
          ).toBeVisible();
        });

        await test.step("admin reviews and overturns the seller appeal", async () => {
          await adminPage.reload();
          await expect(
            adminPage.getByRole("heading", {
              level: 1,
              name: storefrontName,
            })
          ).toBeVisible();
          const reviewButton = adminPage.getByRole("button", {
            exact: true,
            name: "Thẩm định khiếu nại",
          });
          await expect(reviewButton).toBeVisible();
          await reviewButton.click();
          await expect(
            adminPage.getByRole("heading", {
              name: "Thẩm định đơn khiếu nại",
            })
          ).toBeVisible();

          const reviewRequestPromise = waitForPostRequest(
            adminPage,
            ADMIN_REVIEW_ENDPOINT
          );
          const reviewResponsePromise = waitForPost(
            adminPage,
            ADMIN_REVIEW_ENDPOINT
          );
          await adminPage
            .getByRole("button", {
              exact: true,
              name: "Xác nhận kết luận",
            })
            .click();

          const [reviewRequest, reviewResponse] = await Promise.all([
            reviewRequestPromise,
            reviewResponsePromise,
          ]);
          expect(reviewResponse.ok()).toBe(true);
          expect(reviewRequest.postDataJSON()).toMatchObject({
            json: {
              outcome: "UNDER_REVIEW",
              reasonCode: "POLICY_VIOLATION",
            },
          });
          await expect(
            adminPage.getByText(
              "Thẩm định khiếu nại thành công (UNDER_REVIEW)",
              {
                exact: true,
              }
            )
          ).toBeVisible();

          await adminPage.reload();
          await expect(
            adminPage.getByRole("heading", {
              level: 1,
              name: storefrontName,
            })
          ).toBeVisible();
          await adminPage
            .getByRole("button", {
              exact: true,
              name: "Thẩm định khiếu nại",
            })
            .click();
          await expect(
            adminPage.getByRole("heading", {
              name: "Thẩm định đơn khiếu nại",
            })
          ).toBeVisible();

          await adminPage
            .getByLabel("Quyết định thẩm định", { exact: true })
            .click();
          await adminPage
            .getByRole("option", {
              exact: true,
              name: "Chấp thuận khiếu nại (Hủy phạt & Khôi phục)",
            })
            .click();
          await adminPage.getByLabel(/Lý do kết luận/u).fill(outcomeReason);
          await adminPage
            .getByLabel("Ghi chú nội bộ (Tùy chọn)", { exact: true })
            .fill("E2E admin review note.");

          const overturnRequestPromise = waitForPostRequest(
            adminPage,
            ADMIN_REVIEW_ENDPOINT
          );
          const overturnResponsePromise = waitForPost(
            adminPage,
            ADMIN_REVIEW_ENDPOINT
          );
          await adminPage
            .getByRole("button", {
              exact: true,
              name: "Xác nhận kết luận",
            })
            .click();

          const [overturnRequest, overturnResponse] = await Promise.all([
            overturnRequestPromise,
            overturnResponsePromise,
          ]);
          if (!overturnResponse.ok()) {
            throw new Error(
              `Seller appeal overturn failed with HTTP ${overturnResponse.status()}: ${await overturnResponse.text()}`
            );
          }
          expect(overturnRequest.postDataJSON()).toMatchObject({
            json: {
              outcome: "OVERTURNED",
              outcomeReason,
              reasonCode: "POLICY_VIOLATION",
            },
          });
          await expect(
            adminPage.getByText("Thẩm định khiếu nại thành công (OVERTURNED)", {
              exact: true,
            })
          ).toBeVisible();

          await adminPage.reload();
          await expect(
            adminPage.getByRole("button", {
              exact: true,
              name: "Tạm dừng gian hàng",
            })
          ).toBeVisible();
          await expect(
            adminPage.getByText("Chấp thuận (Đã hủy phạt)", { exact: true })
          ).toBeVisible();
          await expect(
            adminPage.getByText(outcomeReason, { exact: true })
          ).toBeVisible();
        });

        await test.step("seller sees the restored storefront", async () => {
          await page.reload();
          await expect(
            page.getByText("Gian hàng đang bị tạm dừng hoạt động (Suspended)", {
              exact: true,
            })
          ).toHaveCount(0);
        });
      } finally {
        await adminContext.close();
      }
    });
  }
);
