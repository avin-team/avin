import { user } from "@avin/db/schema/auth";
import { describe, expect, it, vi } from "vitest";

import type { WalletExecutor } from "./ledger";
import {
  assertSellerCanRequestWithdrawal,
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

  it("locks the user specifically with { of: user } to support PostgreSQL outer join", async () => {
    const forUpdateMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([
        {
          role: "SELLER",
          sellerEnforcementExpiresAt: null,
          sellerEnforcementState: null,
        },
      ]),
    });

    const executor = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              for: forUpdateMock,
            }),
          }),
        }),
      }),
    } as unknown as WalletExecutor;

    await assertSellerCanRequestWithdrawal(executor, "seller-1", new Date());

    expect(forUpdateMock).toHaveBeenCalledWith("update", { of: user });
  });
});
