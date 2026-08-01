import { auditLog } from "@avin/db/schema/auth";
import { listing } from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../access/procedures";
import type { Context } from "../runtime/context";
import {
  assertActiveSubCategory,
  assertEligibleSeller,
  assertPublishable,
} from "./seller-workspace";

export const listingStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "HIDDEN",
  "ARCHIVED",
]);

export const moderationActionSchema = z.enum(["HIDE", "RESTORE", "ARCHIVE"]);

export type ListingStatus = z.infer<typeof listingStatusSchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;

const moderationInputSchema = z.object({
  id: z.string(),
  reason: z
    .string()
    .trim()
    .min(1, "A moderation reason is required")
    .max(2000, "A moderation reason must be 2,000 characters or fewer"),
});

export const adminListListingsInputSchema = z
  .object({
    search: z.string().max(200).optional(),
    status: z.union([listingStatusSchema, z.literal("ALL")]).default("ALL"),
  })
  .optional();

const auditLogInputSchema = z.object({ listingId: z.string() });

export const getModerationTransition = (
  status: ListingStatus,
  action: ModerationAction
): ListingStatus => {
  if (action === "HIDE") {
    if (status !== "PUBLISHED") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only published listings can be hidden",
      });
    }
    return "HIDDEN";
  }

  if (action === "RESTORE") {
    if (status !== "HIDDEN") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only hidden listings can be restored",
      });
    }
    return "PUBLISHED";
  }

  if (status === "ARCHIVED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Archived listings cannot be changed",
    });
  }

  return "ARCHIVED";
};

const recordModerationAudit = async ({
  action,
  context,
  listingId,
  nextStatus,
  previousStatus,
  reason,
}: {
  action: ModerationAction;
  context: Context;
  listingId: string;
  nextStatus: ListingStatus;
  previousStatus: ListingStatus;
  reason: string;
}): Promise<void> => {
  if (!context.session) {
    throw new ORPCError("UNAUTHORIZED");
  }

  await context.audit.record({
    action: `listing.moderation.${action.toLowerCase()}`,
    actorUserId: context.session.user.id,
    metadata: {
      listingId,
      newVisibilityState: nextStatus,
      priorVisibilityState: previousStatus,
      reason,
    },
    outcome: "SUCCESS",
    targetId: listingId,
    targetType: "LISTING",
  });
};

const moderateListing = async ({
  action,
  context,
  input,
}: {
  action: ModerationAction;
  context: Context;
  input: z.infer<typeof moderationInputSchema>;
}) => {
  const found = await context.db.query.listing.findFirst({
    where: eq(listing.id, input.id),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
  }

  const nextStatus = getModerationTransition(found.status, action);

  if (action === "RESTORE") {
    await assertEligibleSeller(found.sellerId);
    const category = await assertActiveSubCategory(found.categoryId);
    assertPublishable(found, category);
  }

  const [updated] = await context.db
    .update(listing)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(listing.id, found.id))
    .returning();

  if (!updated) {
    throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
  }

  await recordModerationAudit({
    action,
    context,
    listingId: found.id,
    nextStatus: updated.status,
    previousStatus: found.status,
    reason: input.reason,
  });

  return updated;
};

export const adminModerationRouter = {
  archive: adminProcedure
    .input(moderationInputSchema)
    .handler(({ context, input }) =>
      moderateListing({ action: "ARCHIVE", context, input })
    ),

  auditLog: adminProcedure
    .input(auditLogInputSchema)
    .handler(({ context, input }) =>
      context.db.query.auditLog.findMany({
        orderBy: (table, { desc }) => [desc(table.createdAt)],
        where: and(
          eq(auditLog.targetId, input.listingId),
          eq(auditLog.targetType, "LISTING")
        ),
      })
    ),

  hide: adminProcedure
    .input(moderationInputSchema)
    .handler(({ context, input }) =>
      moderateListing({ action: "HIDE", context, input })
    ),

  list: adminProcedure
    .input(adminListListingsInputSchema)
    .handler(async ({ context, input }) => {
      const statusFilter =
        input?.status && input.status !== "ALL" ? input.status : undefined;
      const searchQuery = input?.search?.trim().toLowerCase();

      const listings = await context.db.query.listing.findMany({
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
        where: statusFilter ? eq(listing.status, statusFilter) : undefined,
        with: {
          category: {
            with: {
              parentCategory: true,
            },
          },
          seller: {
            columns: {
              email: true,
              id: true,
              image: true,
              name: true,
            },
          },
        },
      });

      if (!searchQuery) {
        return listings;
      }

      return listings.filter((item) =>
        [item.title, item.slug, item.seller.name, item.seller.email]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(searchQuery))
      );
    }),

  restore: adminProcedure
    .input(moderationInputSchema)
    .handler(({ context, input }) =>
      moderateListing({ action: "RESTORE", context, input })
    ),
};
