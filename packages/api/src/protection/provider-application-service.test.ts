import {
  protectionProviderApplication,
  protectionProviderBondAccount,
  protectionProviderBondAdjustment,
  protectionProviderDepositIntent,
  protectionProviderProfile,
  protectionProviderProfileRevision,
  protectionProviderProfileVersion,
  protectionPolicyVersion,
} from "@avin/db/schema/protection";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_PROVIDER_POLICY_VERSION } from "./provider-application";
import type { ProviderApplicationSubmission } from "./provider-application";

vi.mock("../notifications/notification", () => ({
  createNotificationEvent: vi.fn(() => Promise.resolve()),
  listNotificationRecipientsByRole: vi
    .fn()
    .mockResolvedValue([
      { targetPath: "/avin-check/providers", userId: "admin-1" },
    ]),
}));

vi.mock("./pilot", () => ({
  assertProtectionPilotApprovalAllowed: vi.fn(() => Promise.resolve(null)),
  markProtectionPilotInvitationUsed: vi.fn(() => Promise.resolve()),
}));

const { createNotificationEvent } =
  await import("../notifications/notification");
const { decideProviderApplication, submitProviderApplication } =
  await import("./provider-application-service");
const {
  decideProviderProfileRevision,
  getPublicProviderProfile,
  publishProviderProfileStatus,
  saveProviderProfileRevisionDraft,
  startProviderProfileRevision,
  submitProviderProfileRevision,
} = await import("./provider-application-service");

type ApplicationRow = typeof protectionProviderApplication.$inferSelect;
type ProfileRow = typeof protectionProviderProfile.$inferSelect;
type ProfileRevisionRow = typeof protectionProviderProfileRevision.$inferSelect;
type ProfileVersionRow = typeof protectionProviderProfileVersion.$inferSelect;
type DepositIntentRow = typeof protectionProviderDepositIntent.$inferSelect;
type PolicyRow = typeof protectionPolicyVersion.$inferSelect;
type BondAccountRow = typeof protectionProviderBondAccount.$inferSelect;
type BondAdjustmentRow = typeof protectionProviderBondAdjustment.$inferSelect;
type Database = Parameters<typeof submitProviderApplication>[0];

interface ProviderApplicationState {
  application: ApplicationRow | null;
  bondAccounts: BondAccountRow[];
  bondAdjustments: BondAdjustmentRow[];
  depositIntents: DepositIntentRow[];
  policies: PolicyRow[];
  profile: ProfileRow | null;
  revisions: ProfileRevisionRow[];
  versions: ProfileVersionRow[];
}

const validSubmission: ProviderApplicationSubmission = {
  bondAmount: 5_000_000,
  citizenIdNumber: "123456789012",
  fullName: "Nguyen Provider",
  location: "Ho Chi Minh City",
  officialChannels: {
    facebookUrl: "https://facebook.com/provider-one",
    hotline: "0901234567",
    zalo: "0901234567",
  },
  policyAccepted: true,
  policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
  publicDataConsent: true,
  registeredBankAccounts: [
    {
      accountName: "NGUYEN PROVIDER",
      accountNumber: "123456789",
      bankCode: "VCB",
      isPrimary: true,
    },
  ],
  services: "Dịch vụ hỗ trợ tài khoản game và giao dịch Facebook.",
};

const timestamp = new Date("2026-08-21T00:00:00.000Z");
const { protectCitizenId } = await import("./provider-identity");
const protectedCitizenId = protectCitizenId(validSubmission.citizenIdNumber);

const createPolicy = (): PolicyRow => ({
  bronzeMinimumBondAmount: 5_000_000,
  createdAt: timestamp,
  diamondMinimumBondAmount: 50_000_000,
  effectiveAt: new Date("2026-01-01T00:00:00.000Z"),
  goldMinimumBondAmount: 20_000_000,
  id: "policy-1",
  materialChange: false,
  materialChangeMetadata: { changedAreas: [], rationale: "Test policy" },
  membershipFeeAmount: 0,
  minimumBondAmount: 1_000_000,
  publishedAt: timestamp,
  publishedByUserId: "admin-1",
  reacceptDeadlineAt: null,
  recommendedLimitPercentage: 80,
  recommendedLimitRounding: 100_000,
  retentionPolicyReference: "test-retention",
  silverMinimumBondAmount: 10_000_000,
  summary: "Test policy",
  terms: "Test terms",
  title: "Test policy",
  version: CURRENT_PROVIDER_POLICY_VERSION,
  vipMinimumBondAmount: 100_000_000,
});

