import { createHash } from "node:crypto";

import {
  protectionProviderProfile,
  protectionProviderProfileVersion,
} from "@avin/db/schema/protection";
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

const normalizeProviderDirectorySearch = (value: string): string =>
  value.normalize("NFKC").trim().toLocaleLowerCase("vi-VN");

const getProviderDirectoryExactValues = (
  candidate: ProviderDirectoryCandidate
): string[] => [
  candidate.version.displayName,
  candidate.version.officialChannels.facebookId ?? "",
  candidate.version.officialChannels.facebookUrl ?? "",
  candidate.version.officialChannels.zalo ?? "",
  candidate.version.paymentAccount?.accountNumber ?? "",
];

export const getProviderDirectoryMatchScore = (
  candidate: ProviderDirectoryCandidate,
  query: string
): number | null => {
  const normalizedQuery = normalizeProviderDirectorySearch(query);
  if (!normalizedQuery) {
    return null;
  }

  const hasExactIdentityMatch = getProviderDirectoryExactValues(candidate).some(
    (value) =>
      value.length > 0 &&
      normalizeProviderDirectorySearch(value) === normalizedQuery
  );
  if (hasExactIdentityMatch) {
    return 2;
  }

  const normalizedServices = normalizeProviderDirectorySearch(
    candidate.version.services
  );
  return normalizedServices.includes(normalizedQuery) ? 1 : null;
};

const sortByFreshness = (
  left: ProviderDirectoryCandidate,
  right: ProviderDirectoryCandidate
): number => {
  const freshnessDifference =
    right.version.publishedAt.getTime() - left.version.publishedAt.getTime();
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
  officialChannels: {
    facebookUrl: candidate.version.officialChannels.facebookUrl,
    websiteUrl: candidate.version.officialChannels.websiteUrl,
    zalo: candidate.version.officialChannels.zalo,
  },
  profileSlug: candidate.profile.profileSlug,
  publicUrl: providerProfilePath(candidate.profile.profileSlug),
  publishedAt: candidate.version.publishedAt.toISOString(),
  services: candidate.version.services,
  status: candidate.version.status,
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
