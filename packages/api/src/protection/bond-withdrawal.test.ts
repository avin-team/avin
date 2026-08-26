import { describe, expect, it } from "vitest";

import {
  assertProviderBondWithdrawalTransition,
  PROVIDER_BOND_WITHDRAWAL_COOLING_DAYS,
  providerBondWithdrawalApprovalInputSchema,
  providerBondWithdrawalRecordInputSchema,
  providerBondWithdrawalRequestInputSchema,
} from "./bond-withdrawal";

const withdrawalId = "00000000-0000-4000-8000-000000000001";

describe("Provider Bond Withdrawal contract", () => {
  it("defines the exact 30-day cooling period", () => {
    expect(PROVIDER_BOND_WITHDRAWAL_COOLING_DAYS).toBe(30);
    expect(() =>
      assertProviderBondWithdrawalTransition("COOLING", "PENDING_APPROVAL")
    ).not.toThrow();
    expect(() =>
      assertProviderBondWithdrawalTransition("COOLING", "COMPLETED")
    ).toThrow("is not allowed");
  });

  it("requires private reconciliation evidence before recording completion", () => {
    const result = providerBondWithdrawalRecordInputSchema.safeParse({
      externalActionReference: "bank-transfer-1",
      privateEvidenceReference: "evidence/withdrawal-1",
      reason: "Đã hoàn trả toàn bộ Bond ngoài hệ thống.",
      withdrawalId,
    });
    expect(result.success).toBe(true);

    expect(
      providerBondWithdrawalRecordInputSchema.safeParse({
        externalActionReference: "bank-transfer-1",
        reason: "Thiếu evidence private.",
        withdrawalId,
      }).success
    ).toBe(false);
  });

  it("accepts an optional Provider request reason and validates rejection reasons", () => {
    expect(
      providerBondWithdrawalRequestInputSchema.parse({
        reason: "Tôi muốn rút khỏi chương trình.",
      })
    ).toEqual({ reason: "Tôi muốn rút khỏi chương trình." });
    expect(
      providerBondWithdrawalApprovalInputSchema.safeParse({
        decision: "REJECTED",
        withdrawalId,
      }).success
    ).toBe(false);
    expect(() =>
      providerBondWithdrawalApprovalInputSchema.parse({
        decision: "REJECTED",
        reason: "Không đủ điều kiện hoàn trả.",
        withdrawalId,
      })
    ).not.toThrow();
  });
});
