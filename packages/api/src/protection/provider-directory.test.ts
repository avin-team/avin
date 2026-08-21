import { afterEach, describe, expect, it } from "vitest";

import type { ProviderDirectoryCandidate } from "./provider-directory";
import {
  assertProviderDirectorySearchAllowed,
  getProviderDirectoryMatchScore,
  listProviderDirectory,
  PROVIDER_DIRECTORY_SEARCHES_PER_MINUTE,
  rankProviderDirectoryCandidates,
  resetProviderDirectoryRateLimitForTests,
  searchProviderDirectory,
  toProviderDirectoryEntry,
} from "./provider-directory";

const publishedAt = new Date("2026-01-01T00:00:00.000Z");

const createCandidate = (
  overrides: Partial<ProviderDirectoryCandidate["version"]> = {},
  profileOverrides: Partial<ProviderDirectoryCandidate["profile"]> = {}
): ProviderDirectoryCandidate => ({
  profile: {
    id: "profile-1",
    profileSlug: "provider-one",
    ...profileOverrides,
  } as ProviderDirectoryCandidate["profile"],
  version: {
    displayName: "Provider One",
    id: "version-1",
    officialChannels: {
      facebookId: "facebook-123",
      facebookUrl: "https://facebook.com/provider-one",
      websiteUrl: "https://provider.example",
      zalo: "0901234567",
    },
    paymentAccount: {
      accountName: "PROVIDER ONE",
      accountNumber: "123456789",
      accountType: "BANK",
      institution: "Avin Bank",
    },
    profileId: "profile-1",
    profileSlug: "provider-one",
    publishedAt,
    services: "Thiết kế nhận diện thương hiệu",
    status: "ACTIVE",
    verifiedAt: publishedAt,
    versionNumber: 1,
    ...overrides,
  } as ProviderDirectoryCandidate["version"],
});

const createDirectoryDatabase = (
  rows: {
    profile: ProviderDirectoryCandidate["profile"];
    version: ProviderDirectoryCandidate["version"];
  }[]
): Parameters<typeof listProviderDirectory>[0] =>
  ({
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          orderBy: () => Promise.resolve(rows),
        }),
      }),
    }),
  }) as unknown as Parameters<typeof listProviderDirectory>[0];

describe("provider directory matching", () => {
  afterEach(() => {
    resetProviderDirectoryRateLimitForTests();
  });

  it.each([
    "Provider One",
    "https://facebook.com/provider-one",
    "facebook-123",
    "0901234567",
    "123456789",
  ])("supports exact identity lookup for %s", (query) => {
    const candidate = createCandidate();

    expect(getProviderDirectoryMatchScore(candidate, query)).toBe(2);
    expect(
      rankProviderDirectoryCandidates([candidate], query, 50)
    ).toHaveLength(1);
  });

  it("does not fuzzy-match a payment account near miss", () => {
    const candidate = createCandidate();

    expect(getProviderDirectoryMatchScore(candidate, "123456788")).toBeNull();
    expect(
      rankProviderDirectoryCandidates([candidate], "123456788", 50)
    ).toEqual([]);
  });

  it("matches approved service text after exact identity matches", () => {
    const exactIdentity = createCandidate(
      { publishedAt: new Date("2025-01-01T00:00:00.000Z") },
      { id: "profile-exact", profileSlug: "provider-exact" }
    );
    const serviceMatch = createCandidate(
      {
        displayName: "Another Provider",
        officialChannels: {},
        paymentAccount: null,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
        services: "Thiết kế nhận diện thương hiệu và bao bì",
      },
      { id: "profile-service", profileSlug: "provider-service" }
    );

    expect(
      rankProviderDirectoryCandidates(
        [serviceMatch, exactIdentity],
        "Provider One",
        50
      ).map(({ profile }) => profile.id)
    ).toEqual(["profile-exact"]);
    expect(
      rankProviderDirectoryCandidates(
        [serviceMatch, exactIdentity],
        "bao bì",
        50
      ).map(({ profile }) => profile.id)
    ).toEqual(["profile-service"]);
  });

  it("returns only the public projection", () => {
    const entry = toProviderDirectoryEntry(createCandidate());

    expect(entry).not.toHaveProperty("paymentAccount");
    expect(entry.officialChannels).not.toHaveProperty("facebookId");
    expect(entry).not.toHaveProperty("query");
    expect(entry.publicUrl).toBe("/avin-check/provider/provider-one");
  });

  it("uses the latest version and only exposes active profiles", async () => {
    const withdrawnLatest = createCandidate(
      {
        id: "version-2",
        status: "WITHDRAWN",
        versionNumber: 2,
      },
      { id: "profile-withdrawn", profileSlug: "provider-withdrawn" }
    );
    const withdrawnOlder = createCandidate(
      {
        id: "version-1",
        versionNumber: 1,
      },
      { id: "profile-withdrawn", profileSlug: "provider-withdrawn" }
    );
    const active = createCandidate(
      {},
      { id: "profile-active", profileSlug: "provider-active" }
    );
    const database = createDirectoryDatabase([
      withdrawnLatest,
      withdrawnOlder,
      active,
    ]);

    const listed = await listProviderDirectory(database, { limit: 50 });
    expect(listed.providers.map(({ profileSlug }) => profileSlug)).toEqual([
      "provider-active",
    ]);

    const searched = await searchProviderDirectory(
      database,
      "123456789",
      "203.0.113.12"
    );
    expect(searched.providers).toHaveLength(1);
    expect(searched.providers[0]).not.toHaveProperty("paymentAccount");
  });
});

describe("provider directory search rate limit", () => {
  afterEach(() => {
    resetProviderDirectoryRateLimitForTests();
  });

  it("limits a client to the configured searches per minute", () => {
    for (const attempt of Array.from(
      { length: PROVIDER_DIRECTORY_SEARCHES_PER_MINUTE },
      (_, index) => index
    )) {
      assertProviderDirectorySearchAllowed("203.0.113.10", 1000 + attempt);
    }

    expect(() =>
      assertProviderDirectorySearchAllowed("203.0.113.10", 2000)
    ).toThrow(/quá nhiều lần/iu);
  });

  it("opens a new window without retaining the old attempt count", () => {
    for (const attempt of Array.from(
      { length: PROVIDER_DIRECTORY_SEARCHES_PER_MINUTE },
      (_, index) => index
    )) {
      assertProviderDirectorySearchAllowed("203.0.113.11", 1000 + attempt);
    }

    expect(() =>
      assertProviderDirectorySearchAllowed("203.0.113.11", 61_001)
    ).not.toThrow();
  });
});
