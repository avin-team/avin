import { sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import { protectedProcedure } from "../access/procedures";
import { findSellerProfile } from "../seller-application/onboarding";
import { storeProfileInputSchema } from "./profile";
import type { PublicStoreProfile } from "./profile";

const sellerStoreProcedure = protectedProcedure.use(
  async ({ context, next }) => {
    if (context.session.user.role === "SELLER") {
      return next();
    }

    const existingProfile = await context.db.query.sellerProfile.findFirst({
      columns: { id: true },
      where: (table, { eq: equals }) =>
        equals(table.userId, context.session.user.id),
    });

    if (!existingProfile) {
      throw new ORPCError("FORBIDDEN", {
        message: "Seller access is not available for this account",
      });
    }

    return next();
  }
);

const toPublicStoreProfile = (profile: typeof sellerProfile.$inferSelect) =>
  ({
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    bio: profile.bio,
    createdAt: profile.createdAt,
    id: profile.id,
    storeSlug: profile.storeSlug,
    storefrontName: profile.storefrontName,
    updatedAt: profile.updatedAt,
  }) satisfies PublicStoreProfile;

export const sellerStoreRouter = {
  getProfile: sellerStoreProcedure.handler(async ({ context }) => {
    const profile = await findSellerProfile(
      context.db,
      context.session.user.id
    );

    return {
      profile: profile ? toPublicStoreProfile(profile) : null,
      status: "DRAFT" as const,
    };
  }),

  updateProfile: sellerStoreProcedure
    .input(storeProfileInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const existingProfile = await findSellerProfile(context.db, userId);
      const conflictingProfile = await context.db.query.sellerProfile.findFirst(
        {
          columns: { id: true },
          where: (table, { and, eq: equals, ne: notEquals }) =>
            and(
              equals(table.storeSlug, input.storeSlug),
              existingProfile
                ? notEquals(table.id, existingProfile.id)
                : undefined
            ),
        }
      );

      if (conflictingProfile) {
        throw new ORPCError("CONFLICT", {
          message: "Đường dẫn gian hàng đã được sử dụng",
        });
      }

      if (existingProfile) {
        const [updated] = await context.db
          .update(sellerProfile)
          .set({
            avatarUrl: input.avatarUrl,
            bannerUrl: input.bannerUrl || null,
            bio: input.bio,
            storeSlug: input.storeSlug,
            storefrontName: input.storefrontName,
            updatedAt: new Date(),
          })
          .where(eq(sellerProfile.id, existingProfile.id))
          .returning();

        if (!updated) {
          throw new ORPCError("NOT_FOUND", {
            message: "Hồ sơ gian hàng không tồn tại",
          });
        }

        return {
          profile: toPublicStoreProfile(updated),
          status: "DRAFT" as const,
        };
      }

      const [created] = await context.db
        .insert(sellerProfile)
        .values({
          avatarUrl: input.avatarUrl,
          bannerUrl: input.bannerUrl || null,
          bio: input.bio,
          storeSlug: input.storeSlug,
          storefrontName: input.storefrontName,
          userId,
        })
        .returning();

      if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Không thể tạo hồ sơ gian hàng",
        });
      }

      return {
        profile: toPublicStoreProfile(created),
        status: "DRAFT" as const,
      };
    }),
};
