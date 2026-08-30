import { describe, expect, it } from "vitest";

import {
  providerRiskIncidentDecisionFormSchema,
  providerRiskIncidentLinkFormSchema,
} from "./provider-risk-incident-form-schema";

describe("provider risk incident form schemas", () => {
  it("requires a decision reason", () => {
    expect(
      providerRiskIncidentDecisionFormSchema.safeParse({ reason: "" }).success
    ).toBe(false);
    expect(
      providerRiskIncidentDecisionFormSchema.safeParse({
        reason: "Đã đối soát.",
      }).success
    ).toBe(true);
  });

  it("requires a Provider profile for linking", () => {
    expect(
      providerRiskIncidentLinkFormSchema.safeParse({ profileId: "" }).success
    ).toBe(false);
  });
});
