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

export const riskReportIdentifierRoles = [
  "ACCUSED_COUNTERPARTY",
  "PAYMENT_DESTINATION",
  "INTERMEDIARY",
  "CONTACT_CHANNEL",
  "LISTING_STORE",
  "REPORTED_ASSET",
  "IMPERSONATED_IDENTITY",
] as const;

export type RiskReportIdentifierRole =
  (typeof riskReportIdentifierRoles)[number];

/** Identifier roles that may create a public risk-warning lookup result. */
export const riskReportPublicSubjectIdentifierRoles = [
  "ACCUSED_COUNTERPARTY",
  "PAYMENT_DESTINATION",
  "INTERMEDIARY",
  "CONTACT_CHANNEL",
  "LISTING_STORE",
] as const satisfies readonly RiskReportIdentifierRole[];

const riskReportPublicSubjectIdentifierRoleSet = new Set<string>(
  riskReportPublicSubjectIdentifierRoles
);

export const riskReportEvidenceKinds = [
  "PAYMENT_PROOF",
  "CONVERSATION",
  "SCREENSHOT",
  "VIDEO",
  "OWNERSHIP_PROOF",
  "DELIVERY_PROOF",
  "REVERSAL_NOTICE",
  "HANDOVER_PROOF",
  "ACCESS_LOSS_PROOF",
  "GENUINE_REFERENCE",
  "OTHER",
] as const;

export type RiskReportEvidenceKind = (typeof riskReportEvidenceKinds)[number];

export const riskReporterInvolvements = [
  "BUYER",
  "SELLER",
  "INTERMEDIARY",
  "AUTHORIZED_REPRESENTATIVE",
  "DIRECT_OBSERVER",
] as const;

export type RiskReporterInvolvement = (typeof riskReporterInvolvements)[number];

export const riskLossOccurrences = ["YES", "NO", "UNKNOWN"] as const;

export type RiskLossOccurrence = (typeof riskLossOccurrences)[number];

export const riskReportIssueTypes = [
  "NON_DELIVERY",
  "PARTIAL_OR_MISMATCHED_DELIVERY",
  "PAID_THEN_BLOCKED",
  "SERVICE_INCOMPLETE",
  "SERVICE_DAMAGED_ACCOUNT",
  "POST_DELIVERY_CHARGEBACK",
  "FAKE_INTERMEDIARY",
  "ACCOUNT_RECLAIMED",
  "RECOVERY_NOT_TRANSFERRED",
  "ACCOUNT_ACCESS_LOST",
  "PUBLISHER_LOCKED_OR_BANNED",
  "WARRANTY_REFUSED",
  "IMPERSONATION",
  "PHISHING",
  "MALWARE",
  "FAKE_STORE",
  "FAKE_PAYMENT",
  "OTHER",
] as const;

export type RiskReportIssueType = (typeof riskReportIssueTypes)[number];

export const riskReportIssueTypesByReportType = {
  BANK_WALLET_PHONE: [
    "NON_DELIVERY",
    "PARTIAL_OR_MISMATCHED_DELIVERY",
    "PAID_THEN_BLOCKED",
    "SERVICE_INCOMPLETE",
    "SERVICE_DAMAGED_ACCOUNT",
    "POST_DELIVERY_CHARGEBACK",
    "FAKE_INTERMEDIARY",
    "OTHER",
  ],
  MALICIOUS_WEBSITE: [
    "IMPERSONATION",
    "PHISHING",
    "MALWARE",
    "FAKE_STORE",
    "FAKE_PAYMENT",
    "OTHER",
  ],
  SOCIAL_GAME_ACCOUNT: [
    "ACCOUNT_RECLAIMED",
    "RECOVERY_NOT_TRANSFERRED",
    "ACCOUNT_ACCESS_LOST",
    "PUBLISHER_LOCKED_OR_BANNED",
    "WARRANTY_REFUSED",
    "OTHER",
  ],
} as const satisfies Record<RiskReportType, readonly RiskReportIssueType[]>;

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
  "INFECTED",
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

