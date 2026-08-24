import {
  providerOfficialChannelsSchema,
  providerRegisteredBankAccountsSchema,
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

export const providerProfileStatuses = [
  "ACTIVE",
  "SUSPENDED_PENDING_REVIEW",
  "WITHDRAWAL_PENDING",
  "WITHDRAWN",
  "REMOVED_FOR_FRAUD",
] as const;

export type ProviderProfileStatus = (typeof providerProfileStatuses)[number];

export type ProviderApplicationDecision = Exclude<
  ProviderApplicationStatus,
  "DRAFT" | "PENDING_REVIEW"
>;

const evidenceReference = z.string().trim().min(1).max(500);
const citizenIdNumber = z.string().regex(/^\d{12}$/u);
const location = z.string().trim().min(2).max(200);
const bondAmount = z.number().int().min(1_000_000).max(1_000_000_000_000);

const registeredBankAccountsDraftSchema = z
  .array(providerRegisteredBankAccountsSchema.element)
  .max(10);

const providerApplicationFieldsSchema = z.object({
  bondAmount,
  citizenIdNumber,
  fullName: z.string().trim().min(2).max(200),
  location,
  officialChannels: providerOfficialChannelsSchema,
  policyAccepted: z.boolean(),
  policyVersion: z.string().trim().min(1).max(50),
  publicDataConsent: z.literal(true),
  registeredBankAccounts: providerRegisteredBankAccountsSchema,
  services: z.string().trim().min(5).max(4000),
});

export const providerApplicationDraftInputSchema = z.object({
  bondAmount: bondAmount.optional(),
  citizenIdNumber: citizenIdNumber.optional(),
  fullName: providerApplicationFieldsSchema.shape.fullName.optional(),
  location: location.optional(),
  officialChannels: providerOfficialChannelsSchema.partial().optional(),
  policyAccepted: z.boolean().optional(),
  policyVersion: z.string().trim().min(1).max(50).optional(),
  publicDataConsent: z.boolean().optional(),
  registeredBankAccounts: registeredBankAccountsDraftSchema.optional(),
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

    if (!input.officialChannels.hotline?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Hotline is required",
        path: ["officialChannels", "hotline"],
      });
    }

    if (!input.officialChannels.zalo?.trim()) {
      context.addIssue({
        code: "custom",
        message: "Zalo is required",
        path: ["officialChannels", "zalo"],
      });
    }

    if (!input.policyAccepted) {
      context.addIssue({
        code: "custom",
        message: "Current policy acceptance is required",
        path: ["policyAccepted"],
      });
    }

    if (!input.publicDataConsent) {
      context.addIssue({
        code: "custom",
        message: "Public data consent is required",
        path: ["publicDataConsent"],
      });
    }
  });

export type ProviderApplicationSubmission = z.infer<
  typeof providerApplicationSubmissionInputSchema
>;

export const providerProfileRevisionDraftInputSchema =
  providerApplicationDraftInputSchema;

export const providerProfileRevisionSubmissionInputSchema =
  providerApplicationSubmissionInputSchema;

export const providerProfileRevisionDecisionInputSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  id: z.uuid(),
  reason: z.string().trim().max(2000).optional(),
});

export const providerProfileRevisionIdInputSchema = z.object({
  id: z.uuid(),
});

export const providerProfileRevisionListInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    status: z.enum(providerApplicationStatuses).optional(),
  })
  .optional();

export const providerProfileStatusInputSchema = z.object({
  id: z.uuid(),
  status: z.enum(providerProfileStatuses),
  statusReason: z.string().trim().max(2000).optional(),
});

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

export const providerOwnershipRelinkInputSchema = z.object({
  identityEvidenceReference: evidenceReference,
  profileId: z.uuid(),
  reason: z.string().trim().min(20).max(2000),
  targetUserId: z.string().trim().min(1).max(200),
});

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
  _now = new Date(),
  expectedPolicyVersion = CURRENT_PROVIDER_POLICY_VERSION
): ProviderApplicationSubmission => {
  const submission = providerApplicationSubmissionInputSchema.parse(input);
  if (submission.policyVersion !== expectedPolicyVersion) {
    throw new Error("Provider application must accept the current policy");
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
