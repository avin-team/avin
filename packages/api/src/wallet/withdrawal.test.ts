import { describe, expect, it } from "vitest";

import {
  getWithdrawalStatusTransition,
  validateWithdrawalAmount,
  WITHDRAWAL_MINIMUM_AMOUNT,
} from "./withdrawal";

describe("seller withdrawal rules", () => {
  it("requires the minimum withdrawal amount", () => {
    expect(() =>
      validateWithdrawalAmount(WITHDRAWAL_MINIMUM_AMOUNT - 1)
    ).toThrow("Withdrawal amount must be at least 5000 VND");
    expect(() =>
      validateWithdrawalAmount(WITHDRAWAL_MINIMUM_AMOUNT)
    ).not.toThrow();
  });

  it("allows only the documented withdrawal lifecycle transitions", () => {
    expect(getWithdrawalStatusTransition("REQUESTED", "APPROVE")).toBe(
      "APPROVED"
    );
    expect(getWithdrawalStatusTransition("APPROVED", "MARK_PAID")).toBe("PAID");
    expect(getWithdrawalStatusTransition("REQUESTED", "CANCEL")).toBe(
      "CANCELLED"
    );
    expect(getWithdrawalStatusTransition("APPROVED", "REJECT")).toBe(
      "REJECTED"
    );
    expect(() => getWithdrawalStatusTransition("PAID", "REJECT")).toThrow(
      "Withdrawal request cannot transition from PAID"
    );
  });
});
