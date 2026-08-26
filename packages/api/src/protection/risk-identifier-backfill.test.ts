import { describe, expect, it } from "vitest";

import { buildRiskIdentifierBackfillPlan } from "./risk-identifier-backfill";

const createRow = (
  overrides: Partial<{
    id: string;
    maskedValue: string;
    normalizedValue: string;
    publicValue: string | null;
    reportId: string;
    type: "BANK_ACCOUNT" | "PHONE" | "SOCIAL_ACCOUNT" | "WEBSITE";
    value: string;
  }> = {}
) => ({
  id: "identifier-1",
  maskedValue: "legacy-mask",
  normalizedValue: "legacy-value",
  publicValue: null,
  reportId: "report-1",
  type: "WEBSITE" as const,
  value: "Example.com/checkout?token=secret",
  ...overrides,
});

describe("risk identifier backfill", () => {
  it("plans canonical field updates without changing the original value", () => {
    const [change] = buildRiskIdentifierBackfillPlan([createRow()]).changes;

    expect(change).toMatchObject({
      id: "identifier-1",
      nextMaskedValue: "example.com",
      nextNormalizedValue: "https://example.com/checkout",
      nextPublicValue: "example.com/checkout",
      previousNormalizedValue: "legacy-value",
    });
  });

  it("is idempotent and reports cross-report canonical collisions", () => {
    const rows = [
      createRow({
        id: "identifier-phone-1",
        maskedValue: "091***678",
        normalizedValue: "0912345678",
        reportId: "report-1",
        type: "PHONE",
        value: "+84 912-345-678",
      }),
      createRow({
        id: "identifier-phone-2",
        maskedValue: "legacy-mask",
        normalizedValue: "84912345678",
        reportId: "report-2",
        type: "PHONE",
        value: "0912 345 678",
      }),
    ];

    const firstPlan = buildRiskIdentifierBackfillPlan(rows);
    expect(firstPlan.changes).toHaveLength(1);
    expect(firstPlan.unchangedCount).toBe(1);
    expect(firstPlan.collisions).toEqual([
      {
        identifierIds: ["identifier-phone-1", "identifier-phone-2"],
        normalizedValue: "0912345678",
        reportIds: ["report-1", "report-2"],
        type: "PHONE",
      },
    ]);
  });

  it("does not write malformed profile links", () => {
    const plan = buildRiskIdentifierBackfillPlan([
      createRow({
        type: "SOCIAL_ACCOUNT",
        value: "https://facebook.com/groups/example",
      }),
    ]);

    expect(plan.changes).toHaveLength(0);
    expect(plan.invalid).toMatchObject([
      {
        id: "identifier-1",
        type: "SOCIAL_ACCOUNT",
      },
    ]);
  });
});
