import { describe, expect, it } from "vitest";

import {
  createSellerEnforcementFormSchema,
  sellerAppealReviewFormSchema,
  sellerEnforcementReasonCorrectionFormSchema,
} from "./seller-enforcement-form-schema";

describe("seller enforcement form schemas", () => {
  it("requires a seller-visible reason and all ban confirmations", () => {
    const base = {
      adminNote: "",
      confirmEscrowHolds: false,
      confirmOrderItems: false,
      confirmWithdrawals: false,
      expiresAt: undefined,
      reasonCode: "POLICY_VIOLATION" as const,
      sellerReason: "",
    };

    expect(
      createSellerEnforcementFormSchema("BANNED").safeParse(base).success
    ).toBe(false);
    expect(
      createSellerEnforcementFormSchema("BANNED").safeParse({
        ...base,
        confirmEscrowHolds: true,
        confirmOrderItems: true,
        confirmWithdrawals: true,
        sellerReason: "Vi phạm chính sách marketplace.",
      }).success
    ).toBe(true);
  });

  it("does not require ban confirmations for suspension", () => {
    expect(
      createSellerEnforcementFormSchema("SUSPENDED").safeParse({
        adminNote: "",
        confirmEscrowHolds: false,
        confirmOrderItems: false,
        confirmWithdrawals: false,
        expiresAt: undefined,
        reasonCode: "FRAUD_RISK",
        sellerReason: "Cần tạm dừng để xác minh.",
      }).success
    ).toBe(true);
  });

  it("requires a reason for a correction", () => {
    expect(
      sellerEnforcementReasonCorrectionFormSchema.safeParse({
        adminNote: "",
        reasonCode: "OTHER",
        sellerReason: " ",
      }).success
    ).toBe(false);
  });

  it("requires an outcome reason except while an appeal is under review", () => {
    const base = {
      adminNote: "",
      outcomeReason: "",
      reasonCode: "POLICY_VIOLATION" as const,
    };
    expect(
      sellerAppealReviewFormSchema.safeParse({
        ...base,
        outcome: "UPHELD",
      }).success
    ).toBe(false);
    expect(
      sellerAppealReviewFormSchema.safeParse({
        ...base,
        outcome: "UNDER_REVIEW",
      }).success
    ).toBe(true);
  });
});
