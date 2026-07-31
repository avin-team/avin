import { user, verification } from "@avin/db/schema/auth";
import { sellerApplication, sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, gt } from "drizzle-orm";

import { adminProcedure, protectedProcedure } from "../access/procedures";
import {
  adminDecideApplicationInputSchema,
  adminGetApplicationInputSchema,
  adminListApplicationsInputSchema,
  findLatestSellerApplication,
  findSellerProfile,
  requestPhoneOtpInputSchema,
  submitApplicationInputSchema,
  updateDraftProfileInputSchema,
  verifyPhoneOtpInputSchema,
} from "./onboarding";

export const sellerApplicationRouter = {
  adminDecide: adminProcedure
    .input(adminDecideApplicationInputSchema)
    .handler(async ({ context, input }) => {
      const [app] = await context.db
        .select()
        .from(sellerApplication)
        .where(eq(sellerApplication.id, input.id))
        .limit(1);

      if (!app) {
        throw new ORPCError("NOT_FOUND", {
          message: "Hồ sơ đăng ký người bán không tồn tại",
        });
      }

      if (app.status !== "PENDING_REVIEW") {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Chỉ có thể đưa ra phán quyết cho hồ sơ đang ở trạng thái chờ duyệt",
        });
      }

      const normalizedReason = input.reason?.trim();
      if (input.decision !== "APPROVED" && !normalizedReason) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Vui lòng cung cấp lý do phản hồi",
        });
      }

      const [updatedApp] = await context.db
        .update(sellerApplication)
        .set({
          reviewReason: input.decision === "APPROVED" ? null : normalizedReason,
          status: input.decision,
          updatedAt: new Date(),
        })
        .where(eq(sellerApplication.id, input.id))
        .returning();

      if (input.decision === "APPROVED") {
        await context.db
          .update(user)
          .set({ role: "SELLER" })
          .where(eq(user.id, app.userId));
      }

      return {
        applicantName: updatedApp.applicantName,
        bankAccount: updatedApp.bankAccount,
        email: updatedApp.email,
        id: updatedApp.id,
        phone: updatedApp.phone,
        reviewReason: updatedApp.reviewReason ?? undefined,
        revisionCount: updatedApp.revisionCount,
        sellerAgreementVersion: updatedApp.sellerAgreementVersion,
        status: updatedApp.status,
        storefrontName: updatedApp.storefrontName,
        submittedAt: updatedApp.createdAt.toISOString(),
      };
    }),

  adminGet: adminProcedure
    .input(adminGetApplicationInputSchema)
    .handler(async ({ context, input }) => {
      const [app] = await context.db
        .select()
        .from(sellerApplication)
        .where(eq(sellerApplication.id, input.id))
        .limit(1);

      if (!app) {
        throw new ORPCError("NOT_FOUND", {
          message: "Hồ sơ đăng ký người bán không tồn tại",
        });
      }

      return {
        applicantName: app.applicantName,
        bankAccount: app.bankAccount,
        email: app.email,
        id: app.id,
        phone: app.phone,
        reviewReason: app.reviewReason ?? undefined,
        revisionCount: app.revisionCount,
        sellerAgreementVersion: app.sellerAgreementVersion,
        status: app.status,
        storefrontName: app.storefrontName,
        submittedAt: app.createdAt.toISOString(),
      };
    }),

  adminList: adminProcedure
    .input(adminListApplicationsInputSchema)
    .handler(async ({ context, input }) => {
      const statusFilter =
        input?.status && input.status !== "ALL" ? input.status : undefined;
      const searchQuery = input?.search?.trim().toLowerCase();

      const apps = await context.db
        .select()
        .from(sellerApplication)
        .orderBy(desc(sellerApplication.createdAt));

      const result = [];
      for (const app of apps) {
        if (statusFilter && app.status !== statusFilter) {
          continue;
        }
        if (searchQuery && searchQuery.length > 0) {
          const matches = [
            app.applicantName,
            app.email,
            app.storefrontName,
            app.phone,
          ].some((field) => field.toLowerCase().includes(searchQuery));
          if (!matches) {
            continue;
          }
        }
        result.push({
          applicantName: app.applicantName,
          bankAccount: app.bankAccount,
          email: app.email,
          id: app.id,
          phone: app.phone,
          reviewReason: app.reviewReason ?? undefined,
          revisionCount: app.revisionCount,
          sellerAgreementVersion: app.sellerAgreementVersion,
          status: app.status,
          storefrontName: app.storefrontName,
          submittedAt: app.createdAt.toISOString(),
        });
      }
      return result;
    }),

  getProfile: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;

    const [profile, latestApplication] = await Promise.all([
      findSellerProfile(context.db, userId),
      findLatestSellerApplication(context.db, userId),
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

      const profile = await findSellerProfile(context.db, userId);

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

      const existingApp = await findLatestSellerApplication(context.db, userId);

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

      const existingProfile = await findSellerProfile(context.db, userId);

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

      const existingProfile = await findSellerProfile(context.db, userId);

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