/** P0 moderator decisions exposed by the admin route. */
export const riskReportAdminDecisionStatuses = [
  "REJECTED",
  "PUBLISHED",
] as const;

const riskReportTypeSchema = z.enum(riskReportTypes);
const riskReportIdentifierTypeSchema = z.enum(riskReportIdentifierTypes);
const riskReportIdentifierRoleSchema = z.enum(riskReportIdentifierRoles);
const riskReportEvidenceKindSchema = z.enum(riskReportEvidenceKinds);
const riskReportUrgencySchema = z.enum(riskReportUrgencies);
const riskReportWebsiteViolationTypeSchema = z.enum(
  riskReportWebsiteViolationTypes
);
const riskReporterRelationshipSchema = z.enum(riskReporterRelationships);
const riskReporterInvolvementSchema = z.enum(riskReporterInvolvements);
const riskLossOccurrenceSchema = z.enum(riskLossOccurrences);
const riskReportIssueTypeSchema = z.enum(riskReportIssueTypes);
const riskCorrectionRequesterRelationshipSchema = z.enum(
  riskCorrectionRequesterRelationships
);

const reportNarrativeSchema = z.string().trim().max(10_000);
const reportPhoneSchema = z.string().trim().min(6).max(50);
const reportIdentifierValueSchema = z.string().trim().min(1).max(300);
const BANK_ACCOUNT_SEPARATOR_PATTERN = /[\s.-]/gu;
const EMAIL_IN_NARRATIVE_PATTERN =
  /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/giu;
const PHONE_IN_NARRATIVE_PATTERN = /(?<!\d)(?:\+?84|0)\d{8,10}(?!\d)/gu;
const URL_IN_NARRATIVE_PATTERN = /https?:\/\/[^\s<>()]+/giu;

export const riskReportIdentifierInputSchema = z.object({
  displayName: z.string().trim().max(200).optional(),
  holderName: z.string().trim().max(200).optional(),
  institutionName: z.string().trim().max(200).optional(),
  namespace: z.string().trim().max(200).optional(),
  role: riskReportIdentifierRoleSchema,
  type: riskReportIdentifierTypeSchema,
  value: reportIdentifierValueSchema,
});

export type RiskReportIdentifierInput = z.infer<
  typeof riskReportIdentifierInputSchema
>;

export const riskReportTransactionInputSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d+(?:\.\d{1,12})?$/u)
    .refine((value) => Number(value) > 0, {
      message: "Transaction amount must be greater than zero",
    }),
  currencyOrAsset: z.string().trim().min(1).max(30),
  destinationIdentifierIndex: z.number().int().min(0).max(9).optional(),
  occurredAt: z.coerce.date(),
  paymentMethod: z.string().trim().min(1).max(100),
  reference: z.string().trim().max(200).optional(),
  timeKnown: z.boolean().default(false),
});

export type RiskReportTransactionInput = z.infer<
  typeof riskReportTransactionInputSchema
>;

export const riskReportDraftInputSchema = z.object({
  accessLostAt: z.coerce.date().optional(),
  affectedVictimCount: z.number().int().min(1).max(1_000_000).optional(),
  claimedLoss: z.number().int().min(0).max(2_000_000_000).optional(),
  handoverAt: z.coerce.date().optional(),
  identifiers: z.array(riskReportIdentifierInputSchema).max(10).optional(),
  incidentAt: z.coerce.date().optional(),
  incidentDateApproximate: z.boolean().optional(),
  issues: z.array(riskReportIssueTypeSchema).max(8).optional(),
  lossOccurred: riskLossOccurrenceSchema.optional(),
  narrative: reportNarrativeSchema.optional(),
  ongoing: z.boolean().optional(),
  otherIssueDescription: z.string().trim().max(500).optional(),
  platform: z.string().trim().max(200).optional(),
  privateNote: z.string().trim().max(5000).optional(),
  purchaseAt: z.coerce.date().optional(),
  reportId: z.uuid().optional(),
  reporterInvolvement: riskReporterInvolvementSchema.optional(),
  reporterPhone: reportPhoneSchema.optional(),
  reporterRelationship: riskReporterRelationshipSchema.optional(),
  reporterZalo: z.string().trim().max(100).optional(),
  transactions: z.array(riskReportTransactionInputSchema).max(20).optional(),
  type: riskReportTypeSchema,
  urgency: riskReportUrgencySchema.optional(),
  violationType: riskReportWebsiteViolationTypeSchema.optional(),
});

