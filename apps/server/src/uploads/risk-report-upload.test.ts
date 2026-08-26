import {
  RISK_REPORT_DERIVATIVE_UPLOAD_ROUTE,
  RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES,
  RISK_REPORT_EVIDENCE_UPLOAD_ROUTE,
  RISK_REPORT_NATIVE_EVIDENCE_CONTENT_TYPES,
} from "@avin/api/storage";
import { custom } from "@better-upload/server/clients";
import { describe, expect, it, vi } from "vitest";

import {
  createRiskReportDerivativeUploadRouter,
  createRiskReportEvidenceUploadRouter,
} from "./listing-image-upload";

const REPORT_ID = "11111111-1111-4111-8111-111111111111";
const EVIDENCE_ID = "22222222-2222-4222-8222-222222222222";
const UPLOAD_ID = "33333333-3333-4333-8333-333333333333";

const {
  assertProtectionAdminAccess,
  assertRiskReportEvidenceUploadAccess,
  getAdminSession,
  getAuthSession,
  loadProtectionAdminCapabilities,
} = vi.hoisted(() => ({
  assertProtectionAdminAccess: vi.fn(),
  assertRiskReportEvidenceUploadAccess: vi.fn(),
  getAdminSession: vi.fn(),
  getAuthSession: vi.fn(),
  loadProtectionAdminCapabilities: vi.fn(),
}));

vi.mock("@avin/api/protection/capabilities", () => ({
  loadProtectionAdminCapabilities,
}));

vi.mock("@avin/api/protection/procedures", () => ({
  assertProtectionAdminAccess,
}));

vi.mock("@avin/api/protection/risk-report-service", () => ({
  assertRiskReportEvidenceUploadAccess,
}));

vi.mock("@avin/auth", () => ({
  adminAuth: { api: { getSession: getAdminSession } },
  auth: { api: { getSession: getAuthSession } },
}));

vi.mock("@avin/db", () => ({
  db: { query: { listing: { findFirst: vi.fn() } } },
}));

const client = custom({
  accessKeyId: "test",
  host: "localhost",
  region: "test",
  secretAccessKey: "test",
  secure: false,
});

describe("risk report upload routes", () => {
  it("keeps reporter evidence private and delegates ownership checks", async () => {
    getAuthSession.mockResolvedValue({
      user: { banned: false, id: "reporter-1", role: "BUYER" },
    });
    assertRiskReportEvidenceUploadAccess.mockResolvedValue(null);
    const uploadRouter = createRiskReportEvidenceUploadRouter(client);
    const routeFactory = uploadRouter.routes[RISK_REPORT_EVIDENCE_UPLOAD_ROUTE];
    if (!routeFactory) {
      throw new Error("Risk report evidence route is not configured");
    }
    const route = routeFactory();
    const file = {
      name: "payment-proof.pdf",
      size: 100,
      type: "application/pdf",
    };

    const result = await route.onBeforeUpload?.({
      clientMetadata: {
        kind: "PAYMENT_PROOF",
        reportId: REPORT_ID,
        uploadId: UPLOAD_ID,
      },
      files: [file],
      req: new Request("http://localhost/api/risk-report-evidence-upload"),
    });

    expect(uploadRouter.bucketName).toBe("order-files");
    expect(route.fileTypes).toEqual([
      ...RISK_REPORT_NATIVE_EVIDENCE_CONTENT_TYPES,
    ]);
    expect(route.maxFileSize).toBe(RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES);
    expect(assertRiskReportEvidenceUploadAccess).toHaveBeenCalledWith({
      database: expect.anything(),
      files: [file],
      reportId: REPORT_ID,
      reporterUserId: "reporter-1",
    });
    const object = await result?.generateObjectInfo?.({ file });
    expect(object?.key).toBe(
      `risk-reports/private/${REPORT_ID}/${UPLOAD_ID}.pdf`
    );
  });

  it("requires a Risk Moderator session for public derivative uploads", async () => {
    getAdminSession.mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN", twoFactorEnabled: true },
    });
    loadProtectionAdminCapabilities.mockResolvedValue({});
    assertProtectionAdminAccess.mockReturnValue(null);
    const uploadRouter = createRiskReportDerivativeUploadRouter(client);
    const routeFactory =
      uploadRouter.routes[RISK_REPORT_DERIVATIVE_UPLOAD_ROUTE];
    if (!routeFactory) {
      throw new Error("Risk report derivative route is not configured");
    }
    const route = routeFactory();
    const file = {
      name: "redacted-proof.png",
      size: 100,
      type: "image/png",
    };

    const result = await route.onBeforeUpload?.({
      clientMetadata: { evidenceId: EVIDENCE_ID, reportId: REPORT_ID },
      files: [file],
      req: new Request("http://localhost/api/risk-report-derivative-upload"),
    });

    expect(uploadRouter.bucketName).toBe("public-media");
    expect(assertProtectionAdminAccess).toHaveBeenCalled();
    const object = await result?.generateObjectInfo?.({ file });
    expect(object?.key).toMatch(
      new RegExp(
        `^risk-reports/public/${REPORT_ID}/${EVIDENCE_ID}/[a-f0-9-]{36}\\.png$`,
        "iu"
      )
    );
  });
});