const createDepositIntent = (
  overrides: Partial<DepositIntentRow> = {}
): DepositIntentRow => ({
  amount: validSubmission.bondAmount,
  applicationId: "application-1",
  createdAt: timestamp,
  expiresAt: new Date("2026-08-22T00:00:00.000Z"),
  id: "deposit-intent-1",
  kind: "APPLICATION",
  manualReason: null,
  matchedAmount: validSubmission.bondAmount,
  matchedAt: timestamp,
  matchedEventId: "sepay-event-1",
  matchedSourceEventIds: [],
  paymentCode: "AVPROVIDER123456",
  policyVersionId: "policy-1",
  profileId: null,
  providerUserId: "provider-1",
  refundBankReference: null,
  refundDestination: null,
  refundedAt: null,
  status: "MATCHED",
  updatedAt: timestamp,
  ...overrides,
});

const createBondAccount = (): BondAccountRow => ({
  createdAt: timestamp,
  id: "bond-account-1",
  providerProfileId: "profile-1",
  providerUserId: "provider-1",
  recognizedAmount: validSubmission.bondAmount,
  updatedAt: timestamp,
});

const createApplication = (
  status: ApplicationRow["status"] = "DRAFT",
  overrides: Partial<ApplicationRow> = {}
): ApplicationRow => ({
  bondAmount: validSubmission.bondAmount,
  citizenIdCiphertext: protectedCitizenId.citizenIdCiphertext,
  citizenIdHash: protectedCitizenId.citizenIdHash,
  citizenIdLast4: protectedCitizenId.citizenIdLast4,
  createdAt: timestamp,
  depositIntentId: "deposit-intent-1",
  fullName: validSubmission.fullName,
  id: "application-1",
  identityEvidenceReference: null,
  location: validSubmission.location,
  officialChannels: validSubmission.officialChannels,
  policyAcceptedAt: timestamp,
  policyVersion: validSubmission.policyVersion,
  policyVersionId: null,
  providerUserId: "provider-1",
  publicDataConsent: true,
  recognizedBondAmount: validSubmission.bondAmount,
  registeredBankAccounts: validSubmission.registeredBankAccounts,
  reviewReason: null,
  reviewedAt: null,
  reviewedByUserId: null,
  revisionCount: 0,
  services: validSubmission.services,
  status,
  submittedAt: null,
  updatedAt: timestamp,
  ...overrides,
});

const createProfile = (): ProfileRow => ({
  applicationId: "application-1",
  createdAt: timestamp,
  displayName: validSubmission.fullName,
  id: "profile-1",
  location: validSubmission.location,
  officialChannels: validSubmission.officialChannels,
  profileSlug: "nguyen-provider-provider1",
  providerUserId: "provider-1",
  publishedAt: timestamp,
  services: validSubmission.services,
  status: "ACTIVE",
  statusReason: null,
  updatedAt: timestamp,
  verifiedAt: timestamp,
});

const createProfileVersion = (
  versionNumber = 1,
  overrides: Partial<ProfileVersionRow> = {}
): ProfileVersionRow => ({
  createdAt: timestamp,
  displayName: validSubmission.fullName,
  id: `profile-version-${versionNumber}`,
  location: validSubmission.location,
  officialChannels: validSubmission.officialChannels,
  policyVersionId: overrides.policyVersionId ?? null,
  profileId: "profile-1",
  profileSlug: "nguyen-provider-provider1",
  publishedAt: timestamp,
  publishedByUserId: "admin-1",
  recognizedBondAmount: validSubmission.bondAmount,
  recommendedTransactionLimit: 0,
  registeredBankAccounts: validSubmission.registeredBankAccounts,
  services: validSubmission.services,
  sourceApplicationId: "application-1",
  status: "ACTIVE",
  statusReason: null,
  tier: "BRONZE",
  verifiedAt: timestamp,
  versionNumber,
  ...overrides,
});