export type RiskReportDraftInput = z.infer<typeof riskReportDraftInputSchema>;

export const riskReportOwnedInputSchema = z.object({
  reportId: z.uuid(),
});

export const RISK_REPORT_ATTESTATION_VERSION = "risk-report-v1";

export const riskReportSubmitInputSchema = z.object({
  attestationAccepted: z.literal(true),
  attestationVersion: z.literal(RISK_REPORT_ATTESTATION_VERSION),
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
  explanation: z.string().trim().min(10).max(500),
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
  decision: z.enum(riskReportAdminDecisionStatuses),
  id: z.uuid(),
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
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "PUBLISHED"],
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
  const url = new URL(
    /^https?:\/\//iu.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`
  );
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Website identifier must use HTTP or HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Website identifier must not contain credentials");
  }
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replaceAll(/\/{2,}/gu, "/").replace(/\/$/u, "");
  url.hostname = url.hostname.toLowerCase();
  url.hostname = url.hostname.replace(/^www\./u, "").replace(/\.$/u, "");
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }
  return `https://${url.host}${url.pathname}`;
};

const escapeRegExp = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

export const buildRiskReportPublicNarrative = (
  narrative: string,
  privateValues: readonly string[] = []
): string => {
  let publicNarrative = narrative
    .trim()
    .replace(EMAIL_IN_NARRATIVE_PATTERN, "[email đã ẩn]")
    .replace(PHONE_IN_NARRATIVE_PATTERN, "[số điện thoại đã ẩn]")
    .replace(URL_IN_NARRATIVE_PATTERN, (rawUrl) => {
      try {
        const url = new URL(rawUrl);
        url.hash = "";
        url.search = "";
        return url.toString();
      } catch {
        return "[liên kết đã ẩn]";
      }
    });

  for (const value of privateValues) {
    const trimmedValue = value.trim();
    if (trimmedValue.length < 4) {
      continue;
    }
    publicNarrative = publicNarrative.replaceAll(
      new RegExp(escapeRegExp(trimmedValue), "giu"),
      "[thông tin đã ẩn]"
    );
  }

  return publicNarrative;
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

const PUBLIC_SOCIAL_PROFILE_HOST_ALIASES = new Map([
  ["fb.com", "facebook.com"],
  ["m.facebook.com", "facebook.com"],
  ["mbasic.facebook.com", "facebook.com"],
  ["www.facebook.com", "facebook.com"],
  ["m.tiktok.com", "tiktok.com"],
  ["www.tiktok.com", "tiktok.com"],
  ["telegram.me", "t.me"],
  ["www.telegram.me", "t.me"],
  ["www.t.me", "t.me"],
]);

const SHORT_SOCIAL_PROFILE_HOSTS = new Set([
  "l.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
]);

const canonicalizeSocialHostname = (hostname: string): string => {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/u, "");
  return (
    PUBLIC_SOCIAL_PROFILE_HOST_ALIASES.get(normalizedHostname) ??
    normalizedHostname.replace(/^www\./u, "")
  );
};

