import {
  bankAccountSchema,
  sellerApplication,
  sellerProfile,
} from "@avin/db/schema/seller";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";

export const updateDraftProfileInputSchema = z.object({
  avatarUrl: z.union([z.url(), z.literal("")]).optional(),
  bankAccount: bankAccountSchema.optional(),
  bio: z.string().max(500).optional(),
  storefrontName: z
    .string()
    .min(2, "Tên gian hàng phải từ 2 ký tự")
    .max(100, "Tên gian hàng tối đa 100 ký tự"),
});

export const requestPhoneOtpInputSchema = z.object({
  phone: z
    .string()
    .min(9, "Số điện thoại không hợp lệ")
    .max(15, "Số điện thoại không hợp lệ"),
});

export const verifyPhoneOtpInputSchema = z.object({
  code: z.string().length(6, "Mã OTP gồm 6 chữ số"),
  phone: z.string().min(9),
});

export const submitApplicationInputSchema = z.object({
  bankAccount: bankAccountSchema,
  sellerAgreementAccepted: z.boolean().refine((value) => value === true, {
    message: "Bạn phải đồng ý với Điều khoản Người bán",
  }),
  sellerAgreementVersion: z.string().default("v1.0"),
});

export const adminListApplicationsInputSchema = z
  .object({
    search: z.string().optional(),
    status: z
      .enum([
        "ALL",
        "PENDING_REVIEW",
        "APPROVED",
        "CHANGES_REQUESTED",
        "REJECTED",
      ])
      .optional(),
  })
  .optional();

export const adminGetApplicationInputSchema = z.object({
  id: z.string(),
});

export const adminDecideApplicationInputSchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED", "REJECTED"]),
  id: z.string(),
  reason: z.string().optional(),
});

export const findSellerProfile = async (db: Context["db"], userId: string) => {
  const [profile] = await db
    .select()
    .from(sellerProfile)
    .where(eq(sellerProfile.userId, userId))
    .limit(1);
  return profile ?? null;
};

export const findLatestSellerApplication = async (
  db: Context["db"],
  userId: string
) => {
  const [application] = await db
    .select()
    .from(sellerApplication)
    .where(eq(sellerApplication.userId, userId))
    .orderBy(desc(sellerApplication.createdAt))
    .limit(1);
  return application ?? null;
};
