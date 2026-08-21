import {
  protectionProviderApplication,
  protectionProviderProfile,
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

type ApplicationRow = typeof protectionProviderApplication.$inferSelect;
type ProfileRow = typeof protectionProviderProfile.$inferSelect;
type Database = Parameters<typeof submitProviderApplication>[0];

interface ProviderApplicationState {
  application: ApplicationRow | null;
  profile: ProfileRow | null;
}

const validSubmission: ProviderApplicationSubmission = {
  ageEvidenceReference: "evidence/age/provider-1",
  fullName: "Nguyen Provider",
  identityEvidenceReference: "evidence/identity/provider-1",
  officialChannelEvidenceReference: "evidence/channels/provider-1",
  officialChannels: {
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

const createDatabase = (state: ProviderApplicationState): Database => {
  const select = vi.fn(() => {
    let table: unknown;
    const query = {
      from: vi.fn((nextTable: unknown) => {
        table = nextTable;
        return query;
      }),
      limit: vi.fn(() => {
        if (table === protectionProviderApplication) {
          return state.application ? [state.application] : [];
        }
        if (table === protectionProviderProfile) {
          return state.profile ? [state.profile] : [];
        }
        return [];
      }),
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
            applicationId: "application-1",
            createdAt: timestamp,
            displayName: String(values.displayName),
            id: "profile-1",
            officialChannels:
              values.officialChannels as ProfileRow["officialChannels"],
            profileSlug: String(values.profileSlug),
            providerUserId: String(values.providerUserId),
            publishedAt: timestamp,
            services: String(values.services),
            status: "ACTIVE",
            updatedAt: timestamp,
            verifiedAt: timestamp,
          };
          return [state.profile];
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
    expect(state.application?.status).toBe("APPROVED");
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
});