export const isSupportedRiskIdentifierPlatformUrl = (
  value: string
): boolean => {
  const trimmedValue = value.trim();
  let url: URL;
  try {
    url = new URL(
      /^https?:\/\//iu.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`
    );
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = canonicalizeSocialHostname(url.hostname);
  return (
    hostname === "facebook.com" ||
    hostname === "tiktok.com" ||
    hostname === "t.me" ||
    SHORT_SOCIAL_PROFILE_HOSTS.has(url.hostname.toLowerCase())
  );
};

const assertKnownSocialProfilePath = (
  hostname: string,
  pathname: string,
  searchParams: URLSearchParams
): void => {
  if (hostname === "facebook.com") {
    if (pathname === "/profile.php") {
      if (!searchParams.get("id")) {
        throw new Error("Facebook profile URL must contain only a profile id");
      }
      return;
    }
    if (
      !/^\/[^/]+$/u.test(pathname) ||
      /^\/(?:events|groups|marketplace|permalink\.php|photo\.php|photos|reel|share|story\.php|stories|video\.php|videos|watch)(?:\/|$)/u.test(
        pathname
      )
    ) {
      throw new Error("Facebook identifier must point to a public profile");
    }
    return;
  }

  if (hostname === "tiktok.com") {
    if (!/^\/@[a-z0-9._-]+$/iu.test(pathname)) {
      throw new Error("TikTok identifier must point to a public profile");
    }
    return;
  }

  if (
    hostname === "t.me" &&
    (/\/(?:addlist|addstickers|c|joinchat|s)$/iu.test(pathname) ||
      !/^\/[a-z0-9_]{5,32}$/iu.test(pathname))
  ) {
    throw new Error("Telegram identifier must point to a public username");
  }
};

const normalizeProfileIdentifier = (value: string): string => {
  const trimmedValue = value.trim();
  if (
    !/^https?:\/\//iu.test(trimmedValue) &&
    !/[a-z0-9-]+\.[a-z]{2,}(?:\/|$)/iu.test(trimmedValue)
  ) {
    return trimmedValue.replaceAll(/\s+/gu, " ").toLowerCase();
  }

  const url = new URL(
    /^https?:\/\//iu.test(trimmedValue)
      ? trimmedValue
      : `https://${trimmedValue}`
  );
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Profile identifier must use HTTP or HTTPS");
  }
  if (url.username || url.password || url.port) {
    throw new Error("Profile identifier must not contain credentials or ports");
  }

  const hostname = canonicalizeSocialHostname(url.hostname);
  if (SHORT_SOCIAL_PROFILE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("Short social profile links are not supported");
  }
  const pathname = url.pathname.toLowerCase().replace(/\/+$/u, "");
  const searchParams = new URLSearchParams(url.searchParams);
  url.hash = "";
  url.hostname = hostname;
  url.pathname = pathname;
  url.search = "";

  if (PUBLIC_SOCIAL_PROFILE_HOSTS.has(hostname)) {
    assertKnownSocialProfilePath(hostname, pathname, searchParams);
    if (hostname === "facebook.com" && pathname === "/profile.php") {
      url.searchParams.set("id", searchParams.get("id") ?? "");
    }
  }

  if (url.pathname === "/") {
    url.pathname = "";
  }
  return url.toString().replace(/\/$/u, "");
};

