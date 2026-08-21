import { createHash, randomBytes, randomInt } from "node:crypto";

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
  "CHANGES_REQUESTED",
  "REJECTED",
  "PUBLISHED",
  "CORRECTED",
  "REMOVED",
] as const;

export type RiskReportStatus = (typeof riskReportStatuses)[number];

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

export const riskReportEvidenceScanStatuses = [
  "PENDING",
  "CLEAN",
  "REJECTED",
] as const;

export type RiskReportEvidenceScanStatus =
  (typeof riskReportEvidenceScanStatuses)[number];

export const riskReportDecisionStatuses = [
  "UNDER_REVIEW",
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

const emailSchema = z.email().trim().toLowerCase();
const reporterTokenSchema = z.string().trim().min(40).max(200);
const reportNarrativeSchema = z.string().trim().max(10_000);
const reportNameSchema = z.string().trim().min(2).max(200);
const reportPhoneSchema = z.string().trim().min(6).max(50);
const reportIdentifierValueSchema = z.string().trim().min(1).max(300);

export const riskReportIdentifierInputSchema = z.object({
  type: riskReportIdentifierTypeSchema,
  value: reportIdentifierValueSchema,
});

export type RiskReportIdentifierInput = z.infer<
  typeof riskReportIdentifierInputSchema
>;

export const riskReportRequestEmailCodeInputSchema = z.object({
  email: emailSchema,
});

export type RiskReportRequestEmailCodeInput = z.infer<
  typeof riskReportRequestEmailCodeInputSchema
>;

export const riskReportVerifyEmailCodeInputSchema = z.object({
  code: z.string().regex(/^\d{6}$/u),
  email: emailSchema,
});

export type RiskReportVerifyEmailCodeInput = z.infer<
  typeof riskReportVerifyEmailCodeInputSchema
>;

export const riskReportDraftInputSchema = z.object({
  claimedLoss: z.number().int().min(0).max(2_000_000_000).optional(),
  identifiers: z.array(riskReportIdentifierInputSchema).max(6).optional(),
  narrative: reportNarrativeSchema.optional(),
  reportId: z.uuid().optional(),
  reporterName: reportNameSchema.optional(),
  reporterPhone: reportPhoneSchema.optional(),
  reporterToken: reporterTokenSchema,
  reporterZalo: z.string().trim().max(100).optional(),
  type: riskReportTypeSchema,
});

export type RiskReportDraftInput = z.infer<typeof riskReportDraftInputSchema>;

export const riskReportOwnedInputSchema = z.object({
  reportId: z.uuid(),
  reporterToken: reporterTokenSchema,
});

export type RiskReportOwnedInput = z.infer<typeof riskReportOwnedInputSchema>;

export const riskReportMineInputSchema = z.object({
  reportId: z.uuid().optional(),
  reporterToken: reporterTokenSchema,
});

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
  reporterToken: reporterTokenSchema,
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
  .object({ limit: z.number().int().min(1).max(50).optional() })
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
  UNDER_REVIEW: ["CHANGES_REQUESTED", "REJECTED", "PUBLISHED"],
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

export const normalizeRiskEmail = (email: string): string =>
  email.trim().normalize("NFKC").toLowerCase();

export const hashRiskValue = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const generateRiskEmailCode = (): string =>
  randomInt(0, 1_000_000).toString().padStart(6, "0");

export const generateRiskReporterToken = (): string =>
  randomBytes(32).toString("base64url");

export const getRiskReporterEmailIdentifier = (email: string): string =>
  `protection-risk-email:${hashRiskValue(normalizeRiskEmail(email))}`;

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

  return normalized.replaceAll(/\s+/gu, " ").toLowerCase();
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

export const assertRiskReportSubmission = ({
  claimedLoss,
  evidence,
  identifiers,
  narrative,
  type,
}: {
  claimedLoss: number | null | undefined;
  evidence: readonly RiskReportSubmissionEvidence[];
  identifiers: readonly Pick<RiskReportIdentifierInput, "type">[];
  narrative: string | null | undefined;
  type: RiskReportType;
}): void => {
  if (!narrative?.trim()) {
    throw new Error("A report narrative is required before submission");
  }
  if (!claimedLoss || claimedLoss <= 0) {
    throw new Error("A claimed loss greater than zero is required");
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
  if (!evidence.some((item) => item.kind === "PAYMENT_PROOF")) {
    throw new Error("Payment proof is required before submission");
  }
  if (!evidence.some((item) => item.kind === "CONVERSATION")) {
    throw new Error("Conversation evidence is required before submission");
  }
};

export const isPublicRiskReportStatus = (status: RiskReportStatus): boolean =>
  status === "PUBLISHED" || status === "CORRECTED";

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
  };
  return `Avin Check: Báo cáo của bạn ${labels[status] ?? "đã được cập nhật"}`;
};
