import { db } from "@avin/db";
import { listing } from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { auditedAdminProcedure } from "../access/procedures";
import {
  assertActiveSubCategory,
  assertEligibleSeller,
  assertPublishable,
} from "./seller-workspace";

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
