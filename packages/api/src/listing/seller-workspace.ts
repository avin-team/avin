import { db } from "@avin/db";
import {
  listing,
  servicePackage,
  servicePackageDraftSchema,
  subCategory,
} from "@avin/db/schema/catalog";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, sellerProcedure } from "../access/procedures";
import { slugify } from "../runtime/slug";
import type { ManagedObjectStore } from "../runtime/storage";
import {
  getManagedListingImageKeysToDelete,
  LISTING_IMAGE_MAX_COUNT,
} from "../runtime/storage";
import {
  getSellerEnforcement,
  isMarketplaceSellerEnforced,
} from "../seller-enforcement/access";
import { publishListing, resumeListing } from "./listing-publication";
import {
  assertCourseListingContract,
  assertListingPresentation,
  getPrimaryListingImage,
} from "./listing-publication-contract";
import { assertEligibleSeller as assertSellerListingAccess } from "./seller-listing-access";
import {
  assertServicePackageNameUnique,
  parseServicePackageDraft,
} from "./service-packages";

export { getPrimaryListingImage } from "./listing-publication-contract";
export {
  assertCourseListingContract as assertPublishable,
  assertListingPresentation as assertServiceListingBasics,
} from "./listing-publication-contract";
export { CURRENT_SELLER_AGREEMENT_VERSION } from "./seller-listing-access";

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
  images: z.array(z.string()).max(LISTING_IMAGE_MAX_COUNT).optional(),
  priceAmount: z.number().int().nullable().optional(),
  processingTimeHours: z.number().int().nullable().optional(),
  servicePackages: z.array(servicePackageDraftSchema).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  type: listingTypeSchema.optional(),
  warrantyDurationHours: z.number().int().min(0).nullable().optional(),
  warrantyTerms: z.string().max(10_000).nullable().optional(),
});

const servicePackageInputSchema = servicePackageDraftSchema.extend({
  listingId: z.uuid(),
});

const makeSlug = (title: string | null | undefined): string => {
  const base = title ? slugify(title) : "listing";
  return `${base || "listing"}-${crypto.randomUUID().slice(0, 8)}`;
};

export const assertEligibleSeller = async (userId: string): Promise<void> => {
  await assertSellerListingAccess(db, userId);
};

export const assertActiveSubCategory = async (
  categoryId: string
): Promise<
  NonNullable<Awaited<ReturnType<typeof db.query.subCategory.findFirst>>>
> => {
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

const assertDraft = async (
  id: string,
  userId: string
): Promise<
  NonNullable<Awaited<ReturnType<typeof db.query.listing.findFirst>>>
> => {
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

export const assertDeletableDraft = (listingItem: { status: string }): void => {
  if (listingItem.status !== "DRAFT") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Only draft listings can be deleted",
    });
  }
};

const cleanupUnreferencedListingImages = async (
  storage: ManagedObjectStore | undefined,
  references: {
    nextImages?: string[] | null;
    nextThumbnailUrl?: string | null;
    previousImages?: string[] | null;
    previousThumbnailUrl?: string | null;
  }
): Promise<void> => {
  if (!storage) {
    return;
  }

  const keysToDelete = getManagedListingImageKeysToDelete(references, {
    supabaseUrl: storage.supabaseUrl,
  });
  const cleanupResults = await Promise.allSettled(
    keysToDelete.map((key) => storage.deleteObject(key))
  );
  for (const result of cleanupResults) {
    if (result.status === "rejected") {
      console.error("Failed to clean up listing image", {
        error: result.reason,
      });
    }
  }
};

const assertOwnedListing = async (
  id: string,
  userId: string
): Promise<
  NonNullable<Awaited<ReturnType<typeof db.query.listing.findFirst>>>
> => {
  const found = await db.query.listing.findFirst({
    where: and(eq(listing.id, id), eq(listing.sellerId, userId)),
  });

  if (!found) {
    throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
  }

  return found;
};

export const canAccessListingMedia = (
  user: { id: string; role?: string | null } | null | undefined,
  listingItem: {
    sellerId: string;
    status: string;
    category?: { status: string; parentCategory?: { status: string } } | null;
  }
): boolean => {
  if (!user) {
    return (
      listingItem.status === "PUBLISHED" &&
      listingItem.category?.status === "ACTIVE" &&
      listingItem.category?.parentCategory?.status === "ACTIVE"
    );
  }

  if (user.role === "ADMIN") {
    return true;
  }

  if (user.id === listingItem.sellerId) {
    return true;
  }

  return (
    listingItem.status === "PUBLISHED" &&
    listingItem.category?.status === "ACTIVE" &&
    listingItem.category?.parentCategory?.status === "ACTIVE"
  );
};

