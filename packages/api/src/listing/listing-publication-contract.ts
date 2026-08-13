import { ORPCError } from "@orpc/server";

import { LISTING_IMAGE_MAX_COUNT } from "../runtime/storage";

interface ListingPresentation {
  description: string | null;
  images?: string[] | null;
  slug: string;
  thumbnailUrl: string | null;
  title: string | null;
}

interface CourseContract extends ListingPresentation {
  priceAmount: number | null;
  processingTimeHours: number | null;
  warrantyDurationHours: number | null;
  warrantyTerms: string | null;
}

interface PublicationCategory {
  warrantyBounds: { maxHours: number; minHours: number };
}

export const getPrimaryListingImage = (
  images: string[] | null | undefined,
  thumbnailUrl: string | null | undefined
): string | null => images?.[0]?.trim() || thumbnailUrl?.trim() || null;

export const assertListingPresentation = (
  listingItem: ListingPresentation
): void => {
  if (!listingItem.title?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing title is required",
    });
  }
  if (!listingItem.description?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing description is required",
    });
  }
  if (!listingItem.slug.trim()) {
    throw new ORPCError("BAD_REQUEST", { message: "Listing slug is required" });
  }
  if ((listingItem.images?.length ?? 0) > LISTING_IMAGE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `A listing can have at most ${LISTING_IMAGE_MAX_COUNT} images`,
    });
  }
  if (!getPrimaryListingImage(listingItem.images, listingItem.thumbnailUrl)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing must have a designated primary image",
    });
  }
};

export const assertCourseListingContract = (
  listingItem: CourseContract,
  category: PublicationCategory
): void => {
  assertListingPresentation(listingItem);
  if (
    listingItem.priceAmount === null ||
    !Number.isInteger(listingItem.priceAmount) ||
    listingItem.priceAmount <= 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing price must be a positive integer VND amount",
    });
  }
  if (
    listingItem.processingTimeHours === null ||
    !Number.isInteger(listingItem.processingTimeHours) ||
    listingItem.processingTimeHours <= 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Processing Expectation (in hours) must be a positive integer",
    });
  }
  if (
    listingItem.warrantyDurationHours === null ||
    !Number.isInteger(listingItem.warrantyDurationHours)
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Warranty duration in hours is required",
    });
  }
  const { maxHours, minHours } = category.warrantyBounds;
  if (
    listingItem.warrantyDurationHours < minHours ||
    listingItem.warrantyDurationHours > maxHours
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Warranty duration (${listingItem.warrantyDurationHours}h) must be within category bounds (${minHours}h - ${maxHours}h)`,
    });
  }
  if (!listingItem.warrantyTerms?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Warranty terms are required",
    });
  }
};
