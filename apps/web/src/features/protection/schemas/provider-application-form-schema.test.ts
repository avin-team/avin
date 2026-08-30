import { describe, expect, it } from "vitest";

import { providerApplicationFormSchema } from "./provider-application-form-schema";

const validValues = {
  bio: "Tư vấn uy tín",
  bondAmount: 1_000_000,
  citizenIdNumber: "079123456789",
  facebooks: [{ id: "fb-1", url: "https://facebook.com/avin" }],
  fullName: "Nguyễn Văn A",
  location: "Thành phố Hồ Chí Minh",
  officialChannels: {
    avatarUrl: "",
    hotline: "0900000000",
    telegramCommunityUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    youtubeUrl: "",
  },
  policyAccepted: true,
  publicDataConsent: true,
  registeredBankAccounts: [
    {
      accountName: "NGUYEN VAN A",
      accountNumber: "1234567890",
      bankCode: "VCB",
      id: "bank-1",
      isPrimary: true,
    },
  ],
  services: "Tư vấn và hỗ trợ giao dịch an toàn.",
  zalos: [{ id: "zalo-1", phone: "0900000000" }],
};

describe("provider application form schema", () => {
  it("accepts a complete provider application", () => {
    expect(providerApplicationFormSchema.safeParse(validValues).success).toBe(
      true
    );
  });

  it("rejects an incomplete identity and bank account", () => {
    expect(
      providerApplicationFormSchema.safeParse({
        ...validValues,
        citizenIdNumber: "123",
        registeredBankAccounts: [
          { ...validValues.registeredBankAccounts[0], isPrimary: false },
        ],
      }).success
    ).toBe(false);
  });

  it("rejects malformed channel URLs", () => {
    expect(
      providerApplicationFormSchema.safeParse({
        ...validValues,
        officialChannels: {
          ...validValues.officialChannels,
          websiteUrl: "https://",
        },
      }).success
    ).toBe(false);
  });
});
