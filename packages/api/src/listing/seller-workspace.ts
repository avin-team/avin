import { db } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import {
  listing,
  serviceInputFieldSchema,
  subCategory,
} from "@avin/db/schema/catalog";
import { sellerApplication, sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, sellerProcedure } from "../access/procedures";
import { slugify } from "../runtime/slug";
import type { ManagedObjectStore } from "../runtime/storage";
import {
  getManagedListingImageKeysToDelete,
  LISTING_IMAGE_MAX_COUNT,
} from "../runtime/storage";
import { isSellerEnforced } from "../seller-store/profile";
import { assertStoreProfileComplete } from "../seller-store/public-visibility";

export const CURRENT_SELLER_AGREEMENT_VERSION = "v1.0";

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
  serviceInputFields: z.array(serviceInputFieldSchema).optional(),
  thumbnailUrl: z.string().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  type: listingTypeSchema.optional(),
  warrantyDurationHours: z.number().int().min(0).nullable().optional(),
  warrantyTerms: z.string().max(10_000).nullable().optional(),
});

const makeSlug = (title: string | null | undefined): string => {
  const base = title ? slugify(title) : "listing";
  return `${base || "listing"}-${crypto.randomUUID().slice(0, 8)}`;
};

export const getPrimaryListingImage = (
  images: string[] | null | undefined,
  thumbnailUrl: string | null | undefined
): string | null => images?.[0]?.trim() || thumbnailUrl?.trim() || null;

export const assertEligibleSeller = async (userId: string): Promise<void> => {
  const [account, application] = await Promise.all([
    db.query.user.findFirst({ where: eq(userTable.id, userId) }),
    db.query.sellerApplication.findFirst({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: eq(sellerApplication.userId, userId),
    }),
  ]);

  const isEnforced = isSellerEnforced(account);

  if (
    !account ||
    account.role !== "SELLER" ||
    isEnforced ||
    application?.status !== "APPROVED" ||
    application.sellerAgreementVersion !== CURRENT_SELLER_AGREEMENT_VERSION
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "Seller access is not available for this account",
    });
  }
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

export const assertPublishable = (
  draft: {
    description: string | null;
    images?: string[] | null;
    priceAmount: number | null;
    processingTimeHours: number | null;
    serviceInputFields?: unknown[] | null;
    slug: string;
    thumbnailUrl: string | null;
    title: string | null;
    warrantyDurationHours: number | null;
    warrantyTerms: string | null;
  },
  category: {
    warrantyBounds: { minHours: number; maxHours: number };
  }
) => {
  if (!draft.title?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing title is required",
    });
  }

  if (!draft.description?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing description is required",
    });
  }

  if (!draft.slug?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing slug is required",
    });
  }

  if ((draft.images?.length ?? 0) > LISTING_IMAGE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `A listing can have at most ${LISTING_IMAGE_MAX_COUNT} images`,
    });
  }

  if (
    draft.priceAmount === null ||
    draft.priceAmount === undefined ||
    !Number.isInteger(draft.priceAmount) ||
    draft.priceAmount <= 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing price must be a positive integer VND amount",
    });
  }

  if (
    draft.processingTimeHours === null ||
    draft.processingTimeHours === undefined ||
    !Number.isInteger(draft.processingTimeHours) ||
    draft.processingTimeHours <= 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Processing Expectation (in hours) must be a positive integer",
    });
  }

  const primaryImage = getPrimaryListingImage(draft.images, draft.thumbnailUrl);
  if (!primaryImage) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing must have a designated primary image",
    });
  }

  if (
    draft.warrantyDurationHours === null ||
    draft.warrantyDurationHours === undefined ||
    !Number.isInteger(draft.warrantyDurationHours)
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Warranty duration in hours is required",
    });
  }

  const { minHours, maxHours } = category.warrantyBounds;
  if (
    draft.warrantyDurationHours < minHours ||
    draft.warrantyDurationHours > maxHours
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Warranty duration (${draft.warrantyDurationHours}h) must be within category bounds (${minHours}h - ${maxHours}h)`,
    });
  }

  if (!draft.warrantyTerms?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Warranty terms are required",
    });
  }

  if (draft.serviceInputFields && Array.isArray(draft.serviceInputFields)) {
    for (const field of draft.serviceInputFields) {
      const parsed = serviceInputFieldSchema.safeParse(field);
      if (!parsed.success) {
        throw new ORPCError("BAD_REQUEST", {
          message: "All service input fields must be valid",
        });
      }
    }
  }
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
      await assertActiveSubCategory(input.categoryId);

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
          serviceInputFields: input.serviceInputFields ?? [],
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

  getDraft: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      return assertDraft(input.id, context.session.user.id);
    }),

  get: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      return assertOwnedListing(input.id, context.session.user.id);
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

      const hasAccess = canAccessListingMedia(context.session.user, found);
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
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const profile = await db.query.sellerProfile.findFirst({
        where: eq(sellerProfile.userId, context.session.user.id),
      });
      assertStoreProfileComplete(profile);
      const draft = await assertDraft(input.id, context.session.user.id);
      const category = await assertActiveSubCategory(draft.categoryId);
      assertPublishable(draft, category);

      const primaryImage = getPrimaryListingImage(
        draft.images,
        draft.thumbnailUrl
      );

      const [updated] = await db
        .update(listing)
        .set({
          status: "PUBLISHED",
          thumbnailUrl: primaryImage,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, draft.id))
        .returning();
      return updated;
    }),

  resume: sellerProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ context, input }) => {
      await assertEligibleSeller(context.session.user.id);
      const profile = await db.query.sellerProfile.findFirst({
        where: eq(sellerProfile.userId, context.session.user.id),
      });
      assertStoreProfileComplete(profile);
      const found = await assertOwnedListing(input.id, context.session.user.id);
      if (found.status !== "PAUSED") {
        throw new ORPCError("BAD_REQUEST", {
          message: "Only paused listings can be resumed",
        });
      }
      const category = await assertActiveSubCategory(found.categoryId);
      assertPublishable(found, category);

      const primaryImage = getPrimaryListingImage(
        found.images,
        found.thumbnailUrl
      );
      const [updated] = await db
        .update(listing)
        .set({
          status: "PUBLISHED",
          thumbnailUrl: primaryImage,
          updatedAt: new Date(),
        })
        .where(eq(listing.id, found.id))
        .returning();
      return updated;
    }),

  updateDraft: sellerProcedure
    .input(draftFieldsSchema.extend({ id: z.string() }))
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
        assertPublishable(
          {
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
            serviceInputFields:
              input.serviceInputFields ?? found.serviceInputFields,
            thumbnailUrl: nextThumbnailUrl,
            title: Object.hasOwn(input, "title")
              ? (input.title ?? null)
              : found.title,
            warrantyDurationHours: Object.hasOwn(input, "warrantyDurationHours")
              ? (input.warrantyDurationHours ?? null)
              : found.warrantyDurationHours,
            warrantyTerms: Object.hasOwn(input, "warrantyTerms")
              ? (input.warrantyTerms ?? null)
              : found.warrantyTerms,
          },
          category
        );
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
          ...(input.serviceInputFields
            ? { serviceInputFields: input.serviceInputFields }
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
