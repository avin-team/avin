import { z } from "zod";

export const providerRiskIncidentStatuses = [
  "AWAITING_PROVIDER_RESPONSE",
  "PROVIDER_RESPONDED",
  "RESPONSE_EXPIRED",
  "UNDER_REVIEW",
  "DISMISSED",
  "CONFIRMED_FRAUD",
] as const;

export type ProviderRiskIncidentStatus =
  (typeof providerRiskIncidentStatuses)[number];

export const providerRiskIncidentReviewStatuses = [
  "UNDER_REVIEW",
  "DISMISSED",
] as const;

export type ProviderRiskIncidentReviewStatus =
  (typeof providerRiskIncidentReviewStatuses)[number];

export const PROVIDER_RISK_RESPONSE_WINDOW_MS = 48 * 60 * 60 * 1000;

export const providerRiskIncidentLinkInputSchema = z.object({
  profileId: z.uuid(),
  profileVersionId: z.uuid().optional(),
  reason: z.string().trim().min(1).max(2000).optional(),
  reportId: z.uuid(),
});

export type ProviderRiskIncidentLinkInput = z.infer<
  typeof providerRiskIncidentLinkInputSchema
>;

export const providerRiskIncidentIdInputSchema = z.object({
  incidentId: z.uuid(),
});

export const providerRiskIncidentListInputSchema = z
  .object({
    profileId: z.uuid().optional(),
    reportId: z.uuid().optional(),
    status: z.enum(providerRiskIncidentStatuses).optional(),
  })
  .optional();

export const providerRiskIncidentResponseInputSchema = z.object({
  incidentId: z.uuid(),
  response: z.string().trim().min(20).max(10_000),
});

export type ProviderRiskIncidentResponseInput = z.infer<
  typeof providerRiskIncidentResponseInputSchema
>;

export const providerRiskIncidentEvidenceInputSchema = z.object({
  contentType: z.string().trim().min(1).max(120),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((value) => !/[\\/]/u.test(value), {
      message: "Evidence file name must not contain path separators",
    }),
  incidentId: z.uuid(),
  kind: z.enum([
    "PAYMENT_PROOF",
    "CONVERSATION",
    "SCREENSHOT",
    "VIDEO",
    "OWNERSHIP_PROOF",
    "OTHER",
  ]),
  originalStorageKey: z.string().trim().min(1).max(500),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/iu)
    .optional(),
  sizeBytes: z.number().int().positive(),
});

export type ProviderRiskIncidentEvidenceInput = z.infer<
  typeof providerRiskIncidentEvidenceInputSchema
>;

export const providerRiskIncidentReviewInputSchema = z.object({
  incidentId: z.uuid(),
  reason: z.string().trim().min(1).max(2000),
  status: z.enum(providerRiskIncidentReviewStatuses),
});

export type ProviderRiskIncidentReviewInput = z.infer<
  typeof providerRiskIncidentReviewInputSchema
>;

export const providerRiskIncidentConfirmFraudInputSchema = z.object({
  incidentId: z.uuid(),
  reason: z.string().trim().min(1).max(2000),
});

export type ProviderRiskIncidentConfirmFraudInput = z.infer<
  typeof providerRiskIncidentConfirmFraudInputSchema
>;

export const providerRiskIncidentCandidateListInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
  })
  .optional();

export const providerRiskIncidentStatusTransitions: Record<
  ProviderRiskIncidentStatus,
  readonly ProviderRiskIncidentStatus[]
> = {
  AWAITING_PROVIDER_RESPONSE: ["PROVIDER_RESPONDED", "RESPONSE_EXPIRED"],
  CONFIRMED_FRAUD: [],
  DISMISSED: [],
  PROVIDER_RESPONDED: ["UNDER_REVIEW", "DISMISSED", "CONFIRMED_FRAUD"],
  RESPONSE_EXPIRED: ["UNDER_REVIEW", "DISMISSED", "CONFIRMED_FRAUD"],
  UNDER_REVIEW: ["DISMISSED", "CONFIRMED_FRAUD"],
};

export const assertProviderRiskIncidentTransition = (
  current: ProviderRiskIncidentStatus,
  next: ProviderRiskIncidentStatus
): void => {
  if (!providerRiskIncidentStatusTransitions[current].includes(next)) {
    throw new Error(
      `Provider risk incident transition ${current} -> ${next} is not allowed`
    );
  }
};

export const getProviderRiskResponseDeadline = (noticeVerifiedAt: Date): Date =>
  new Date(noticeVerifiedAt.getTime() + PROVIDER_RISK_RESPONSE_WINDOW_MS);

export const isProviderRiskResponseOpen = ({
  incident,
  now,
}: {
  incident: {
    responseDeadlineAt: Date;
    status: ProviderRiskIncidentStatus;
  };
  now: Date;
}): boolean =>
  incident.status === "AWAITING_PROVIDER_RESPONSE" &&
  now.getTime() < incident.responseDeadlineAt.getTime();
