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
    location: "Ho Chi Minh City",
    profileSlug: "provider-one",
    ...profileOverrides,
  } as ProviderDirectoryCandidate["profile"],
  version: {
    displayName: "Provider One",
    id: "version-1",
    location: "Ho Chi Minh City",
    officialChannels: {
      facebookId: "facebook-123",
      facebookUrl: "https://facebook.com/provider-one",
      hotline: "0901234567",
      websiteUrl: "https://provider.example",
      zalo: "0901234567",
    },
    profileId: "profile-1",
    profileSlug: "provider-one",
    publishedAt,
    recognizedBondAmount: 5_000_000,
    registeredBankAccounts: [
      {
        accountName: "PROVIDER ONE",
        accountNumber: "123456789",
        bankCode: "VCB",
        isPrimary: true,
      },
    ],
    services: "Thiết kế nhận diện thương hiệu",
    status: "ACTIVE",
    tier: "BRONZE",
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
    ["Provider One", 5],
    ["Provider", 3],
    ["One", 2],
  ])("matches partner name %s", (query, expectedScore) => {
    const candidate = createCandidate();

    expect(getProviderDirectoryMatchScore(candidate, query)).toBe(
      expectedScore
    );
    expect(
      rankProviderDirectoryCandidates([candidate], query, 50)
    ).toHaveLength(1);
  });

  it.each([
    ["https://facebook.com/provider-one", 5],
    ["0901234567", 5],
    ["123456789", 5],
    ["nhận diện thương hiệu", 2],
  ])("searches the public field %s", (query, expectedScore) => {
    const candidate = createCandidate();

    expect(getProviderDirectoryMatchScore(candidate, query)).toBe(
      expectedScore
    );
    expect(
      rankProviderDirectoryCandidates([candidate], query, 50)
    ).toHaveLength(1);
  });

  it("does not search Facebook IDs or CCCD", () => {
    const candidate = createCandidate();

    for (const query of ["facebook-123", "123456789012"]) {
      expect(getProviderDirectoryMatchScore(candidate, query)).toBeNull();
      expect(rankProviderDirectoryCandidates([candidate], query, 50)).toEqual(
        []
      );
    }
  });

  it("ranks exact names before prefix and partial matches", () => {
    const exactMatch = createCandidate(
      {
        publishedAt: new Date("2025-01-01T00:00:00.000Z"),
        registeredBankAccounts: [],
      },
      { id: "profile-exact", profileSlug: "provider-exact" }
    );
    const prefixMatch = createCandidate(
      {
        displayName: "Provider One Studio",
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
        registeredBankAccounts: [],
      },
      { id: "profile-prefix", profileSlug: "provider-prefix" }
    );
    const partialMatch = createCandidate(
      { displayName: "The Provider One Agency", registeredBankAccounts: [] },
      { id: "profile-partial", profileSlug: "provider-partial" }
    );

    expect(
      rankProviderDirectoryCandidates(
        [partialMatch, prefixMatch, exactMatch],
        "Provider One",
        50
      ).map(({ profile }) => profile.id)
    ).toEqual(["profile-exact", "profile-prefix", "profile-partial"]);
  });

  it("returns only the public projection", () => {
    const entry = toProviderDirectoryEntry(createCandidate());

    expect(entry).not.toHaveProperty("paymentAccount");
    expect(entry).not.toHaveProperty("citizenIdCiphertext");
    expect(entry.officialChannels).toHaveProperty("facebookId", "facebook-123");
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
      "Provider",
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
