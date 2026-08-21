import {
  protectionProviderApplication,
  protectionProviderProfile,
  protectionProviderProfileRevision,
  protectionProviderProfileVersion,
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
type Database = Parameters<typeof submitProviderApplication>[0];

interface ProviderApplicationState {
  application: ApplicationRow | null;
  profile: ProfileRow | null;
  revisions: ProfileRevisionRow[];
  versions: ProfileVersionRow[];
}

const validSubmission: ProviderApplicationSubmission = {
  ageEvidenceReference: "evidence/age/provider-1",
  fullName: "Nguyen Provider",
  identityEvidenceReference: "evidence/identity/provider-1",
  officialChannelEvidenceReference: "evidence/channels/provider-1",
  officialChannels: {
    facebookId: "facebook-123",
    facebookUrl: "https://facebook.com/provider-one",
  },
  operatingHistoryEvidenceReference: "evidence/operating/provider-1",
  operatingSince: "2024-01-01",
  paymentAccount: {
    accountName: "NGUYEN PROVIDER",
    accountNumber: "123456789",
    accountType: "BANK",
    institution: "Avin Bank",
  },
  paymentDisclosureConsent: false,
  paymentEvidenceReference: "evidence/payment/provider-1",
  policyAccepted: true,
  policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
  services: "Dịch vụ hỗ trợ tài khoản game và giao dịch Facebook.",
};

const timestamp = new Date("2026-08-21T00:00:00.000Z");

const createApplication = (
  status: ApplicationRow["status"] = "DRAFT"
): ApplicationRow => ({
  ageEvidenceReference: validSubmission.ageEvidenceReference,
  createdAt: timestamp,
  fullName: validSubmission.fullName,
  id: "application-1",
  identityEvidenceReference: validSubmission.identityEvidenceReference,
  officialChannelEvidenceReference:
    validSubmission.officialChannelEvidenceReference,
  officialChannels: validSubmission.officialChannels,
  operatingHistoryEvidenceReference:
    validSubmission.operatingHistoryEvidenceReference,
  operatingSince: validSubmission.operatingSince,
  paymentAccount: validSubmission.paymentAccount,
  paymentDisclosureConsent: validSubmission.paymentDisclosureConsent,
  paymentEvidenceReference: validSubmission.paymentEvidenceReference,
  policyAcceptedAt: timestamp,
  policyVersion: validSubmission.policyVersion,
  providerUserId: "provider-1",
  reviewReason: null,
  reviewedAt: null,
  reviewedByUserId: null,
  revisionCount: 0,
  services: validSubmission.services,
  status,
  submittedAt: null,
  updatedAt: timestamp,
});

const createProfile = (): ProfileRow => ({
  applicationId: "application-1",
  createdAt: timestamp,
  displayName: validSubmission.fullName,
  id: "profile-1",
  officialChannels: validSubmission.officialChannels,
  profileSlug: "nguyen-provider-provider1",
  providerUserId: "provider-1",
  publishedAt: timestamp,
  services: validSubmission.services,
  status: "ACTIVE",
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
  officialChannels: validSubmission.officialChannels,
  paymentAccount: validSubmission.paymentAccount,
  profileId: "profile-1",
  profileSlug: "nguyen-provider-provider1",
  publishedAt: timestamp,
  publishedByUserId: "admin-1",
  services: validSubmission.services,
  sourceApplicationId: "application-1",
  status: "ACTIVE",
  statusReason: null,
  verifiedAt: timestamp,
  versionNumber,
  ...overrides,
});

const createProfileRevision = (
  status: ProfileRevisionRow["status"] = "DRAFT",
  overrides: Partial<ProfileRevisionRow> = {}
): ProfileRevisionRow => ({
  ageEvidenceReference: validSubmission.ageEvidenceReference,
  baseVersionId: "profile-version-1",
  createdAt: timestamp,
  fullName: validSubmission.fullName,
  id: "profile-revision-1",
  identityEvidenceReference: validSubmission.identityEvidenceReference,
  officialChannelEvidenceReference:
    validSubmission.officialChannelEvidenceReference,
  officialChannels: validSubmission.officialChannels,
  operatingHistoryEvidenceReference:
    validSubmission.operatingHistoryEvidenceReference,
  operatingSince: validSubmission.operatingSince,
  paymentAccount: validSubmission.paymentAccount,
  paymentDisclosureConsent: validSubmission.paymentDisclosureConsent,
  paymentEvidenceReference: validSubmission.paymentEvidenceReference,
  policyAcceptedAt: timestamp,
  policyVersion: validSubmission.policyVersion,
  profileId: "profile-1",
  providerUserId: "provider-1",
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
        if (table === protectionProviderProfileVersion) {
          return state.versions;
        }
        if (table === protectionProviderProfileRevision) {
          return state.revisions;
        }
        return [];
      }),
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
        return [];
      }),
      orderBy: vi.fn(() => query),
      where: vi.fn(() => query),
    };
    return query;
  });

  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((values: Record<string, unknown>) => ({
      onConflictDoNothing: vi.fn(() => Promise.resolve()),
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
      application: null,
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
    expect(approved.publicProfile?.officialChannels).not.toHaveProperty(
      "facebookId"
    );
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

  it("keeps pending revisions private and publishes immutable history", async () => {
    const state: ProviderApplicationState = {
      application: createApplication("APPROVED"),
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
