import { describe, expect, it } from "vitest";

import {
  createProviderBondWithdrawalApprovalFormSchema,
  providerBondWithdrawalRecordFormSchema,
} from "./provider-bond-withdrawal-form-schema";

describe("providerBondWithdrawalRecordFormSchema", () => {
  it("requires all reconciliation fields", () => {
    expect(
      providerBondWithdrawalRecordFormSchema.safeParse({
        externalActionReference: "bank-transfer-1",
        privateEvidenceReference: "evidence/withdrawal-1",
        reason: "Đã hoàn trả toàn bộ Bond ngoài hệ thống.",
      }).success
    ).toBe(true);
    expect(
      providerBondWithdrawalRecordFormSchema.safeParse({
        externalActionReference: "bank-transfer-1",
        privateEvidenceReference: "",
        reason: "Ghi nhận.",
      }).success
    ).toBe(false);
  });
});

describe("createProviderBondWithdrawalApprovalFormSchema", () => {
  it("requires a reason only when rejecting", () => {
    expect(
      createProviderBondWithdrawalApprovalFormSchema("APPROVED").safeParse({
        reason: "",
      }).success
    ).toBe(true);
    expect(
      createProviderBondWithdrawalApprovalFormSchema("REJECTED").safeParse({
        reason: "",
      }).success
    ).toBe(false);
  });
});
