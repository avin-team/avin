import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuditEvent, Context } from "../runtime/context";
import {
  adminModerationRouter,
  getModerationTransition,
} from "./admin-moderation";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    query: {
      auditLog: { findMany: vi.fn() },
      listing: { findFirst: vi.fn(), findMany: vi.fn() },
      sellerApplication: { findFirst: vi.fn() },
      sellerProfile: { findFirst: vi.fn() },
      subCategory: { findFirst: vi.fn() },
      user: { findFirst: vi.fn() },
    },
    update: vi.fn(),
  },
}));

vi.mock("@avin/db", () => ({ db: dbMock }));

const createContext = (
  role: (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE],
  auditEvents: AuditEvent[] = [],
  userId = "admin-1"
): Context => ({
  audit: {
    record: (event) => {
      auditEvents.push(event);
      return Promise.resolve();
    },
  },
  db: dbMock as unknown as Context["db"],
  session: {
    session: {
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      id: "session-1",
      ipAddress: null,
      token: "session-token",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      userAgent: null,
      userId,
    },
    user: {
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      email: "admin@example.com",
      emailVerified: true,
      id: userId,
      image: null,
      name: "Admin User",
      role,
      twoFactorEnabled: true,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  },
});

const publishedListing = {
  categoryId: "category-1",
  id: "listing-1",
  sellerId: "seller-1",
  status: "PUBLISHED" as const,
};

describe("Listing moderation transition rules", () => {
  it("lists Listings for an authorized Admin with status and Seller search filters", async () => {
    const matchingListing = {
      ...publishedListing,
      category: {
        name: "Account setup",
        parentCategory: { name: "Digital services" },
      },
      seller: {
        email: "seller@example.com",
        id: publishedListing.sellerId,
        image: null,
        name: "Trusted Seller",
      },
      title: "Premium account setup",
    };
    const otherListing = {
      ...publishedListing,
      id: "listing-2",
      seller: matchingListing.seller,
      title: "Different service",
    };
    dbMock.query.listing.findMany.mockResolvedValue([
      matchingListing,
      otherListing,
    ]);

    await expect(
      call(
        adminModerationRouter.list,
        { search: "trusted seller", status: "PUBLISHED" },
        { context: createContext(ACCOUNT_ROLE.ADMIN) }
      )
    ).resolves.toEqual([matchingListing, otherListing]);
  });

  it("returns the Listing moderation audit trail to an authorized Admin", async () => {
    const auditEntries = [
      {
        action: "listing.moderation.hide",
        actorUserId: "admin-1",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        id: "audit-1",
        metadata: {
          listingId: publishedListing.id,
          newVisibilityState: "HIDDEN",
          priorVisibilityState: "PUBLISHED",
          reason: "Policy violation",
        },
        outcome: "SUCCESS" as const,
        targetId: publishedListing.id,
        targetType: "LISTING",
      },
    ];
    dbMock.query.auditLog.findMany.mockResolvedValue(auditEntries);

    await expect(
      call(
        adminModerationRouter.auditLog,
        { listingId: publishedListing.id },
        { context: createContext(ACCOUNT_ROLE.ADMIN) }
      )
    ).resolves.toEqual(auditEntries);
  });

  it("allows an Admin to hide a published Listing and records the complete audit event", async () => {
    const auditEvents: AuditEvent[] = [];
    const updatedListing = { ...publishedListing, status: "HIDDEN" as const };
    dbMock.query.listing.findFirst.mockResolvedValue(publishedListing);
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedListing]),
        }),
      }),
    });

    await expect(
      call(
        adminModerationRouter.hide,
        { id: publishedListing.id, reason: "Violates marketplace policy" },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).resolves.toEqual(updatedListing);

    expect(auditEvents).toEqual([
      {
        action: "listing.moderation.hide",
        actorUserId: "admin-1",
        metadata: {
          listingId: publishedListing.id,
          newVisibilityState: "HIDDEN",
          priorVisibilityState: "PUBLISHED",
          reason: "Violates marketplace policy",
        },
        outcome: "SUCCESS",
        targetId: publishedListing.id,
        targetType: "LISTING",
      },
    ]);
  });

  it("allows an Admin to archive any non-archived Listing", async () => {
    const auditEvents: AuditEvent[] = [];
    const updatedListing = { ...publishedListing, status: "ARCHIVED" as const };
    dbMock.query.listing.findFirst.mockResolvedValue(publishedListing);
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedListing]),
        }),
      }),
    });

    await expect(
      call(
        adminModerationRouter.archive,
        { id: publishedListing.id, reason: "Retained for legal record" },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).resolves.toEqual(updatedListing);
    expect(auditEvents[0]).toMatchObject({
      action: "listing.moderation.archive",
      metadata: {
        newVisibilityState: "ARCHIVED",
        priorVisibilityState: "PUBLISHED",
        reason: "Retained for legal record",
      },
      targetId: publishedListing.id,
    });
  });

  it("requires a reason for every moderation action, including restore", async () => {
    dbMock.query.listing.findFirst.mockResolvedValue({
      ...publishedListing,
      status: "HIDDEN",
    });

    await expect(
      call(
        adminModerationRouter.restore,
        { id: publishedListing.id, reason: "   " },
        { context: createContext(ACCOUNT_ROLE.ADMIN) }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("restores a hidden Listing only after Seller and publication gates pass", async () => {
    const auditEvents: AuditEvent[] = [];
    const hiddenListing = {
      ...publishedListing,
      description: "A complete listing description",
      images: ["https://storage.avin.internal/listing-1/1.jpg"],
      priceAmount: 150_000,
      processingTimeHours: 12,
      serviceInputFields: [],
      slug: "premium-account-setup-1234",
      status: "HIDDEN" as const,
      thumbnailUrl: "https://storage.avin.internal/listing-1/1.jpg",
      title: "Premium account setup",
      warrantyDurationHours: 48,
      warrantyTerms: "Free replacement within 48 hours",
    };
    const restoredListing = { ...hiddenListing, status: "PUBLISHED" as const };
    dbMock.query.listing.findFirst.mockResolvedValue(hiddenListing);
    dbMock.query.user.findFirst.mockResolvedValue({
      banExpires: null,
      banned: false,
      role: ACCOUNT_ROLE.SELLER,
    });
    dbMock.query.sellerApplication.findFirst.mockResolvedValue({
      sellerAgreementVersion: "v1.0",
      status: "APPROVED",
    });
    dbMock.query.sellerProfile.findFirst.mockResolvedValue({
      avatarUrl: "https://example.com/avatar.png",
      bio: "A complete store profile",
      storeSlug: "trusted-seller",
      storefrontName: "Trusted Seller",
    });
    dbMock.query.subCategory.findFirst.mockResolvedValue({
      parentCategory: { status: "ACTIVE" },
      warrantyBounds: { maxHours: 720, minHours: 24 },
    });
    dbMock.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([restoredListing]),
        }),
      }),
    });

    await expect(
      call(
        adminModerationRouter.restore,
        { id: hiddenListing.id, reason: "Publication gates re-verified" },
        { context: createContext(ACCOUNT_ROLE.ADMIN, auditEvents) }
      )
    ).resolves.toEqual(restoredListing);
    expect(auditEvents[0]).toMatchObject({
      action: "listing.moderation.restore",
      targetId: hiddenListing.id,
      targetType: "LISTING",
    });
  });

  it("does not allow a Seller to use the Admin moderation boundary", async () => {
    await expect(
      call(
        adminModerationRouter.hide,
        { id: publishedListing.id, reason: "Policy violation" },
        { context: createContext(ACCOUNT_ROLE.SELLER) }
      )
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps archived Listings terminal", async () => {
    dbMock.query.listing.findFirst.mockResolvedValue({
      ...publishedListing,
      status: "ARCHIVED",
    });

    await expect(
      call(
        adminModerationRouter.archive,
        { id: publishedListing.id, reason: "Retained for legal record" },
        { context: createContext(ACCOUNT_ROLE.ADMIN) }
      )
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.update).not.toHaveBeenCalled();
  });
});

describe("Listing moderation state transitions", () => {
  it.each([
    ["PUBLISHED", "HIDE", "HIDDEN"],
    ["HIDDEN", "RESTORE", "PUBLISHED"],
    ["DRAFT", "ARCHIVE", "ARCHIVED"],
    ["PAUSED", "ARCHIVE", "ARCHIVED"],
    ["PUBLISHED", "ARCHIVE", "ARCHIVED"],
  ] as const)("transitions %s with %s to %s", (status, action, nextStatus) => {
    expect(getModerationTransition(status, action)).toBe(nextStatus);
  });

  it("rejects restoring a Listing that is not hidden", () => {
    expect(() => getModerationTransition("PUBLISHED", "RESTORE")).toThrow(
      "Only hidden listings can be restored"
    );
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});