export const getRiskIdentifierPlatform = (
  value: string
): "FACEBOOK" | "TIKTOK" | "TELEGRAM" | null => {
  let normalizedValue: string;
  try {
    normalizedValue = normalizeProfileIdentifier(value);
  } catch {
    return null;
  }

  if (!/^https?:\/\//iu.test(normalizedValue)) {
    return null;
  }

  const { hostname } = new URL(normalizedValue);
  if (hostname === "facebook.com") {
    return "FACEBOOK";
  }
  if (hostname === "tiktok.com") {
    return "TIKTOK";
  }
  if (hostname === "t.me") {
    return "TELEGRAM";
  }
  return null;
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
    const compact = normalized.replaceAll(/[\s().-]/gu, "");
    if (!/^\+?\d{6,15}$/u.test(compact)) {
      throw new Error("Phone identifier must use a valid international format");
    }
    const digits = compact.replace(/^\+/u, "");
    if (compact.startsWith("+84") && digits.length === 11) {
      return `0${digits.slice(2)}`;
    }
    if (compact.startsWith("+")) {
      return `+${digits}`;
    }
    if (digits.startsWith("0")) {
      return digits;
    }
    throw new Error(
      "Phone identifier must include a country code or start with 0"
    );
  }

  if (type === "BANK_ACCOUNT") {
    const digits = normalized.replaceAll(BANK_ACCOUNT_SEPARATOR_PATTERN, "");
    if (!/^\d{4,50}$/u.test(digits)) {
      throw new Error("Bank account identifier must use digits");
    }
    return digits;
  }

  if (type === "WALLET_ACCOUNT") {
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
      const url = new URL(normalizedValue);
      return `${url.host.replace(/^www\./u, "")}${url.pathname}`;
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
  const hostname = canonicalizeSocialHostname(url.hostname);
  const searchParams = new URLSearchParams(url.searchParams);
  if (
    !PUBLIC_SOCIAL_PROFILE_HOSTS.has(hostname) ||
    url.username ||
    url.password ||
    url.port ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    return null;
  }

  if (
    url.search &&
    !(
      hostname === "facebook.com" &&
      url.pathname === "/profile.php" &&
      [...searchParams.keys()].every((key) => key === "id") &&
      Boolean(searchParams.get("id"))
    )
  ) {
    return null;
  }

  return normalizeProfileIdentifier(normalizedValue);
};

export interface RiskReportPublicTitleIdentifier {
  institutionName?: string | null;
  maskedValue: string;
  publicValue: string | null;
  role: RiskReportIdentifierRole;
  type: RiskReportIdentifierType;
}

/**
 * Build the stable public heading for a native warning. The heading only
 * receives already-normalized/masked values so it cannot leak a private
 * identifier or accidentally turn a reporter-authored title into a public
 * claim.
 */
export const createRiskReportPublicTitle = ({
  identifiers,
  platform,
  type,
}: {
  identifiers: readonly RiskReportPublicTitleIdentifier[];
  platform?: string | null;
  type: RiskReportType;
}): string => {
  const publicSubjectIdentifier = identifiers.find((identifier) =>
    riskReportPublicSubjectIdentifierRoleSet.has(identifier.role)
  );
  const reportedAsset = identifiers.find(
    (identifier) => identifier.role === "REPORTED_ASSET"
  );
  const identifier = publicSubjectIdentifier ?? reportedAsset ?? identifiers[0];
  const value =
    identifier?.publicValue ?? identifier?.maskedValue ?? "liên quan";

  if (type === "MALICIOUS_WEBSITE") {
    return `Cảnh báo website giả mạo ${value}`;
  }

  if (type === "SOCIAL_GAME_ACCOUNT") {
    const platformLabel = platform?.trim() || "tài khoản số";
    return `Cảnh báo ${platformLabel} bị back · ${value}`;
  }

  const institution = identifier?.institutionName?.trim();
  return institution
    ? `Cảnh báo giao dịch với ${value} · ${institution}`
    : `Cảnh báo giao dịch với ${value}`;
};

export const maskRiskIdentifier = (
  type: RiskReportIdentifierType,
  value: string
): string => {
  const normalized = normalizeRiskIdentifier(type, value);
  if (type === "WEBSITE") {
    const url = new URL(normalized);
    return url.host.replace(/^www\./u, "");
  }

  if (
    type === "PHONE" ||
    type === "BANK_ACCOUNT" ||
    type === "WALLET_ACCOUNT"
  ) {
    if (normalized.length <= 6) {
      return `${normalized.slice(0, 1)}***${normalized.slice(-1)}`;
    }
    return `${normalized.slice(0, 3)}***${normalized.slice(-3)}`;
  }

  if (type === "SOCIAL_ACCOUNT" || type === "PLATFORM_ACCOUNT") {
    return normalized;
  }
  return normalized;
};

