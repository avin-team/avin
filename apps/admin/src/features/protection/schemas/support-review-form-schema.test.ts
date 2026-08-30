import { describe, expect, it } from "vitest";

import {
  createSupportReviewOutcomeFormSchema,
  supportReviewApprovalFormSchema,
  supportReviewEligibilityFormSchema,
  supportReviewReconsiderationFormSchema,
} from "./support-review-form-schema";

describe("support review form schemas", () => {
  it("validates eligibility inputs", () => {
    const result = supportReviewEligibilityFormSchema.safeParse({
      actualLoss: "100000",
      approvedServiceConfirmed: true,
      channel: "FACEBOOK",
      evidenceSufficient: true,
      preTransactionVideoPresent: true,
      privateEvidenceReference: "evidence/support-1",
      profileVersionId: "version-1",
      providerIdentityConfirmed: true,
      reason: "Đã đối soát đầy đủ.",
      registeredPaymentIdentityConfirmed: true,
      requiredProcessCompleted: true,
      scope: "DIRECT",
      transactionAt: "2025-01-01T10:00",
      transactionLawfulConfirmed: true,
    });
    expect(result.success).toBe(true);
  });

  it("enforces outcome allocation rules", () => {
    expect(
      createSupportReviewOutcomeFormSchema(1000).safeParse({
        evidenceReference: "evidence/support-1",
        externalReference: "bank-transfer-1",
        outcome: "HANDLED_BY_PROVIDER",
        reason: "Provider đã xử lý.",
        supportAmount: "1001",
      }).success
    ).toBe(false);
    expect(
      createSupportReviewOutcomeFormSchema(1000).safeParse({
        evidenceReference: "evidence/support-1",
        externalReference: "bank-transfer-1",
        outcome: "HANDLED_BY_PROGRAM",
        reason: "Đã hỗ trợ.",
        supportAmount: "500",
      }).success
    ).toBe(true);
  });

  it("requires reasons and new evidence where applicable", () => {
    expect(
      supportReviewApprovalFormSchema.safeParse({
        decision: "REJECTED",
        reason: "",
      }).success
    ).toBe(false);
    expect(
      supportReviewReconsiderationFormSchema.safeParse({
        basis: "NEW_EVIDENCE",
        evidenceReference: "",
        reason: "Có bằng chứng mới.",
      }).success
    ).toBe(false);
  });
});
