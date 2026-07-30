import { verification } from "@avin/db/schema/auth";
import {
  bankAccountSchema,
  sellerApplication,
  sellerProfile,
} from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../authorization";
import type { Context } from "../context";

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
  sellerAgreementAccepted: z.boolean().refine((val) => val === true, {
    message: "Bạn phải đồng ý với Điều khoản Người bán",
  }),
  sellerAgreementVersion: z.string().default("v1.0"),
});

const getSellerProfile = async (db: Context["db"], userId: string) => {
  const [profile] = await db
    .select()
    .from(sellerProfile)
    .where(eq(sellerProfile.userId, userId))
    .limit(1);
  return profile ?? null;
};

const getLatestApplication = async (db: Context["db"], userId: string) => {
  const [app] = await db
    .select()
    .from(sellerApplication)
    .where(eq(sellerApplication.userId, userId))
    .orderBy(desc(sellerApplication.createdAt))
    .limit(1);
  return app ?? null;
};

export const sellerRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;

    const [profile, latestApplication] = await Promise.all([
      getSellerProfile(context.db, userId),
      getLatestApplication(context.db, userId),
    ]);

    return {
      application: latestApplication,
      profile,
    };
  }),

  requestPhoneOtp: protectedProcedure
    .input(requestPhoneOtpInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      // Generate 6-digit OTP code (mock 123456 for predictable dev/testing)
      const otpCode = "123456";
      const identifier = `phone_otp:${userId}:${input.phone}`;
      // OTP valid for 10 minutes
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Clean up previous OTP requests for this phone number and user
      await context.db
        .delete(verification)
        .where(eq(verification.identifier, identifier));

      // Persist OTP code into verification table
      await context.db.insert(verification).values({
        createdAt: new Date(),
        expiresAt,
        id: crypto.randomUUID(),
        identifier,
        updatedAt: new Date(),
        value: otpCode,
      });

      return {
        message: "Mã OTP đã được gửi đến số điện thoại",
        success: true,
      };
    }),

  submitApplication: protectedProcedure
    .input(submitApplicationInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const profile = await getSellerProfile(context.db, userId);

      if (!profile) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Vui lòng tạo thông tin gian hàng trước khi nộp đơn",
        });
      }

      if (!profile.phoneVerified || !profile.phone) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Vui lòng xác minh số điện thoại qua SMS OTP trước khi nộp đơn",
        });
      }

      // Update bank account on profile
      await context.db
        .update(sellerProfile)
        .set({
          bankAccount: input.bankAccount,
          updatedAt: new Date(),
        })
        .where(eq(sellerProfile.id, profile.id));

      const existingApp = await getLatestApplication(context.db, userId);

      if (existingApp?.status === "PENDING_REVIEW") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Hồ sơ đăng ký người bán của bạn đang được duyệt",
        });
      }

      if (existingApp?.status === "APPROVED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Tài khoản người bán của bạn đã được duyệt",
        });
      }

      const acceptedAt = new Date();

      if (existingApp?.status === "CHANGES_REQUESTED") {
        const [updatedApp] = await context.db
          .update(sellerApplication)
          .set({
            applicantName: context.session.user.name,
            bankAccount: input.bankAccount,
            email: context.session.user.email,
            phone: profile.phone,
            reviewReason: null,
            revisionCount: existingApp.revisionCount + 1,
            sellerAgreementAcceptedAt: acceptedAt,
            sellerAgreementVersion: input.sellerAgreementVersion,
            status: "PENDING_REVIEW",
            storefrontName: profile.storefrontName,
            updatedAt: acceptedAt,
          })
          .where(eq(sellerApplication.id, existingApp.id))
          .returning();

        return updatedApp;
      }

      const [newApp] = await context.db
        .insert(sellerApplication)
        .values({
          applicantName: context.session.user.name,
          bankAccount: input.bankAccount,
          email: context.session.user.email,
          phone: profile.phone,
          revisionCount: 0,
          sellerAgreementAcceptedAt: acceptedAt,
          sellerAgreementVersion: input.sellerAgreementVersion,
          sellerProfileId: profile.id,
          status: "PENDING_REVIEW",
          storefrontName: profile.storefrontName,
          userId,
        })
        .returning();

      return newApp;
    }),

  updateDraftProfile: protectedProcedure
    .input(updateDraftProfileInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const existingProfile = await getSellerProfile(context.db, userId);

      if (existingProfile) {
        const [updated] = await context.db
          .update(sellerProfile)
          .set({
            avatarUrl: input.avatarUrl ?? existingProfile.avatarUrl,
            bankAccount: input.bankAccount ?? existingProfile.bankAccount,
            bio: input.bio ?? existingProfile.bio,
            storefrontName: input.storefrontName,
            updatedAt: new Date(),
          })
          .where(eq(sellerProfile.id, existingProfile.id))
          .returning();

        return updated;
      }

      const [created] = await context.db
        .insert(sellerProfile)
        .values({
          avatarUrl: input.avatarUrl,
          bankAccount: input.bankAccount,
          bio: input.bio,
          phoneVerified: false,
          storefrontName: input.storefrontName,
          userId,
        })
        .returning();

      return created;
    }),

  verifyPhoneOtp: protectedProcedure
    .input(verifyPhoneOtpInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const identifier = `phone_otp:${userId}:${input.phone}`;
      const now = new Date();

      // Look up unexpired verification record matching code in database
      const [record] = await context.db
        .select()
        .from(verification)
        .where(
          and(
            eq(verification.identifier, identifier),
            eq(verification.value, input.code),
            gt(verification.expiresAt, now)
          )
        )
        .limit(1);

      if (!record) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Mã OTP không chính xác hoặc đã hết hạn",
        });
      }

      // Delete used OTP record
      await context.db
        .delete(verification)
        .where(eq(verification.id, record.id));

      const existingProfile = await getSellerProfile(context.db, userId);

      if (existingProfile) {
        const [updated] = await context.db
          .update(sellerProfile)
          .set({
            phone: input.phone,
            phoneVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(sellerProfile.id, existingProfile.id))
          .returning();

        return updated;
      }

      const [created] = await context.db
        .insert(sellerProfile)
        .values({
          phone: input.phone,
          phoneVerified: true,
          storefrontName: `${context.session.user.name} Store`,
          userId,
        })
        .returning();

      return created;
    }),
};
