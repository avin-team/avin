import { z } from "zod";

export const riskReportTypes = [
  "BANK_WALLET_PHONE",
  "MALICIOUS_WEBSITE",
  "SOCIAL_GAME_ACCOUNT",
] as const;

export type RiskReportType = (typeof riskReportTypes)[number];

export const riskReportStatuses = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "UNDER_VERIFICATION",
  "CHANGES_REQUESTED",
  "REJECTED",
  "PUBLISHED",
  "CORRECTED",
  "REMOVED",
] as const;

export type RiskReportStatus = (typeof riskReportStatuses)[number];

export const publicRiskReportStatuses = [
  "PUBLISHED",
  "CORRECTED",
  "UNDER_VERIFICATION",
] as const satisfies readonly RiskReportStatus[];

export type PublicRiskReportStatus = (typeof publicRiskReportStatuses)[number];

export const riskReportWebsiteViolationTypes = [
  "PHISHING",
  "MALWARE",
  "IMPERSONATION",
  "FAKE_STORE",
  "PAYMENT_SCAM",
  "OTHER",
] as const;

export type RiskReportWebsiteViolationType =
  (typeof riskReportWebsiteViolationTypes)[number];

export const riskReportUrgencies = ["NORMAL", "URGENT"] as const;

export type RiskReportUrgency = (typeof riskReportUrgencies)[number];

export const riskReportIdentifierTypes = [
  "BANK_ACCOUNT",
  "WALLET_ACCOUNT",
  "PHONE",
  "WEBSITE",
  "SOCIAL_ACCOUNT",
  "PLATFORM_ACCOUNT",
] as const;

export type RiskReportIdentifierType =
  (typeof riskReportIdentifierTypes)[number];

export const riskReportEvidenceKinds = [
  "PAYMENT_PROOF",
  "CONVERSATION",
  "SCREENSHOT",
  "VIDEO",
  "OWNERSHIP_PROOF",
  "OTHER",
] as const;

export type RiskReportEvidenceKind = (typeof riskReportEvidenceKinds)[number];

export const riskReporterRelationships = [
  "NO_PROVIDER_RELATIONSHIP",
  "SELF_PROVIDER",
  "OTHER_PROVIDER",
] as const;

export type RiskReporterRelationship =
  (typeof riskReporterRelationships)[number];

export const riskCorrectionRequesterRelationships = [
  "SUBJECT",
  "AUTHORIZED_REPRESENTATIVE",
] as const;

export type RiskCorrectionRequesterRelationship =
  (typeof riskCorrectionRequesterRelationships)[number];

export const riskReportEvidenceScanStatuses = [
  "PENDING",
  "CLEAN",
  "REJECTED",
] as const;

export type RiskReportEvidenceScanStatus =
  (typeof riskReportEvidenceScanStatuses)[number];

export const riskReportDecisionStatuses = [
  "UNDER_REVIEW",
  "UNDER_VERIFICATION",
  "CHANGES_REQUESTED",
  "REJECTED",
  "PUBLISHED",
  "CORRECTED",
  "REMOVED",
] as const;

export type RiskReportDecisionStatus =
  (typeof riskReportDecisionStatuses)[number];

const riskReportTypeSchema = z.enum(riskReportTypes);
const riskReportIdentifierTypeSchema = z.enum(riskReportIdentifierTypes);
const riskReportEvidenceKindSchema = z.enum(riskReportEvidenceKinds);
const riskReportUrgencySchema = z.enum(riskReportUrgencies);
const riskReportWebsiteViolationTypeSchema = z.enum(
  riskReportWebsiteViolationTypes
);
const riskReporterRelationshipSchema = z.enum(riskReporterRelationships);
const riskCorrectionRequesterRelationshipSchema = z.enum(
  riskCorrectionRequesterRelationships
);

const reportNarrativeSchema = z.string().trim().max(10_000);
const reportPhoneSchema = z.string().trim().min(6).max(50);
const reportIdentifierValueSchema = z.string().trim().min(1).max(300);

export const riskReportIdentifierInputSchema = z.object({
  type: riskReportIdentifierTypeSchema,
  value: reportIdentifierValueSchema,
});

export type RiskReportIdentifierInput = z.infer<
  typeof riskReportIdentifierInputSchema
