import { describe, expect, it } from "vitest";

import { protectionPolicyFormSchema } from "./protection-policy-form-schema";

const validValues = {
  bronzeMinimumBondAmount: "5000000",
  changedAreas: "bond, reacceptance",
  diamondMinimumBondAmount: "50000000",
  effectiveAt: "2030-01-01T09:00",
  goldMinimumBondAmount: "20000000",
  materialChange: true,
  membershipFeeAmount: "0",
  minimumBondAmount: "1000000",
  rationale: "Cập nhật chính sách Bond.",
  reacceptDeadlineAt: "2030-02-01T09:00",
  recommendedLimitPercentage: "80",
  recommendedLimitRounding: "100000",
  retentionPolicyReference: "LEGAL_DATA_GOVERNANCE_APPROVAL_REQUIRED",
  silverMinimumBondAmount: "10000000",
  summary: "Tóm tắt policy.",
  terms: "Điều khoản policy.",
  title: "Policy 2030",
  version: "2030.1",
  vipMinimumBondAmount: "100000000",
};

describe("protectionPolicyFormSchema", () => {
  it("accepts a valid policy", () => {
    expect(protectionPolicyFormSchema.safeParse(validValues).success).toBe(
      true
    );
  });

  it("requires a deadline for material changes and increasing thresholds", () => {
    expect(
      protectionPolicyFormSchema.safeParse({
        ...validValues,
        reacceptDeadlineAt: "",
      }).success
    ).toBe(false);
    expect(
      protectionPolicyFormSchema.safeParse({
        ...validValues,
        vipMinimumBondAmount: "1000000",
      }).success
    ).toBe(false);
  });
});
