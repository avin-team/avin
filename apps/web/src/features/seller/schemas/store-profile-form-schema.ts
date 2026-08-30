import { z } from "zod";

const optionalImageUrl = z
  .string()
  .trim()
  .refine((value) => {
    if (!value) {
      return true;
    }
    try {
      return new URL(value).protocol.startsWith("http");
    } catch {
      return false;
    }
  }, "Ảnh phải dùng URL HTTP hoặc HTTPS hợp lệ.");

export const storeProfileFormSchema = z.object({
  avatarUrl: optionalImageUrl.min(1, "Ảnh đại diện gian hàng là bắt buộc."),
  bannerUrl: optionalImageUrl,
  bio: z.string().trim().min(1, "Mô tả gian hàng là bắt buộc.").max(500),
  slugCustomized: z.boolean(),
  storeSlug: z
    .string()
    .trim()
    .min(2, "Đường dẫn gian hàng phải từ 2 ký tự.")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "Đường dẫn gian hàng không hợp lệ."),
  storefrontName: z
    .string()
    .trim()
    .min(2, "Tên gian hàng phải từ 2 ký tự.")
    .max(100),
});

export type StoreProfileFormValues = z.infer<typeof storeProfileFormSchema>;
