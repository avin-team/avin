import { describe, expect, it } from "vitest";

import { calculateEscrowReleaseAmounts } from "./commission";

describe("escrow release commission", () => {
  it("floors the platform commission and preserves the escrow amount", () => {
    expect(calculateEscrowReleaseAmounts(999, 12.5)).toEqual({
      commissionAmount: 124,
      sellerProceeds: 875,
    });
  });

  it("supports zero and full commission without losing balance", () => {
    expect(calculateEscrowReleaseAmounts(1000, 0)).toEqual({
      commissionAmount: 0,
      sellerProceeds: 1000,
    });
    expect(calculateEscrowReleaseAmounts(1000, 100)).toEqual({
      commissionAmount: 1000,
      sellerProceeds: 0,
    });
  });
});
