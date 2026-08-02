import { user as userTable } from "@avin/db/schema/auth";
import { sellerApplication, sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";

import type { Context } from "../runtime/context";
import {
  isSellerEnforced,
  isStoreProfileComplete,
  isStorePubliclyEligible,
} from "./profile";
import type {
  StoreProfileCompletenessData,
  StoreVisibilityReason,
} from "./profile";

export type StoreVisibilityStatus = "PRIVATE" | "PUBLIC";

export interface StoreVisibility {
  slugLocked: boolean;
  visibilityReason: StoreVisibilityReason;
  status: StoreVisibilityStatus;
}

const markStoreSlugLocked = async (
  database: Context["db"],
  profile: StoreProfileCompletenessData & { id: string }
): Promise<void> => {
  if (profile.storeSlugLockedAt) {
    return;
  }

  await database
    .update(sellerProfile)
    .set({ storeSlugLockedAt: new Date() })
    .where(eq(sellerProfile.id, profile.id));
};

export const assertStoreProfileComplete = (
  profile: StoreProfileCompletenessData | null | undefined
): void => {
  if (!isStoreProfileComplete(profile)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Store profile must be complete before publishing a listing",
    });
  }
};

export const getStoreVisibility = async (
  database: Context["db"],
  userId: string
): Promise<StoreVisibility> => {
  const [profile, account, application] = await Promise.all([
    database.query.sellerProfile.findFirst({
      where: eq(sellerProfile.userId, userId),
    }),
    database.query.user.findFirst({
      columns: {
        banExpires: true,
        banned: true,
        role: true,
      },
      where: eq(userTable.id, userId),
    }),
    database.query.sellerApplication.findFirst({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: eq(sellerApplication.userId, userId),
    }),
  ]);

  let reason: StoreVisibilityReason = "PUBLIC";
  if (!profile) {
    reason = "NO_PROFILE";
  } else if (isSellerEnforced(account)) {
    reason = "ENFORCED";
  } else if (!isStoreProfileComplete(profile)) {
    reason = "INCOMPLETE_PROFILE";
  } else if (account?.role !== "SELLER" || application?.status !== "APPROVED") {
    reason = "PENDING_APPROVAL";
  } else if (!isStorePubliclyEligible({ account, application, profile })) {
    reason = "PENDING_APPROVAL";
  }

  return {
    slugLocked: Boolean(profile?.storeSlugLockedAt) || reason === "PUBLIC",
    status: reason === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    visibilityReason: reason,
  };
};

export const getStoreVisibilityStatus = async (
  database: Context["db"],
  userId: string
): Promise<StoreVisibilityStatus> => {
  const visibility = await getStoreVisibility(database, userId);
  return visibility.status;
};

export const isStoreSlugLocked = async (
  database: Context["db"],
  profile:
    | (StoreProfileCompletenessData & { id: string; userId: string })
    | null
): Promise<boolean> => {
  if (!profile) {
    return false;
  }

  if (profile.storeSlugLockedAt) {
    return true;
  }

  if (!isStoreProfileComplete(profile)) {
    return false;
  }

  const [account, application] = await Promise.all([
    database.query.user.findFirst({
      columns: {
        banExpires: true,
        banned: true,
        role: true,
      },
      where: eq(userTable.id, profile.userId),
    }),
    database.query.sellerApplication.findFirst({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      where: eq(sellerApplication.userId, profile.userId),
    }),
  ]);

  const isLocked = isStorePubliclyEligible({
    account,
    application,
    profile,
  });
  if (isLocked) {
    await markStoreSlugLocked(database, profile);
  }
  return isLocked;
};

export const findPublicStoreProfile = async (
  database: Context["db"],
  storeSlug: string
) => {
  const profile = await database.query.sellerProfile.findFirst({
    where: eq(sellerProfile.storeSlug, storeSlug),
  });

  if (!profile) {
    return null;
  }

  const status = await getStoreVisibilityStatus(database, profile.userId);
  return status === "PUBLIC" ? profile : null;
};
