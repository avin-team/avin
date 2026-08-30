import { describe, expect, it } from "vitest";

import { reviewDecisionFormSchema } from "./review-decision-form-schema";

describe("review decision form schema", () => {
  it("allows approval without a reason", () => {
    expect(reviewDecisionFormSchema.safeParse({ reason: "" }).success).toBe(
      true
    );
  });

  it("limits the optional reason", () => {
    expect(
      reviewDecisionFormSchema.safeParse({ reason: "x".repeat(2001) }).success
    ).toBe(false);
  });
});
