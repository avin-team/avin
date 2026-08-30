import { describe, expect, it } from "vitest";

import {
  providerBondAdjustmentFormSchema,
  providerDepositIntentDecisionFormSchema,
} from "./provider-bond-form-schema";

describe("provider bond form schemas", () => {
  it("requires evidence for Bond increases", () => {
    expect(
      providerBondAdjustmentFormSchema.safeParse({
        amount: "1000000",
        evidenceReference: "evidence/bond-1",
        externalBankReference: "bank-transfer-1",
        kind: "DEPOSIT",
        profileId: "profile-1",
        reason: "Đã đối soát khoản nạp.",
      }).success
    ).toBe(true);
    expect(
      providerBondAdjustmentFormSchema.safeParse({
        amount: "1000000",
        evidenceReference: "",
        externalBankReference: "",
        kind: "DEPOSIT",
        profileId: "profile-1",
        reason: "Thiếu chứng từ.",
      }).success
    ).toBe(false);
  });

  it("requires refund references and validates source IDs", () => {
    expect(
      providerDepositIntentDecisionFormSchema.safeParse({
        decision: "REFUND",
        matchedAmount: "",
        reason: "Đã xác minh và hoàn tiền.",
        refundBankReference: "bank-ref-1",
        sourceEventIds: "",
      }).success
    ).toBe(true);
    expect(
      providerDepositIntentDecisionFormSchema.safeParse({
        decision: "REFUND",
        matchedAmount: "",
        reason: "Đã xác minh và hoàn tiền.",
        refundBankReference: "",
        sourceEventIds: "",
      }).success
    ).toBe(false);
  });
});
