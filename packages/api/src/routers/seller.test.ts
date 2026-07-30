import { describe, expect, it } from "vitest";

import {
  requestPhoneOtpInputSchema,
  submitApplicationInputSchema,
  updateDraftProfileInputSchema,
  verifyPhoneOtpInputSchema,
} from "./seller";

describe("seller onboarding schemas & validation", () => {
  it("validates updateDraftProfile input", () => {
    const valid = updateDraftProfileInputSchema.safeParse({
      bio: "Shop game uy tín 24/7",
      storefrontName: "GameKey Store",
    });
    expect(valid.success).toBe(true);

    const invalidShortName = updateDraftProfileInputSchema.safeParse({
      storefrontName: "A",
    });
    expect(invalidShortName.success).toBe(false);
  });

  it("validates phone OTP request & verify inputs", () => {
    const validRequest = requestPhoneOtpInputSchema.safeParse({
      phone: "0901234567",
    });
    expect(validRequest.success).toBe(true);

    const invalidPhone = requestPhoneOtpInputSchema.safeParse({
      phone: "123",
    });
    expect(invalidPhone.success).toBe(false);

    const validVerify = verifyPhoneOtpInputSchema.safeParse({
      code: "123456",
      phone: "0901234567",
    });
    expect(validVerify.success).toBe(true);

    const invalidCode = verifyPhoneOtpInputSchema.safeParse({
      code: "1234",
      phone: "0901234567",
    });
    expect(invalidCode.success).toBe(false);
  });

  it("validates application submission input and agreement acceptance", () => {
    const valid = submitApplicationInputSchema.safeParse({
      bankAccount: {
        accountName: "NGUYEN VAN A",
        accountNumber: "1903123456789",
        bankName: "Techcombank",
      },
      sellerAgreementAccepted: true,
      sellerAgreementVersion: "v1.0",
    });
    expect(valid.success).toBe(true);

    const unacceptedAgreement = submitApplicationInputSchema.safeParse({
      bankAccount: {
        accountName: "NGUYEN VAN A",
        accountNumber: "1903123456789",
        bankName: "Techcombank",
      },
      sellerAgreementAccepted: false,
    });
    expect(unacceptedAgreement.success).toBe(false);
  });
});