export const maskRiskHolderName = (value: string): string => {
  const parts = value.trim().replaceAll(/\s+/gu, " ").split(" ");
  const finalPart = parts.at(-1);
  if (!finalPart) {
    return "";
  }
  const maskedFinalPart = `${finalPart.slice(0, 1).toLocaleUpperCase("vi-VN")}.`;
  if (parts.length === 1) {
    return maskedFinalPart;
  }
  return `${parts.slice(0, -1).join(" ")} ${maskedFinalPart}`;
};

export const getRiskReportIdentifierTypes = (
  _type: RiskReportType
): readonly RiskReportIdentifierType[] => riskReportIdentifierTypes;

export interface RiskReportSubmissionEvidence {
  kind: RiskReportEvidenceKind;
  publicCopyReady?: boolean;
  scanStatus: RiskReportEvidenceScanStatus;
}

type RiskReportSubmissionIdentifier = Pick<
  RiskReportIdentifierInput,
  "role" | "type"
> & {
  displayName?: string | null;
  holderName?: string | null;
  institutionName?: string | null;
  namespace?: string | null;
  value?: string | null;
};

const riskSubjectIdentifierRoles = new Set<RiskReportIdentifierRole>(
  riskReportPublicSubjectIdentifierRoles
);

const hasRiskSubjectIdentifier = (
  identifiers: readonly RiskReportSubmissionIdentifier[],
  allowedTypes: readonly RiskReportIdentifierType[]
): boolean => {
  const allowedTypesSet = new Set(allowedTypes);
  return identifiers.some(
    (identifier) =>
      riskSubjectIdentifierRoles.has(identifier.role) &&
      allowedTypesSet.has(identifier.type)
  );
};

const assertReportIssues = (
  type: RiskReportType,
  issues: readonly RiskReportIssueType[],
  otherIssueDescription?: string | null,
  narrative?: string | null
): void => {
  if (issues.length === 0) {
    throw new Error("At least one report issue is required");
  }
  const allowedIssues = new Set(riskReportIssueTypesByReportType[type]);
  if (issues.some((issue) => !allowedIssues.has(issue))) {
    throw new Error("A report issue does not match the selected report type");
  }
  if (issues.includes("OTHER")) {
    const descriptionLength =
      otherIssueDescription?.trim().length || narrative?.trim().length || 0;
    if (descriptionLength < 20) {
      throw new Error(
        "An explanation of at least 20 characters is required for Other"
      );
    }
  }
};

const assertBankWalletPhoneSubmission = (
  identifiers: readonly RiskReportSubmissionIdentifier[],
  evidence: readonly RiskReportSubmissionEvidence[]
): void => {
  if (
    !hasRiskSubjectIdentifier(identifiers, [
      "BANK_ACCOUNT",
      "WALLET_ACCOUNT",
      "PHONE",
      "SOCIAL_ACCOUNT",
      "PLATFORM_ACCOUNT",
    ])
  ) {
    throw new Error("A transaction risk identifier is required");
  }
  if (evidence.length === 0) {
    throw new Error(
      "Payment or conversation proof is required before submission"
    );
  }
};

const assertMaliciousWebsiteSubmission = (
  identifiers: readonly RiskReportSubmissionIdentifier[],
  evidence: readonly RiskReportSubmissionEvidence[],
  issues: readonly RiskReportIssueType[]
): void => {
  if (
    !hasRiskSubjectIdentifier(identifiers, [
      "WEBSITE",
      "SOCIAL_ACCOUNT",
      "PLATFORM_ACCOUNT",
    ])
  ) {
    throw new Error("The exact fake website, app, or profile is required");
  }
  if (evidence.length === 0) {
    throw new Error("A screenshot or video is required before submission");
  }
  if (
    issues.includes("IMPERSONATION") &&
    !identifiers.some(
      (identifier) => identifier.role === "IMPERSONATED_IDENTITY"
    )
  ) {
    throw new Error("The genuine impersonated identity is required");
  }
};

