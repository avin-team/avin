import { db } from "@avin/db";
import { listing, parentCategory, subCategory } from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { and, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../access/procedures";

export const getListingIdentifierCandidates = (
  identifier: string
): { id?: string; slug: string } => {
  if (!z.uuid().safeParse(identifier).success) {
    return { slug: identifier };
  }

  return { id: identifier, slug: identifier };
};

export const listingDiscoveryRouter = {
  categories: publicProcedure.handler(async () => {
    // Only return ACTIVE parents and ACTIVE sub-categories for public buyers
    const parents = await db.query.parentCategory.findMany({
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
      where: eq(parentCategory.status, "ACTIVE"),
      with: {
        subCategories: {
          orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
          where: eq(subCategory.status, "ACTIVE"),
        },
      },
    });

    return parents;
  }),

  categoryBySlug: publicProcedure
    .input(
      z.object({
        parentSlug: z.string(),
        subSlug: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const parent = await db.query.parentCategory.findFirst({
        where: and(
          eq(parentCategory.slug, input.parentSlug),
          eq(parentCategory.status, "ACTIVE")
        ),
        with: {
          subCategories: {
            where: eq(subCategory.status, "ACTIVE"),
          },
        },
      });

      if (!parent) {
        throw new ORPCError("NOT_FOUND", {
          message: `Category "${input.parentSlug}" not found`,
        });
      }

      if (!input.subSlug) {
        return { parent, sub: null };
      }

      const sub = parent.subCategories.find((s) => s.slug === input.subSlug);

      if (!sub) {
        throw new ORPCError("NOT_FOUND", {
          message: `Sub-category "${input.subSlug}" not found under "${input.parentSlug}"`,
        });
      }

      return { parent, sub };
    }),

  listingById: publicProcedure
    .input(
      z.object({
        slug: z.string(),
      })
    )
    .handler(async ({ context, input }) => {
      const identifier = getListingIdentifierCandidates(input.slug);
      const found = await db.query.listing.findFirst({
        where: identifier.id
          ? or(eq(listing.slug, identifier.slug), eq(listing.id, identifier.id))
          : eq(listing.slug, identifier.slug),
        with: {
          category: {
            with: {
              parentCategory: true,
            },
          },
          seller: {
            columns: {
              id: true,
              image: true,
              name: true,
            },
          },
        },
      });

      if (!found || !found.category) {
        throw new ORPCError("NOT_FOUND", {
          message: "Listing not found or unavailable",
        });
      }

      const user = context.session?.user;
      const isAdmin = user?.role === "ADMIN";
      const isOwner = user?.id === found.sellerId;
      const isPubliclyAvailable =
        found.status === "PUBLISHED" &&
        found.category.status === "ACTIVE" &&
        found.category.parentCategory.status === "ACTIVE";

      if (!isAdmin && !isOwner && !isPubliclyAvailable) {
        throw new ORPCError("NOT_FOUND", {
          message: "Listing not found or unavailable",
        });
      }

      return found;
    }),

  listings: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
        page: z.number().int().min(1).default(1),
        parentSlug: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
        subSlug: z.string().optional(),
        type: z.enum(["SERVICE", "COURSE"]).optional(),
      })
    )
    .handler(async ({ input }) => {
      const conditions = [eq(listing.status, "PUBLISHED")];

      if (input.type) {
        conditions.push(eq(listing.type, input.type));
      }

      // Filter by category
      if (input.subSlug && input.parentSlug) {
        const parent = await db.query.parentCategory.findFirst({
          where: and(
            eq(parentCategory.slug, input.parentSlug),
            eq(parentCategory.status, "ACTIVE")
          ),
        });
        if (parent) {
          const sub = await db.query.subCategory.findFirst({
            where: and(
              eq(subCategory.parentId, parent.id),
              eq(subCategory.slug, input.subSlug),
              eq(subCategory.status, "ACTIVE")
            ),
          });
          if (sub) {
            conditions.push(eq(listing.categoryId, sub.id));
          } else {
            return { items: [], page: input.page, total: 0, totalPages: 0 };
          }
        } else {
          return { items: [], page: input.page, total: 0, totalPages: 0 };
        }
      } else if (input.parentSlug) {
        const parent = await db.query.parentCategory.findFirst({
          where: and(
            eq(parentCategory.slug, input.parentSlug),
            eq(parentCategory.status, "ACTIVE")
          ),
          with: {
            subCategories: { where: eq(subCategory.status, "ACTIVE") },
          },
        });

        if (parent && parent.subCategories.length > 0) {
          const subIds = parent.subCategories.map((s) => s.id);
          conditions.push(inArray(listing.categoryId, subIds));
        } else {
          return { items: [], page: input.page, total: 0, totalPages: 0 };
        }
      }

      // Search term
      if (input.search?.trim()) {
        const term = `%${input.search.trim()}%`;
        const searchCond = or(
          ilike(listing.title, term),
          ilike(listing.description, term)
        );
        if (searchCond) {
          conditions.push(searchCond);
        }
      }

      const whereClause = and(...conditions);

      // Count total
      const [countResult] = await db
        .select({ total: count() })
        .from(listing)
        .where(whereClause);

      const total = countResult?.total ?? 0;
      const totalPages = Math.ceil(total / input.limit);
      const offset = (input.page - 1) * input.limit;

      const getOrderBy = () => {
        if (input.sortBy === "price_asc") {
          return [sql`${listing.priceAmount} ASC`];
        }
        if (input.sortBy === "price_desc") {
          return [sql`${listing.priceAmount} DESC`];
        }
        return [sql`${listing.createdAt} DESC`];
      };
      const orderBy = getOrderBy();

      const items = await db.query.listing.findMany({
        limit: input.limit,
        offset,
        orderBy,
        where: whereClause,
        with: {
          category: true,
          seller: {
            columns: {
              id: true,
              image: true,
              name: true,
            },
          },
        },
      });

      return {
        items: items.map((item) => ({
          ...item,
          priceAmount: item.priceAmount ?? 0,
          title: item.title ?? "Untitled listing",
        })),
        page: input.page,
        total,
        totalPages,
      };
    }),
};
