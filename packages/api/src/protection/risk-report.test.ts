import { describe, expect, it } from "vitest";

import {
  assertRiskReportSubmission,
  assertRiskReportTransition,
  createRiskReportPublicPath,
  getRiskIdentifierPublicValue,
  getRiskReportIdentifierTypes,
  hashRiskValue,
  isRiskReportUnderVerificationEligible,
  isPublicRiskReportStatus,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
} from "./risk-report";

describe("Risk report contracts", () => {
  it("normalizes exact identifiers and only exposes a masked sensitive value", () => {
    expect(normalizeRiskIdentifier("PHONE", "+84 912-345-678")).toBe(
      "0912345678"
    );
    expect(normalizeRiskIdentifier("BANK_ACCOUNT", "  0123-456.789 ")).toBe(
      "0123456789"
    );
    expect(maskRiskIdentifier("BANK_ACCOUNT", "0123456789")).toBe("**** 6789");
    expect(
      maskRiskIdentifier("WEBSITE", "https://Example.com/path#secret")
    ).toBe("example.com");
  });

  it("only exposes approved public profile URLs without query strings", () => {
    expect(
      getRiskIdentifierPublicValue(
        "SOCIAL_ACCOUNT",
        "https://facebook.com/provider-one"
      )
    ).toBe("https://facebook.com/provider-one");
    expect(
      getRiskIdentifierPublicValue(
        "SOCIAL_ACCOUNT",
        "https://facebook.com/provider-one?tracking=secret"
      )
    ).toBeNull();
    expect(
      getRiskIdentifierPublicValue(
        "SOCIAL_ACCOUNT",
        "https://untrusted.example/provider-one"
      )
    ).toBeNull();
  });

  it("keeps OTP and reporter token material one-way at the contract boundary", () => {
    expect(hashRiskValue("email@example.com")).toMatch(/^[a-f0-9]{64}$/u);
    expect(hashRiskValue("email@example.com")).toBe(
      hashRiskValue("email@example.com")
    );
  });

  it("allows only the documented lifecycle transitions", () => {
    expect(() =>
      assertRiskReportTransition("DRAFT", "SUBMITTED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("CHANGES_REQUESTED", "SUBMITTED")
    ).not.toThrow();
    expect(() => assertRiskReportTransition("DRAFT", "PUBLISHED")).toThrow();
    expect(() =>
      assertRiskReportTransition("PUBLISHED", "CORRECTED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("CORRECTED", "REMOVED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("UNDER_REVIEW", "UNDER_VERIFICATION")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("UNDER_VERIFICATION", "PUBLISHED")
    ).not.toThrow();
    expect(() => assertRiskReportTransition("REMOVED", "PUBLISHED")).toThrow();
  });

  it("requires identifier, loss, clean payment proof, and conversation evidence", () => {
    const paymentProofEvidence = {
      kind: "PAYMENT_PROOF" as const,
      scanStatus: "CLEAN" as const,
    };
    const conversationEvidence = {
      kind: "CONVERSATION" as const,
      scanStatus: "CLEAN" as const,
    };
    const base = {
      claimedLoss: 100_000,
      evidence: [paymentProofEvidence, conversationEvidence],
      identifiers: [{ type: "BANK_ACCOUNT" as const }],
      narrative: "Đã chuyển tiền nhưng không nhận được dịch vụ như cam kết.",
      type: "BANK_WALLET_PHONE" as const,
    };

    expect(() => assertRiskReportSubmission(base)).not.toThrow();
    expect(() =>
      assertRiskReportSubmission({
        ...base,
        evidence: [paymentProofEvidence],
      })
    ).toThrow("Conversation evidence");
    expect(() =>
      assertRiskReportSubmission({
        ...base,
        identifiers: [{ type: "WEBSITE" }],
      })
    ).toThrow("relevant risk identifier");
    expect(() =>
      assertRiskReportSubmission({
        ...base,
        evidence: [
          { kind: "PAYMENT_PROOF", scanStatus: "PENDING" },
          conversationEvidence,
        ],
      })
    ).toThrow("pass file validation");
  });

  it("keeps future report types mapped to their relevant identifier classes", () => {
    expect(getRiskReportIdentifierTypes("MALICIOUS_WEBSITE")).toEqual([
      "WEBSITE",
    ]);
    expect(createRiskReportPublicPath("warning-report-1")).toBe(
      "/avin-check/warning/warning-report-1"
    );
  });

  it("uses type-specific evidence requirements for website reports", () => {
    expect(() =>
      assertRiskReportSubmission({
        claimedLoss: null,
        evidence: [{ kind: "SCREENSHOT", scanStatus: "CLEAN" }],
        identifiers: [{ type: "WEBSITE" }],
        narrative:
          "Website giả mạo yêu cầu người dùng nhập thông tin thanh toán.",
        type: "MALICIOUS_WEBSITE",
        violationType: "PHISHING",
      })
    ).not.toThrow();
    expect(() =>
      assertRiskReportSubmission({
        claimedLoss: null,
        evidence: [{ kind: "PAYMENT_PROOF", scanStatus: "CLEAN" }],
        identifiers: [{ type: "WEBSITE" }],
        narrative:
          "Website giả mạo yêu cầu người dùng nhập thông tin thanh toán.",
        type: "MALICIOUS_WEBSITE",
        violationType: "PHISHING",
      })
    ).toThrow("screenshot or video");
  });

  it("requires ownership or transaction proof and conversation for account reports", () => {
    const base = {
      claimedLoss: null,
      identifiers: [{ type: "SOCIAL_ACCOUNT" as const }],
      narrative: "Tài khoản bị chiếm quyền và người dùng không thể khôi phục.",
      platform: "Telegram",
      type: "SOCIAL_GAME_ACCOUNT" as const,
    };

    expect(() =>
      assertRiskReportSubmission({
        ...base,
        evidence: [
          { kind: "OWNERSHIP_PROOF", scanStatus: "CLEAN" },
          { kind: "CONVERSATION", scanStatus: "CLEAN" },
        ],
      })
    ).not.toThrow();
    expect(() =>
      assertRiskReportSubmission({
        ...base,
        evidence: [{ kind: "CONVERSATION", scanStatus: "CLEAN" }],
      })
    ).toThrow("Ownership or transaction proof");
    expect(() =>
      assertRiskReportSubmission({
        ...base,
        evidence: [{ kind: "OWNERSHIP_PROOF", scanStatus: "CLEAN" }],
      })
    ).toThrow("Conversation evidence");
  });

  it("keeps under-verification and removal in the public lifecycle", () => {
    expect(
      isRiskReportUnderVerificationEligible({
        affectedVictimCount: 1,
        urgency: "URGENT",
      })
    ).toBe(true);
    expect(
      isRiskReportUnderVerificationEligible({
        affectedVictimCount: 2,
        urgency: "NORMAL",
      })
    ).toBe(true);
    expect(
      isRiskReportUnderVerificationEligible({
        affectedVictimCount: 1,
        urgency: "NORMAL",
      })
    ).toBe(false);
    expect(isPublicRiskReportStatus("UNDER_VERIFICATION")).toBe(true);
    expect(isPublicRiskReportStatus("REMOVED")).toBe(true);
    expect(isPublicRiskReportStatus("UNDER_REVIEW")).toBe(false);
  });
});