const assertSocialGameAccountSubmission = (
  identifiers: readonly RiskReportSubmissionIdentifier[],
  evidence: readonly RiskReportSubmissionEvidence[],
  dates: {
    accessLostAt: Date | null | undefined;
    handoverAt: Date | null | undefined;
    purchaseAt: Date | null | undefined;
  }
): void => {
  if (
    !identifiers.some(
      (identifier) =>
        identifier.role === "REPORTED_ASSET" &&
        (identifier.type === "SOCIAL_ACCOUNT" ||
          identifier.type === "PLATFORM_ACCOUNT")
    )
  ) {
    throw new Error("The reclaimed account UID is required");
  }
  if (!dates.accessLostAt && !dates.purchaseAt && !dates.handoverAt) {
    throw new Error("The account access-loss date is required");
  }
  if (evidence.length === 0) {
    throw new Error(
      "Evidence of ownership or handover is required before submission"
    );
  }
};

const assertSubmissionNarrativeAndInvolvement = ({
  incidentAt,
  narrative,
  publicNarrative,
  publicPacketPreviewedAt,
  requirePublicProjection,
  reporterInvolvement,
  type,
}: {
  incidentAt: Date | null | undefined;
  narrative: string | null | undefined;
  publicNarrative: string | null | undefined;
  publicPacketPreviewedAt: Date | null | undefined;
  requirePublicProjection: boolean;
  reporterInvolvement: RiskReporterInvolvement | null | undefined;
  type: RiskReportType;
}): void => {
  const narrativeLength = narrative?.trim().length ?? 0;
  if (narrativeLength < 50 || narrativeLength > 10_000) {
    throw new Error(
      "A report narrative between 50 and 10000 characters is required"
    );
  }
  if (requirePublicProjection && !publicNarrative?.trim()) {
    throw new Error("A safe public narrative is required before submission");
  }
  if (requirePublicProjection && !publicPacketPreviewedAt) {
    throw new Error(
      "The public report packet must be previewed before submission"
    );
  }
  if (!reporterInvolvement) {
    throw new Error("Reporter involvement is required before submission");
  }
  if (!incidentAt) {
    throw new Error(
      "An incident or discovery date is required before submission"
    );
  }
  if (
    reporterInvolvement === "DIRECT_OBSERVER" &&
    type !== "MALICIOUS_WEBSITE"
  ) {
    throw new Error(
      "Direct observer reports are limited to fake websites, apps, or profiles"
    );
  }
};

const assertSubmissionFinancials = ({
  claimedLoss,
  lossOccurred,
  transactions,
}: {
  claimedLoss: number | null | undefined;
  lossOccurred: RiskLossOccurrence | null | undefined;
  transactions: readonly RiskReportTransactionInput[];
}): void => {
  if (!lossOccurred) {
    throw new Error("The financial-loss answer is required before submission");
  }
  if (lossOccurred === "YES") {
    if (!claimedLoss || claimedLoss <= 0) {
      throw new Error("A claimed loss greater than zero is required");
    }
    if (transactions.length === 0) {
      throw new Error(
        "At least one transaction is required for a claimed loss"
      );
    }
  }
};

