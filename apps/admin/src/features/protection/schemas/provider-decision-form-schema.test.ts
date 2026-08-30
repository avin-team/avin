import { describe, expect, it } from "vitest";

import { providerDecisionFormSchema } from "./provider-decision-form-schema";

describe("providerDecisionFormSchema", () => {
  it("allows approval without a reason", () => {
    expect(
      providerDecisionFormSchema.safeParse({
        decision: "APPROVED",
        reason: "",
      }).success
    ).toBe(true);
  });

  it("requires a reason for changes or rejection", () => {
    expect(
      providerDecisionFormSchema.safeParse({
        decision: "REJECTED",
        reason: "",
      }).success
    ).toBe(false);
    expect(
      providerDecisionFormSchema.safeParse({
        decision: "CHANGES_REQUESTED",
        reason: "Bổ sung bằng chứng định danh.",
      }).success
    ).toBe(true);
  });
});
