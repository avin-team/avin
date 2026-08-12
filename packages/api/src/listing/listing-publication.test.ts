import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  publishListing,
  restoreListing,
  resumeListing,
} from "./listing-publication";

interface ListingFixture {
  categoryId: string;
  description: string;
  id: string;
  images: string[];
  priceAmount: number;
  processingTimeHours: number;
  sellerId: string;
  slug: string;
  status: "DRAFT" | "HIDDEN" | "PAUSED" | "PUBLISHED";
  thumbnailUrl: string;
  title: string;
  type: "COURSE" | "SERVICE";
  warrantyDurationHours: number;
  warrantyTerms: string;
}

interface PublicationState {
  category?: {
    parentCategory: { status: "ACTIVE" };
    warrantyBounds: { maxHours: number; minHours: number };
  };
  listing: ListingFixture;
  notifications: Record<string, unknown>[];
  packages: Record<string, unknown>[];
}

interface FindFirstInput {
  where?: SQL;
}

interface TestDatabase {
  insert: () => {
    values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
      onConflictDoNothing: () => Promise<void>;
      returning: () => Promise<Record<string, unknown>[]>;
    };
  };
  query: {
    listing: {
      findFirst: (input: FindFirstInput) => Promise<ListingFixture | undefined>;
    };
    sellerApplication: { findFirst: () => Promise<Record<string, unknown>> };
    sellerEnforcement: {
      findFirst: (input: FindFirstInput) => Promise<Record<string, unknown>>;
    };
    sellerProfile: { findFirst: () => Promise<Record<string, unknown>> };
    servicePackage: { findMany: () => Promise<Record<string, unknown>[]> };
    subCategory: {
      findFirst: () => Promise<PublicationState["category"]>;
    };
    user: {
      findFirst: (input: FindFirstInput) => Promise<Record<string, unknown>>;
    };
  };
  transaction: <Result>(
    callback: (transaction: TestDatabase) => Promise<Result>
  ) => Promise<Result>;
  update: () => {
    set: (values: Record<string, unknown>) => {
      where: () => Promise<void> & {
        returning: () => Promise<ListingFixture[]>;
      };
    };
  };
}

