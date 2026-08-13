import { db } from "@avin/db";
import {
  listing,
  parentCategory,
  servicePackage,
  subCategory,
} from "@avin/db/schema/catalog";
import { orderItem } from "@avin/db/schema/commerce";
import { sellerEnforcement } from "@avin/db/schema/seller-enforcement";
import { ORPCError } from "@orpc/server";
import {
  and,
  count,
  exists,
  eq,
  getTableName,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../access/procedures";
import {
  getSellerEnforcement,
  isMarketplaceSellerEnforced,
} from "../seller-enforcement/access";
import {
  getServicePackageSummaryPrice,
  sortAvailableServicePackages,
} from "./service-packages";

export const getListingIdentifierCandidates = (
  identifier: string
): { id?: string; slug: string } => {
  if (!z.uuid().safeParse(identifier).success) {
    return { slug: identifier };
  }

  return { id: identifier, slug: identifier };
};

export const isListingPubliclyAvailable = (
  listingStatus: "DRAFT" | "PUBLISHED" | "PAUSED" | "HIDDEN" | "ARCHIVED",
  categoryStatus: "ACTIVE" | "HIDDEN" | "ARCHIVED",
  parentCategoryStatus: "ACTIVE" | "HIDDEN" | "ARCHIVED"
): boolean =>
  listingStatus === "PUBLISHED" &&
  categoryStatus === "ACTIVE" &&
  parentCategoryStatus === "ACTIVE";

const sellerEnforcementTableName = getTableName(sellerEnforcement);
const sellerEnforcementSellerIdColumnName = sellerEnforcement.sellerId.name;
const sellerEnforcementStateColumnName = sellerEnforcement.state.name;

export const sellerIsNotEnforcedCondition = (_now = new Date()): SQL<unknown> =>
  sql`
  NOT EXISTS (
    SELECT 1
    FROM ${sql.identifier(sellerEnforcementTableName)} AS seller_enforcement
    WHERE seller_enforcement.${sql.identifier(sellerEnforcementSellerIdColumnName)} = ${listing.sellerId}
      AND (
        seller_enforcement.${sql.identifier(sellerEnforcementStateColumnName)} = 'BANNED'
        OR seller_enforcement.${sql.identifier(sellerEnforcementStateColumnName)} = 'SUSPENDED'
      )
  )
`;

const findListingForDiscovery = (slug: string) => {
  const identifier = getListingIdentifierCandidates(slug);
  return db.query.listing.findFirst({
    where: identifier.id
      ? or(eq(listing.slug, identifier.slug), eq(listing.id, identifier.id))
      : eq(listing.slug, identifier.slug),
    with: {
      category: { with: { parentCategory: true } },
      seller: { columns: { id: true, image: true, name: true } },
      sellerProfile: {
        columns: {
          avatarUrl: true,
          completedOrderCount: true,
          createdAt: true,
          id: true,
          ratingCount: true,
          ratingScore: true,
          storeSlug: true,
          storefrontName: true,
        },
      },
      servicePackages: true,
    },
  });
};

type DiscoveryListing = NonNullable<
  Awaited<ReturnType<typeof findListingForDiscovery>>
>;

const assertListingDiscoverable = async (
  found: DiscoveryListing,
  user: { id: string; role?: string | null } | undefined
): Promise<void> => {
  if (!found.category) {
    throw new ORPCError("NOT_FOUND", {
      message: "Listing not found or unavailable",
    });
  }
  const sellerAccount = await getSellerEnforcement(db, found.sellerId);
  const isBannedSeller =
    sellerAccount?.state === "BANNED" &&
    isMarketplaceSellerEnforced(sellerAccount);
  const isPubliclyAvailable = isListingPubliclyAvailable(
    found.status,
    found.category.status,
    found.category.parentCategory.status
  );
  const hasAvailableServicePackage =
    found.type !== "SERVICE" ||
    found.servicePackages.some(
      (packageItem) => packageItem.status === "AVAILABLE"
    );
  const isPrivilegedViewer =
    user?.role === "ADMIN" || (user?.id === found.sellerId && !isBannedSeller);

  if (
    !isPrivilegedViewer &&
    (!isPubliclyAvailable ||
      !hasAvailableServicePackage ||
      isMarketplaceSellerEnforced(sellerAccount))
  ) {
    throw new ORPCError("NOT_FOUND", {
      message: "Listing not found or unavailable",
    });
  }
};

const toListingDetailSeller = (
  profile: DiscoveryListing["sellerProfile"],
  seller: DiscoveryListing["seller"]
) => {
  const avatarUrl = profile?.avatarUrl;
  return {
    avatarUrl: avatarUrl ?? seller.image,
    completedOrderCount: profile?.completedOrderCount ?? 0,
    createdAt: profile?.createdAt ?? null,
    id: profile?.id ?? seller.id,
    image: avatarUrl ?? seller.image,
    name: profile?.storefrontName ?? seller.name,
    ratingCount: profile?.ratingCount ?? 0,
    ratingScore: profile?.ratingScore ?? "0",
    storeSlug: profile?.storeSlug ?? null,
    storefrontName: profile?.storefrontName ?? seller.name,
  };
};

const toListingSummarySeller = (
  profile: {
    avatarUrl: string | null;
    completedOrderCount: number;
    id: string;
    ratingCount: number;
    ratingScore: string;
    storeSlug: string | null;
    storefrontName: string;
  } | null,
  seller: { id: string; image: string | null; name: string }
) => ({
  avatarUrl: profile?.avatarUrl ?? seller.image,
  completedOrderCount: profile?.completedOrderCount ?? 0,
  id: profile?.id ?? seller.id,
  image: profile?.avatarUrl ?? seller.image,
  name: profile?.storefrontName ?? seller.name,
  ratingCount: profile?.ratingCount ?? 0,
  ratingScore: profile?.ratingScore ?? "0",
  storeSlug: profile?.storeSlug ?? null,
  storefrontName: profile?.storefrontName ?? seller.name,
});

const toListingDetail = (found: DiscoveryListing) => {
  const {
    sellerProfile: foundProfile,
    seller: foundSeller,
    servicePackages: foundPackages,
    ...foundRest
  } = found;
  const availablePackages = sortAvailableServicePackages(foundPackages);

  return {
    ...foundRest,
    completedOrderCount: found.completedOrderCount ?? 0,
    priceAmount:
      found.type === "SERVICE"
        ? getServicePackageSummaryPrice(availablePackages)
        : found.priceAmount,
    ratingCount: found.ratingCount ?? 0,
    ratingScore: found.ratingScore ?? "0",
    seller: toListingDetailSeller(foundProfile, foundSeller),
    servicePackages: availablePackages,
  };
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
      const found = await findListingForDiscovery(input.slug);

      if (!found) {
        throw new ORPCError("NOT_FOUND", {
          message: "Listing not found or unavailable",
        });
      }
      await assertListingDiscoverable(found, context.session?.user);
      return toListingDetail(found);
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
      const conditions = [
        eq(listing.status, "PUBLISHED"),
        sellerIsNotEnforcedCondition(),
        or(
          eq(listing.type, "COURSE"),
          exists(
            db
              .select({ id: servicePackage.id })
              .from(servicePackage)
              .where(
                and(
                  eq(servicePackage.listingId, listing.id),
                  eq(servicePackage.status, "AVAILABLE")
                )
              )
          )
        ),
      ];

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
        const summaryPrice = sql`COALESCE(
          (
            SELECT MIN(${servicePackage.priceAmount})
            FROM ${servicePackage}
            WHERE ${servicePackage.listingId} = ${listing.id}
              AND ${servicePackage.status} = 'AVAILABLE'
          ),
          ${listing.priceAmount}
        )`;
        if (input.sortBy === "price_asc") {
          return [sql`${summaryPrice} ASC`];
        }
        if (input.sortBy === "price_desc") {
          return [sql`${summaryPrice} DESC`];
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
          sellerProfile: {
            columns: {
              avatarUrl: true,
              completedOrderCount: true,
              id: true,
              ratingCount: true,
              ratingScore: true,
              storeSlug: true,
              storefrontName: true,
            },
          },
          servicePackages: {
            orderBy: (table, { asc }) => [
              asc(table.priceAmount),
              asc(table.name),
            ],
            where: eq(servicePackage.status, "AVAILABLE"),
          },
        },
      });

      const listingIds = items.map((i) => i.id);
      let soldCountMap: Record<string, number> = {};

      if (listingIds.length > 0) {
        const soldCounts = await db
          .select({
            count: count(orderItem.id),
            listingId: orderItem.listingId,
          })
          .from(orderItem)
          .where(
            and(
              inArray(orderItem.listingId, listingIds),
              inArray(orderItem.status, ["DELIVERED", "IN_WARRANTY", "CLOSED"])
            )
          )
          .groupBy(orderItem.listingId);

        soldCountMap = Object.fromEntries(
          soldCounts.map((s) => [s.listingId, s.count])
        );
      }

      return {
        items: items.map((item) => {
          const { sellerProfile: prof, seller: sel, ...rest } = item;

          return {
            ...rest,
            completedOrderCount: item.completedOrderCount ?? 0,
            priceAmount:
              item.type === "SERVICE"
                ? (getServicePackageSummaryPrice(item.servicePackages) ?? 0)
                : (item.priceAmount ?? 0),
            ratingCount: item.ratingCount ?? 0,
            ratingScore: item.ratingScore ? Number(item.ratingScore) : null,
            seller: toListingSummarySeller(prof, sel),
            servicePackages: item.servicePackages,
            soldCount: soldCountMap[item.id] ?? 0,
            title: item.title ?? "Untitled listing",
          };
        }),
        page: input.page,
        total,
        totalPages,
      };
    }),
};