const assertSubmissionIdentifiersAndEvidence = ({
  evidence,
  identifiers,
  platform,
  requirePublicProjection,
  type,
  violationType,
}: {
  evidence: readonly RiskReportSubmissionEvidence[];
  identifiers: readonly RiskReportSubmissionIdentifier[];
  platform?: string | null;
  requirePublicProjection: boolean;
  type: RiskReportType;
  violationType?: RiskReportWebsiteViolationType | null;
}): void => {
  if (type === "MALICIOUS_WEBSITE" && !violationType) {
    throw new Error("A website violation type is required");
  }
  if (type === "SOCIAL_GAME_ACCOUNT" && !platform?.trim()) {
    throw new Error("A platform is required for social or game reports");
  }

  if (identifiers.length === 0) {
    throw new Error("A relevant lookup identifier is required");
  }
  for (const identifier of identifiers) {
    if (
      identifier.type === "BANK_ACCOUNT" &&
      (!identifier.institutionName?.trim() || !identifier.holderName?.trim())
    ) {
      throw new Error(
        "Bank account identifiers require an institution and account-holder name"
      );
    }
  }

  if (
    requirePublicProjection &&
    evidence.some((item) => item.scanStatus !== "CLEAN")
  ) {
    throw new Error(
      "All evidence must pass malware scanning before submission"
    );
  }
  if (
    requirePublicProjection &&
    !evidence.some((item) => item.publicCopyReady)
  ) {
    throw new Error(
      "At least one safe public evidence copy is required before submission"
    );
  }
};

export const assertRiskReportSubmission = (
  {
    accessLostAt,
    claimedLoss,
    evidence,
    handoverAt,
    identifiers,
    incidentAt,
    issues,
    lossOccurred,
    narrative,
    otherIssueDescription,
    platform,
    publicNarrative,
    publicPacketPreviewedAt,
    purchaseAt,
    reporterInvolvement,
    transactions,
    type,
    violationType,
  }: {
    accessLostAt?: Date | null;
    claimedLoss: number | null | undefined;
    evidence: readonly RiskReportSubmissionEvidence[];
    identifiers: readonly RiskReportSubmissionIdentifier[];
    handoverAt?: Date | null;
    incidentAt: Date | null | undefined;
    issues: readonly RiskReportIssueType[];
    lossOccurred: RiskLossOccurrence | null | undefined;
    narrative: string | null | undefined;
    otherIssueDescription?: string | null;
    platform?: string | null;
    publicNarrative: string | null | undefined;
    publicPacketPreviewedAt: Date | null | undefined;
    purchaseAt?: Date | null;
    reporterInvolvement: RiskReporterInvolvement | null | undefined;
    transactions: readonly RiskReportTransactionInput[];
    type: RiskReportType;
    violationType?: RiskReportWebsiteViolationType | null;
  },
  { requirePublicProjection = true }: { requirePublicProjection?: boolean } = {}
): void => {
  assertSubmissionNarrativeAndInvolvement({
    incidentAt,
    narrative,
    publicNarrative,
    publicPacketPreviewedAt,
    reporterInvolvement,
    requirePublicProjection,
    type,
  });

  assertReportIssues(type, issues, otherIssueDescription, narrative);

  assertSubmissionFinancials({
    claimedLoss,
    lossOccurred,
    transactions,
  });

  assertSubmissionIdentifiersAndEvidence({
    evidence,
    identifiers,
    platform,
    requirePublicProjection,
    type,
    violationType,
  });

  if (type === "BANK_WALLET_PHONE") {
    assertBankWalletPhoneSubmission(identifiers, evidence);
  } else if (type === "MALICIOUS_WEBSITE") {
    assertMaliciousWebsiteSubmission(identifiers, evidence, issues);
  } else {
    assertSocialGameAccountSubmission(identifiers, evidence, {
      accessLostAt,
      handoverAt,
      purchaseAt,
    });
  }
};

/** Validates the private intake path while publication processing is deferred. */
export const assertRiskReportIntake = (
  input: Parameters<typeof assertRiskReportSubmission>[0]
): void => {
  assertRiskReportSubmission(input, { requirePublicProjection: false });
};

export const isPublicRiskReportStatus = (status: RiskReportStatus): boolean =>
  status === "CORRECTED" || status === "PUBLISHED" || status === "REMOVED";

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
