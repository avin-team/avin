import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod";

import { user } from "./auth";

export const protectionProviderApplicationStatus = pgEnum(
  "protection_provider_application_status",
  ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"]
);

export const protectionProviderProfileStatus = pgEnum(
  "protection_provider_profile_status",
  [
    "ACTIVE",
    "SUSPENDED_PENDING_REVIEW",
    "WITHDRAWAL_PENDING",
    "WITHDRAWN",
    "REMOVED_FOR_FRAUD",
  ]
);

export const protectionRiskReportType = pgEnum("protection_risk_report_type", [
  "BANK_WALLET_PHONE",
  "MALICIOUS_WEBSITE",
  "SOCIAL_GAME_ACCOUNT",
]);

export const protectionRiskReportWebsiteViolation = pgEnum(
  "protection_risk_report_website_violation",
  [
    "PHISHING",
    "MALWARE",
    "IMPERSONATION",
    "FAKE_STORE",
    "PAYMENT_SCAM",
    "OTHER",
  ]
);

export const protectionRiskReportUrgency = pgEnum(
  "protection_risk_report_urgency",
  ["NORMAL", "URGENT"]
);

export const protectionRiskReportStatus = pgEnum(
  "protection_risk_report_status",
  [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "CHANGES_REQUESTED",
    "REJECTED",
    "PUBLISHED",
    "CORRECTED",
    "REMOVED",
    "UNDER_VERIFICATION",
  ]
);

export const protectionRiskIdentifierType = pgEnum(
  "protection_risk_identifier_type",
  [
    "BANK_ACCOUNT",
    "WALLET_ACCOUNT",
    "PHONE",
    "WEBSITE",
    "SOCIAL_ACCOUNT",
    "PLATFORM_ACCOUNT",
  ]
);

export const protectionRiskEvidenceKind = pgEnum(
  "protection_risk_evidence_kind",
  [
    "PAYMENT_PROOF",
    "CONVERSATION",
    "SCREENSHOT",
    "VIDEO",
    "OWNERSHIP_PROOF",
    "OTHER",
  ]
);

export const protectionRiskEvidenceScanStatus = pgEnum(
  "protection_risk_evidence_scan_status",
  ["PENDING", "CLEAN", "REJECTED"]
);

export const protectionRiskEmailDeliveryStatus = pgEnum(
  "protection_risk_email_delivery_status",
  ["pending", "retrying", "sent", "failed"]
);

export const providerOfficialChannelsSchema = z.object({
  facebookId: z.string().trim().max(200).optional(),
  facebookUrl: z.url().optional(),
  websiteUrl: z.url().optional(),
  zalo: z.string().trim().max(100).optional(),
});

export type ProviderOfficialChannels = z.infer<
  typeof providerOfficialChannelsSchema
>;

export const providerPaymentAccountSchema = z.object({
  accountName: z.string().trim().min(1).max(200),
  accountNumber: z.string().trim().min(1).max(100),
  accountType: z.enum(["BANK", "WALLET"]),
  institution: z.string().trim().min(1).max(200),
});

export type ProviderPaymentAccount = z.infer<
  typeof providerPaymentAccountSchema
>;

