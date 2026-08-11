import { describe, expect, it } from "vitest";

import {
  getSellerEnforcementTransition,
  isSellerEnforcementActive,
  shouldCancelBannedSellerItem,
} from "./policy";

describe("Seller Enforcement policy", () => {
  it("models the accepted lifecycle transitions", () => {
    expect(getSellerEnforcementTransition("CLEAR", "SUSPENDED")).toBe(
      "SUSPEND"
    );
    expect(getSellerEnforcementTransition("CLEAR", "BANNED")).toBe("BAN");
    expect(getSellerEnforcementTransition("SUSPENDED", "CLEAR")).toBe("LIFT");
    expect(getSellerEnforcementTransition("SUSPENDED", "BANNED")).toBe(
      "ESCALATE"
    );
    expect(getSellerEnforcementTransition("BANNED", "CLEAR")).toBe("OVERTURN");
    expect(() => getSellerEnforcementTransition("CLEAR", "CLEAR")).toThrow(
      "Seller Enforcement is already CLEAR"
    );
  });

  it("keeps a suspension active until the SYSTEM expiry action commits", () => {
    const now = new Date("2026-08-11T00:00:00.000Z");

    expect(
      isSellerEnforcementActive({ expiresAt: null, state: "SUSPENDED" }, now)
    ).toBe(true);
    expect(
      isSellerEnforcementActive(
        { expiresAt: new Date("2026-08-10T23:59:59.000Z"), state: "SUSPENDED" },
        now
      )
    ).toBe(true);
    expect(
      isSellerEnforcementActive({ expiresAt: null, state: "BANNED" }, now)
    ).toBe(true);
    expect(
      isSellerEnforcementActive({ expiresAt: null, state: "CLEAR" }, now)
    ).toBe(false);
  });

  it("cancels only unfulfilled non-disputed items after a ban", () => {
    expect(shouldCancelBannedSellerItem("AWAITING_SELLER", false)).toBe(true);
    expect(shouldCancelBannedSellerItem("IN_PROGRESS", false)).toBe(true);
    expect(shouldCancelBannedSellerItem("IN_PROGRESS", true)).toBe(false);
    expect(shouldCancelBannedSellerItem("DELIVERED", false)).toBe(false);
    expect(shouldCancelBannedSellerItem("IN_WARRANTY", false)).toBe(false);
    expect(shouldCancelBannedSellerItem("CLOSED", false)).toBe(false);
  });
});
