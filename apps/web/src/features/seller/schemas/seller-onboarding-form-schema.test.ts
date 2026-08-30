import { describe, expect, it } from "vitest";

import { createSellerOnboardingFormSchema } from "./seller-onboarding-form-schema";

const baseValues = {
  accountName: "NGUYEN VAN A",
  accountNumber: "1234567890",
  agreementAccepted: true,
  avatarUrl: "https://cdn.example.com/logo.png",
  bankName: "VCB",
  bio: "Dịch vụ uy tín",
  phone: "0900000000",
  storefrontName: "Avin Store",
};

describe("seller onboarding form schema", () => {
  it("accepts complete step one and step two values", () => {
    expect(
      createSellerOnboardingFormSchema(1).safeParse(baseValues).success
    ).toBe(true);
    expect(
      createSellerOnboardingFormSchema(2).safeParse(baseValues).success
    ).toBe(true);
  });

  it("requires bank details and agreement on step two", () => {
    expect(
      createSellerOnboardingFormSchema(2).safeParse({
        ...baseValues,
        accountNumber: "",
        agreementAccepted: false,
      }).success
    ).toBe(false);
  });
});
