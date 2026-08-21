import { describe, expect, it } from "vitest";

import {
  CURRENT_PROVIDER_POLICY_VERSION,
  assertProviderApplicationTransition,
  createProviderProfileSlug,
  validateProviderApplicationSubmission,
} from "./provider-application";

const validSubmission = {
  ageEvidenceReference: "evidence/age/provider-1",
  fullName: "Nguyen Provider",
  identityEvidenceReference: "evidence/identity/provider-1",
  officialChannelEvidenceReference: "evidence/channels/provider-1",
  officialChannels: {
    facebookUrl: "https://facebook.com/provider-one",
  },
  operatingHistoryEvidenceReference: "evidence/operating/provider-1",
  operatingSince: "2024-01-01",
  paymentAccount: {
    accountName: "NGUYEN PROVIDER",
    accountNumber: "123456789",
    accountType: "BANK" as const,
    institution: "Avin Bank",
  },
  paymentDisclosureConsent: false,
  paymentEvidenceReference: "evidence/payment/provider-1",
  policyAccepted: true,
  policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
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
  it("accepts complete evidence and current policy consent", () => {
    expect(
      validateProviderApplicationSubmission(
        validSubmission,
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toMatchObject(validSubmission);
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

  it("requires at least one year of operating history", () => {
    expect(() =>
      validateProviderApplicationSubmission(
        {
          ...validSubmission,
          operatingSince: "2025-08-22",
        },
        new Date("2026-08-21T00:00:00.000Z")
      )
    ).toThrow(/one year/iu);
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
