import { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import {
  listing,
  serviceInputFieldSchema,
  subCategory,
} from "@avin/db/schema/catalog";
import { sellerApplication } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { sellerProcedure } from "../access/procedures";

const CURRENT_SELLER_AGREEMENT_VERSION = "v1.0";

const listingTypeSchema = z.enum(["SERVICE", "COURSE"]);
const listingStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "PAUSED",
  "HIDDEN",
  "ARCHIVED",
]);

const draftFieldsSchema = z.object({
  categoryId: z.string().optional(),
  description: z.string().max(10_000).nullable().optional(),
  priceAmount: z.number().int().min(0).nullable().optional(),
  serviceInputFields: z.array(serviceInputFieldSchema).optional(),
  thumbnailUrl: z.url().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  type: listingTypeSchema.optional(),
  warrantyDurationHours: z.number().int().min(0).nullable().optional(),
  warrantyTerms: z.string().max(10_000).nullable().optional(),
});

const slugify = (value: string): string =>
  value
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9\s-]/gu, "")
    .replaceAll(/[\s_]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

const makeSlug = (title: string | null | undefined): string => {
  const base = title ? slugify(title) : "listing";
  return `${base || "listing"}-${crypto.randomUUID().slice(0, 8)}`;
};

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
      message: "Seller access is not available for this account",
    });
  }
};

const assertActiveSubCategory = async (categoryId: string): Promise<void> => {
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
};

const assertDraft = async (id: string, userId: string) => {
  const draft = await db.query.listing.findFirst({
    where: and(
      eq(listing.id, id),
      eq(listing.sellerId, userId),
      eq(listing.status, "DRAFT")
    ),
  });

  if (!draft) {
    throw new ORPCError("NOT_FOUND", {
      message: "Draft listing not found",
    });
  }

  return draft;
};

const assertOwnedListing = async (id: string, userId: string) => {
  const found = await db.query.listing.findFirst({
    where: and(eq(listing.id, id), eq(listing.sellerId, userId)),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
  }

  return found;
};

const assertPublishable = (draft: {
  priceAmount: number | null;
  title: string | null;
  warrantyDurationHours: number | null;
  warrantyTerms: string | null;
}) => {
  if (
    !draft.title?.trim() ||
    draft.priceAmount === null ||
    draft.priceAmount === undefined ||
    draft.warrantyDurationHours === null ||
    draft.warrantyDurationHours === undefined ||
    !draft.warrantyTerms?.trim()
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Listing needs a title, price, and warranty details before publishing",
    });
  }
};

export const sellerWorkspaceRouter = {
  archive: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const found = await assertOwnedListing(input.id, context.session.user.id);

      if (found.status === "ARCHIVED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Archived listings cannot be changed",
        });
      }

      const [updated] = await db
        .update(listing)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(eq(listing.id, found.id))
        .returning();
      return updated;
    }),

  createDraft: sellerProcedure
    .input(
      draftFieldsSchema.extend({
        categoryId: z.string(),
        type: listingTypeSchema,
      })
    )
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      await assertActiveSubCategory(input.categoryId);

      const [created] = await db
        .insert(listing)
        .values({
          categoryId: input.categoryId,
          description: input.description,
          id: crypto.randomUUID(),
          priceAmount: input.priceAmount,
          sellerId: context.session.user.id,
          serviceInputFields: input.serviceInputFields ?? [],
          slug: makeSlug(input.title),
          thumbnailUrl: input.thumbnailUrl,
          title: input.title,
          type: input.type,
          warrantyDurationHours: input.warrantyDurationHours,
          warrantyTerms: input.warrantyTerms,
        })
        .returning();

      return created;
    }),

  getDraft: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      return assertDraft(input.id, context.session.user.id);
    }),

  listMine: sellerProcedure
    .input(z.object({ status: listingStatusSchema.optional() }).optional())
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      return db.query.listing.findMany({
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
        where: and(
          eq(listing.sellerId, context.session.user.id),
          input?.status
            ? eq(listing.status, input.status)
            : or(
                eq(listing.status, "DRAFT"),
                eq(listing.status, "PUBLISHED"),
                eq(listing.status, "PAUSED"),
                eq(listing.status, "HIDDEN")
              )
        ),
      });
    }),

  pause: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const found = await assertOwnedListing(input.id, context.session.user.id);
      if (found.status !== "PUBLISHED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only published listings can be paused",
        });
      }
      const [updated] = await db
        .update(listing)
        .set({ status: "PAUSED", updatedAt: new Date() })
        .where(eq(listing.id, found.id))
        .returning();
      return updated;
    }),

  publish: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const draft = await assertDraft(input.id, context.session.user.id);
      await assertActiveSubCategory(draft.categoryId);
      assertPublishable(draft);
      const [updated] = await db
        .update(listing)
        .set({ status: "PUBLISHED", updatedAt: new Date() })
        .where(eq(listing.id, draft.id))
        .returning();
      return updated;
    }),

  resume: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const found = await assertOwnedListing(input.id, context.session.user.id);
      if (found.status !== "PAUSED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only paused listings can be resumed",
        });
      }
      await assertActiveSubCategory(found.categoryId);
      assertPublishable(found);
      const [updated] = await db
        .update(listing)
        .set({ status: "PUBLISHED", updatedAt: new Date() })
        .where(eq(listing.id, found.id))
        .returning();
      return updated;
    }),

  updateDraft: sellerProcedure
    .input(draftFieldsSchema.extend({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const draft = await assertDraft(input.id, context.session.user.id);
      if (input.categoryId) {
        await assertActiveSubCategory(input.categoryId);
      }

      const [updated] = await db
        .update(listing)
        .set({
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(Object.hasOwn(input, "description")
            ? { description: input.description }
            : {}),
          ...(Object.hasOwn(input, "priceAmount")
            ? { priceAmount: input.priceAmount }
            : {}),
          ...(input.serviceInputFields
            ? { serviceInputFields: input.serviceInputFields }
            : {}),
          ...(Object.hasOwn(input, "thumbnailUrl")
            ? { thumbnailUrl: input.thumbnailUrl }
            : {}),
          ...(Object.hasOwn(input, "title") ? { title: input.title } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(Object.hasOwn(input, "warrantyDurationHours")
            ? { warrantyDurationHours: input.warrantyDurationHours }
            : {}),
          ...(Object.hasOwn(input, "warrantyTerms")
            ? { warrantyTerms: input.warrantyTerms }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(listing.id, draft.id))
        .returning();
      return updated;
    }),
};
