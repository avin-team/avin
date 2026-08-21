import {
  providerOfficialChannelsSchema,
  providerPaymentAccountSchema,
} from "@avin/db/schema/protection";
import { z } from "zod";

export const CURRENT_PROVIDER_POLICY_VERSION = "v1.0";

export const providerApplicationStatuses = [
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "REJECTED",
] as const;

export type ProviderApplicationStatus =
  (typeof providerApplicationStatuses)[number];

export type ProviderApplicationDecision = Exclude<
  ProviderApplicationStatus,
  "DRAFT" | "PENDING_REVIEW"
>;

const evidenceReference = z.string().trim().min(1).max(500);
const operatingSince = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

const providerApplicationFieldsSchema = z.object({
  ageEvidenceReference: evidenceReference,
  fullName: z.string().trim().min(2).max(200),
  identityEvidenceReference: evidenceReference,
  officialChannelEvidenceReference: evidenceReference,
  officialChannels: providerOfficialChannelsSchema,
  operatingHistoryEvidenceReference: evidenceReference,
  operatingSince,
  paymentAccount: providerPaymentAccountSchema,
  paymentDisclosureConsent: z.boolean(),
  paymentEvidenceReference: evidenceReference,
  policyAccepted: z.boolean(),
  policyVersion: z.string().trim().min(1).max(50),
  services: z.string().trim().min(10).max(2000),
});

export const providerApplicationDraftInputSchema = z.object({
  ageEvidenceReference: evidenceReference.optional(),
  fullName: providerApplicationFieldsSchema.shape.fullName.optional(),
  identityEvidenceReference: evidenceReference.optional(),
  officialChannelEvidenceReference: evidenceReference.optional(),
  officialChannels: providerOfficialChannelsSchema.partial().optional(),
  operatingHistoryEvidenceReference: evidenceReference.optional(),
  operatingSince: operatingSince.optional(),
  paymentAccount: providerPaymentAccountSchema.partial().optional(),
  paymentDisclosureConsent: z.boolean().optional(),
  paymentEvidenceReference: evidenceReference.optional(),
  policyAccepted: z.boolean().optional(),
  policyVersion: z.string().trim().min(1).max(50).optional(),
  services: providerApplicationFieldsSchema.shape.services.optional(),
});

export type ProviderApplicationDraft = z.infer<
  typeof providerApplicationDraftInputSchema
>;

export const providerApplicationSubmissionInputSchema =
  providerApplicationFieldsSchema.superRefine((input, context) => {
    const hasOfficialChannel = Object.values(input.officialChannels).some(
      (value) => Boolean(value?.trim())
    );
    if (!hasOfficialChannel) {
      context.addIssue({
        code: "custom",
        message: "At least one official channel is required",
        path: ["officialChannels"],
      });
    }

    if (!input.policyAccepted) {
      context.addIssue({
        code: "custom",
        message: "Current policy acceptance is required",
        path: ["policyAccepted"],
      });
    }
  });

export type ProviderApplicationSubmission = z.infer<
  typeof providerApplicationSubmissionInputSchema
>;

export const providerApplicationDecisionInputSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  id: z.uuid(),
  reason: z.string().trim().max(2000).optional(),
});

export const providerApplicationListInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(providerApplicationStatuses).optional(),
  })
  .optional();

export const providerApplicationIdInputSchema = z.object({ id: z.uuid() });

const allowedTransitions: Record<
  ProviderApplicationStatus,
  readonly ProviderApplicationStatus[]
> = {
  APPROVED: [],
  CHANGES_REQUESTED: ["PENDING_REVIEW"],
  DRAFT: ["PENDING_REVIEW"],
  PENDING_REVIEW: ["APPROVED", "CHANGES_REQUESTED", "REJECTED"],
  REJECTED: [],
};

export const assertProviderApplicationTransition = (
  current: ProviderApplicationStatus,
  next: ProviderApplicationStatus
): void => {
  if (!allowedTransitions[current].includes(next)) {
    throw new Error(
      `Provider application transition ${current} -> ${next} is not allowed`
    );
  }
};

export const validateProviderApplicationSubmission = (
  input: unknown,
  now = new Date()
): ProviderApplicationSubmission => {
  const submission = providerApplicationSubmissionInputSchema.parse(input);
  if (submission.policyVersion !== CURRENT_PROVIDER_POLICY_VERSION) {
    throw new Error("Provider application must accept the current policy");
  }

  const operatingDate = new Date(`${submission.operatingSince}T00:00:00.000Z`);
  const oneYearAgo = new Date(now);
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  if (operatingDate > oneYearAgo) {
    throw new Error(
      "Provider must show at least one year of operating history"
    );
  }

  return submission;
};

export const createProviderProfileSlug = (
  displayName: string,
  providerUserId: string
): string => {
  const normalizedName = displayName
    .replaceAll(/[Đđ]/gu, "D")
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "")
    .slice(0, 80);
  const normalizedUserId = providerUserId
    .replaceAll(/[^a-z0-9]/giu, "")
    .toLowerCase()
    .slice(0, 12);

  return `${normalizedName || "provider"}-${normalizedUserId || "profile"}`;
};
