import { z } from "zod";

const optionalDetailsSchema = z.object({
  facebookUrl: z.string(),
  incidentDate: z.string(),
  ongoing: z.boolean(),
  phoneNumber: z.string(),
  telegramUrl: z.string(),
  tiktokUrl: z.string(),
});

const attestationSchema = z.boolean().refine(Boolean, {
  message: "Vui lòng xác nhận cam kết thông tin trước khi gửi.",
});

const requiredNarrative = z
  .string()
  .trim()
  .min(50, "Nội dung tố cáo cần tối thiểu 50 ký tự để nêu rõ sự việc.")
  .max(10_000);

export const transactionReportFormSchema = z.object({
  accountNumber: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số tài khoản ngân hàng."),
  amount: z
    .string()
    .trim()
    .refine(
      (value) => Number(value.replaceAll(/[,.\s]/gu, "")) > 0,
      "Vui lòng nhập số tiền hợp lệ lớn hơn 0."
    ),
  attestationAccepted: attestationSchema,
  bankName: z.string().trim().min(1, "Vui lòng nhập tên ngân hàng nhận tiền."),
  holderName: z.string().trim().min(1, "Vui lòng nhập tên chủ tài khoản."),
  narrative: requiredNarrative,
  optionalDetails: optionalDetailsSchema,
});

export const accountReportFormSchema = z.object({
  accountId: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập ID hoặc tên tài khoản bị back."),
  attestationAccepted: attestationSchema,
  narrative: requiredNarrative,
  optionalDetails: optionalDetailsSchema,
  platform: z.string().trim().min(1, "Vui lòng nhập nền tảng tài khoản."),
});

const violationTypeSchema = z.enum([
  "IMPERSONATION",
  "PHISHING",
  "MALWARE",
  "FAKE_STORE",
  "PAYMENT_SCAM",
  "OTHER",
]);

export const websiteReportFormSchema = z
  .object({
    attestationAccepted: attestationSchema,
    impersonatedUrl: z.string(),
    narrative: requiredNarrative,
    optionalDetails: optionalDetailsSchema,
    violationType: violationTypeSchema,
    websiteUrl: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập link website, app hoặc profile lừa đảo."),
  })
  .superRefine((value, context) => {
    if (
      value.violationType === "IMPERSONATION" &&
      !value.impersonatedUrl.trim()
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Vui lòng nhập link profile/website chính chủ bị mạo danh để đối chiếu.",
        path: ["impersonatedUrl"],
      });
    }
  });

export type TransactionReportFormValues = z.infer<
  typeof transactionReportFormSchema
>;
export type AccountReportFormValues = z.infer<typeof accountReportFormSchema>;
export type WebsiteReportFormValues = z.infer<typeof websiteReportFormSchema>;
