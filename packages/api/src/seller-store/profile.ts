import { z } from "zod";

import { slugify } from "../runtime/slug";

export const STORE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const storeProfileInputSchema = z.object({
  avatarUrl: z.url("Ảnh đại diện gian hàng là bắt buộc"),
  bannerUrl: z.union([z.url(), z.literal("")]).default(""),
  bio: z
    .string()
    .trim()
    .min(1, "Mô tả gian hàng là bắt buộc")
    .max(500, "Mô tả gian hàng tối đa 500 ký tự"),
  storeSlug: z
    .string()
    .trim()
    .min(2, "Đường dẫn gian hàng phải từ 2 ký tự")
    .max(100, "Đường dẫn gian hàng tối đa 100 ký tự")
    .regex(STORE_SLUG_PATTERN, "Đường dẫn gian hàng không hợp lệ"),
  storefrontName: z
    .string()
    .trim()
    .min(2, "Tên gian hàng phải từ 2 ký tự")
    .max(100, "Tên gian hàng tối đa 100 ký tự"),
});

export type StoreProfileInput = z.infer<typeof storeProfileInputSchema>;

export type StoreVisibilityReason =
  | "ENFORCED"
  | "INCOMPLETE_PROFILE"
  | "NO_PROFILE"
  | "PENDING_APPROVAL"
  | "PUBLIC";

export interface StoreProfileCompletenessData {
  avatarUrl?: string | null;
  bio?: string | null;
  storeSlugLockedAt?: Date | null;
  storeSlug?: string | null;
  storefrontName?: string | null;
}

export interface StorePublicEligibilityInput {
  account?: {
    banExpires?: Date | null;
    banned?: boolean | null;
    role?: string | null;
  } | null;
  application?: {
    status?: string | null;
  } | null;
  now?: Date;
  profile?: StoreProfileCompletenessData | null;
}

export const isStoreProfileComplete = (
  profile: StoreProfileCompletenessData | null | undefined
): boolean =>
  Boolean(
    profile?.storefrontName?.trim() &&
    profile.storeSlug?.trim() &&
    profile.bio?.trim() &&
    profile.avatarUrl?.trim()
  );

export const isSellerEnforced = (
  account: StorePublicEligibilityInput["account"],
  now = new Date()
): boolean =>
  account?.banned === true ||
  (account?.banExpires !== null &&
    account?.banExpires !== undefined &&
    account.banExpires > now);

export const isStorePubliclyEligible = ({
  account,
  application,
  now,
  profile,
}: StorePublicEligibilityInput): boolean =>
  account?.role === "SELLER" &&
  !isSellerEnforced(account, now) &&
  application?.status === "APPROVED" &&
  isStoreProfileComplete(profile);

export const createStoreSlug = (storefrontName: string): string =>
  slugify(storefrontName) || "store";

export interface PublicStoreProfile {
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  createdAt: Date;
  id: string;
  storeSlug: string;
  storefrontName: string;
  updatedAt: Date;
}
