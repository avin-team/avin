import { z } from "zod";

const optionalChannelUrl = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) {
      return true;
    }
    try {
      const url = new URL(value);
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        value.length <= 2000
      );
    } catch {
      return false;
    }
  }, "Nhập URL HTTP hoặc HTTPS hợp lệ.");

const zaloSchema = z.object({
  id: z.string().min(1),
  phone: z.string().trim().min(1, "Vui lòng nhập số Zalo.").max(100),
});

const facebookSchema = z.object({
  id: z.string().min(1),
  url: optionalChannelUrl,
});

const bankAccountSchema = z.object({
  accountName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên chủ tài khoản.")
    .max(200),
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{4,30}$/u, "Số tài khoản phải có từ 4 đến 30 chữ số."),
  bankCode: z.string().trim().min(2, "Vui lòng chọn ngân hàng.").max(50),
  id: z.string().min(1),
  isPrimary: z.boolean(),
});

export const providerApplicationFormSchema = z
  .object({
    bio: z.string().trim().max(150),
    bondAmount: z.number().int().min(1_000_000).max(1_000_000_000_000),
    citizenIdNumber: z
      .string()
      .regex(/^\d{12}$/u, "CCCD phải gồm đúng 12 chữ số."),
    facebooks: z.array(facebookSchema).max(10),
    fullName: z.string().trim().min(2).max(200),
    location: z.string().trim().min(2).max(200),
    officialChannels: z.object({
      avatarUrl: optionalChannelUrl,
      hotline: z.string().trim().max(100),
      telegramCommunityUrl: optionalChannelUrl,
      tiktokUrl: optionalChannelUrl,
      websiteUrl: optionalChannelUrl,
      youtubeUrl: optionalChannelUrl,
    }),
    policyAccepted: z
      .boolean()
      .refine(
        (value) => value,
        "Bạn cần đồng ý với Quy chế Hoạt động Đối tác."
      ),
    publicDataConsent: z
      .boolean()
      .refine((value) => value, "Bạn cần đồng ý công khai dữ liệu đối tác."),
    registeredBankAccounts: z
      .array(bankAccountSchema)
      .min(1)
      .max(10)
      .superRefine((accounts, context) => {
        if (accounts.filter((account) => account.isPrimary).length !== 1) {
          context.addIssue({
            code: "custom",
            message: "Cần chọn đúng một tài khoản chính.",
          });
        }
      }),
    services: z.string().trim().min(5).max(4000),
    zalos: z.array(zaloSchema).min(1).max(10),
  })
  .superRefine((value, context) => {
    if (
      value.facebooks.length > 1 &&
      value.facebooks.some((item) => !item.url.trim())
    ) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng hoàn tất hoặc xóa các link Facebook phụ.",
        path: ["facebooks"],
      });
    }

    const hasOfficialChannel =
      Object.values(value.officialChannels).some(
        (channel) => channel.trim().length > 0
      ) ||
      value.facebooks.some((item) => item.url.trim().length > 0) ||
      value.zalos.some((item) => item.phone.trim().length > 0);
    if (!hasOfficialChannel) {
      context.addIssue({
        code: "custom",
        message: "Cần khai báo ít nhất một kênh liên hệ chính thức.",
        path: ["officialChannels"],
      });
    }
  });

export type ProviderApplicationFormValues = z.infer<
  typeof providerApplicationFormSchema
>;
