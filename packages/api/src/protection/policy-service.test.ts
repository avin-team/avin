import {
  protectionPolicyVersion,
  protectionProviderApplication,
  protectionProviderPolicyAcceptance,
  protectionProviderProfile,
} from "@avin/db/schema/protection";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createNotificationEvent: vi.fn(() => Promise.resolve()),
  publishProviderProfileStatusInTransaction: vi.fn(() =>
    Promise.resolve({ profile: null, profileVersion: null })
  ),
}));

vi.mock("../notifications/notification", () => ({
  createNotificationEvent: mocks.createNotificationEvent,
}));

vi.mock("./provider-application-service", () => ({
  publishProviderProfileStatusInTransaction:
    mocks.publishProviderProfileStatusInTransaction,
}));

const { enforceProtectionPolicyDeadlines } = await import("./policy-service");

type PolicyRow = typeof protectionPolicyVersion.$inferSelect;
type ApplicationRow = typeof protectionProviderApplication.$inferSelect;
type ProfileRow = typeof protectionProviderProfile.$inferSelect;
type Database = Parameters<
  typeof enforceProtectionPolicyDeadlines
>[0]["database"];

const now = new Date("2026-10-02T00:00:00.000Z");
const policyId = "00000000-0000-4000-8000-000000000001";
const profileId = "00000000-0000-4000-8000-000000000002";

const policy = {
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
  effectiveAt: new Date("2026-09-01T00:00:00.000Z"),
  id: policyId,
  materialChange: true,
  materialChangeMetadata: {
    changedAreas: ["support eligibility"],
    rationale: "Clarify the support eligibility process.",
  },
  membershipFeeAmount: 3_000_000,
  minimumBondAmount: 30_000_000,
  publishedAt: new Date("2026-09-01T00:00:00.000Z"),
  publishedByUserId: "admin-1",
  reacceptDeadlineAt: new Date("2026-10-01T00:00:00.000Z"),
  retentionPolicyReference: "LEGAL_DATA_GOVERNANCE_APPROVAL_REQUIRED",
  summary: "A versioned Provider policy.",
  terms: "Provider terms.",
  title: "Protection Program Policy",
  version: "v2.0",
} as PolicyRow;

const profile = {
  applicationId: "application-1",
  createdAt: now,
  displayName: "Provider One",
  id: profileId,
  officialChannels: {},
  profileSlug: "provider-one",
  providerUserId: "provider-1",
  publishedAt: now,
  services: "Game account support",
  status: "ACTIVE",
  updatedAt: now,
  verifiedAt: now,
} as ProfileRow;

const application = {
  id: "application-1",
  policyAcceptedAt: null,
  policyVersion: null,
  providerUserId: profile.providerUserId,
} as unknown as ApplicationRow;

const createDatabase = (): Database => {
  const select = vi.fn(() => {
    let table: unknown;
    const resolve = (): unknown[] => {
      if (table === protectionPolicyVersion) {
        return [policy];
      }
      if (table === protectionProviderProfile) {
        return [profile];
      }
      if (table === protectionProviderApplication) {
        return [application];
      }
      if (table === protectionProviderPolicyAcceptance) {
        return [];
      }
      return [];
    };
    const query = {
      execute: () => Promise.resolve(resolve()),
      for: () => query,
      from: (nextTable: unknown) => {
        table = nextTable;
        return query;
      },
      limit: () => Promise.resolve(resolve()),
      orderBy: () => query,
      where: () => query,
    };
    return query as unknown as Database;
  });

  const database = {
    select,
    transaction: <Result>(
      callback: (transaction: Database) => Promise<Result>
    ): Promise<Result> => callback(database as unknown as Database),
  };
  return database as unknown as Database;
};

describe("Protection policy enforcement", () => {
  beforeEach(() => {
    mocks.createNotificationEvent.mockClear();
    mocks.publishProviderProfileStatusInTransaction.mockClear();
  });

  it("suspends a Provider after a missed material-policy deadline without deleting the profile", async () => {
    const result = await enforceProtectionPolicyDeadlines({
      database: createDatabase(),
      now,
    });

    expect(result).toEqual({
      notifiedProfileIds: [],
      suspendedProfileIds: [profileId],
    });
    expect(
      mocks.publishProviderProfileStatusInTransaction
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId,
        status: "SUSPENDED_PENDING_REVIEW",
      })
    );
    expect(mocks.createNotificationEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "protection_provider_policy.suspended",
      })
    );
  });
});
