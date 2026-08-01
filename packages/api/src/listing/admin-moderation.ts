import { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import { listing, subCategory } from "@avin/db/schema/catalog";
import { sellerApplication } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auditedAdminProcedure } from "../access/procedures";
import { assertPublishable } from "./seller-workspace";

const CURRENT_SELLER_AGREEMENT_VERSION = "v1.0";

const assertEligibleSeller = async (userId: string): Promise<void> => {
  const [account, application] = await Promise.all([
    db.query.user.findFirst({ where: eq(userTable.id, userId) }),
    db.query.sellerApplication.findFirst({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: eq(sellerApplication.userId, userId),
    }),
  ]);

  const isBanned =
    account?.banned === true ||
    (account?.banExpires !== null &&
      account?.banExpires !== undefined &&
      account.banExpires > new Date());

  if (
    !account ||
    account.role !== "SELLER" ||
    isBanned ||
    application?.status !== "APPROVED" ||
    application.sellerAgreementVersion !== CURRENT_SELLER_AGREEMENT_VERSION
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "Seller is not eligible for publication or restoration",
    });
  }
};

const assertActiveSubCategory = async (categoryId: string) => {
  const category = await db.query.subCategory.findFirst({
    where: and(
      eq(subCategory.id, categoryId),
      eq(subCategory.status, "ACTIVE")
    ),
    with: {
      parentCategory: {
        columns: { status: true },
      },
    },
  });

  if (!category || category.parentCategory.status !== "ACTIVE") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing category must be active",
    });
  }

  return category;
};

export const adminModerationRouter = {
  archive: auditedAdminProcedure("listing.moderation.archive")
    .input(z.object({ id: z.string(), reason: z.string().min(1) }))
    .handler(async ({ input }) => {
      const found = await db.query.listing.findFirst({
        where: eq(listing.id, input.id),
      });

      if (!found) {
        throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
      }

      if (found.status === "ARCHIVED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Listing is already archived",
        });
      }

      const [updated] = await db
        .update(listing)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(eq(listing.id, found.id))
        .returning();

      return updated;
    }),

  hide: auditedAdminProcedure("listing.moderation.hide")
    .input(z.object({ id: z.string(), reason: z.string().min(1) }))
    .handler(async ({ input }) => {
      const found = await db.query.listing.findFirst({
        where: eq(listing.id, input.id),
      });

      if (!found) {
        throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
      }

      if (found.status !== "PUBLISHED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only published listings can be hidden",
        });
      }

      const [updated] = await db
        .update(listing)
        .set({ status: "HIDDEN", updatedAt: new Date() })
        .where(eq(listing.id, found.id))
        .returning();

      return updated;
    }),

  restore: auditedAdminProcedure("listing.moderation.restore")
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .handler(async ({ input }) => {
      const found = await db.query.listing.findFirst({
        where: eq(listing.id, input.id),
      });

      if (!found) {
        throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
      }

      if (found.status !== "HIDDEN") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only hidden listings can be restored",
        });
      }

      await assertEligibleSeller(found.sellerId);
      const category = await assertActiveSubCategory(found.categoryId);
      assertPublishable(found, category);

      const [updated] = await db
        .update(listing)
        .set({ status: "PUBLISHED", updatedAt: new Date() })
        .where(eq(listing.id, found.id))
        .returning();

      return updated;
    }),
};