const { database, setPublicationState } = await vi.hoisted(async () => {
  const { PgDialect } = await import("drizzle-orm/pg-core");
  let state: PublicationState;
  const dialect = new PgDialect();

  const getQuery = (
    input: FindFirstInput
  ): { params: unknown[]; sql: string } =>
    input.where ? dialect.sqlToQuery(input.where) : { params: [], sql: "" };

  const getParamForColumn = (
    input: FindFirstInput,
    columnName: string
  ): unknown => {
    const query = getQuery(input);
    const match = new RegExp(
      `"[^"]+"\\."${columnName}" = \\$([0-9]+)`,
      "u"
    ).exec(query.sql);
    return match?.[1] ? query.params[Number(match[1]) - 1] : undefined;
  };

  const listingMatches = (input: FindFirstInput): boolean => {
    const expectedId = getParamForColumn(input, "id");
    const expectedSellerId = getParamForColumn(input, "seller_id");
    const expectedStatus = getParamForColumn(input, "status");
    return (
      (expectedId === undefined || expectedId === state.listing.id) &&
      (expectedSellerId === undefined ||
        expectedSellerId === state.listing.sellerId) &&
      (expectedStatus === undefined || expectedStatus === state.listing.status)
    );
  };

  const testDatabase: TestDatabase = {
    insert: () => ({
      values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
        const rows = Array.isArray(values) ? values : [values];
        if (rows.some((row) => "recipientUserId" in row)) {
          state.notifications.push(...rows);
        } else {
          state.packages.push(
            ...rows.map((row) => ({
              firstPublishedAt: null,
              id: `package-${state.packages.length + 1}`,
              status: "AVAILABLE",
              ...row,
            }))
          );
        }
        return {
          onConflictDoNothing: () => Promise.resolve(),
          returning: () => Promise.resolve(rows),
        };
      },
    }),
    query: {
      listing: {
        findFirst: (input: FindFirstInput) =>
          Promise.resolve(listingMatches(input) ? state.listing : undefined),
      },
      sellerApplication: {
        findFirst: () =>
          Promise.resolve({
            sellerAgreementVersion: "v1.0",
            status: "APPROVED",
          }),
      },
      sellerEnforcement: {
        findFirst: (input: FindFirstInput) => {
          const sellerId = getParamForColumn(input, "seller_id");
          return Promise.resolve({ expiresAt: null, sellerId, state: "CLEAR" });
        },
      },
      sellerProfile: {
        findFirst: () =>
          Promise.resolve({
            avatarUrl: "https://example.com/avatar.png",
            bio: "Dịch vụ số cho người mua.",
            storeSlug: "trusted-seller",
            storefrontName: "Trusted Seller",
          }),
      },
      servicePackage: {
        findMany: () => Promise.resolve(state.packages),
      },
      subCategory: { findFirst: () => Promise.resolve(state.category) },
      user: {
        findFirst: (input: FindFirstInput) =>
          Promise.resolve({
            id: getParamForColumn(input, "id"),
            role: "SELLER",
          }),
      },
    },
    transaction: <Result>(
      callback: (transaction: typeof testDatabase) => Promise<Result>
    ): Promise<Result> => callback(testDatabase),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          if (values.status === "PUBLISHED") {
            state.listing = { ...state.listing, ...values };
          } else if ("firstPublishedAt" in values) {
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

  return {
    database: testDatabase,
    setPublicationState: (nextState: PublicationState): void => {
      state = nextState;
    },
  };
});

vi.mock("@avin/db", () => ({ db: database }));

const createListing = (
  overrides: Partial<Pick<ListingFixture, "status" | "type">> = {}
): ListingFixture => ({
  categoryId: "category-1",
  description: "A complete Listing description",
  id: "listing-1",
  images: ["https://storage.avin.internal/listing-1/primary.jpg"],
  priceAmount: 150_000,
  processingTimeHours: 12,
  sellerId: "seller-1",
  slug: "premium-account-setup-1234",
  status: overrides.status ?? "DRAFT",
  thumbnailUrl: "https://storage.avin.internal/listing-1/stale.jpg",
  title: "Premium account setup",
  type: overrides.type ?? "COURSE",
  warrantyDurationHours: 48,
  warrantyTerms: "Free replacement within 48 hours",
});

const createState = (
  listingItem: ListingFixture,
  overrides: Partial<PublicationState> = {}
): PublicationState => ({
  category: {
    parentCategory: { status: "ACTIVE" },
    warrantyBounds: { maxHours: 720, minHours: 24 },
  },
  listing: listingItem,
  notifications: [],
  packages: [],
  ...overrides,
});

beforeEach(() => {
  setPublicationState(createState(createListing()));
});

describe("Listing publication commands", () => {
  it("publishes a COURSE after all publication gates pass", async () => {
    const state = createState(createListing());
    setPublicationState(state);

    const published = await publishListing({
      listingId: state.listing.id,
      sellerId: state.listing.sellerId,
    });

    expect(published).toMatchObject({
      status: "PUBLISHED",
      thumbnailUrl: state.listing.images[0],
    });
  });

  it("does not publish another Seller's draft", async () => {
    const state = createState(createListing());
    setPublicationState(state);

    await expect(
      publishListing({ listingId: state.listing.id, sellerId: "seller-2" })
    ).rejects.toThrow("Draft listing not found");
    expect(state.listing.status).toBe("DRAFT");
  });

  it("publishes a legacy SERVICE by creating and marking its initial package", async () => {
    const state = createState(createListing({ type: "SERVICE" }));
    setPublicationState(state);

    await publishListing({
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

  it("does not publish an owned Listing that is no longer a draft", async () => {
    const state = createState(createListing({ status: "PAUSED" }));
    setPublicationState(state);

    await expect(
      publishListing({
        listingId: state.listing.id,
        sellerId: state.listing.sellerId,
      })
    ).rejects.toThrow("Draft listing not found");
    expect(state.listing.status).toBe("PAUSED");
  });

  it("resumes only a paused Listing", async () => {
    const state = createState(createListing({ status: "PUBLISHED" }));
    setPublicationState(state);

    await expect(
      resumeListing({
        listingId: state.listing.id,
        sellerId: state.listing.sellerId,
      })
    ).rejects.toThrow("Only paused listings can be resumed");
    expect(state.listing.status).toBe("PUBLISHED");
  });

  it("restores a hidden Listing and records its Notification atomically", async () => {
    const state = createState(createListing({ status: "HIDDEN" }));
    setPublicationState(state);

    const restored = await restoreListing({ listingId: state.listing.id });

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
    setPublicationState(state);

    await expect(
      publishListing({
        listingId: state.listing.id,
        sellerId: state.listing.sellerId,
      })
    ).rejects.toThrow("Listing category must be active");
    expect(state.listing.status).toBe("DRAFT");
  });
});
