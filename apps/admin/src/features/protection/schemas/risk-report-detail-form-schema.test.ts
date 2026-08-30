import { describe, expect, it } from "vitest";

import {
  createRiskReportDecisionFormSchema,
  riskReportDerivativeFormSchema,
} from "./risk-report-detail-form-schema";

describe("riskReportDerivativeFormSchema", () => {
  it("requires all derivative checks", () => {
    expect(
      riskReportDerivativeFormSchema.safeParse({
        metadataRemoved: true,
        unrelatedPiiRedacted: true,
        watermarkApplied: true,
      }).success
    ).toBe(true);
    expect(
      riskReportDerivativeFormSchema.safeParse({
        metadataRemoved: true,
        unrelatedPiiRedacted: false,
        watermarkApplied: true,
      }).success
    ).toBe(false);
  });
});

describe("createRiskReportDecisionFormSchema", () => {
  it("requires a reason only for rejection", () => {
    expect(
      createRiskReportDecisionFormSchema("PUBLISHED").safeParse({
        reason: "",
      }).success
    ).toBe(true);
    expect(
      createRiskReportDecisionFormSchema("REJECTED").safeParse({
        reason: "",
      }).success
    ).toBe(false);
  });
});
