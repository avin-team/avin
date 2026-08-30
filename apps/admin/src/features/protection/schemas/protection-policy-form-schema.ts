import { z } from "zod";

const numericString = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => {
      const number = Number(value);
      return Number.isInteger(number) && number >= min && number <= max;
    }, message);

const policyMoney = numericString(
  0,
  1_000_000_000_000,
  "Vui lòng nhập số tiền nguyên hợp lệ."
);

export const protectionPolicyFormSchema = z
  .object({
    bronzeMinimumBondAmount: policyMoney,
    changedAreas: z
      .string()
      .trim()
      .refine(
        (value) => value.split(",").some((area) => area.trim().length > 0),
        "Vui lòng nhập ít nhất một vùng thay đổi."
      ),
    diamondMinimumBondAmount: policyMoney,
    effectiveAt: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn thời điểm hiệu lực.")
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        "Thời điểm hiệu lực không hợp lệ."
      ),
    goldMinimumBondAmount: policyMoney,
    materialChange: z.boolean(),
    membershipFeeAmount: z
      .string()
      .refine((value) => Number(value) === 0, "Membership Fee phải bằng 0."),
    minimumBondAmount: numericString(
      1_000_000,
      1_000_000_000_000,
      "Minimum Bond phải từ 1.000.000 VND."
    ),
    rationale: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập lý do thay đổi.")
      .max(2000),
    reacceptDeadlineAt: z.string(),
    recommendedLimitPercentage: numericString(
      0,
      80,
      "Phần trăm hạn mức phải từ 0 đến 80."
    ),
    recommendedLimitRounding: numericString(
      1,
      1_000_000_000,
      "Đơn vị làm tròn phải là số nguyên dương."
    ),
    retentionPolicyReference: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập retention policy reference.")
      .max(500),
    silverMinimumBondAmount: policyMoney,
    summary: z.string().trim().min(1).max(2000),
    terms: z.string().trim().min(1).max(20_000),
    title: z.string().trim().min(1).max(200),
    version: z.string().trim().min(1).max(50),
    vipMinimumBondAmount: policyMoney,
  })
  .superRefine((value, context) => {
    if (value.materialChange && !value.reacceptDeadlineAt.trim()) {
      context.addIssue({
        code: "custom",
        message: "Material change cần deadline reaccept.",
        path: ["reacceptDeadlineAt"],
      });
    }
    if (!value.materialChange && value.reacceptDeadlineAt.trim()) {
      context.addIssue({
        code: "custom",
        message: "Chỉ material change mới có deadline reaccept.",
        path: ["reacceptDeadlineAt"],
      });
    }

    const effectiveAt = new Date(value.effectiveAt);
    const deadline = value.reacceptDeadlineAt
      ? new Date(value.reacceptDeadlineAt)
      : null;
    if (
      deadline &&
      !Number.isNaN(effectiveAt.getTime()) &&
      !Number.isNaN(deadline.getTime()) &&
      deadline <= effectiveAt
    ) {
      context.addIssue({
        code: "custom",
        message: "Deadline reaccept phải sau thời điểm hiệu lực.",
        path: ["reacceptDeadlineAt"],
      });
    }

    const thresholds = [
      value.minimumBondAmount,
      value.bronzeMinimumBondAmount,
      value.silverMinimumBondAmount,
      value.goldMinimumBondAmount,
      value.diamondMinimumBondAmount,
      value.vipMinimumBondAmount,
    ].map(Number);
    if (
      thresholds.some(
        (threshold, index) =>
          index > 0 && threshold <= (thresholds[index - 1] ?? -1)
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Các ngưỡng Provider Bond phải tăng dần.",
        path: ["vipMinimumBondAmount"],
      });
    }
  });

export type ProtectionPolicyFormValues = z.infer<
  typeof protectionPolicyFormSchema
>;
