import { describe, expect, it } from "vitest";

import {
  isPolicyAcceptanceOverdue,
  protectionPolicyVersionPublishInputSchema,
} from "./policy";

const baseInput = {
  effectiveAt: "2026-09-01T00:00:00.000Z",
  materialChange: true,
  materialChangeMetadata: {
    changedAreas: ["support eligibility"],
    rationale: "Clarify the support eligibility process.",
  },
  membershipFeeAmount: 0,
  minimumBondAmount: 1_000_000,
  reacceptDeadlineAt: "2026-10-01T00:00:00.000Z",
  retentionPolicyReference: "LEGAL_DATA_GOVERNANCE_APPROVAL_REQUIRED",
  summary: "A versioned Provider policy.",
  terms: "Provider terms.",
  title: "Protection Program Policy",
  version: "v2.0",
};

describe("Protection policy contracts", () => {
  it("requires a later reacceptance deadline for material changes", () => {
    expect(() =>
      protectionPolicyVersionPublishInputSchema.parse({
        ...baseInput,
        reacceptDeadlineAt: null,
      })
    ).toThrow(/requires a reacceptance deadline/iu);

    expect(() =>
      protectionPolicyVersionPublishInputSchema.parse({
        ...baseInput,
        reacceptDeadlineAt: "2026-09-01T00:00:00.000Z",
      })
    ).toThrow(/must be after the effective time/iu);
  });

  it("does not accept deadlines on non-material policy versions", () => {
    expect(() =>
      protectionPolicyVersionPublishInputSchema.parse({
        ...baseInput,
        materialChange: false,
      })
    ).toThrow(/only material policy changes/iu);
  });

  it("keeps the P0 membership fee fixed at zero", () => {
    expect(() =>
      protectionPolicyVersionPublishInputSchema.parse({
        ...baseInput,
        membershipFeeAmount: 1,
      })
    ).toThrow();
  });

  it("marks only an unaccepted, material policy past its deadline as overdue", () => {
    const now = new Date("2026-10-02T00:00:00.000Z");
    const deadline = new Date("2026-10-01T00:00:00.000Z");

    expect(
      isPolicyAcceptanceOverdue({
        accepted: false,
        deadline,
        materialChange: true,
        now,
      })
    ).toBe(true);
    expect(
      isPolicyAcceptanceOverdue({
        accepted: true,
        deadline,
        materialChange: true,
        now,
      })
    ).toBe(false);
    expect(
      isPolicyAcceptanceOverdue({
        accepted: false,
        deadline,
        materialChange: false,
        now,
      })
    ).toBe(false);
  });
});