>;

export const riskReportDraftInputSchema = z.object({
  affectedVictimCount: z.number().int().min(1).max(1_000_000).optional(),
  claimedLoss: z.number().int().min(0).max(2_000_000_000).optional(),
  identifiers: z.array(riskReportIdentifierInputSchema).max(6).optional(),
  narrative: reportNarrativeSchema.optional(),
  platform: z.string().trim().max(200).optional(),
  reportId: z.uuid().optional(),
  reporterPhone: reportPhoneSchema.optional(),
  reporterRelationship: riskReporterRelationshipSchema.optional(),
  reporterZalo: z.string().trim().max(100).optional(),
  type: riskReportTypeSchema,
  urgency: riskReportUrgencySchema.optional(),
  violationType: riskReportWebsiteViolationTypeSchema.optional(),
});

export type RiskReportDraftInput = z.infer<typeof riskReportDraftInputSchema>;

export const riskReportOwnedInputSchema = z.object({
  reportId: z.uuid(),
});

export type RiskReportOwnedInput = z.infer<typeof riskReportOwnedInputSchema>;

export const riskReportWithdrawalInputSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
  reportId: z.uuid(),
});

export const riskReportCorrectionRequestInputSchema = z.object({
  authorityEvidenceReference: z.string().trim().min(1).max(500),
  reason: z.string().trim().min(20).max(5000),
  reportId: z.uuid(),
  requesterRelationship: riskCorrectionRequesterRelationshipSchema,
});

export type RiskReportCorrectionRequestInput = z.infer<
  typeof riskReportCorrectionRequestInputSchema
>;

export const riskReportCorrectionDecisionInputSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "UNDER_REVIEW"]),
  id: z.uuid(),
  reason: z.string().trim().max(2000).optional(),
});

export const riskReportCorrectionIdInputSchema = z.object({ id: z.uuid() });

export const riskReportMineInputSchema = z
  .object({ reportId: z.uuid().optional() })
  .optional();

export const riskReportEvidenceInputSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((value) => !/[\\/]/u.test(value), {
      message: "Evidence file name must not contain path separators",
    }),
  kind: riskReportEvidenceKindSchema,
  originalStorageKey: z.string().trim().min(1).max(500),
  reportId: z.uuid(),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/iu)
    .optional(),
  sizeBytes: z.number().int().positive(),
});

export type RiskReportEvidenceInput = z.infer<
  typeof riskReportEvidenceInputSchema
>;

export const riskReportAdminListInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(riskReportStatuses).optional(),
  })
  .optional();

export const riskReportAdminIdInputSchema = z.object({ id: z.uuid() });

export const riskReportAdminDecisionInputSchema = z.object({
  decision: z.enum(riskReportDecisionStatuses),
  id: z.uuid(),
  publicSummary: z.string().trim().min(20).max(5000).optional(),
  reason: z.string().trim().max(2000).optional(),
  underVerificationApproved: z.boolean().optional(),
});

export const riskReportDerivativeInputSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  evidenceId: z.uuid(),
  metadataRemoved: z.boolean(),
  reportId: z.uuid(),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/iu)
    .optional(),
  sizeBytes: z.number().int().positive(),
  storageKey: z.string().trim().min(1).max(500),
  unrelatedPiiRedacted: z.boolean(),
  watermarkApplied: z.boolean(),
});

export const publicRiskWarningListInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).optional(),
    source: z.literal("chongscam").optional(),
    sourceReportIds: z.array(z.uuid()).min(1).max(50).optional(),
  })
  .optional();

export const publicRiskWarningIdInputSchema = z.object({
  slug: z.string().trim().min(1).max(150),
});

const allowedTransitions: Record<
  RiskReportStatus,
  readonly RiskReportStatus[]
> = {
  CHANGES_REQUESTED: ["SUBMITTED"],
  CORRECTED: ["PUBLISHED", "REMOVED"],
  DRAFT: ["SUBMITTED"],
  PUBLISHED: ["CORRECTED", "REMOVED"],
  REJECTED: [],
  REMOVED: [],
  SUBMITTED: ["UNDER_REVIEW"],
  UNDER_REVIEW: [
    "CHANGES_REQUESTED",
    "REJECTED",
    "PUBLISHED",
    "UNDER_VERIFICATION",
  ],
  UNDER_VERIFICATION: ["PUBLISHED", "CORRECTED", "REMOVED"],
};

