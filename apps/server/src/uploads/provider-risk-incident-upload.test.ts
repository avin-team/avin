import {
  PROVIDER_RISK_INCIDENT_EVIDENCE_UPLOAD_ROUTE,
  RISK_REPORT_EVIDENCE_CONTENT_TYPES,
  RISK_REPORT_EVIDENCE_MAX_BYTES,
} from "@avin/api/storage";
import { custom } from "@better-upload/server/clients";
import { describe, expect, it, vi } from "vitest";

const { assertUploadAccess, getAuthSession } = vi.hoisted(() => ({
  assertUploadAccess: vi.fn(),
  getAuthSession: vi.fn(),
}));

vi.mock("@avin/api/protection/provider-risk-incident-service", () => ({
  assertProviderRiskIncidentEvidenceUploadAccess: assertUploadAccess,
}));

vi.mock("@avin/auth", () => ({
  adminAuth: { api: { getSession: vi.fn() } },
  auth: { api: { getSession: getAuthSession } },
}));

vi.mock("@avin/db", () => ({
  db: { query: { listing: { findFirst: vi.fn() } } },
}));

const { createProviderRiskIncidentEvidenceUploadRouter } =
  await import("./listing-image-upload");

const client = custom({
  accessKeyId: "test",
  host: "localhost",
  region: "test",
  secretAccessKey: "test",
  secure: false,
});

describe("Provider risk incident upload route", () => {
  it("requires the Avin auth session and keeps evidence private", async () => {
    getAuthSession.mockResolvedValue({ user: { id: "provider-1" } });
    assertUploadAccess.mockResolvedValue(null);
    const uploadRouter = createProviderRiskIncidentEvidenceUploadRouter(client);
    const routeFactory =
      uploadRouter.routes[PROVIDER_RISK_INCIDENT_EVIDENCE_UPLOAD_ROUTE];
    if (!routeFactory) {
      throw new Error("Provider incident evidence route is not configured");
    }
    const route = routeFactory();
    const file = {
      name: "provider-proof.pdf",
      size: 100,
      type: "application/pdf",
    };
    const req = new Request(
      "http://localhost/api/provider-risk-incident-evidence-upload"
    );

    const result = await route.onBeforeUpload?.({
      clientMetadata: {
        incidentId: "11111111-1111-4111-8111-111111111111",
        kind: "OTHER",
      },
      files: [file],
      req,
    });

    expect(getAuthSession).toHaveBeenCalledWith({ headers: req.headers });
    expect(assertUploadAccess).toHaveBeenCalledWith({
      database: expect.anything(),
      files: [file],
      incidentId: "11111111-1111-4111-8111-111111111111",
      providerUserId: "provider-1",
    });
    expect(uploadRouter.bucketName).toBe("order-files");
    expect(route.fileTypes).toEqual([...RISK_REPORT_EVIDENCE_CONTENT_TYPES]);
    expect(route.maxFileSize).toBe(RISK_REPORT_EVIDENCE_MAX_BYTES);
    const object = await result?.generateObjectInfo?.({ file });
    expect(object?.cacheControl).toBe("private, max-age=0");
    expect(object?.key).toMatch(
      /^risk-incidents\/private\/11111111-1111-4111-8111-111111111111\/provider-1\/[a-f0-9-]{36}\.pdf$/iu
    );
  });
});
