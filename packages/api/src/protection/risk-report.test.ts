import { describe, expect, it } from "vitest";

import {
  assertRiskReportIntake,
  assertRiskReportSubmission,
  assertRiskReportTransition,
  buildRiskReportPublicNarrative,
  createRiskReportPublicTitle,
  createRiskReportPublicPath,
  getRiskIdentifierPublicValue,
  getRiskReportIdentifierTypes,
  isPublicRiskReportStatus,
  isRiskReportUnderVerificationEligible,
  maskRiskHolderName,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
  riskReportAdminDecisionInputSchema,
  riskReportIdentifierTypes,
} from "./risk-report";

type Submission = Parameters<typeof assertRiskReportSubmission>[0];

const incidentAt = new Date("2026-08-20T10:00:00.000Z");
const longNarrative =
  "Tôi đã chuyển tiền cho đối tượng qua ngân hàng để mua dịch vụ MMO, có trao đổi và xác nhận giao dịch rõ ràng nhưng sau đó đối tượng không thực hiện đúng cam kết và tiếp tục né tránh liên hệ.";

const cleanEvidence = (
  kind: Submission["evidence"][number]["kind"]
): Submission["evidence"][number] => ({
  kind,
  publicCopyReady: true,
  scanStatus: "CLEAN",
});

const bankSubmission: Submission = {
  claimedLoss: 100_000,
  evidence: [cleanEvidence("PAYMENT_PROOF"), cleanEvidence("CONVERSATION")],
  identifiers: [
    {
      holderName: "Nguyen Van A",
      institutionName: "VIB",
      role: "PAYMENT_DESTINATION",
      type: "BANK_ACCOUNT",
      value: "0123456789",
    },
  ],
  incidentAt,
  issues: ["NON_DELIVERY"],
  lossOccurred: "YES",
  narrative: longNarrative,
  otherIssueDescription: null,
  platform: null,
  publicNarrative: longNarrative,
  publicPacketPreviewedAt: incidentAt,
  reporterInvolvement: "BUYER",
  transactions: [
    {
      amount: "100000",
      currencyOrAsset: "VND",
      occurredAt: incidentAt,
      paymentMethod: "BANK_TRANSFER",
      timeKnown: true,
    },
  ],
  type: "BANK_WALLET_PHONE",
  violationType: null,
};

