import { describe, expect, it } from "vitest";

import {
  CURRENT_PROVIDER_POLICY_VERSION,
  assertProviderApplicationTransition,
  createProviderProfileSlug,
  validateProviderApplicationSubmission,
} from "./provider-application";

const validSubmission = {
  bondAmount: 5_000_000,
  citizenIdNumber: "123456789012",
  fullName: "Nguyen Provider",
  location: "Ho Chi Minh City",
  officialChannels: {
    facebookUrl: "https://facebook.com/provider-one",
    hotline: "0901234567",
    zalo: "0901234567",
  },
  policyAccepted: true,
  policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
  publicDataConsent: true,
  registeredBankAccounts: [
    {
      accountName: "NGUYEN PROVIDER",
      accountNumber: "123456789",
      bankCode: "VCB",
      isPrimary: true,
    },
  ],
  services: "Dịch vụ hỗ trợ tài khoản game và giao dịch Facebook.",
};

describe("Provider application transitions", () => {
  it.each([
    ["DRAFT", "PENDING_REVIEW"],
    ["PENDING_REVIEW", "APPROVED"],
    ["PENDING_REVIEW", "CHANGES_REQUESTED"],
    ["PENDING_REVIEW", "REJECTED"],
    ["CHANGES_REQUESTED", "PENDING_REVIEW"],
  ] as const)("allows %s to become %s", (current, next) => {
    expect(() =>
      assertProviderApplicationTransition(current, next)
    ).not.toThrow();
  });

  it.each([
    ["APPROVED", "PENDING_REVIEW"],
    ["APPROVED", "REJECTED"],
    ["REJECTED", "PENDING_REVIEW"],
    ["CHANGES_REQUESTED", "APPROVED"],
  ] as const)("rejects %s to become %s", (current, next) => {
    expect(() => assertProviderApplicationTransition(current, next)).toThrow(
      /transition/iu
    );
  });
});

describe("Provider application submission validation", () => {
  it("accepts complete submission and current policy consent", () => {
    expect(
      validateProviderApplicationSubmission(
        validSubmission,
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toMatchObject(validSubmission);
  });

  it("accepts streamlined submission without evidence references", () => {
    const streamlinedSubmission = {
      bondAmount: 1_000_000,
      citizenIdNumber: "987654321012",
      fullName: "Nguyen Hoang Duong",
      location: "Da Nang",
      officialChannels: {
        avatarUrl: "https://example.com/avatar.png",
        hotline: "0934567643",
        zalo: "0934567643",
      },
      policyAccepted: true,
      policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
      publicDataConsent: true,
      registeredBankAccounts: [
        {
          accountName: "NGUYEN HOANG DUONG",
          accountNumber: "1031000002351",
          bankCode: "VCB",
          isPrimary: true,
        },
      ],
      services: "Dịch vụ hỗ trợ giao dịch và mạng xã hội.",
    };

    expect(
      validateProviderApplicationSubmission(
        streamlinedSubmission,
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toMatchObject(streamlinedSubmission);
  });

  it("requires an official channel and current policy", () => {
    expect(() =>
      validateProviderApplicationSubmission(
        {
          ...validSubmission,
          officialChannels: {},
        },
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toThrow(/official channel/iu);

    expect(() =>
      validateProviderApplicationSubmission(
        {
          ...validSubmission,
          policyVersion: "v0",
        },
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toThrow(/policy/iu);
  });

  it("requires a valid primary bank account and public consent", () => {
    expect(() =>
      validateProviderApplicationSubmission(
        {
          ...validSubmission,
          publicDataConsent: false,
        },
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toThrow(/expected true/iu);

    expect(() =>
      validateProviderApplicationSubmission(
        {
          ...validSubmission,
          registeredBankAccounts: [
            {
              accountName: "NGUYEN PROVIDER",
              accountNumber: "123456789",
              bankCode: "VCB",
              isPrimary: false,
            },
          ],
        },
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toThrow(/primary/iu);
  });
});

describe("Provider profile identity", () => {
  it("creates a stable identity-bound slug", () => {
    expect(createProviderProfileSlug("Đối tác Một", "provider-123")).toBe(
      "doi-tac-mot-provider123"
    );
    expect(createProviderProfileSlug("Đối tác Một", "provider-456")).not.toBe(
      "doi-tac-mot-provider123"
    );
  });
});