const assertOwnedServicePackage = async (id: string, userId: string) => {
  const found = await db.query.servicePackage.findFirst({
    where: eq(servicePackage.id, id),
    with: { listing: true },
  });
  if (!found || found.listing.sellerId !== userId) {
    throw new ORPCError("NOT_FOUND", { message: "Service package not found" });
  }
  if (found.listing.status === "ARCHIVED") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Archived listings cannot be changed",
    });
  }
  return found;
};

const getServicePackages = (listingId: string) =>
  db.query.servicePackage.findMany({
    orderBy: (table) => [asc(table.priceAmount), asc(table.name)],
    where: eq(servicePackage.listingId, listingId),
  });

export const canUploadListingImage = (
  userId: string,
  listingItem: { sellerId: string; status: string }
): boolean =>
  listingItem.sellerId === userId && listingItem.status !== "ARCHIVED";

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
      const category = await assertActiveSubCategory(input.categoryId);

      const [created] = await db
        .insert(listing)
        .values({
          categoryId: input.categoryId,
          description: input.description,
          id: crypto.randomUUID(),
          images: input.images ?? [],
          priceAmount: input.priceAmount,
          processingTimeHours: input.processingTimeHours,
          sellerId: context.session.user.id,
          slug: makeSlug(input.title),
          thumbnailUrl: getPrimaryListingImage(
            input.images,
            input.thumbnailUrl
          ),
          title: input.title,
          type: input.type,
          warrantyDurationHours: input.warrantyDurationHours,
          warrantyTerms: input.warrantyTerms,
        })
        .returning();

      if (created && input.type === "SERVICE" && input.servicePackages) {
        const packages = input.servicePackages.map((packageInput) =>
          parseServicePackageDraft(packageInput, category)
        );
        const names = new Set<string>();
        for (const packageInput of packages) {
          const normalizedName = packageInput.name.toLocaleLowerCase();
          if (names.has(normalizedName)) {
            throw new ORPCError("BAD_REQUEST", {
              message: "Service package names must be unique",
            });
          }
          names.add(normalizedName);
        }
        await db.insert(servicePackage).values(
          packages.map((packageInput) => ({
            listingId: created.id,
            ...packageInput,
          }))
        );
      }

      return created;
    }),

  deleteDraft: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const draft = await assertDraft(input.id, context.session.user.id);
      assertDeletableDraft(draft);

      const [deleted] = await db
        .delete(listing)
        .where(
          and(
            eq(listing.id, draft.id),
            eq(listing.sellerId, context.session.user.id),
            eq(listing.status, "DRAFT")
          )
        )
        .returning();

      if (!deleted) {
        throw new ORPCError("NOT_FOUND", {
          message: "Draft listing not found",
        });
      }

      await cleanupUnreferencedListingImages(context.storage, {
        nextImages: [],
        nextThumbnailUrl: null,
        previousImages: deleted.images,
        previousThumbnailUrl: deleted.thumbnailUrl,
      });

      return { id: deleted.id };
    }),

  discardImageUploads: sellerProcedure
    .input(
      z.object({
        id: z.string(),
        imageUrls: z.array(z.string()).max(LISTING_IMAGE_MAX_COUNT),
      })
    )
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const found = await assertOwnedListing(input.id, context.session.user.id);

      await cleanupUnreferencedListingImages(context.storage, {
        nextImages: found.images,
        nextThumbnailUrl: found.thumbnailUrl,
        previousImages: input.imageUrls,
        previousThumbnailUrl: null,
      });

      return { id: found.id };
    }),

  get: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      return assertOwnedListing(input.id, context.session.user.id);
    }),

  getDraft: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      return assertDraft(input.id, context.session.user.id);
    }),

  getMediaAccess: protectedProcedure
    .input(z.object({ listingId: z.string() }))
    .handler(async ({ context, input }) => {
      const found = await db.query.listing.findFirst({
        where: eq(listing.id, input.listingId),
        with: {
          category: {
            with: {
              parentCategory: true,
            },
          },
        },
      });

      if (!found) {
        throw new ORPCError("NOT_FOUND", { message: "Listing not found" });
      }

      const enforcement = await getSellerEnforcement(
        context.db,
        found.sellerId
      );
      const isPublicSellerMedia = !isMarketplaceSellerEnforced(enforcement);
      const isBannedSeller =
        enforcement?.state === "BANNED" &&
        isMarketplaceSellerEnforced(enforcement);
      const hasAccess =
        context.session.user.role === "ADMIN" ||
        (context.session.user.id === found.sellerId && !isBannedSeller) ||
        (isPublicSellerMedia &&
          canAccessListingMedia(context.session.user, found));
      if (!hasAccess) {
        throw new ORPCError("FORBIDDEN", {
          message: "Media access is restricted for this listing",
        });
      }

      return {
        hasAccess: true,
        images: found.images,
        thumbnailUrl: found.thumbnailUrl,
      };
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
    .handler(({ context, input }) =>
      publishListing({
        database: context.db,
        listingId: input.id,
        sellerId: context.session.user.id,
      })
    ),

  resume: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(({ context, input }) =>
      resumeListing({
        database: context.db,
        listingId: input.id,
        sellerId: context.session.user.id,
      })
    ),

  servicePackages: {
    create: sellerProcedure
      .input(servicePackageInputSchema)
      .handler(async ({ context, input }) => {
        await assertEligibleSeller(context.session.user.id);
        const listingItem = await assertOwnedListing(
          input.listingId,
          context.session.user.id
        );
        if (listingItem.type !== "SERVICE") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Only Service listings can have packages",
          });
        }
        if (listingItem.status === "ARCHIVED") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Archived listings cannot be changed",
          });
        }
        const category = await assertActiveSubCategory(listingItem.categoryId);
        const packageDraft = parseServicePackageDraft(input, category);
        const existing = await getServicePackages(listingItem.id);
        assertServicePackageNameUnique(existing, packageDraft.name);
        const [created] = await db
          .insert(servicePackage)
          .values({
            firstPublishedAt:
              listingItem.status === "PUBLISHED" ? new Date() : null,
            listingId: listingItem.id,
            ...packageDraft,
          })
          .returning();
        if (!created) {
          throw new Error("Service package was not created");
        }
        return created;
      }),

    delete: sellerProcedure
      .input(z.object({ id: z.uuid() }))
      .handler(async ({ context, input }) => {
        await assertEligibleSeller(context.session.user.id);
        const found = await assertOwnedServicePackage(
          input.id,
          context.session.user.id
        );
        if (found.firstPublishedAt) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "A published Service package cannot be deleted; make it unavailable instead",
          });
        }
        await db.delete(servicePackage).where(eq(servicePackage.id, found.id));
        return { id: found.id };
      }),

    list: sellerProcedure
      .input(z.object({ listingId: z.uuid() }))
      .handler(async ({ context, input }) => {
        await assertEligibleSeller(context.session.user.id);
        const listingItem = await assertOwnedListing(
          input.listingId,
          context.session.user.id
        );
        if (listingItem.type !== "SERVICE") {
          return [];
        }
        return getServicePackages(listingItem.id);
      }),

    setAvailability: sellerProcedure
      .input(z.object({ available: z.boolean(), id: z.uuid() }))
      .handler(async ({ context, input }) => {
        await assertEligibleSeller(context.session.user.id);
        const found = await assertOwnedServicePackage(
          input.id,
          context.session.user.id
        );
        return db.transaction(async (tx) => {
          const [lockedPackage] = await tx
            .select({
              id: servicePackage.id,
              listingId: servicePackage.listingId,
              listingStatus: listing.status,
              status: servicePackage.status,
            })
            .from(servicePackage)
            .innerJoin(listing, eq(servicePackage.listingId, listing.id))
            .where(eq(servicePackage.id, found.id))
            .for("update")
            .limit(1);

          if (!lockedPackage) {
            throw new ORPCError("NOT_FOUND", {
              message: "Service package not found",
            });
          }
          if (lockedPackage.listingStatus === "ARCHIVED") {
            throw new ORPCError("BAD_REQUEST", {
              message: "Archived listings cannot be changed",
            });
          }

          if (
            !input.available &&
            lockedPackage.status === "AVAILABLE" &&
            lockedPackage.listingStatus === "PUBLISHED"
          ) {
            const packageRows = await tx
              .select({ status: servicePackage.status })
              .from(servicePackage)
              .where(eq(servicePackage.listingId, lockedPackage.listingId))
              .for("update");
            const availablePackageCount = packageRows.filter(
              (packageItem) => packageItem.status === "AVAILABLE"
            ).length;
            if (availablePackageCount <= 1) {
              throw new ORPCError("BAD_REQUEST", {
                message:
                  "A published Service listing must retain at least one available package",
              });
            }
          }

          const [updated] = await tx
            .update(servicePackage)
            .set({
              status: input.available ? "AVAILABLE" : "UNAVAILABLE",
              updatedAt: new Date(),
            })
            .where(eq(servicePackage.id, lockedPackage.id))
            .returning();
          return updated;
        });
      }),

    update: sellerProcedure
      .input(servicePackageDraftSchema.extend({ id: z.uuid() }))
      .handler(async ({ context, input }) => {
        await assertEligibleSeller(context.session.user.id);
        const found = await assertOwnedServicePackage(
          input.id,
          context.session.user.id
        );
        if (found.listing.type !== "SERVICE") {
          throw new ORPCError("BAD_REQUEST", {
            message: "Only Service listings can have packages",
          });
        }
        const category = await assertActiveSubCategory(
          found.listing.categoryId
        );
        const packageDraft = parseServicePackageDraft(input, category);
        const existing = await getServicePackages(found.listingId);
        assertServicePackageNameUnique(existing, packageDraft.name, found.id);
        const [updated] = await db
          .update(servicePackage)
          .set({ ...packageDraft, updatedAt: new Date() })
          .where(eq(servicePackage.id, found.id))
          .returning();
        return updated;
      }),
  },

  updateDraft: sellerProcedure
    .input(draftFieldsSchema.extend({ id: z.string() }))
    // oxlint-disable-next-line complexity
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const found = await assertOwnedListing(input.id, context.session.user.id);

      if (found.status === "ARCHIVED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Archived listings cannot be modified",
        });
      }

      if (input.categoryId && input.categoryId !== found.categoryId) {
        await assertActiveSubCategory(input.categoryId);
      }

      const hasImagesInput = Object.hasOwn(input, "images");
      const hasThumbnailInput = Object.hasOwn(input, "thumbnailUrl");
      const nextImages = hasImagesInput ? (input.images ?? []) : found.images;
      let nextThumbnailUrl = found.thumbnailUrl;
      if (hasImagesInput) {
        nextThumbnailUrl = getPrimaryListingImage(nextImages, null);
      } else if (hasThumbnailInput && nextImages.length === 0) {
        nextThumbnailUrl = input.thumbnailUrl ?? null;
      }

      if (found.status === "PUBLISHED") {
        const targetCategoryId = input.categoryId ?? found.categoryId;
        const category = await assertActiveSubCategory(targetCategoryId);
        const publishableDraft = {
          ...found,
          description: Object.hasOwn(input, "description")
            ? (input.description ?? null)
            : found.description,
          images: nextImages,
          priceAmount: Object.hasOwn(input, "priceAmount")
            ? (input.priceAmount ?? null)
            : found.priceAmount,
          processingTimeHours: Object.hasOwn(input, "processingTimeHours")
            ? (input.processingTimeHours ?? null)
            : found.processingTimeHours,
          thumbnailUrl: nextThumbnailUrl,
          title: Object.hasOwn(input, "title")
            ? (input.title ?? null)
            : found.title,
          type: input.type ?? found.type,
          warrantyDurationHours: Object.hasOwn(input, "warrantyDurationHours")
            ? (input.warrantyDurationHours ?? null)
            : found.warrantyDurationHours,
          warrantyTerms: Object.hasOwn(input, "warrantyTerms")
            ? (input.warrantyTerms ?? null)
            : found.warrantyTerms,
        };
        if (publishableDraft.type === "SERVICE") {
          assertListingPresentation(publishableDraft);
        } else {
          assertCourseListingContract(publishableDraft, category);
        }
      }

      const [updated] = await db
        .update(listing)
        .set({
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(Object.hasOwn(input, "description")
            ? { description: input.description }
            : {}),
          ...(hasImagesInput ? { images: nextImages } : {}),
          ...(Object.hasOwn(input, "priceAmount")
            ? { priceAmount: input.priceAmount }
            : {}),
          ...(Object.hasOwn(input, "processingTimeHours")
            ? { processingTimeHours: input.processingTimeHours }
            : {}),
          ...(hasImagesInput || hasThumbnailInput
            ? { thumbnailUrl: nextThumbnailUrl }
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
        .where(eq(listing.id, found.id))
        .returning();

      await cleanupUnreferencedListingImages(context.storage, {
        nextImages,
        nextThumbnailUrl,
        previousImages: found.images,
        previousThumbnailUrl: found.thumbnailUrl,
      });

      return updated;
    }),
};
