import { describe, expect, it } from "vitest";

import { checkoutInputSchema } from "./checkout-input";

const baseInput = {
  confirmMaterialChanges: false,
  idempotencyKey: "checkout-key-123456",
  items: [
    {
      contractFingerprint: "a".repeat(64),
      listingId: "00000000-0000-4000-8000-000000000001",
    },
  ],
};

describe("checkout input", () => {
  it("normalizes an omitted buyer description to an empty optional value", () => {
    expect(checkoutInputSchema.parse(baseInput).items[0]?.description).toBe("");
  });

  it("accepts a buyer description up to 1000 characters", () => {
    expect(
      checkoutInputSchema.parse({
        ...baseInput,
        items: [{ ...baseInput.items[0], description: "x".repeat(1000) }],
      }).items[0]?.description
    ).toHaveLength(1000);
  });

  it("rejects a buyer description over 1000 characters", () => {
    expect(() =>
      checkoutInputSchema.parse({
        ...baseInput,
        items: [{ ...baseInput.items[0], description: "x".repeat(1001) }],
      })
    ).toThrow();
  });
});
