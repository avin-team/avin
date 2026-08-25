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
    candidate.version.officialChannels.zaloSecondary,
    candidate.version.officialChannels.facebookUrl,
    candidate.version.officialChannels.facebookSecondaryUrl,
    candidate.version.officialChannels.bioShopUrl,
    candidate.version.officialChannels.telegramCommunityUrl,
    candidate.version.officialChannels.tiktokUrl,
    candidate.version.officialChannels.youtubeUrl,
    candidate.version.officialChannels.websiteUrl,
    ...(candidate.version.officialChannels.zalos ?? []).flatMap((item) => [
      item.phone,
    ]),
    ...(candidate.version.officialChannels.additionalZalos ?? []),
    ...(candidate.version.officialChannels.facebooks ?? []).flatMap((fb) => [
      fb.url,
    ]),
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
  return (
    left.profile.profileSlug.localeCompare(
      right.profile.profileSlug,
      "vi-VN"
    ) || left.profile.id.localeCompare(right.profile.id)
  );
};

export const rankProviderDirectoryCandidates = (
  candidates: ProviderDirectoryCandidate[],
  query: string,
  limit: number
): ProviderDirectoryCandidate[] =>
  candidates
    .map((candidate) => ({
      candidate,
      score: getProviderDirectoryMatchScore(candidate, query),
    }))
    .filter(
      (
        entry
      ): entry is {
        candidate: ProviderDirectoryCandidate;
        score: number;
      } => entry.score !== null
    )
    .toSorted((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) {
        return scoreDifference;
      }
      return sortByFreshness(left.candidate, right.candidate);
    })
    .slice(0, limit)
    .map(({ candidate }) => candidate);

export const toProviderDirectoryEntry = (
  candidate: ProviderDirectoryCandidate
) => ({
  bio: candidate.version.bio ?? candidate.profile.bio,
  displayName: candidate.version.displayName,
  id: candidate.profile.id,
  location: candidate.version.location,
  officialChannels: {
    additionalZalos: candidate.version.officialChannels.additionalZalos,
    avatarUrl: candidate.version.officialChannels.avatarUrl,
    bioShopId: candidate.version.officialChannels.bioShopId,
    bioShopUrl: candidate.version.officialChannels.bioShopUrl,
    facebookId: candidate.version.officialChannels.facebookId,
    facebookSecondaryId: candidate.version.officialChannels.facebookSecondaryId,
    facebookSecondaryUrl:
      candidate.version.officialChannels.facebookSecondaryUrl,
    facebookUrl: candidate.version.officialChannels.facebookUrl,
    facebooks: candidate.version.officialChannels.facebooks,
    hotline: candidate.version.officialChannels.hotline,
    qrCodeUrl: candidate.version.officialChannels.qrCodeUrl,
    telegramCommunityUrl:
      candidate.version.officialChannels.telegramCommunityUrl,
    tiktokUrl: candidate.version.officialChannels.tiktokUrl,
    websiteUrl: candidate.version.officialChannels.websiteUrl,
    youtubeUrl: candidate.version.officialChannels.youtubeUrl,
    zalo: candidate.version.officialChannels.zalo,
    zaloSecondary: candidate.version.officialChannels.zaloSecondary,
    zalos: candidate.version.officialChannels.zalos,
  },
  profileSlug: candidate.profile.profileSlug,
  publicUrl: providerProfilePath(candidate.profile.profileSlug),
  publishedAt: candidate.version.publishedAt.toISOString(),
  recognizedBondAmount: candidate.version.recognizedBondAmount,
  recommendedTransactionLimit: candidate.version.recommendedTransactionLimit,
  services: candidate.version.services,
  source: candidate.version.source ?? candidate.profile.source,
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
