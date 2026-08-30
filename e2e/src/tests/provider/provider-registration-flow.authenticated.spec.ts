import { createSePaySignature } from "@avin/api/wallet/sepay";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { AUTH_STATE_PATHS } from "../../support/auth-state";
import {
  resolveE2EEnvironment,
  resolveSePayTestConfiguration,
} from "../../support/environment";

const BOND_AMOUNT = 1_000_000;

const waitForPost = (page: Page, endpoint: string) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(endpoint)
  );

const waitForSuccessfulPost = (page: Page, endpoint: string) =>
  page.waitForResponse(
    (response) =>
      response.ok() &&
      response.request().method() === "POST" &&
      response.url().includes(endpoint)
  );

const createUniqueDigits = (length: number): string => {
  const timestamp = String(Date.now());
  return timestamp.slice(-length).padStart(length, "7");
};

test.describe(
  "Provider registration and review",
  { tag: ["@provider", "@critical"] },
  () => {
    test("registers a Provider, reconciles the bond payment, and publishes the profile", async ({
      browser,
      page,
    }, testInfo) => {
      test.setTimeout(120_000);

      const environment = resolveE2EEnvironment();
      const sePay = resolveSePayTestConfiguration();
      if (!environment.adminBaseURL) {
        throw new Error(
          "Provider registration E2E requires E2E_ADMIN_BASE_URL or the local Admin server."
        );
      }

      const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
      const fullName = `E2E Provider ${runId}`;
      const citizenId = `079${createUniqueDigits(9)}`;
      const bankAccountNumber = `9${createUniqueDigits(9)}`;
      const zaloPhone = `09${createUniqueDigits(8)}`;
      const serviceDescription = `Dịch vụ Provider E2E cho lần chạy ${runId}.`;

      await test.step("complete the Provider application form", async () => {
        const workspaceResponse = waitForSuccessfulPost(
          page,
          "/rpc/protection/providerWorkspace"
        );
        const depositIntentResponse = waitForSuccessfulPost(
          page,
          "/rpc/protection/providerApplication/getDepositIntent"
        );
        await page.goto("/avin-check/apply");
        await Promise.all([workspaceResponse, depositIntentResponse]);
        const applicationForm = page.getByTestId("provider-application-form");
        const existingPaymentPanel = page.getByTestId("provider-deposit-panel");
        await expect(applicationForm.or(existingPaymentPanel)).toBeVisible({
          timeout: 20_000,
        });
        if (await existingPaymentPanel.isVisible()) {
          await page.getByTestId("provider-edit-form").click();
        }
        await expect(applicationForm).toBeVisible();

        await page.getByLabel(/^Họ và tên/u).fill(fullName);
        await page.getByLabel(/^Căn cước công dân/u).fill(citizenId);
        await page
          .getByLabel(/^Địa điểm/u)
          .fill("Quận 1, Thành phố Hồ Chí Minh");
        await page
          .getByPlaceholder(/Số điện thoại Zalo chính/u)
          .fill(zaloPhone);
        await page.getByLabel(/^Dịch vụ cung cấp/u).fill(serviceDescription);
        await page
          .getByRole("button", { exact: true, name: "Tiếp tục" })
          .click();

        await page
          .getByLabel("Tên chủ tài khoản", { exact: true })
          .fill("AVIN E2E PROVIDER");
        await page
          .getByLabel("Số tài khoản", { exact: true })
          .fill(bankAccountNumber);

        const bankSelect = page.getByLabel("Ngân hàng", { exact: true });
        await bankSelect.click();
        await page.getByRole("option", { exact: true, name: "VCB" }).click();
        await page
          .getByRole("checkbox", { exact: true, name: "Tài khoản chính" })
          .check();
        await page
          .getByRole("checkbox", {
            name: /Tôi đồng ý công khai chính xác số tiền/u,
          })
          .check();
        await page
          .getByRole("checkbox", {
            name: /Tôi đồng ý Quy chế Hoạt động Đối tác/u,
          })
          .check();

        const submitButton = page.getByTestId("provider-submit-application");
        await expect(submitButton).toBeEnabled();

        const saveDraftResponse = waitForPost(
          page,
          "/rpc/protection/providerApplication/saveDraft"
        );
        const createIntentResponse = waitForPost(
          page,
          "/rpc/protection/providerApplication/createDepositIntent"
        );
        await submitButton.click();

        const saveDraft = await saveDraftResponse;
        const createIntent = await createIntentResponse;
        expect(saveDraft.ok()).toBe(true);
        expect(createIntent.ok()).toBe(true);
      });

      let paymentCode = "";

      await test.step("verify the payment instruction", async () => {
        await expect(page.getByTestId("provider-deposit-panel")).toBeVisible();
        await expect(
          page.getByText(/Chuyển đúng 1\.000\.000 ₫/u)
        ).toBeVisible();

        const paymentCodeElement = page.getByTestId("provider-payment-code");
        await expect(paymentCodeElement).toHaveCount(1);
        const paymentCodeText = await paymentCodeElement.textContent();
        paymentCode = paymentCodeText?.trim() ?? "";
        expect(paymentCode).toMatch(/^AV[A-Z0-9]{12}$/u);

        const qrCode = page.getByRole("img", {
          name: "Mã QR chuyển khoản vào quỹ đảm bảo của Đối tác",
        });
        await expect(qrCode).toHaveAttribute("src", /vietqr\.app\/img/u);
        const qrSource = await qrCode.getAttribute("src");
        if (!qrSource) {
          throw new Error("Provider payment QR source was not rendered.");
        }
        const qrUrl = new URL(qrSource);
        expect(qrUrl.searchParams.get("amount")).toBe(String(BOND_AMOUNT));
        expect(qrUrl.searchParams.get("des")).toBe(paymentCode);
      });

      await test.step("reconcile the synthetic SePay payment", async () => {
        const timestamp = Math.floor(Date.now() / 1000);
        const body = JSON.stringify({
          accountNumber: sePay.receivingAccountNumber,
          code: paymentCode,
          content: `${paymentCode} E2E Provider Bond`,
          currency: "VND",
          gateway: "E2E SePay",
          id: `e2e-provider-${runId}`,
          referenceCode: `E2E-${runId}`,
          transactionDate: new Date().toISOString(),
          transferAmount: BOND_AMOUNT,
          transferType: "in",
        });
        const response = await page.request.post(
          `${environment.apiBaseURL}/webhook/sepay`,
          {
            data: body,
            headers: {
              "content-type": "application/json",
              "x-sepay-signature": createSePaySignature({
                body,
                secret: sePay.secret,
                timestamp,
              }),
              "x-sepay-timestamp": String(timestamp),
            },
          }
        );

        expect(response.ok()).toBe(true);
        await page.reload();
        await expect(
          page.getByTestId("provider-application-pending-review")
        ).toBeVisible();
        await expect(page.getByText("Đã thanh toán quỹ đảm bảo")).toBeVisible();
        await expect(page.getByText("Đang chờ xét duyệt")).toBeVisible();
      });

      const adminContext = await browser.newContext({
        baseURL: environment.adminBaseURL,
        storageState: AUTH_STATE_PATHS.admin,
      });
      const adminPage = await adminContext.newPage();

      try {
        await test.step("review and approve the Provider application", async () => {
          await adminPage.goto("/avin-check/providers");
          await expect(
            adminPage.getByRole("heading", {
              level: 1,
              name: "Hàng đợi xét duyệt Provider",
            })
          ).toBeVisible();
          await adminPage
            .getByRole("textbox", { name: "Tìm hồ sơ Provider" })
            .fill(serviceDescription);

          const applicationRow = adminPage
            .getByRole("row")
            .filter({ hasText: serviceDescription });
          await expect(applicationRow).toHaveCount(1);
          await expect(applicationRow).toContainText("Chờ duyệt");
          await applicationRow
            .getByTestId("provider-application-review")
            .click();

          await expect(adminPage).toHaveURL(
            /\/avin-check\/providers\/[0-9a-f-]{36}$/u
          );
          await expect(
            adminPage.getByRole("heading", { level: 1, name: fullName })
          ).toBeVisible();
          await expect(
            adminPage.getByText("Thông tin đăng ký đối tác", { exact: true })
          ).toBeVisible();
          await expect(
            adminPage.getByText("1.000.000 ₫ · NORMAL", { exact: true })
          ).toBeVisible();

          await adminPage.getByTestId("provider-approve-button").click();
          await expect(
            adminPage.getByText("Xác nhận: Đã duyệt", { exact: true })
          ).toBeVisible();

          const decisionResponse = waitForPost(
            adminPage,
            "/rpc/protection/adminProviderApplications/decide"
          );
          await adminPage.getByTestId("provider-confirm-decision").click();
          const decision = await decisionResponse;
          expect(decision.ok()).toBe(true);
          await expect(
            adminPage.getByTestId("provider-public-profile-published")
          ).toBeVisible();
        });
      } finally {
        await adminContext.close();
      }

      await test.step("provider sees the published public profile", async () => {
        await page.reload();
        await expect(
          page.getByTestId("provider-profile-approved")
        ).toBeVisible();
        await expect(
          page.getByRole("link", {
            exact: true,
            name: "Xem hồ sơ công khai",
          })
        ).toHaveAttribute("href", /\/avin-check\/provider\//u);
      });
    });
  }
);
