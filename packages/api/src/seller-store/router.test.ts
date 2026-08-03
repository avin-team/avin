import { call } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import {
  createStoreSlug,
  isStoreProfileComplete,
  isStorePubliclyEligible,
  storeProfileInputSchema,
} from "./profile";
import { isStoreSlugLocked } from "./public-visibility";
import { sellerStoreRouter } from "./router";

describe("seller store router interface", () => {
  it("exposes the private store profile workflow", () => {
    expect(Object.keys(sellerStoreRouter).toSorted()).toEqual([
      "getProfile",
      "getPublicBySlug",
      "updateProfile",
    ]);
  });
});

describe("store profile contract", () => {
  it("creates a URL-safe initial slug from a store name", () => {
    expect(createStoreSlug("Studio của Ngọc")).toBe("studio-cua-ngoc");
  });

  it("requires the fields needed to complete the private profile", () => {
    expect(
      storeProfileInputSchema.safeParse({
        avatarUrl: "https://example.com/avatar.png",
        bannerUrl: "",
        bio: "Dịch vụ số cho người bán.",
        storeSlug: "studio-cua-ngoc",
        storefrontName: "Studio của Ngọc",
      }).success
    ).toBe(true);

    expect(
      storeProfileInputSchema.safeParse({
        avatarUrl: "",
        bannerUrl: "",
        bio: "Dịch vụ số cho người bán.",
        storeSlug: "Studio Cua Ngoc",
        storefrontName: "Studio của Ngọc",
      }).success
    ).toBe(false);
  });

  it("treats the required identity fields as the complete profile boundary", () => {
    const completeProfile = {
      avatarUrl: "https://example.com/avatar.png",
      bio: "Dịch vụ số cho người bán.",
      storeSlug: "studio-cua-ngoc",
      storefrontName: "Studio của Ngọc",
    };

    expect(isStoreProfileComplete(completeProfile)).toBe(true);
    expect(isStoreProfileComplete({ ...completeProfile, bio: "   " })).toBe(
      false
    );
  });

  it("makes a Store public only for an approved, non-enforced Seller", () => {
    const profile = {
      avatarUrl: "https://example.com/avatar.png",
      bio: "Dịch vụ số cho người bán.",
      storeSlug: "studio-cua-ngoc",
      storefrontName: "Studio của Ngọc",
    };
    const account = {
      banExpires: null,
      banned: false,
      role: "SELLER",
    };

    expect(
      isStorePubliclyEligible({
        account,
        application: { status: "APPROVED" },
        profile,
      })
    ).toBe(true);
    expect(
      isStorePubliclyEligible({
        account,
        application: { status: "PENDING_REVIEW" },
        profile,
      })
    ).toBe(false);
    expect(
      isStorePubliclyEligible({
        account: { ...account, banned: true },
        application: { status: "APPROVED" },
        profile,
      })
    ).toBe(false);
    expect(
      isStorePubliclyEligible({
        account: {
          ...account,
          banExpires: new Date("2026-08-02T12:00:00.000Z"),
        },
        application: { status: "APPROVED" },
        now: new Date("2026-08-02T11:00:00.000Z"),
        profile,
      })
    ).toBe(false);
    expect(
      isStorePubliclyEligible({
        account: {
          ...account,
          banExpires: new Date("2026-08-02T12:00:00.000Z"),
        },
        application: { status: "APPROVED" },
        now: new Date("2026-08-02T13:00:00.000Z"),
        profile,
      })
    ).toBe(true);
  });

  it("keeps the Store slug locked after its first public state", async () => {
    await expect(
      isStoreSlugLocked({} as Context["db"], {
        avatarUrl: "https://example.com/avatar.png",
        bio: "Dịch vụ số cho người bán.",
        id: "profile-1",
        storeSlug: "studio-cua-ngoc",
        storeSlugLockedAt: new Date("2026-01-01T00:00:00.000Z"),
        storefrontName: "Studio của Ngọc",
        userId: "seller-1",
      })
    ).resolves.toBe(true);
  });
});

