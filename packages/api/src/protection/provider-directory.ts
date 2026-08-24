import { createHash } from "node:crypto";

import {
  protectionProviderProfile,
  protectionProviderProfileVersion,
} from "@avin/db/schema/protection";
import type { ProviderTier } from "@avin/db/schema/protection";
import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";

type Database = Context["db"];
type ProviderProfile = typeof protectionProviderProfile.$inferSelect;
type ProviderProfileVersion =
  typeof protectionProviderProfileVersion.$inferSelect;

export const PROVIDER_DIRECTORY_DEFAULT_LIMIT = 24;
export const PROVIDER_DIRECTORY_MAX_LIMIT = 50;
export const PROVIDER_DIRECTORY_SEARCHES_PER_MINUTE = 30;
const PROVIDER_TIER_SORT_ORDER: Record<ProviderTier, number> = {
  BRONZE: 4,
  DIAMOND: 1,
  GOLD: 2,
  NORMAL: 5,
  SILVER: 3,
  VIP: 0,
};

export const providerDirectoryListInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(PROVIDER_DIRECTORY_MAX_LIMIT)
    .default(PROVIDER_DIRECTORY_DEFAULT_LIMIT),
});

export const providerDirectorySearchInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
});

export interface ProviderDirectoryCandidate {
  profile: ProviderProfile;
  version: ProviderProfileVersion;
}

interface SearchRateLimitBucket {
  count: number;
  windowStartedAt: number;
}

const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000;
const searchRateLimitBuckets = new Map<string, SearchRateLimitBucket>();

const providerProfilePath = (profileSlug: string): string =>
  `/avin-check/provider/${profileSlug}`;

const normalizeProviderDirectorySearch = (
  value: string | null | undefined
): string => value?.normalize("NFKC").trim().toLocaleLowerCase("vi-VN") ?? "";

export const getProviderDirectoryMatchScore = (
  candidate: ProviderDirectoryCandidate,
  query: string
): number | null => {
  const normalizedQuery = normalizeProviderDirectorySearch(query);
  if (!normalizedQuery) {
    return null;
  }

  const normalizedDisplayName = normalizeProviderDirectorySearch(
    candidate.version.displayName
  );
  const searchableExactValues = [
    candidate.profile.location,
    candidate.version.location,
    candidate.version.officialChannels.hotline,
    candidate.version.officialChannels.zalo,
    candidate.version.officialChannels.facebookUrl,
    candidate.version.officialChannels.telegramCommunityUrl,
    candidate.version.officialChannels.tiktokUrl,
    candidate.version.officialChannels.youtubeUrl,
    candidate.version.officialChannels.websiteUrl,
    ...(candidate.version.registeredBankAccounts ?? []).flatMap((account) => [
      account.accountNumber,
      account.bankCode,
      account.accountName,
    ]),
  ].map((value) => normalizeProviderDirectorySearch(value ?? ""));
  if (searchableExactValues.includes(normalizedQuery)) {
    return 5;
  }
  if (normalizedDisplayName === normalizedQuery) {
    return 4;
  }
  if (normalizedDisplayName.startsWith(normalizedQuery)) {
    return 3;
  }
  const fuzzyValues = [
    normalizedDisplayName,
    normalizeProviderDirectorySearch(candidate.version.services),
    normalizeProviderDirectorySearch(candidate.version.location),
  ];
  return fuzzyValues.some((value) => value.includes(normalizedQuery))
    ? 2
    : null;
};

const sortByFreshness = (
  left: ProviderDirectoryCandidate,
  right: ProviderDirectoryCandidate
): number => {
  const tierDifference =
    PROVIDER_TIER_SORT_ORDER[left.version.tier] -
    PROVIDER_TIER_SORT_ORDER[right.version.tier];
  if (tierDifference !== 0) {
    return tierDifference;
  }
  const bondDifference =
    right.version.recognizedBondAmount - left.version.recognizedBondAmount;
  if (bondDifference !== 0) {
    return bondDifference;
  }
  const freshnessDifference =
    right.version.verifiedAt.getTime() - left.version.verifiedAt.getTime();
  if (freshnessDifference !== 0) {
    return freshnessDifference;
  }
  return left.profile.profileSlug.localeCompare(right.profile.profileSlug);
};

export const rankProviderDirectoryCandidates = (
  candidates: readonly ProviderDirectoryCandidate[],
  query: string,
  limit: number
): ProviderDirectoryCandidate[] => {
  const ranked = candidates.flatMap((candidate) => {
    const score = getProviderDirectoryMatchScore(candidate, query);
    return score === null ? [] : [{ candidate, score }];
  });

  return ranked
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        sortByFreshness(left.candidate, right.candidate)
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
};

