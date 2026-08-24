import { z } from "zod";

export const policyMaterialChangeMetadataSchema = z.object({
  changedAreas: z.array(z.string().trim().min(1).max(100)).max(20),
  rationale: z.string().trim().min(1).max(2000),
});

export type PolicyMaterialChangeMetadata = z.infer<
  typeof policyMaterialChangeMetadataSchema
>;

const policyMoneyAmount = z.number().int().min(0).max(1_000_000_000_000);
const policyPercentage = z.number().int().min(0).max(80);

export const protectionPolicyVersionPublishInputSchema = z
  .object({
    bronzeMinimumBondAmount: policyMoneyAmount.default(5_000_000),
    diamondMinimumBondAmount: policyMoneyAmount.default(50_000_000),
    effectiveAt: z.coerce.date(),
    goldMinimumBondAmount: policyMoneyAmount.default(20_000_000),
    materialChange: z.boolean(),
    materialChangeMetadata: policyMaterialChangeMetadataSchema,
    membershipFeeAmount: z.literal(0).default(0),
    minimumBondAmount: policyMoneyAmount.min(1_000_000).default(1_000_000),
    reacceptDeadlineAt: z.coerce.date().nullable().optional(),
    recommendedLimitPercentage: policyPercentage.default(80),
    recommendedLimitRounding: z
      .number()
      .int()
      .min(1)
      .max(1_000_000_000)
      .default(100_000),
    retentionPolicyReference: z.string().trim().min(1).max(500),
    silverMinimumBondAmount: policyMoneyAmount.default(10_000_000),
    summary: z.string().trim().min(1).max(2000),
    terms: z.string().trim().min(1).max(20_000),
    title: z.string().trim().min(1).max(200),
    version: z.string().trim().min(1).max(50),
    vipMinimumBondAmount: policyMoneyAmount.default(100_000_000),
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
    const thresholds = [
      input.minimumBondAmount,
      input.bronzeMinimumBondAmount,
      input.silverMinimumBondAmount,
      input.goldMinimumBondAmount,
      input.diamondMinimumBondAmount,
      input.vipMinimumBondAmount,
    ];
    if (
      thresholds.some((value, index) => {
        const previous = thresholds[index - 1];
        return index > 0 && previous !== undefined && value <= previous;
      })
    ) {
      context.addIssue({
        code: "custom",
        message: "Provider Bond thresholds must be strictly increasing",
        path: ["vipMinimumBondAmount"],
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