export const assertRiskReportTransition = (
  current: RiskReportStatus,
  next: RiskReportStatus
): void => {
  if (!allowedTransitions[current].includes(next)) {
    throw new Error(
      `Risk report transition ${current} -> ${next} is not allowed`
    );
  }
};

export const isRiskReportUnderVerificationEligible = ({
  affectedVictimCount,
  urgency,
}: {
  affectedVictimCount: number;
  urgency: RiskReportUrgency;
}): boolean => urgency === "URGENT" || affectedVictimCount >= 2;

const normalizeWebsite = (value: string): string => {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Website identifier must use HTTP or HTTPS");
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname === "/") {
    url.pathname = "";
  }
  return url.toString().replace(/\/$/u, "");
};

const PUBLIC_SOCIAL_PROFILE_HOSTS = new Set([
  "discord.com",
  "discord.gg",
  "facebook.com",
  "instagram.com",
  "roblox.com",
  "steamcommunity.com",
  "t.me",
  "telegram.me",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
]);

const normalizeProfileIdentifier = (value: string): string => {
  if (!/^https?:\/\//iu.test(value)) {
    return value.replaceAll(/\s+/gu, " ").toLowerCase();
  }

  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Profile identifier must use HTTP or HTTPS");
  }
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.toLowerCase();
  if (url.pathname === "/") {
    url.pathname = "";
  }
  return url.toString().replace(/\/$/u, "");
};

export const normalizeRiskIdentifier = (
  type: RiskReportIdentifierType,
  value: string
): string => {
  const normalized = value.trim().normalize("NFKC");
  if (normalized.length === 0) {
    throw new Error("Risk identifier is required");
  }

  if (type === "WEBSITE") {
    return normalizeWebsite(normalized);
  }

  if (type === "PHONE") {
    const digits = normalized.replaceAll(/\D/gu, "");
    if (digits.startsWith("84") && digits.length === 11) {
      return `0${digits.slice(2)}`;
    }
    return digits;
  }

  if (type === "BANK_ACCOUNT" || type === "WALLET_ACCOUNT") {
    return normalized.replaceAll(/[\s.-]/gu, "").toLowerCase();
  }

  if (type === "SOCIAL_ACCOUNT" || type === "PLATFORM_ACCOUNT") {
    return normalizeProfileIdentifier(normalized);
  }

  return normalized.replaceAll(/\s+/gu, " ").toLowerCase();
};

