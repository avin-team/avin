import { describe, expect, it } from "vitest";

import { riskReportCorrectionFormSchema } from "./risk-report-correction-form-schema";

describe("risk report correction form schema", () => {
  it("rejects incomplete correction requests", () => {
    expect(
      riskReportCorrectionFormSchema.safeParse({
        authorityEvidenceReference: "",
        reason: "quá ngắn",
        reportId: "",
        requesterRelationship: "SUBJECT",
      }).success
    ).toBe(false);
  });

  it("accepts a complete correction request", () => {
    expect(
      riskReportCorrectionFormSchema.safeParse({
        authorityEvidenceReference: "case-file-123",
        reason: "Thông tin trong cảnh báo cần được cập nhật theo hồ sơ mới.",
        reportId: "report-123",
        requesterRelationship: "AUTHORIZED_REPRESENTATIVE",
      }).success
    ).toBe(true);
  });
});
