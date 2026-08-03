import { listing } from "@avin/db/schema/catalog";
import { sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, publicProcedure } from "../access/procedures";
import { findSellerProfile } from "../seller-application/onboarding";
import { STORE_SLUG_PATTERN, storeProfileInputSchema } from "./profile";
import type { PublicStoreProfile } from "./profile";
import {
  findPublicStoreProfile,
  getStoreVisibility,
  isStoreSlugLocked,
} from "./public-visibility";

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
    const userId = context.session.user.id;
    const profile = await findSellerProfile(context.db, userId);

    return {
      profile: profile ? toPublicStoreProfile(profile) : null,
      ...(await getStoreVisibility(context.db, userId)),
    };
  }),

  getPublicBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string().trim().min(2).max(100).regex(STORE_SLUG_PATTERN),
      })
    )
    .handler(async ({ context, input }) => {
      const profile = await findPublicStoreProfile(context.db, input.slug);

      if (!profile) {
        throw new ORPCError("NOT_FOUND", {
          message: "Store not found or unavailable",
        });
      }

      const listingRows = await context.db.query.listing.findMany({
        columns: {
          createdAt: true,
          id: true,
          priceAmount: true,
          slug: true,
          thumbnailUrl: true,
          title: true,
          type: true,
        },
        limit: 51,
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        where: and(
          eq(listing.sellerId, profile.userId),
          eq(listing.status, "PUBLISHED")
        ),
        with: {
          category: {
            columns: {
              status: true,
            },
            with: {
              parentCategory: {
                columns: {
                  status: true,
                },
              },
            },
          },
          servicePackages: {
            columns: {
              name: true,
              priceAmount: true,
              status: true,
            },
            orderBy: (table, { asc }) => [
              asc(table.priceAmount),
              asc(table.name),
            ],
            where: (table, { eq: equals }) => equals(table.status, "AVAILABLE"),
          },
        },
      });

      const hasMore = listingRows.length > 50;
      const listings = listingRows.slice(0, 50);

      return {
        hasMore,
        listings: listings.flatMap((item) => {
          if (
            item.category.status !== "ACTIVE" ||
            item.category.parentCategory.status !== "ACTIVE"
          ) {
            return [];
          }

          let { priceAmount } = item;
          if (item.type === "SERVICE" && item.servicePackages) {
            priceAmount = item.servicePackages[0]?.priceAmount ?? null;
          }
          if (priceAmount === null) {
            return [];
          }

          return [
            {
              createdAt: item.createdAt,
              id: item.id,
              priceAmount,
              slug: item.slug,
              thumbnailUrl: item.thumbnailUrl,
              title: item.title,
              type: item.type,
            },
          ];
        }),
        profile: toPublicStoreProfile(profile),
      };
    }),

  updateProfile: sellerStoreProcedure
    .input(storeProfileInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const existingProfile = await findSellerProfile(context.db, userId);

      if (
        existingProfile &&
        input.storeSlug !== existingProfile.storeSlug &&
        (await isStoreSlugLocked(context.db, existingProfile))
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Không thể đổi đường dẫn khi gian hàng đã public",
        });
      }

      const conflictingProfile = await context.db.query.sellerProfile.findFirst(
        {
          columns: { id: true },
          where: (table, { and: all, eq: equals, ne: notEquals }) =>
            all(
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

        await isStoreSlugLocked(context.db, updated);

        return {
          profile: toPublicStoreProfile(updated),
          ...(await getStoreVisibility(context.db, userId)),
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

      await isStoreSlugLocked(context.db, created);

      return {
        profile: toPublicStoreProfile(created),
        ...(await getStoreVisibility(context.db, userId)),
      };
    }),
};