export const getRiskIdentifierPublicValue = (
  type: RiskReportIdentifierType,
  normalizedValue: string
): string | null => {
  if (type === "WEBSITE") {
    try {
      return new URL(normalizedValue).hostname;
    } catch {
      return null;
    }
  }

  if (type !== "SOCIAL_ACCOUNT" && type !== "PLATFORM_ACCOUNT") {
    return null;
  }

  if (!/^https?:\/\//iu.test(normalizedValue)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(normalizedValue);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase().replace(/^www\./u, "");
  if (
    !PUBLIC_SOCIAL_PROFILE_HOSTS.has(hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    return null;
  }

  return url.toString().replace(/\/$/u, "");
};

export const maskRiskIdentifier = (
  type: RiskReportIdentifierType,
  value: string
): string => {
  const normalized = normalizeRiskIdentifier(type, value);
  if (type === "WEBSITE") {
    const url = new URL(normalized);
    return url.hostname;
  }

  if (
    type === "PHONE" ||
    type === "BANK_ACCOUNT" ||
    type === "WALLET_ACCOUNT"
  ) {
    return `**** ${normalized.slice(-4)}`;
  }

  if (normalized.length <= 4) {
    return "****";
  }
  return `${normalized.slice(0, 2)}****${normalized.slice(-2)}`;
};

export const getRiskReportIdentifierTypes = (
  type: RiskReportType
): readonly RiskReportIdentifierType[] => {
  if (type === "BANK_WALLET_PHONE") {
    return ["BANK_ACCOUNT", "WALLET_ACCOUNT", "PHONE"];
  }
  if (type === "MALICIOUS_WEBSITE") {
    return ["WEBSITE"];
  }
  return ["SOCIAL_ACCOUNT", "PLATFORM_ACCOUNT"];
};

export interface RiskReportSubmissionEvidence {
  kind: RiskReportEvidenceKind;
  scanStatus: RiskReportEvidenceScanStatus;
}

const assertEvidenceKinds = (
  evidence: readonly RiskReportSubmissionEvidence[],
  requiredKinds: readonly RiskReportEvidenceKind[],
  message: string
): void => {
  if (
    !requiredKinds.some((kind) => evidence.some((item) => item.kind === kind))
  ) {
    throw new Error(message);
  }
};

export const assertRiskReportSubmission = ({
  claimedLoss,
  evidence,
  identifiers,
  narrative,
  platform,
  type,
  violationType,
}: {
  claimedLoss: number | null | undefined;
  evidence: readonly RiskReportSubmissionEvidence[];
  identifiers: readonly Pick<RiskReportIdentifierInput, "type">[];
  narrative: string | null | undefined;
  platform?: string | null;
  type: RiskReportType;
  violationType?: RiskReportWebsiteViolationType | null;
}): void => {
  if (!narrative?.trim()) {
    throw new Error("A report narrative is required before submission");
  }
  if (type === "BANK_WALLET_PHONE" && (!claimedLoss || claimedLoss <= 0)) {
    throw new Error("A claimed loss greater than zero is required");
  }

  if (type === "MALICIOUS_WEBSITE" && !violationType) {
    throw new Error("A website violation type is required");
  }
  if (type === "SOCIAL_GAME_ACCOUNT" && !platform?.trim()) {
    throw new Error("A platform is required for social or game reports");
  }

  const allowedIdentifierTypeSet = new Set(getRiskReportIdentifierTypes(type));
  if (
    !identifiers.some((identifier) =>
      allowedIdentifierTypeSet.has(identifier.type)
    )
  ) {
    throw new Error("A relevant risk identifier is required");
  }

  if (evidence.some((item) => item.scanStatus !== "CLEAN")) {
    throw new Error("All evidence must pass file validation before submission");
  }
  if (type === "BANK_WALLET_PHONE") {
    assertEvidenceKinds(
      evidence,
      ["PAYMENT_PROOF"],
      "Payment proof is required before submission"
    );
    assertEvidenceKinds(
      evidence,
      ["CONVERSATION"],
      "Conversation evidence is required before submission"
    );
  } else if (type === "MALICIOUS_WEBSITE") {
    assertEvidenceKinds(
      evidence,
      ["SCREENSHOT", "VIDEO"],
      "A screenshot or video is required before submission"
    );
  } else {
    assertEvidenceKinds(
      evidence,
      ["OWNERSHIP_PROOF", "PAYMENT_PROOF"],
      "Ownership or transaction proof is required before submission"
    );
    assertEvidenceKinds(
      evidence,
      ["CONVERSATION"],
      "Conversation evidence is required before submission"
    );
  }
};

export const isPublicRiskReportStatus = (status: RiskReportStatus): boolean =>
  status === "CORRECTED" ||
  status === "PUBLISHED" ||
  status === "REMOVED" ||
  status === "UNDER_VERIFICATION";

export const createRiskReportPublicSlug = (reportId: string): string =>
  `warning-${reportId}`;

export const createRiskReportPublicPath = (publicSlug: string): string =>
  `/avin-check/warning/${encodeURIComponent(publicSlug)}`;

export const createRiskReportEmailSubject = (
  status: RiskReportStatus
): string => {
  const labels: Partial<Record<RiskReportStatus, string>> = {
    CHANGES_REQUESTED: "cần bổ sung thông tin",
    CORRECTED: "đã được cập nhật",
    PUBLISHED: "đã được duyệt và công khai",
    REJECTED: "đã bị từ chối",
    REMOVED: "đã được gỡ khỏi danh mục công khai",
    UNDER_REVIEW: "đang được xem xét",
    UNDER_VERIFICATION: "đang được công khai để xác minh",
  };
  return `Avin Check: Báo cáo của bạn ${labels[status] ?? "đã được cập nhật"}`;
};
