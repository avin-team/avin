import { describe, expect, it } from "vitest";

import { riskReportWithdrawalFormSchema } from "./risk-report-workspace-schema";

describe("risk report workspace form schema", () => {
  it("requires a meaningful withdrawal reason", () => {
    expect(
      riskReportWithdrawalFormSchema.safeParse({ reason: "quá ngắn" }).success
    ).toBe(false);
  });

  it("accepts a reason with at least ten characters", () => {
    expect(
      riskReportWithdrawalFormSchema.safeParse({
        reason: "Đã giải quyết ổn thỏa",
      }).success
    ).toBe(true);
  });
});
