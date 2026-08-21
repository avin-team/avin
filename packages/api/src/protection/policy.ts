import { z } from "zod";

export const policyMaterialChangeMetadataSchema = z.object({
  changedAreas: z.array(z.string().trim().min(1).max(100)).max(20),
  rationale: z.string().trim().min(1).max(2000),
});

export type PolicyMaterialChangeMetadata = z.infer<
  typeof policyMaterialChangeMetadataSchema
>;

const policyMoneyAmount = z.number().int().min(0).max(1_000_000_000_000);

export const protectionPolicyVersionPublishInputSchema = z
  .object({
    effectiveAt: z.coerce.date(),
    materialChange: z.boolean(),
    materialChangeMetadata: policyMaterialChangeMetadataSchema,
    membershipFeeAmount: policyMoneyAmount,
    minimumBondAmount: policyMoneyAmount,
    reacceptDeadlineAt: z.coerce.date().nullable().optional(),
    retentionPolicyReference: z.string().trim().min(1).max(500),
    summary: z.string().trim().min(1).max(2000),
    terms: z.string().trim().min(1).max(20_000),
    title: z.string().trim().min(1).max(200),
    version: z.string().trim().min(1).max(50),
  })
  .superRefine((input, context) => {
    if (input.materialChange && !input.reacceptDeadlineAt) {
      context.addIssue({
        code: "custom",
        message: "A material policy change requires a reacceptance deadline",
        path: ["reacceptDeadlineAt"],
      });
    }
    if (!input.materialChange && input.reacceptDeadlineAt) {
      context.addIssue({
        code: "custom",
        message:
          "Only material policy changes can have a reacceptance deadline",
        path: ["reacceptDeadlineAt"],
      });
    }
    if (
      input.reacceptDeadlineAt &&
      input.reacceptDeadlineAt <= input.effectiveAt
    ) {
      context.addIssue({
        code: "custom",
        message: "Reacceptance deadline must be after the effective time",
        path: ["reacceptDeadlineAt"],
      });
    }
  });

export type ProtectionPolicyVersionPublishInput = z.infer<
  typeof protectionPolicyVersionPublishInputSchema
>;

export const protectionPolicyVersionIdInputSchema = z.object({
  policyVersionId: z.uuid(),
});

export const protectionPolicyVersionListInputSchema = z
  .object({
    currentOnly: z.boolean().optional(),
  })
  .optional();

export const protectionPolicyAcceptanceInputSchema =
  protectionPolicyVersionIdInputSchema;

export const isPolicyAcceptanceOverdue = ({
  accepted,
  deadline,
  materialChange,
  now,
}: {
  accepted: boolean;
  deadline: Date | null;
  materialChange: boolean;
  now: Date;
}): boolean =>
  materialChange &&
  !accepted &&
  deadline !== null &&
  now.getTime() >= deadline.getTime();