describe("Risk report contracts", () => {
  it("normalizes exact identifiers and masks sensitive values like CheckScam", () => {
    expect(normalizeRiskIdentifier("PHONE", "+84 912-345-678")).toBe(
      "0912345678"
    );
    expect(normalizeRiskIdentifier("PHONE", "+1 (212) 555-0199")).toBe(
      "+12125550199"
    );
    expect(() => normalizeRiskIdentifier("PHONE", "84 912-345-678")).toThrow(
      "country code"
    );
    expect(normalizeRiskIdentifier("BANK_ACCOUNT", "  0123-456.789 ")).toBe(
      "0123456789"
    );
    expect(
      normalizeRiskIdentifier("WEBSITE", "Example.com/checkout?token=secret")
    ).toBe("https://example.com/checkout");
    expect(maskRiskIdentifier("BANK_ACCOUNT", "0123456789")).toBe("012***789");
    expect(maskRiskIdentifier("PHONE", "0912345678")).toBe("091***678");
    expect(maskRiskHolderName("Nguyen Van A")).toBe("Nguyen Van A.");
    expect(
      maskRiskIdentifier("WEBSITE", "https://Example.com/path#secret")
    ).toBe("example.com");
  });

  it("builds a public narrative from the reporter's own narrative without private leaks", () => {
    const publicNarrative = buildRiskReportPublicNarrative(
      "Liên hệ 0912345678 hoặc reporter@example.com tại https://fake.example/path?token=secret.",
      ["0912345678", "fake-account-123"]
    );

    expect(publicNarrative).toContain("[số điện thoại đã ẩn]");
    expect(publicNarrative).toContain("[email đã ẩn]");
    expect(publicNarrative).toContain("https://fake.example/path");
    expect(publicNarrative).not.toContain("token=secret");
    expect(publicNarrative).not.toContain("fake-account-123");
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
  });

  it("allows only the documented lifecycle transitions", () => {
    expect(() =>
      assertRiskReportTransition("DRAFT", "SUBMITTED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("CHANGES_REQUESTED", "SUBMITTED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("SUBMITTED", "REJECTED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("SUBMITTED", "PUBLISHED")
    ).not.toThrow();
    expect(() => assertRiskReportTransition("DRAFT", "PUBLISHED")).toThrow();
    expect(() =>
      assertRiskReportTransition("PUBLISHED", "CORRECTED")
    ).not.toThrow();
    expect(() =>
      assertRiskReportTransition("CORRECTED", "REMOVED")
    ).not.toThrow();
  });

  it("exposes only approve or reject in the P0 moderator input", () => {
    expect(
      riskReportAdminDecisionInputSchema.parse({
        decision: "PUBLISHED",
        id: "00000000-0000-4000-8000-000000000001",
      }).decision
    ).toBe("PUBLISHED");
    expect(() =>
      riskReportAdminDecisionInputSchema.parse({
        decision: "UNDER_VERIFICATION",
        id: "00000000-0000-4000-8000-000000000001",
      })
    ).toThrow();
  });

  it("requires the complete transaction evidence bundle and a public preview", () => {
    expect(() => assertRiskReportSubmission(bankSubmission)).not.toThrow();
    expect(() =>
      assertRiskReportIntake({
        ...bankSubmission,
        evidence: [],
      })
    ).toThrow("Payment or conversation proof");
    expect(() =>
      assertRiskReportSubmission({
        ...bankSubmission,
        evidence: [
          { ...cleanEvidence("PAYMENT_PROOF"), scanStatus: "PENDING" },
          cleanEvidence("CONVERSATION"),
        ],
      })
    ).toThrow("malware scanning");
    expect(() =>
      assertRiskReportSubmission({
        ...bankSubmission,
        publicPacketPreviewedAt: null,
      })
    ).toThrow("previewed");
  });

  it("allows private intake while publication processing is deferred", () => {
    expect(() =>
      assertRiskReportIntake({
        ...bankSubmission,
        evidence: [
          {
            ...cleanEvidence("PAYMENT_PROOF"),
            publicCopyReady: false,
            scanStatus: "PENDING",
          },
          {
            ...cleanEvidence("CONVERSATION"),
            publicCopyReady: false,
            scanStatus: "PENDING",
          },
        ],
        publicNarrative: null,
        publicPacketPreviewedAt: null,
      })
    ).not.toThrow();
  });

  it("requires exact fake-surface evidence and impersonation references", () => {
    const websiteSubmission: Submission = {
      claimedLoss: null,
      evidence: [cleanEvidence("SCREENSHOT")],
      identifiers: [
        {
          role: "LISTING_STORE",
          type: "WEBSITE",
          value: "https://fake.example/store",
        },
      ],
      incidentAt,
      issues: ["PHISHING"],
      lossOccurred: "NO",
      narrative:
        "Website giả mạo yêu cầu người dùng nhập thông tin thanh toán và thông tin đăng nhập.",
      publicNarrative:
        "Website giả mạo yêu cầu người dùng nhập thông tin thanh toán và thông tin đăng nhập.",
      publicPacketPreviewedAt: incidentAt,
      reporterInvolvement: "DIRECT_OBSERVER",
      transactions: [],
      type: "MALICIOUS_WEBSITE",
      violationType: "PHISHING",
    };

    expect(() => assertRiskReportSubmission(websiteSubmission)).not.toThrow();
    expect(() =>
      assertRiskReportIntake({
        ...websiteSubmission,
        evidence: [],
      })
    ).toThrow("screenshot or video");
  });

  it("requires account asset, ownership, handover, and access-loss evidence", () => {
    const accountSubmission: Submission = {
      accessLostAt: incidentAt,
      claimedLoss: null,
      evidence: [
        cleanEvidence("HANDOVER_PROOF"),
        cleanEvidence("OWNERSHIP_PROOF"),
        cleanEvidence("ACCESS_LOSS_PROOF"),
      ],
      handoverAt: new Date("2026-08-19T10:00:00.000Z"),
      identifiers: [
        {
          role: "REPORTED_ASSET",
          type: "PLATFORM_ACCOUNT",
          value: "roblox:123456",
        },
      ],
      incidentAt,
      issues: ["ACCOUNT_RECLAIMED"],
      lossOccurred: "NO",
      narrative:
        "Tài khoản đã được bàn giao nhưng người mua mất quyền truy cập sau khi giao dịch hoàn tất.",
      platform: "Roblox",
      publicNarrative:
        "Tài khoản đã được bàn giao nhưng người mua mất quyền truy cập sau khi giao dịch hoàn tất.",
      publicPacketPreviewedAt: incidentAt,
      purchaseAt: new Date("2026-08-18T10:00:00.000Z"),
      reporterInvolvement: "BUYER",
      transactions: [],
      type: "SOCIAL_GAME_ACCOUNT",
    };

    expect(() => assertRiskReportSubmission(accountSubmission)).not.toThrow();
    expect(() =>
      assertRiskReportSubmission({
        ...accountSubmission,
        accessLostAt: null,
        handoverAt: null,
        purchaseAt: null,
      })
    ).toThrow("access-loss date");
    expect(() =>
      assertRiskReportIntake({
        ...accountSubmission,
        evidence: [],
      })
    ).toThrow("Evidence of ownership");
  });

  it("generates a deterministic masked public title", () => {
    expect(
      createRiskReportPublicTitle({
        identifiers: [
          {
            institutionName: "VIB",
            maskedValue: "327***940",
            publicValue: null,
            role: "PAYMENT_DESTINATION",
            type: "BANK_ACCOUNT",
          },
        ],
        type: "BANK_WALLET_PHONE",
      })
    ).toBe("Cảnh báo giao dịch với 327***940 · VIB");
  });

  it("keeps identifier classes and public status helpers explicit", () => {
    expect(getRiskReportIdentifierTypes("MALICIOUS_WEBSITE")).toEqual(
      riskReportIdentifierTypes
    );
    expect(createRiskReportPublicPath("warning-report-1")).toBe(
      "/avin-check/warning/warning-report-1"
    );
    expect(
      isRiskReportUnderVerificationEligible({
        affectedVictimCount: 1,
        urgency: "URGENT",
      })
    ).toBe(true);
    expect(isPublicRiskReportStatus("PUBLISHED")).toBe(true);
    expect(isPublicRiskReportStatus("UNDER_REVIEW")).toBe(false);
  });
});
