import { z } from "zod";

const storefrontFieldsSchema = z.object({
  accountName: z.string().trim(),
  accountNumber: z.string().trim(),
  agreementAccepted: z.boolean(),
  avatarUrl: z.string().trim(),
  bankName: z.string().trim(),
  bio: z.string().trim().max(2000),
  phone: z.string().trim(),
  storefrontName: z.string().trim(),
});

export const createSellerOnboardingFormSchema = (step: 1 | 2) =>
  storefrontFieldsSchema.superRefine((value, context) => {
    if (!value.avatarUrl) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng tải lên ảnh đại diện / logo gian hàng.",
        path: ["avatarUrl"],
      });
    }
    if (!value.storefrontName) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng nhập tên gian hàng.",
        path: ["storefrontName"],
      });
    }
    if (!value.phone) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng nhập số điện thoại liên hệ.",
        path: ["phone"],
      });
    }

    if (step !== 2) {
      return;
    }

    if (
      !value.bankName ||
      !value.accountName ||
      !/^\d{4,30}$/u.test(value.accountNumber)
    ) {
      context.addIssue({
        code: "custom",
        message: "Vui lòng điền đầy đủ thông tin tài khoản ngân hàng.",
        path: ["accountNumber"],
      });
    }
    if (!value.agreementAccepted) {
      context.addIssue({
        code: "custom",
        message: "Bạn phải đồng ý với Điều khoản Người bán Avin.",
        path: ["agreementAccepted"],
      });
    }
  });

export type SellerOnboardingFormValues = z.infer<
  ReturnType<typeof createSellerOnboardingFormSchema>
>;
