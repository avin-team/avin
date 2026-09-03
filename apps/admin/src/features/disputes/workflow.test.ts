import { describe, expect, it } from "vitest";

import { canResolveDispute } from "./workflow";

describe("Dispute workflow", () => {
  it("checks whether dispute can be resolved", () => {
    expect(canResolveDispute("OPEN")).toBe(true);
    expect(canResolveDispute("UNDER_REVIEW")).toBe(true);
    expect(canResolveDispute("RESOLVED_REFUNDED")).toBe(false);
    expect(canResolveDispute("RESOLVED_RELEASED")).toBe(false);
  });
});