export const protectionProviderApplication = pgTable(
  "protection_provider_application",
  {
    ageEvidenceReference: text("age_evidence_reference"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fullName: text("full_name"),
    id: uuid("id").defaultRandom().primaryKey(),
    identityEvidenceReference: text("identity_evidence_reference"),
    officialChannelEvidenceReference: text(
      "official_channel_evidence_reference"
    ),
    officialChannels:
      jsonb("official_channels").$type<ProviderOfficialChannels>(),
    operatingHistoryEvidenceReference: text(
      "operating_history_evidence_reference"
    ),
    operatingSince: date("operating_since", { mode: "string" }),
    paymentAccount: jsonb("payment_account").$type<ProviderPaymentAccount>(),
    paymentDisclosureConsent: boolean("payment_disclosure_consent"),
    paymentEvidenceReference: text("payment_evidence_reference"),
    policyAcceptedAt: timestamp("policy_accepted_at"),
    policyVersion: text("policy_version"),
    providerUserId: text("provider_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revisionCount: integer("revision_count").default(0).notNull(),
    services: text("services"),
    status: protectionProviderApplicationStatus("status")
      .default("DRAFT")
      .notNull(),
    submittedAt: timestamp("submitted_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("protection_provider_application_status_idx").on(table.status),
    index("protection_provider_application_submitted_idx").on(
      table.submittedAt
    ),
    index("protection_provider_application_reviewer_idx").on(
      table.reviewedByUserId
    ),
  ]
);

export const protectionProviderProfile = pgTable(
  "protection_provider_profile",
  {
    applicationId: uuid("application_id")
      .notNull()
      .unique()
      .references(() => protectionProviderApplication.id, {
        onDelete: "restrict",
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    displayName: text("display_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    officialChannels: jsonb("official_channels")
      .$type<ProviderOfficialChannels>()
      .notNull(),
    profileSlug: text("profile_slug").notNull(),
    providerUserId: text("provider_user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    services: text("services").notNull(),
    status: protectionProviderProfileStatus("status")
      .default("ACTIVE")
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("protection_provider_profile_slug_idx").on(table.profileSlug),
    index("protection_provider_profile_status_idx").on(table.status),
  ]
);

export const protectionProviderProfileVersion = pgTable(
  "protection_provider_profile_version",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    displayName: text("display_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    officialChannels: jsonb("official_channels")
      .$type<ProviderOfficialChannels>()
      .notNull(),
    paymentAccount: jsonb("payment_account").$type<ProviderPaymentAccount>(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => protectionProviderProfile.id, {
        onDelete: "restrict",
      }),
    profileSlug: text("profile_slug").notNull(),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
    publishedByUserId: text("published_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    services: text("services").notNull(),
    sourceApplicationId: uuid("source_application_id").references(
      () => protectionProviderApplication.id,
      { onDelete: "set null" }
    ),
    status: protectionProviderProfileStatus("status").notNull(),
    statusReason: text("status_reason"),
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    versionNumber: integer("version_number").notNull(),
  },
  (table) => [
    uniqueIndex("protection_provider_profile_version_number_idx").on(
      table.profileId,
      table.versionNumber
    ),
    index("protection_provider_profile_version_slug_idx").on(table.profileSlug),
  ]
);

export const protectionProviderProfileRevision = pgTable(
  "protection_provider_profile_revision",
  {
    ageEvidenceReference: text("age_evidence_reference"),
    baseVersionId: uuid("base_version_id")
      .notNull()
      .references(() => protectionProviderProfileVersion.id, {
        onDelete: "restrict",
      }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fullName: text("full_name"),
    id: uuid("id").defaultRandom().primaryKey(),
    identityEvidenceReference: text("identity_evidence_reference"),
    officialChannelEvidenceReference: text(
      "official_channel_evidence_reference"
    ),
    officialChannels:
      jsonb("official_channels").$type<ProviderOfficialChannels>(),
    operatingHistoryEvidenceReference: text(
      "operating_history_evidence_reference"
    ),
    operatingSince: date("operating_since", { mode: "string" }),
    paymentAccount: jsonb("payment_account").$type<ProviderPaymentAccount>(),
    paymentDisclosureConsent: boolean("payment_disclosure_consent"),
    paymentEvidenceReference: text("payment_evidence_reference"),
    policyAcceptedAt: timestamp("policy_accepted_at"),
    policyVersion: text("policy_version"),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => protectionProviderProfile.id, {
        onDelete: "restrict",
      }),
    providerUserId: text("provider_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    revisionNumber: integer("revision_number").notNull(),
    services: text("services"),
    status: protectionProviderApplicationStatus("status")
      .default("DRAFT")
      .notNull(),
    submittedAt: timestamp("submitted_at"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("protection_provider_profile_revision_number_idx").on(
      table.profileId,
      table.revisionNumber
    ),
    index("protection_provider_profile_revision_status_idx").on(table.status),
    index("protection_provider_profile_revision_submitted_idx").on(
      table.submittedAt
    ),
  ]
);

export const protectionRiskReporterSession = pgTable(
  "protection_risk_reporter_session",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    email: text("email").notNull(),
    emailHash: text("email_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    ipHash: text("ip_hash"),
    lastUsedAt: timestamp("last_used_at"),
    tokenHash: text("token_hash").notNull(),
  },
  (table) => [
    index("protection_risk_reporter_session_email_hash_idx").on(
      table.emailHash
    ),
    uniqueIndex("protection_risk_reporter_session_token_hash_idx").on(
      table.tokenHash
    ),
    index("protection_risk_reporter_session_expires_idx").on(table.expiresAt),
  ]
);

export const protectionRiskReport = pgTable(
  "protection_risk_report",
  {
    affectedVictimCount: integer("affected_victim_count").default(1).notNull(),
    claimedLoss: integer("claimed_loss"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    narrative: text("narrative"),
    platform: text("platform"),
    publicSlug: text("public_slug"),
    publicSummary: text("public_summary"),
    publishedAt: timestamp("published_at"),
    reporterEmail: text("reporter_email").notNull(),
    reporterName: text("reporter_name"),
    reporterPhone: text("reporter_phone"),
    reporterSessionId: uuid("reporter_session_id")
      .notNull()
      .references(() => protectionRiskReporterSession.id, {
        onDelete: "restrict",
      }),
    reporterZalo: text("reporter_zalo"),
    reviewReason: text("review_reason"),
    reviewedAt: timestamp("reviewed_at"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: protectionRiskReportStatus("status").default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at"),
    type: protectionRiskReportType("type").notNull(),
    underVerificationApproved: boolean("under_verification_approved")
      .default(false)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    urgency: protectionRiskReportUrgency("urgency").default("NORMAL").notNull(),
    violationType: protectionRiskReportWebsiteViolation("violation_type"),
  },
  (table) => [
    uniqueIndex("protection_risk_report_public_slug_idx").on(table.publicSlug),
    index("protection_risk_report_status_idx").on(table.status),
    index("protection_risk_report_submitted_idx").on(table.submittedAt),
    index("protection_risk_report_reporter_session_idx").on(
      table.reporterSessionId
    ),
  ]
);

export const protectionRiskIdentifier = pgTable(
  "protection_risk_identifier",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isPrimary: boolean("is_primary").default(false).notNull(),
    maskedValue: text("masked_value").notNull(),
    normalizedValue: text("normalized_value").notNull(),
    publicValue: text("public_value"),
    reportId: uuid("report_id")
      .notNull()
      .references(() => protectionRiskReport.id, { onDelete: "cascade" }),
    type: protectionRiskIdentifierType("type").notNull(),
    value: text("value").notNull(),
  },
  (table) => [
    index("protection_risk_identifier_report_idx").on(table.reportId),
    index("protection_risk_identifier_lookup_idx").on(
      table.type,
      table.normalizedValue
    ),
  ]
);

export const protectionRiskEvidence = pgTable(
  "protection_risk_evidence",
  {
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    fileName: text("file_name").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    immutableAt: timestamp("immutable_at").defaultNow().notNull(),
    kind: protectionRiskEvidenceKind("kind").notNull(),
    originalStorageKey: text("original_storage_key").notNull(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => protectionRiskReport.id, { onDelete: "cascade" }),
    scanReason: text("scan_reason"),
    scanStatus: protectionRiskEvidenceScanStatus("scan_status")
      .default("PENDING")
      .notNull(),
    sha256: text("sha256"),
    sizeBytes: integer("size_bytes").notNull(),
  },
  (table) => [
    uniqueIndex("protection_risk_evidence_storage_key_idx").on(
      table.originalStorageKey
    ),
    index("protection_risk_evidence_report_idx").on(table.reportId),
  ]
);

export const protectionRiskEvidenceDerivative = pgTable(
  "protection_risk_evidence_derivative",
  {
    contentType: text("content_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    evidenceId: uuid("evidence_id")
      .notNull()
      .unique()
      .references(() => protectionRiskEvidence.id, { onDelete: "cascade" }),
    id: uuid("id").defaultRandom().primaryKey(),
    metadataRemoved: boolean("metadata_removed").default(false).notNull(),
    sha256: text("sha256"),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    unrelatedPiiRedacted: boolean("unrelated_pii_redacted")
      .default(false)
      .notNull(),
    watermarkApplied: boolean("watermark_applied").default(false).notNull(),
  },
  (table) => [
    index("protection_risk_evidence_derivative_storage_idx").on(
      table.storageKey
    ),
  ]
);

export const protectionRiskReportHistory = pgTable(
  "protection_risk_report_history",
  {
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    isPublic: boolean("is_public").default(false).notNull(),
    reason: text("reason"),
    reportId: uuid("report_id")
      .notNull()
      .references(() => protectionRiskReport.id, { onDelete: "cascade" }),
    status: protectionRiskReportStatus("status").notNull(),
  },
  (table) => [
    index("protection_risk_report_history_report_idx").on(
      table.reportId,
      table.createdAt
    ),
  ]
);

export const protectionRiskReportEmailDelivery = pgTable(
  "protection_risk_report_email_delivery",
  {
    attemptCount: integer("attempt_count").default(0).notNull(),
    claimedAt: timestamp("claimed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    eventType: text("event_type").notNull(),
    firstAttemptAt: timestamp("first_attempt_at"),
    htmlBody: text("html_body").notNull(),
    id: uuid("id").defaultRandom().primaryKey(),
    lastAttemptAt: timestamp("last_attempt_at"),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    reportId: uuid("report_id").references(() => protectionRiskReport.id, {
      onDelete: "cascade",
    }),
    retryWindowStartedAt: timestamp("retry_window_started_at").notNull(),
    sourceId: text("source_id").notNull(),
    sourceType: text("source_type").notNull(),
    status: protectionRiskEmailDeliveryStatus("status")
      .default("pending")
      .notNull(),
    subject: text("subject").notNull(),
    textBody: text("text_body").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("protection_risk_email_delivery_event_unique_idx").on(
      table.sourceType,
      table.sourceId,
      table.eventType,
      table.recipientEmail
    ),
    index("protection_risk_email_delivery_claim_idx").on(
      table.status,
      table.nextAttemptAt,
      table.claimedAt
    ),
  ]
);