describe("public Store profile route", () => {
  it("returns a public Store with an empty Listing collection", async () => {
    const profile = {
      avatarUrl: "https://example.com/avatar.png",
      bannerUrl: null,
      bio: "Dịch vụ số cho người bán.",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "profile-1",
      storeSlug: "studio-cua-ngoc",
      storefrontName: "Studio của Ngọc",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userId: "seller-1",
    };
    const db = {
      query: {
        listing: { findMany: vi.fn().mockResolvedValue([]) },
        sellerApplication: {
          findFirst: vi.fn().mockResolvedValue({ status: "APPROVED" }),
        },
        sellerProfile: {
          findFirst: vi.fn().mockResolvedValue(profile),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            banExpires: null,
            banned: false,
            role: "SELLER",
          }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn() }),
      }),
    } as unknown as Context["db"];

    await expect(
      call(
        sellerStoreRouter.getPublicBySlug,
        { slug: profile.storeSlug },
        {
          context: {
            audit: { record: vi.fn() },
            db,
            session: null,
          } as Context,
        }
      )
    ).resolves.toMatchObject({
      listings: [],
      profile: {
        storeSlug: profile.storeSlug,
        storefrontName: profile.storefrontName,
      },
    });
  });

  it("redacts internal Listing fields and excludes inactive categories", async () => {
    const profile = {
      avatarUrl: "https://example.com/avatar.png",
      bannerUrl: null,
      bio: "Dịch vụ số cho người bán.",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "profile-1",
      storeSlug: "studio-cua-ngoc",
      storefrontName: "Studio của Ngọc",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userId: "seller-1",
    };
    const publicListing = {
      category: {
        parentCategory: { status: "ACTIVE" },
        status: "ACTIVE",
      },
      createdAt: new Date("2026-01-02T00:00:00.000Z"),
      description: "Internal description",
      id: "listing-1",
      priceAmount: 150_000,
      serviceInputFields: [{ id: "secret" }],
      slug: "account-setup-1234",
      thumbnailUrl: "https://example.com/listing.png",
      title: "Premium account setup",
      type: "SERVICE",
    };
    const hiddenListing = {
      ...publicListing,
      category: {
        parentCategory: { status: "ACTIVE" },
        status: "HIDDEN",
      },
      id: "listing-2",
    };
    const db = {
      query: {
        listing: {
          findMany: vi.fn().mockResolvedValue([publicListing, hiddenListing]),
        },
        sellerApplication: {
          findFirst: vi.fn().mockResolvedValue({ status: "APPROVED" }),
        },
        sellerProfile: {
          findFirst: vi.fn().mockResolvedValue(profile),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            banExpires: null,
            banned: false,
            role: "SELLER",
          }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn() }),
      }),
    } as unknown as Context["db"];

    await expect(
      call(
        sellerStoreRouter.getPublicBySlug,
        { slug: profile.storeSlug },
        {
          context: {
            audit: { record: vi.fn() },
            db,
            session: null,
          } as Context,
        }
      )
    ).resolves.toMatchObject({
      listings: [
        {
          createdAt: publicListing.createdAt,
          id: publicListing.id,
          priceAmount: publicListing.priceAmount,
          slug: publicListing.slug,
          thumbnailUrl: publicListing.thumbnailUrl,
          title: publicListing.title,
          type: publicListing.type,
        },
      ],
    });
  });

  it("does not expose an unapproved Store profile", async () => {
    const profile = {
      avatarUrl: "https://example.com/avatar.png",
      bannerUrl: null,
      bio: "Dịch vụ số cho người bán.",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      id: "profile-1",
      storeSlug: "studio-cua-ngoc",
      storefrontName: "Studio của Ngọc",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userId: "seller-1",
    };
    const db = {
      query: {
        listing: { findMany: vi.fn() },
        sellerApplication: {
          findFirst: vi.fn().mockResolvedValue({ status: "PENDING_REVIEW" }),
        },
        sellerProfile: {
          findFirst: vi.fn().mockResolvedValue(profile),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            banExpires: null,
            banned: false,
            role: "SELLER",
          }),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where: vi.fn() }),
      }),
    } as unknown as Context["db"];

    await expect(
      call(
        sellerStoreRouter.getPublicBySlug,
        { slug: profile.storeSlug },
        {
          context: {
            audit: { record: vi.fn() },
            db,
            session: null,
          } as Context,
        }
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(db.query.listing.findMany).not.toHaveBeenCalled();
  });
});
