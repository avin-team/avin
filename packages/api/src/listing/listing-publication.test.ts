import type { db } from "@avin/db";
import { listing, servicePackage } from "@avin/db/schema/catalog";
import { notification } from "@avin/db/schema/commerce";
import { describe, expect, it } from "vitest";

import {
  publishListing,
  restoreListing,
  resumeListing,
} from "./listing-publication";

const ACTIVE_CATEGORY = {
  parentCategory: { status: "ACTIVE" },
  warrantyBounds: { maxHours: 720, minHours: 24 },
};

const COMPLETE_PROFILE = {
  avatarUrl: "https://example.com/avatar.png",
  bio: "Dịch vụ số cho người mua.",
  storeSlug: "trusted-seller",
  storefrontName: "Trusted Seller",
};

const createListing = (
  overrides: Partial<{
    status: "DRAFT" | "HIDDEN" | "PAUSED" | "PUBLISHED";
    type: "COURSE" | "SERVICE";
  }> = {}
) => ({
  categoryId: "category-1",
  description: "A complete Listing description",
  id: "listing-1",
  images: ["https://storage.avin.internal/listing-1/primary.jpg"],
  priceAmount: 150_000,
  processingTimeHours: 12,
  sellerId: "seller-1",
  slug: "premium-account-setup-1234",
  status: overrides.status ?? ("DRAFT" as const),
  thumbnailUrl: "https://storage.avin.internal/listing-1/stale.jpg",
  title: "Premium account setup",
  type: overrides.type ?? ("COURSE" as const),
  warrantyDurationHours: 48,
  warrantyTerms: "Free replacement within 48 hours",
});

interface PublicationState {
  category?: typeof ACTIVE_CATEGORY;
  listing: ReturnType<typeof createListing>;
  notifications: Record<string, unknown>[];
  packages: Record<string, unknown>[];
}

const createPublicationDatabase = (state: PublicationState): typeof db => {
  const database = {
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(values) ? values : [values];
        if (table === servicePackage) {
          state.packages.push(
            ...rows.map((row) => ({
              firstPublishedAt: null,
              id: `package-${state.packages.length + 1}`,
              status: "AVAILABLE",
              ...row,
            }))
          );
        }
        if (table === notification) {
          state.notifications.push(...rows);
        }
        return {
          onConflictDoNothing: () => Promise.resolve(),
          returning: () => Promise.resolve(rows),
        };
      },
    }),
    query: {
      listing: { findFirst: () => Promise.resolve(state.listing) },
      sellerApplication: {
        findFirst: () =>
          Promise.resolve({
            sellerAgreementVersion: "v1.0",
            status: "APPROVED",
          }),
      },
      sellerEnforcement: {
        findFirst: () =>
          Promise.resolve({
            expiresAt: null,
            sellerId: state.listing.sellerId,
            state: "CLEAR",
          }),
      },
      sellerProfile: { findFirst: () => Promise.resolve(COMPLETE_PROFILE) },
      servicePackage: {
        findMany: () => Promise.resolve(state.packages),
      },
      subCategory: { findFirst: () => Promise.resolve(state.category) },
      user: {
        findFirst: () =>
          Promise.resolve({ id: state.listing.sellerId, role: "SELLER" }),
      },
    },
    transaction: <Result>(
      callback: (transaction: typeof db) => Promise<Result>
    ): Promise<Result> => callback(database as unknown as typeof db),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          if (table === listing) {
            state.listing = {
              ...state.listing,
              ...values,
            } as typeof state.listing;
          }
          if (table === servicePackage) {
            state.packages = state.packages.map((packageItem) => ({
              ...packageItem,
              firstPublishedAt:
                packageItem.firstPublishedAt ?? values.firstPublishedAt,
              updatedAt: values.updatedAt,
            }));
          }
          return Object.assign(Promise.resolve(), {
            returning: () => Promise.resolve([state.listing]),
          });
        },
      }),
    }),
  };

  return database as unknown as typeof db;
};

const createState = (
  listingItem: ReturnType<typeof createListing>,
  overrides: Partial<PublicationState> = {}
): PublicationState => ({
  category: ACTIVE_CATEGORY,
  listing: listingItem,
  notifications: [],
  packages: [],
  ...overrides,
});

describe("Listing publication commands", () => {
  it("publishes a COURSE after all publication gates pass", async () => {
    const state = createState(createListing());

    const published = await publishListing({
      database: createPublicationDatabase(state),
      listingId: state.listing.id,
      sellerId: state.listing.sellerId,
    });

    expect(published).toMatchObject({
      status: "PUBLISHED",
      thumbnailUrl: state.listing.images[0],
    });
  });

  it("publishes a legacy SERVICE by creating and marking its initial package", async () => {
    const state = createState(createListing({ type: "SERVICE" }));

    await publishListing({
      database: createPublicationDatabase(state),
      listingId: state.listing.id,
      sellerId: state.listing.sellerId,
    });

    expect(state.packages).toEqual([
      expect.objectContaining({
        firstPublishedAt: expect.any(Date),
        listingId: state.listing.id,
        status: "AVAILABLE",
      }),
    ]);
  });

  it("resumes only a paused Listing", async () => {
    const state = createState(createListing({ status: "PUBLISHED" }));

    await expect(
      resumeListing({
        database: createPublicationDatabase(state),
        listingId: state.listing.id,
        sellerId: state.listing.sellerId,
      })
    ).rejects.toThrow("Only paused listings can be resumed");
    expect(state.listing.status).toBe("PUBLISHED");
  });

  it("restores a hidden Listing and records its Notification atomically", async () => {
    const state = createState(createListing({ status: "HIDDEN" }));

    const restored = await restoreListing({
      database: createPublicationDatabase(state),
      listingId: state.listing.id,
    });

    expect(restored.status).toBe("PUBLISHED");
    expect(state.notifications).toEqual([
      expect.objectContaining({
        eventType: "listing.restored",
        recipientUserId: state.listing.sellerId,
        sourceType: "LISTING",
      }),
    ]);
  });

  it("does not publish when the Category gate fails", async () => {
    const state = createState(createListing(), { category: undefined });

    await expect(
      publishListing({
        database: createPublicationDatabase(state),
        listingId: state.listing.id,
        sellerId: state.listing.sellerId,
      })
    ).rejects.toThrow("Listing category must be active");
    expect(state.listing.status).toBe("DRAFT");
  });
});