const createProfileRevision = (
  status: ProfileRevisionRow["status"] = "DRAFT",
  overrides: Partial<ProfileRevisionRow> = {}
): ProfileRevisionRow => ({
  baseVersionId: "profile-version-1",
  citizenIdCiphertext: protectedCitizenId.citizenIdCiphertext,
  citizenIdHash: protectedCitizenId.citizenIdHash,
  citizenIdLast4: protectedCitizenId.citizenIdLast4,
  createdAt: timestamp,
  fullName: validSubmission.fullName,
  id: "profile-revision-1",
  identityEvidenceReference: null,
  location: validSubmission.location,
  officialChannels: validSubmission.officialChannels,
  policyAcceptedAt: timestamp,
  policyVersion: validSubmission.policyVersion,
  policyVersionId: overrides.policyVersionId ?? null,
  profileId: "profile-1",
  providerUserId: "provider-1",
  publicDataConsent: true,
  registeredBankAccounts: validSubmission.registeredBankAccounts,
  reviewReason: null,
  reviewedAt: null,
  reviewedByUserId: null,
  revisionNumber: 1,
  services: validSubmission.services,
  status,
  submittedAt: null,
  updatedAt: timestamp,
  ...overrides,
});

const createDatabase = (state: ProviderApplicationState): Database => {
  const select = vi.fn(() => {
    let table: unknown;
    const query = {
      execute: vi.fn(() => {
        if (table === protectionProviderBondAccount) {
          return state.bondAccounts;
        }
        if (table === protectionProviderBondAdjustment) {
          return state.bondAdjustments;
        }
        if (table === protectionProviderDepositIntent) {
          return state.depositIntents;
        }
        if (table === protectionPolicyVersion) {
          return state.policies;
        }
        if (table === protectionProviderProfileVersion) {
          return state.versions;
        }
        if (table === protectionProviderProfileRevision) {
          return state.revisions;
        }
        return [];
      }),
      for: vi.fn(() => query),
      from: vi.fn((nextTable: unknown) => {
        table = nextTable;
        return query;
      }),
      limit: vi.fn((requestedLimit = 1) => {
        if (table === protectionProviderApplication) {
          return state.application ? [state.application] : [];
        }
        if (table === protectionProviderProfile) {
          return state.profile ? [state.profile] : [];
        }
        if (table === protectionProviderProfileVersion) {
          const versions = state.versions.toSorted(
            (left, right) => right.versionNumber - left.versionNumber
          );
          return requestedLimit === 1 ? versions.slice(0, 1) : versions;
        }
        if (table === protectionProviderProfileRevision) {
          const revisions = state.revisions.toSorted(
            (left, right) => right.revisionNumber - left.revisionNumber
          );
          return requestedLimit === 1 ? revisions.slice(0, 1) : revisions;
        }
        if (table === protectionProviderDepositIntent) {
          return state.depositIntents.slice(0, requestedLimit);
        }
        if (table === protectionPolicyVersion) {
          return state.policies.slice(0, requestedLimit);
        }
        if (table === protectionProviderBondAccount) {
          return state.bondAccounts.slice(0, requestedLimit);
        }
        if (table === protectionProviderBondAdjustment) {
          return state.bondAdjustments.slice(0, requestedLimit);
        }
        return [];
      }),
      orderBy: vi.fn(() => query),
      where: vi.fn(() => query),
    };
    return query;
  });

  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((values: Record<string, unknown>) => ({
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn(() => {
          if (table === protectionProviderBondAccount) {
            const account = createBondAccount();
            state.bondAccounts.push(account);
            return [account];
          }
          return [];
        }),
      })),
      returning: vi.fn(() => {
        if (table === protectionProviderApplication) {
          state.application = {
            ...createApplication(),
            ...values,
            id: "application-1",
          } as ApplicationRow;
          return [state.application];
        }
        if (table === protectionProviderProfile) {
          state.profile = {
            ...createProfile(),
            displayName: String(values.displayName),
            officialChannels:
              values.officialChannels as ProfileRow["officialChannels"],
            profileSlug: String(values.profileSlug),
            providerUserId: String(values.providerUserId),
            services: String(values.services),
            statusReason: null,
          };
          return [state.profile];
        }
        if (table === protectionProviderProfileVersion) {
          const version = createProfileVersion(
            Number(values.versionNumber),
            values as Partial<ProfileVersionRow>
          );
          state.versions.push(version);
          return [version];
        }
        if (table === protectionProviderProfileRevision) {
          const revision = createProfileRevision(
            String(values.status ?? "DRAFT") as ProfileRevisionRow["status"],
            {
              ...values,
              id: `profile-revision-${state.revisions.length + 1}`,
            } as Partial<ProfileRevisionRow>
          );
          state.revisions.push(revision);
          return [revision];
        }
        if (table === protectionProviderBondAccount) {
          const account = {
            ...createBondAccount(),
            ...values,
            id: "bond-account-1",
          } as BondAccountRow;
          state.bondAccounts.push(account);
          return [account];
        }
        if (table === protectionProviderBondAdjustment) {
          const adjustment = {
            ...values,
            createdAt: timestamp,
            id: `bond-adjustment-${state.bondAdjustments.length + 1}`,
            recordedAt: timestamp,
            updatedAt: timestamp,
          } as BondAdjustmentRow;
          state.bondAdjustments.push(adjustment);
          return [];
        }
        return [];
      }),
    })),
  }));

  const update = vi.fn((table: unknown) => ({
    set: vi.fn((values: Record<string, unknown>) => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => {
          if (table === protectionProviderApplication && state.application) {
            state.application = {
              ...state.application,
              ...values,
            } as ApplicationRow;
            return [state.application];
          }
          if (table === protectionProviderProfile && state.profile) {
            state.profile = {
              ...state.profile,
              ...values,
            } as ProfileRow;
            return [state.profile];
          }
          if (table === protectionProviderProfileRevision) {
            const [revision] = state.revisions;
            if (revision) {
              state.revisions[0] = {
                ...revision,
                ...values,
              } as ProfileRevisionRow;
              return [state.revisions[0]];
            }
          }
          if (table === protectionProviderDepositIntent) {
            const [intent] = state.depositIntents;
            if (intent) {
              state.depositIntents[0] = {
                ...intent,
                ...values,
              } as DepositIntentRow;
              return [state.depositIntents[0]];
            }
          }
          if (table === protectionProviderBondAccount) {
            const [account] = state.bondAccounts;
            if (account) {
              state.bondAccounts[0] = {
                ...account,
                ...values,
              } as BondAccountRow;
              return [state.bondAccounts[0]];
            }
          }
          return [];
        }),
      })),
    })),
  }));

  const databaseImplementation = {
    insert,
    select,
    transaction: <Result>(
      callback: (transaction: Database) => Promise<Result>
    ): Promise<Result> =>
      callback(databaseImplementation as unknown as Database),
    update,
  };

  return databaseImplementation as unknown as Database;
};