export const toProviderDirectoryEntry = (
  candidate: ProviderDirectoryCandidate
) => ({
  displayName: candidate.version.displayName,
  id: candidate.profile.id,
  location: candidate.version.location,
  officialChannels: {
    facebookUrl: candidate.version.officialChannels.facebookUrl,
    hotline: candidate.version.officialChannels.hotline,
    telegramCommunityUrl:
      candidate.version.officialChannels.telegramCommunityUrl,
    tiktokUrl: candidate.version.officialChannels.tiktokUrl,
    websiteUrl: candidate.version.officialChannels.websiteUrl,
    youtubeUrl: candidate.version.officialChannels.youtubeUrl,
    zalo: candidate.version.officialChannels.zalo,
  },
  profileSlug: candidate.profile.profileSlug,
  publicUrl: providerProfilePath(candidate.profile.profileSlug),
  publishedAt: candidate.version.publishedAt.toISOString(),
  recognizedBondAmount: candidate.version.recognizedBondAmount,
  recommendedTransactionLimit: candidate.version.recommendedTransactionLimit,
  services: candidate.version.services,
  status: candidate.version.status,
  tier: candidate.version.tier,
  verifiedAt: candidate.version.verifiedAt.toISOString(),
  versionNumber: candidate.version.versionNumber,
});

const loadLatestProviderDirectoryCandidates = async (
  database: Database
): Promise<ProviderDirectoryCandidate[]> => {
  const rows = await database
    .select({
      profile: protectionProviderProfile,
      version: protectionProviderProfileVersion,
    })
    .from(protectionProviderProfileVersion)
    .innerJoin(
      protectionProviderProfile,
      eq(
        protectionProviderProfileVersion.profileId,
        protectionProviderProfile.id
      )
    )
    .orderBy(desc(protectionProviderProfileVersion.versionNumber));

  const latestByProfile = new Map<string, ProviderDirectoryCandidate>();
  for (const row of rows) {
    if (!latestByProfile.has(row.profile.id)) {
      latestByProfile.set(row.profile.id, row);
    }
  }

  return [...latestByProfile.values()].filter(
    ({ version }) => version.status === "ACTIVE"
  );
};

const sortDirectoryCandidates = (
  candidates: readonly ProviderDirectoryCandidate[]
): ProviderDirectoryCandidate[] => candidates.toSorted(sortByFreshness);

export const listProviderDirectory = async (
  database: Database,
  input: z.infer<typeof providerDirectoryListInputSchema>
) => {
  const candidates = await loadLatestProviderDirectoryCandidates(database);
  return {
    providers: sortDirectoryCandidates(candidates)
      .slice(0, input.limit)
      .map(toProviderDirectoryEntry),
  };
};

const providerDirectoryRateLimitKey = (ipAddress?: string): string =>
  createHash("sha256")
    .update(ipAddress?.trim() || "unknown")
    .digest("hex");

export const assertProviderDirectorySearchAllowed = (
  ipAddress: string | undefined,
  now = Date.now()
): void => {
  const key = providerDirectoryRateLimitKey(ipAddress);
  const existing = searchRateLimitBuckets.get(key);
  if (
    !existing ||
    now - existing.windowStartedAt >= SEARCH_RATE_LIMIT_WINDOW_MS
  ) {
    searchRateLimitBuckets.set(key, { count: 1, windowStartedAt: now });
    return;
  }

  if (existing.count >= PROVIDER_DIRECTORY_SEARCHES_PER_MINUTE) {
    throw new ORPCError("TOO_MANY_REQUESTS", {
      message: "Bạn đã tìm kiếm quá nhiều lần. Vui lòng thử lại sau một phút.",
    });
  }

  existing.count += 1;
};

export const resetProviderDirectoryRateLimitForTests = (): void => {
  searchRateLimitBuckets.clear();
};

export const searchProviderDirectory = async (
  database: Database,
  query: string,
  ipAddress?: string
) => {
  assertProviderDirectorySearchAllowed(ipAddress);
  const candidates = await loadLatestProviderDirectoryCandidates(database);
  return {
    providers: rankProviderDirectoryCandidates(
      candidates,
      query,
      PROVIDER_DIRECTORY_MAX_LIMIT
    ).map(toProviderDirectoryEntry),
  };
};
