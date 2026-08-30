import { describe, expect, it } from "vitest";

import { buyerDisputeCancellationSchema } from "./order-action-schemas";

describe("buyerDisputeCancellationSchema", () => {
  it("requires a cancellation reason", () => {
    expect(
      buyerDisputeCancellationSchema.safeParse({ reason: "" }).success
    ).toBe(false);
    expect(
      buyerDisputeCancellationSchema.safeParse({
        reason: "Không cần hỗ trợ nữa.",
      }).success
    ).toBe(true);
  });
});