describe("Provider application review workflow", () => {
  beforeEach(() => {
    vi.mocked(createNotificationEvent).mockClear();
  });

  it("covers submit, changes request, resubmit, and approval publication", async () => {
    const state: ProviderApplicationState = {
      application: createApplication(),
      bondAccounts: [],
      bondAdjustments: [],
      depositIntents: [createDepositIntent()],
      policies: [createPolicy()],
      profile: null,
      revisions: [],
      versions: [],
    };
    const database = createDatabase(state);

    await submitProviderApplication(database, "provider-1", validSubmission);
    expect(state.application?.status).toBe("PENDING_REVIEW");
    expect(createNotificationEvent).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "protection_provider_application.submitted",
      })
    );

    await decideProviderApplication({
      applicationId: "application-1",
      database,
      decision: "CHANGES_REQUESTED",
      reason: "Cần bổ sung bằng chứng vận hành.",
      reviewerUserId: "admin-1",
    });
    expect(state.application).toMatchObject({
      reviewReason: "Cần bổ sung bằng chứng vận hành.",
      status: "CHANGES_REQUESTED",
    });

    await submitProviderApplication(database, "provider-1", validSubmission);
    expect(state.application).toMatchObject({
      revisionCount: 1,
      status: "PENDING_REVIEW",
    });

    const approved = await decideProviderApplication({
      applicationId: "application-1",
      database,
      decision: "APPROVED",
      reviewerUserId: "admin-1",
    });
    expect(approved.publicProfile).toMatchObject({
      profileSlug: "nguyen-provider-provider1",
      publicUrl: "/avin-check/provider/nguyen-provider-provider1",
      status: "ACTIVE",
    });
    expect(approved.publicProfile).not.toHaveProperty("paymentAccount");
    expect(approved.publicProfile?.officialChannels).toHaveProperty(
      "facebookUrl",
      "https://facebook.com/provider-one"
    );
    expect(approved.publicProfile).toMatchObject({
      location: "Ho Chi Minh City",
      recognizedBondAmount: 5_000_000,
      tier: "BRONZE",
    });
    expect(state.application?.status).toBe("APPROVED");
    expect(state.versions).toHaveLength(1);
    expect(createNotificationEvent).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "protection_provider_application.approved",
      })
    );
  });

  it("rejects a pending application with an explicit reason", async () => {
    const state: ProviderApplicationState = {
      application: createApplication("PENDING_REVIEW"),
      bondAccounts: [],
      bondAdjustments: [],
      depositIntents: [createDepositIntent()],
      policies: [createPolicy()],
      profile: null,
      revisions: [],
      versions: [],
    };
    const database = createDatabase(state);

    await decideProviderApplication({
      applicationId: "application-1",
      database,
      decision: "REJECTED",
      reason: "Không thể đối chiếu danh tính.",
      reviewerUserId: "admin-1",
    });

    expect(state.application).toMatchObject({
      reviewReason: "Không thể đối chiếu danh tính.",
      status: "REJECTED",
    });
    expect(createNotificationEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "protection_provider_application.rejected",
      })
    );
  });

  it("approves a pending application without optional evidence references", async () => {
    const state: ProviderApplicationState = {
      application: createApplication("PENDING_REVIEW", {
        identityEvidenceReference: null,
      }),
      bondAccounts: [],
      bondAdjustments: [],
      depositIntents: [createDepositIntent()],
      policies: [createPolicy()],
      profile: null,
      revisions: [],
      versions: [],
    };

    const approved = await decideProviderApplication({
      applicationId: "application-1",
      database: createDatabase(state),
      decision: "APPROVED",
      reviewerUserId: "admin-1",
    });

    expect(approved.application.status).toBe("APPROVED");
    expect(approved.publicProfile).toMatchObject({ status: "ACTIVE" });
  });

  it("keeps pending revisions private and publishes immutable history", async () => {
    const state: ProviderApplicationState = {
      application: createApplication("APPROVED"),
      bondAccounts: [createBondAccount()],
      bondAdjustments: [],
      depositIntents: [createDepositIntent()],
      policies: [createPolicy()],
      profile: createProfile(),
      revisions: [],
      versions: [createProfileVersion()],
    };
    const database = createDatabase(state);

    const started = await startProviderProfileRevision(database, "provider-1");
    expect(started).toMatchObject({
      baseVersionId: "profile-version-1",
      revisionNumber: 1,
      status: "DRAFT",
    });

    await saveProviderProfileRevisionDraft(
      database,
      "provider-1",
      validSubmission
    );
    await submitProviderProfileRevision(
      database,
      "provider-1",
      validSubmission
    );

    const pendingProfile = await getPublicProviderProfile(
      database,
      "nguyen-provider-provider1"
    );
    expect(pendingProfile).toMatchObject({
      displayName: "Nguyen Provider",
      status: "ACTIVE",
      versionNumber: 1,
    });
    expect(pendingProfile).not.toHaveProperty("fullName");
    expect(state.revisions[0]?.status).toBe("PENDING_REVIEW");

    const approved = await decideProviderProfileRevision({
      database,
      decision: "APPROVED",
      reviewerUserId: "admin-1",
      revisionId: "profile-revision-1",
    });
    expect(approved.publicProfile).toMatchObject({
      profileSlug: "nguyen-provider-provider1",
      versionNumber: 2,
    });
    expect(state.versions).toHaveLength(2);
    expect(state.versions[0]).toMatchObject({
      displayName: "Nguyen Provider",
      versionNumber: 1,
    });

    await expect(
      decideProviderProfileRevision({
        database,
        decision: "APPROVED",
        reviewerUserId: "admin-1",
        revisionId: "profile-revision-1",
      })
    ).rejects.toThrow("Only pending Provider profile revisions can be decided");

    const withdrawn = await publishProviderProfileStatus({
      database,
      profileId: "profile-1",
      reviewerUserId: "admin-1",
      status: "WITHDRAWN",
      statusReason: "Provider yêu cầu rút khỏi chương trình.",
    });
    expect(withdrawn).toMatchObject({
      profileSlug: "nguyen-provider-provider1",
      status: "WITHDRAWN",
      statusReason: "Provider yêu cầu rút khỏi chương trình.",
      versionNumber: 3,
    });
    expect(withdrawn.history).toEqual([
      expect.objectContaining({ status: "ACTIVE", versionNumber: 1 }),
      expect.objectContaining({ status: "ACTIVE", versionNumber: 2 }),
      expect.objectContaining({
        status: "WITHDRAWN",
        statusReason: "Provider yêu cầu rút khỏi chương trình.",
        versionNumber: 3,
      }),
    ]);
  });
});
