import { readFile } from "node:fs/promises";

import type { Page } from "@playwright/test";

import { expect, test } from "../../fixtures/risk-report.fixture";
import { AUTH_STATE_PATHS } from "../../support/auth-state";
import { resolveE2EEnvironment } from "../../support/environment";

const EVIDENCE_FILE_URL = new URL(
  "../../../../apps/web/public/images/seed-listings/youtube-services.png",
  import.meta.url
);

const waitForPost = (page: Page, endpoint: string) =>
  page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes(endpoint)
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getReportIdFromDraftResponse = async (response: {
  json: () => Promise<unknown>;
}): Promise<string> => {
  const payload: unknown = await response.json();
  const draft = isRecord(payload) && "json" in payload ? payload.json : payload;
  if (!isRecord(draft) || typeof draft.id !== "string") {
    throw new Error("The save-draft response did not contain a report ID.");
  }
  return draft.id;
};

test.describe(
  "risk report submission and moderation",
  { tag: ["@risk-report", "@critical"] },
  () => {
    test("submits a transaction report and publishes its redacted warning", async ({
      browser,
      page,
      withRiskReportCleanup,
    }, testInfo) => {
      test.setTimeout(90_000);

      const environment = resolveE2EEnvironment();
      const runId = `${Date.now()}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;
      const accountNumber = `9${Date.now()}${testInfo.workerIndex}`;
      const bankName = `E2E Bank ${runId}`;
      const holderName = `E2E REPORT SUBJECT ${runId}`;
      const narrative =
        `E2E report: người mua đã chuyển khoản theo thỏa thuận nhưng không nhận được tài khoản. ` +
        `Sau khi nhận tiền, đối tượng chặn liên lạc và không hoàn trả số tiền đã nhận. Mã chạy ${runId}.`;
      const evidenceBuffer = await readFile(EVIDENCE_FILE_URL);
      const reporterContext = await browser.newContext({
        baseURL: environment.webBaseURL,
        storageState: AUTH_STATE_PATHS.storefront,
      });
      const reporterPage = await reporterContext.newPage();

      let reportId = "";

      try {
        await test.step("reporter submits a transaction risk report", async () => {
          await reporterPage.goto("/avin-check/report");
          await expect(
            reporterPage.getByRole("heading", {
              level: 1,
              name: "Tố cáo lừa đảo & rủi ro",
            })
          ).toBeVisible();

          await reporterPage.getByLabel(/^Tên chủ tài khoản/u).fill(holderName);
          await reporterPage.getByLabel(/^Số tài khoản/u).fill(accountNumber);
          await reporterPage.getByLabel(/^Ngân hàng/u).fill(bankName);
          await reporterPage
            .getByLabel(/^Số tiền chiếm đoạt \(VNĐ\)/u)
            .fill("1500000");
          await reporterPage
            .getByLabel("Tải ảnh Bill, đoạn chat giao dịch, bằng chứng...", {
              exact: true,
            })
            .setInputFiles({
              buffer: evidenceBuffer,
              mimeType: "image/png",
              name: "e2e-payment-proof.png",
            });
          await expect(
            reporterPage.getByText("e2e-payment-proof.png", { exact: true })
          ).toBeVisible();
          await reporterPage.getByLabel(/^Nội dung tố cáo/u).fill(narrative);
          await reporterPage
            .getByRole("checkbox", { name: /Tôi cam kết/u })
            .check();

          const saveDraftResponse = waitForPost(
            reporterPage,
            "/rpc/protection/riskReport/saveDraft"
          );
          const evidenceUploadResponse = waitForPost(
            reporterPage,
            "/api/risk-report-evidence-upload"
          );
          const addEvidenceResponse = waitForPost(
            reporterPage,
            "/rpc/protection/riskReport/addEvidence"
          );
          const previewResponse = waitForPost(
            reporterPage,
            "/rpc/protection/riskReport/preview"
          );
          const submitResponse = waitForPost(
            reporterPage,
            "/rpc/protection/riskReport/submit"
          );

          await reporterPage
            .getByRole("button", { exact: true, name: "Gửi duyệt tố cáo" })
            .click();

          const saveResponse = await saveDraftResponse;
          expect(saveResponse.ok()).toBe(true);
          reportId = await getReportIdFromDraftResponse(saveResponse);
          withRiskReportCleanup(reportId);

          const uploadResponse = await evidenceUploadResponse;
          expect(uploadResponse.ok()).toBe(true);
          const addEvidence = await addEvidenceResponse;
          expect(addEvidence.ok()).toBe(true);
          const preview = await previewResponse;
          expect(preview.ok()).toBe(true);
          const submit = await submitResponse;
          expect(submit.ok()).toBe(true);

          await expect(
            reporterPage.getByRole("heading", {
              level: 2,
              name: "Gửi Tố Cáo Thành Công!",
            })
          ).toBeVisible();
        });

        await test.step("reporter sees the submitted report", async () => {
          await reporterPage
            .getByRole("button", {
              exact: true,
              name: "Xem danh sách báo cáo của tôi",
            })
            .click();
          await expect(reporterPage).toHaveURL(/\/avin-check\/reports$/u);
          const reportCard = reporterPage
            .locator('[data-slot="card"]')
            .filter({ hasText: bankName });
          await expect(reportCard).toBeVisible();
          await expect(reportCard).toContainText("Đã gửi");
        });

        await test.step("moderator opens the submitted report", async () => {
          await page.goto("/avin-check/risk-reports");
          await expect(
            page.getByRole("heading", {
              level: 1,
              name: "Hàng đợi Risk Moderator",
            })
          ).toBeVisible();
          await page
            .getByRole("textbox", { exact: true, name: "Tìm risk report" })
            .fill(accountNumber);

          const reviewLink = page.getByRole("link", {
            exact: true,
            name: "Xem & xử lý",
          });
          const reportRow = page.getByRole("row").filter({ has: reviewLink });
          await expect(reportRow).toHaveCount(1);
          await expect(reportRow).toContainText("Đã gửi");
          await reviewLink.click();
          await expect(page).toHaveURL(
            new RegExp(`/avin-check/risk-reports/${reportId}$`, "u")
          );
          await expect(
            page.getByRole("heading", { level: 1, name: reportId })
          ).toBeVisible();
          await expect(
            page.getByText(narrative, { exact: true }).first()
          ).toBeVisible();
          await expect(
            page.getByText("Bằng chứng đính kèm (1)", { exact: true })
          ).toBeVisible();
        });

        await test.step("moderator cannot publish before registering a derivative", async () => {
          const blockedDecisionResponse = waitForPost(
            page,
            "/rpc/protection/adminRiskReports/decide"
          );
          await page
            .getByRole("button", {
              exact: true,
              name: "Duyệt & công khai warning",
            })
            .click();
          await expect(
            page.getByText("Xác nhận: Đã công khai", { exact: true })
          ).toBeVisible();
          await page
            .getByRole("button", { exact: true, name: "Xác nhận" })
            .click();

          const blockedDecision = await blockedDecisionResponse;
          expect(blockedDecision.ok()).toBe(false);
          const blockedDecisionBody = await blockedDecision.text();
          expect(blockedDecisionBody.toLowerCase()).toContain("derivative");
          await page.getByRole("button", { exact: true, name: "Huỷ" }).click();
        });

        await test.step("moderator registers the public derivative", async () => {
          await page
            .getByRole("button", {
              exact: true,
              name: "Tuỳ chọn: Đăng ký bản derivative che PII thủ công...",
            })
            .click();
          await page
            .getByRole("checkbox", {
              exact: true,
              name: "Đã xoá metadata nhạy cảm khỏi bản derivative.",
            })
            .check();
          await page
            .getByRole("checkbox", {
              exact: true,
              name: "Đã che PII không liên quan và nội dung ngoài phạm vi warning.",
            })
            .check();
          await page
            .getByRole("checkbox", {
              exact: true,
              name: "Đã đóng watermark Avin Check lên derivative.",
            })
            .check();

          const derivativeUploadResponse = waitForPost(
            page,
            "/api/risk-report-derivative-upload"
          );
          const derivativeRegisterResponse = waitForPost(
            page,
            "/rpc/protection/adminRiskReports/registerDerivative"
          );
          await page
            .getByLabel("Chọn derivative", { exact: true })
            .setInputFiles({
              buffer: evidenceBuffer,
              mimeType: "image/png",
              name: "e2e-payment-proof-derivative.png",
            });

          const derivativeUpload = await derivativeUploadResponse;
          expect(derivativeUpload.ok()).toBe(true);
          const derivativeRegister = await derivativeRegisterResponse;
          expect(derivativeRegister.ok()).toBe(true);
          await expect(
            page.getByText("Derivative đã đăng ký", { exact: true })
          ).toBeVisible();
        });

        await test.step("moderator publishes the warning", async () => {
          const decisionResponse = waitForPost(
            page,
            "/rpc/protection/adminRiskReports/decide"
          );
          await page
            .getByRole("button", {
              exact: true,
              name: "Duyệt & công khai warning",
            })
            .click();
          await expect(
            page.getByText("Xác nhận: Đã công khai", { exact: true })
          ).toBeVisible();
          await page
            .getByRole("button", { exact: true, name: "Xác nhận" })
            .click();

          const decision = await decisionResponse;
          expect(decision.ok()).toBe(true);
          await expect(
            page.getByText(/Trạng thái: Đã công khai/u)
          ).toBeVisible();
        });

        await test.step("reporter sees the published warning", async () => {
          await reporterPage.goto("/avin-check/reports");
          const reportCard = reporterPage
            .locator('[data-slot="card"]')
            .filter({ hasText: bankName });
          await expect(reportCard).toBeVisible();
          await expect(reportCard).toContainText("Đã công khai");

          await reporterPage.goto(`/avin-check/warning/warning-${reportId}`);
          await expect(reporterPage).toHaveURL(
            new RegExp(`/avin-check/warning/warning-${reportId}$`, "u")
          );
          await expect(
            reporterPage.getByText("Thông tin cảnh báo", { exact: true })
          ).toBeVisible();
          await expect(
            reporterPage.getByText("Đã công khai", { exact: true })
          ).toBeVisible();
        });
      } finally {
        await reporterContext.close();
      }
    });
  }
);
