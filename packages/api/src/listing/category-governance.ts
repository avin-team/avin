import { db } from "@avin/db";
import {
  listing,
  parentCategory,
  serviceInputFieldSchema,
  subCategory,
} from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { count, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure } from "../access/procedures";

const generateSlug = (text: string): string =>
  text
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

const validateCommissionRate = (ratePercent: number): void => {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Commission rate must be between 0% and 100%",
    });
  }
};

const validateWarrantyBounds = (minHours: number, maxHours: number): void => {
  if (minHours < 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Minimum warranty hours cannot be negative",
    });
  }
  if (maxHours < minHours) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Maximum warranty hours must be greater than or equal to minimum warranty hours",
    });
  }
};

const validateDefaultWarrantyDuration = (
  durationHours: number,
  minHours: number,
  maxHours: number
): void => {
  if (durationHours < minHours || durationHours > maxHours) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Default warranty duration must be within bounds (${minHours}h - ${maxHours}h)`,
    });
  }
};

export const categoryGovernanceRouter = {
  archive: adminProcedure
    .input(
      z.object({
        id: z.string(),
        level: z.enum(["parent", "sub"]),
      })
    )
    .handler(async ({ input }) => {
      if (input.level === "parent") {
        const [updated] = await db
          .update(parentCategory)
          .set({ status: "ARCHIVED" })
          .where(eq(parentCategory.id, input.id))
          .returning();

        if (!updated) {
          throw new ORPCError("NOT_FOUND", {
            message: "Parent category not found",
          });
        }

        // Cascade to sub-categories
        await db
          .update(subCategory)
          .set({ status: "ARCHIVED" })
          .where(eq(subCategory.parentId, input.id));

        return updated;
      }

      const [updated] = await db
        .update(subCategory)
        .set({ status: "ARCHIVED" })
        .where(eq(subCategory.id, input.id))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Sub category not found" });
      }

      return updated;
    }),

  createParent: adminProcedure
    .input(
      z.object({
        description: z.string().optional(),
        name: z.string().min(1, "Name is required"),
        slug: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const slug = input.slug?.trim() || generateSlug(input.name);

      const existing = await db.query.parentCategory.findFirst({
        where: eq(parentCategory.slug, slug),
      });

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: `Parent category with slug "${slug}" already exists`,
        });
      }

      const [created] = await db
        .insert(parentCategory)
        .values({
          description: input.description?.trim(),
          name: input.name.trim(),
          slug,
        })
        .returning();

      return created;
    }),

  createSub: adminProcedure
    .input(
      z.object({
        commissionRatePercent: z.number(),
        defaultServiceInputs: z.array(serviceInputFieldSchema).optional(),
        defaultWarrantyDurationHours: z.number().min(0),
        defaultWarrantyTerms: z.string().min(1),
        maxWarrantyHours: z.number().min(0),
        minWarrantyHours: z.number().min(0),
        name: z.string().min(1, "Name is required"),
        parentId: z.string(),
        slug: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      validateCommissionRate(input.commissionRatePercent);
      validateWarrantyBounds(input.minWarrantyHours, input.maxWarrantyHours);
      validateDefaultWarrantyDuration(
        input.defaultWarrantyDurationHours,
        input.minWarrantyHours,
        input.maxWarrantyHours
      );

      const parent = await db.query.parentCategory.findFirst({
        where: eq(parentCategory.id, input.parentId),
      });

      if (!parent) {
        throw new ORPCError("NOT_FOUND", {
          message: "Parent category not found",
        });
      }

      const slug = input.slug?.trim() || generateSlug(input.name);

      const existing = await db.query.subCategory.findFirst({
        where: (table, { and, eq: matchEq }) =>
          and(
            matchEq(table.parentId, input.parentId),
            matchEq(table.slug, slug)
          ),
      });

      if (existing) {
        throw new ORPCError("CONFLICT", {
          message: `Sub category with slug "${slug}" already exists under this parent`,
        });
      }

      const [created] = await db
        .insert(subCategory)
        .values({
          commissionRatePercent: input.commissionRatePercent.toString(),
          defaultServiceInputs: input.defaultServiceInputs ?? [],
          defaultWarrantyPolicy: {
            durationHours: input.defaultWarrantyDurationHours,
            terms: input.defaultWarrantyTerms.trim(),
          },
          name: input.name.trim(),
          parentId: input.parentId,
          slug,
          warrantyBounds: {
            maxHours: input.maxWarrantyHours,
            minHours: input.minWarrantyHours,
          },
        })
        .returning();

      return created;
    }),

  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
        level: z.enum(["parent", "sub"]),
      })
    )
    .handler(async ({ input }) => {
      if (input.level === "sub") {
        const [listingCount] = await db
          .select({ value: count() })
          .from(listing)
          .where(eq(listing.categoryId, input.id));

        if (listingCount && listingCount.value > 0) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: `Cannot delete sub-category linked to ${listingCount.value} listing(s). Archive it instead.`,
          });
        }

        const [deleted] = await db
          .delete(subCategory)
          .where(eq(subCategory.id, input.id))
          .returning();

        if (!deleted) {
          throw new ORPCError("NOT_FOUND", {
            message: "Sub category not found",
          });
        }

        return { id: deleted.id };
      }

      // Parent level
      const subs = await db.query.subCategory.findMany({
        where: eq(subCategory.parentId, input.id),
      });

      if (subs.length > 0) {
        const subIds = subs.map((s) => s.id);
        const [listingCount] = await db
          .select({ value: count() })
          .from(listing)
          .where(inArray(listing.categoryId, subIds));

        if (listingCount && listingCount.value > 0) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: `Cannot delete parent category with ${listingCount.value} listing(s) in its sub-categories. Archive it instead.`,
          });
        }
      }

      const [deleted] = await db
        .delete(parentCategory)
        .where(eq(parentCategory.id, input.id))
        .returning();

      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Parent category not found",
        });
      }

      return { id: deleted.id };
    }),

  list: adminProcedure.handler(
    async () =>
      await db.query.parentCategory.findMany({
        orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
        with: {
          subCategories: {
            orderBy: (table, { asc }) => [
              asc(table.sortOrder),
              asc(table.name),
            ],
          },
        },
      })
  ),

  reorderParents: adminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number().int(),
          })
        ),
      })
    )
    .handler(async ({ input }) => {
      await Promise.all(
        input.items.map((item) =>
          db
            .update(parentCategory)
            .set({ sortOrder: item.sortOrder })
            .where(eq(parentCategory.id, item.id))
        )
      );
      return { success: true };
    }),

  reorderSubs: adminProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            id: z.string(),
            sortOrder: z.number().int(),
          })
        ),
      })
    )
    .handler(async ({ input }) => {
      await Promise.all(
        input.items.map((item) =>
          db
            .update(subCategory)
            .set({ sortOrder: item.sortOrder })
            .where(eq(subCategory.id, item.id))
        )
      );
      return { success: true };
    }),

  updateParent: adminProcedure
    .input(
      z.object({
        description: z.string().optional(),
        id: z.string(),
        name: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .handler(async ({ input }) => {
      const [updated] = await db
        .update(parentCategory)
        .set({
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.description === undefined
            ? {}
            : { description: input.description.trim() }),
          ...(input.sortOrder === undefined
            ? {}
            : { sortOrder: input.sortOrder }),
        })
        .where(eq(parentCategory.id, input.id))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Parent category not found",
        });
      }

      return updated;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        id: z.string(),
        level: z.enum(["parent", "sub"]),
        status: z.enum(["ACTIVE", "HIDDEN", "ARCHIVED"]),
      })
    )
    .handler(async ({ input }) => {
      if (input.level === "parent") {
        const [updated] = await db
          .update(parentCategory)
          .set({ status: input.status })
          .where(eq(parentCategory.id, input.id))
          .returning();

        if (!updated) {
          throw new ORPCError("NOT_FOUND", {
            message: "Parent category not found",
          });
        }

        // Cascade status change to sub-categories
        await db
          .update(subCategory)
          .set({ status: input.status })
          .where(eq(subCategory.parentId, input.id));

        return updated;
      }

      const [updated] = await db
        .update(subCategory)
        .set({ status: input.status })
        .where(eq(subCategory.id, input.id))
        .returning();

      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Sub category not found" });
      }

      return updated;
    }),

  updateSub: adminProcedure
    .input(
      z.object({
        commissionRatePercent: z.number().optional(),
        defaultServiceInputs: z.array(serviceInputFieldSchema).optional(),
        defaultWarrantyDurationHours: z.number().min(0).optional(),
        defaultWarrantyTerms: z.string().optional(),
        id: z.string(),
        maxWarrantyHours: z.number().min(0).optional(),
        minWarrantyHours: z.number().min(0).optional(),
        name: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .handler(async ({ input }) => {
      const existing = await db.query.subCategory.findFirst({
        where: eq(subCategory.id, input.id),
      });

      if (!existing) {
        throw new ORPCError("NOT_FOUND", { message: "Sub category not found" });
      }

      const minH = input.minWarrantyHours ?? existing.warrantyBounds.minHours;
      const maxH = input.maxWarrantyHours ?? existing.warrantyBounds.maxHours;
      const durH =
        input.defaultWarrantyDurationHours ??
        existing.defaultWarrantyPolicy.durationHours;

      if (input.commissionRatePercent !== undefined) {
        validateCommissionRate(input.commissionRatePercent);
      }
      validateWarrantyBounds(minH, maxH);
      validateDefaultWarrantyDuration(durH, minH, maxH);

      const [updated] = await db
        .update(subCategory)
        .set({
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.commissionRatePercent === undefined
            ? {}
            : {
                commissionRatePercent: input.commissionRatePercent.toString(),
              }),
          ...(input.sortOrder === undefined
            ? {}
            : { sortOrder: input.sortOrder }),
          ...(input.defaultServiceInputs
            ? { defaultServiceInputs: input.defaultServiceInputs }
            : {}),
          defaultWarrantyPolicy: {
            durationHours: durH,
            terms:
              input.defaultWarrantyTerms?.trim() ??
              existing.defaultWarrantyPolicy.terms,
          },
          warrantyBounds: {
            maxHours: maxH,
            minHours: minH,
          },
        })
        .where(eq(subCategory.id, input.id))
        .returning();

      return updated;
    }),
};
