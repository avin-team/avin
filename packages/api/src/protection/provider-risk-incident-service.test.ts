import {
  protectionProviderProfile,
  protectionProviderProfileVersion,
  protectionProviderRiskIncident,
  protectionProviderRiskIncidentEvidence,
  protectionProviderRiskIncidentHistory,
  protectionRiskReport,
} from "@avin/db/schema/protection";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createNotificationEvent: vi.fn(() => Promise.resolve()),
  publishProviderProfileStatusInTransaction: vi.fn(() => Promise.resolve()),
}));

vi.mock("../notifications/notification", () => ({
  createNotificationEvent: mocks.createNotificationEvent,
}));

vi.mock("./provider-application-service", () => ({
  publishProviderProfileStatusInTransaction:
    mocks.publishProviderProfileStatusInTransaction,
}));

const {
  confirmProviderRiskIncidentFraud,
  expireProviderRiskIncidentResponses,
  getProviderRiskIncidentForProvider,
  linkRiskReportToProvider,
  submitProviderRiskIncidentResponse,
} = await import("./provider-risk-incident-service");

type ProfileRow = typeof protectionProviderProfile.$inferSelect;
type ProfileVersionRow = typeof protectionProviderProfileVersion.$inferSelect;
type IncidentRow = typeof protectionProviderRiskIncident.$inferSelect;
type IncidentEvidenceRow =
  typeof protectionProviderRiskIncidentEvidence.$inferSelect;
type IncidentHistoryRow =
  typeof protectionProviderRiskIncidentHistory.$inferSelect;
type ReportRow = typeof protectionRiskReport.$inferSelect;
type Database = Parameters<typeof linkRiskReportToProvider>[0]["database"];

const timestamp = new Date("2026-08-21T00:00:00.000Z");

const createProfile = (overrides: Partial<ProfileRow> = {}): ProfileRow => ({
  applicationId: "application-1",
  createdAt: timestamp,
  displayName: "Provider One",
  id: "profile-1",
  location: "Ho Chi Minh City",
  officialChannels: { websiteUrl: "https://provider.example" },
  profileSlug: "provider-one",
  providerUserId: "provider-1",
  publishedAt: timestamp,
  services: "Game account support",
  status: "ACTIVE",
  updatedAt: timestamp,
  verifiedAt: timestamp,
  ...overrides,
  statusReason: overrides.statusReason ?? null,
});

const createVersion = (
  overrides: Partial<ProfileVersionRow> = {}
): ProfileVersionRow => ({
  createdAt: timestamp,
  displayName: "Provider One",
  id: "profile-version-1",
  location: "Ho Chi Minh City",
  officialChannels: { websiteUrl: "https://provider.example" },
  policyVersionId: overrides.policyVersionId ?? null,
  profileId: "profile-1",
  profileSlug: "provider-one",
  publishedAt: timestamp,
  publishedByUserId: "admin-1",
  recognizedBondAmount: 0,
  recommendedTransactionLimit: 0,
  registeredBankAccounts: [],
  services: "Game account support",
  sourceApplicationId: "application-1",
  status: "ACTIVE",
  statusReason: null,
  tier: "NORMAL",
  verifiedAt: timestamp,
  versionNumber: 1,
  ...overrides,
});

const createReport = (overrides: Partial<ReportRow> = {}): ReportRow => ({
  affectedVictimCount: 1,
  claimedLoss: 100,
  createdAt: timestamp,
  id: "report-1",
  narrative: "A moderated report",
  platform: null,
  possibleDuplicateOfReportId: null,
  publicSlug: "warning-1",
  publicSummary: "Public warning summary",
  publishedAt: timestamp,
  reporterEmail: "reporter@example.com",
  reporterName: "Reporter",
  reporterPhone: "0123456789",
  reporterRelationship: "NO_PROVIDER_RELATIONSHIP",
  reporterUserId: "reporter-1",
  reporterZalo: null,
  reviewReason: null,
  reviewedAt: timestamp,
  reviewedByUserId: "admin-1",
  status: "PUBLISHED",
  submittedAt: timestamp,
  type: "BANK_WALLET_PHONE",
  underVerificationApproved: false,
  updatedAt: timestamp,
  urgency: "NORMAL",
  violationType: null,
  withdrawalReason: null,
  withdrawalRequestedAt: null,
  withdrawalStatus: "NONE",
  ...overrides,
  policyVersionId: overrides.policyVersionId ?? null,
});

const createIncident = (overrides: Partial<IncidentRow> = {}): IncidentRow => ({
  createdAt: timestamp,
  id: "incident-1",
  noticeVerifiedAt: timestamp,
  providerProfileId: "profile-1",
  providerProfileVersionId: "profile-version-1",
  providerRespondedAt: null,
  providerResponse: null,
  providerUserId: "provider-1",
  responseDeadlineAt: new Date(timestamp.getTime() + 48 * 60 * 60 * 1000),
  reviewReason: null,
  reviewedAt: null,
  reviewedByUserId: null,
  riskReportId: "report-1",
  status: "AWAITING_PROVIDER_RESPONSE",
  updatedAt: timestamp,
  ...overrides,
  policyVersionId: overrides.policyVersionId ?? null,
});

interface State {
  evidence: IncidentEvidenceRow[];
  history: IncidentHistoryRow[];
  incidents: IncidentRow[];
  profile: ProfileRow;
  reports: ReportRow[];
  versions: ProfileVersionRow[];
}

const createDatabase = (state: State): Database => {
  const select = vi.fn((selection?: Record<string, unknown>) => {
    let table: unknown;
    const resolve = () => {
      if (selection && "incident" in selection) {
        return state.incidents.map((incident) => ({
          incident,
          profile: state.profile,
          profileVersion:
            state.versions.find(
              (version) => version.id === incident.providerProfileVersionId
            ) ?? state.versions[0],
          report:
            state.reports.find(
              (report) => report.id === incident.riskReportId
            ) ?? state.reports[0],
        }));
      }
      if (table === protectionProviderRiskIncident) {
        return state.incidents;
      }
      if (table === protectionProviderRiskIncidentEvidence) {
        return state.evidence;
      }
      if (table === protectionProviderRiskIncidentHistory) {
        return state.history;
      }
      if (table === protectionProviderProfile) {
        return [state.profile];
      }
      if (table === protectionProviderProfileVersion) {
        return state.versions;
      }
      if (table === protectionRiskReport) {
        return state.reports;
      }
      return [];
    };
    const query = {
      execute: () => Promise.resolve(resolve()),
      from: (nextTable: unknown) => {
        table = nextTable;
        return query;
      },
      innerJoin: () => query,
      limit: (count = 1) => Promise.resolve(resolve().slice(0, count)),
      orderBy: () => query,
      where: () => query,
    };
    return query;
  });

  const insert = vi.fn((table: unknown) => ({
    values: (values: Record<string, unknown>) => {
      if (table === protectionProviderRiskIncidentHistory) {
        state.history.push({
          actorUserId: (values.actorUserId as string | null) ?? null,
          createdAt: values.createdAt as Date,
          id: `history-${state.history.length + 1}`,
          incidentId: String(values.incidentId),
          reason: (values.reason as string | null) ?? null,
          status: values.status as IncidentHistoryRow["status"],
        });
      }
      const returning = () => {
        if (table === protectionProviderRiskIncident) {
          const incident = createIncident({
            ...values,
            id: "incident-created",
          } as Partial<IncidentRow>);
          state.incidents.push(incident);
          return Promise.resolve([incident]);
        }
        if (table === protectionProviderRiskIncidentHistory) {
          return Promise.resolve([state.history.at(-1)]);
        }
        return Promise.resolve([]);
      };
      return {
        onConflictDoNothing: () => Promise.resolve(),
        returning,
      };
    },
  }));

  const update = vi.fn((table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: () => ({
        returning: () => {
          if (table === protectionProviderRiskIncident) {
            const [incident] = state.incidents;
            if (!incident) {
              return Promise.resolve([]);
            }
            Object.assign(incident, values);
            return Promise.resolve([incident]);
          }
          if (table === protectionProviderProfile) {
            Object.assign(state.profile, values);
            return Promise.resolve([state.profile]);
          }
          return Promise.resolve([]);
        },
      }),
    }),
  }));

  const database = {
    insert,
    select,
    transaction: <Result>(
      callback: (transaction: Database) => Promise<Result>
    ): Promise<Result> => callback(database as unknown as Database),
    update,
  };
  return database as unknown as Database;
};

const createState = (incident: IncidentRow = createIncident()): State => ({
  evidence: [],
  history: [],
  incidents: [incident],
  profile: createProfile(),
  reports: [createReport()],
  versions: [createVersion()],
});

describe("Provider risk incident service", () => {
  beforeEach(() => {
    mocks.createNotificationEvent.mockClear();
    mocks.publishProviderProfileStatusInTransaction.mockClear();
  });

  it("links a moderated report to an authoritative profile version and sends a verified 48-hour notice", async () => {
    const state = createState();
    state.incidents = [];
    const database = createDatabase(state);
    const linked = await linkRiskReportToProvider({
      database,
      now: timestamp,
      profileId: "profile-1",
      profileVersionId: "profile-version-1",
      reportId: "report-1",
      reviewerUserId: "moderator-1",
    });

    expect(linked.profileVersion.versionId).toBe("profile-version-1");
    expect(Date.parse(linked.responseDeadlineAt)).toBe(
      timestamp.getTime() + 48 * 60 * 60 * 1000
    );
    expect(linked).not.toHaveProperty("reporterEmail");
    expect(linked).not.toHaveProperty("originalStorageKey");
    expect(state.history[0]).toMatchObject({
      actorUserId: "moderator-1",
      status: "AWAITING_PROVIDER_RESPONSE",
    });
    expect(mocks.createNotificationEvent).toHaveBeenCalledTimes(2);
    expect(
      mocks.createNotificationEvent.mock.calls.map(
        (call) => (call as unknown as [unknown, { eventType: string }])[1]
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: "protection_provider_risk_incident.related_report",
        }),
        expect.objectContaining({
          eventType: "protection_provider_risk_incident.response_deadline",
        }),
      ])
    );
  });

  it("scopes private response access to the owning Provider", async () => {
    const database = createDatabase(createState());
    await expect(
      getProviderRiskIncidentForProvider({
        database,
        incidentId: "incident-1",
        providerUserId: "another-provider",
      })
    ).rejects.toThrow("Provider incident does not exist");
  });

  it("does not attach new Risk Reports while a Provider withdrawal is pending", async () => {
    const state = createState();
    state.incidents = [];
    state.profile.status = "WITHDRAWAL_PENDING";
    const database = createDatabase(state);

    await expect(
      linkRiskReportToProvider({
        database,
        now: timestamp,
        profileId: "profile-1",
        profileVersionId: "profile-version-1",
        reportId: "report-1",
        reviewerUserId: "moderator-1",
      })
    ).rejects.toThrow("pending withdrawal");
  });

  it("accepts a response before the deadline and keeps evidence private", async () => {
    const state = createState();
    const database = createDatabase(state);
    const result = await submitProviderRiskIncidentResponse({
      database,
      incidentId: "incident-1",
      now: new Date(timestamp.getTime() + 1000),
      providerUserId: "provider-1",
      response: "Provider response with the requested context and remediation.",
    });

    expect(result.status).toBe("PROVIDER_RESPONDED");
    expect(result.providerResponse).toContain("requested context");
    expect(state.history.at(-1)?.status).toBe("PROVIDER_RESPONDED");
    expect(result).not.toHaveProperty("reporterEmail");
  });

  it("expires a missed deadline into suspension without concluding fraud", async () => {
    const state = createState();
    const database = createDatabase(state);
    const result = await expireProviderRiskIncidentResponses({
      database,
      now: new Date(timestamp.getTime() + 48 * 60 * 60 * 1000),
    });

    expect(result.expiredCount).toBe(1);
    expect(state.incidents[0]?.status).toBe("RESPONSE_EXPIRED");
    expect(
      mocks.publishProviderProfileStatusInTransaction
    ).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SUSPENDED_PENDING_REVIEW" })
    );
    expect(state.incidents[0]?.status).not.toBe("CONFIRMED_FRAUD");
  });

  it("requires an explicit manager decision for fraud and preserves the warning report", async () => {
    const state = createState(
      createIncident({ providerResponse: "Evidence", status: "UNDER_REVIEW" })
    );
    const database = createDatabase(state);
    const result = await confirmProviderRiskIncidentFraud({
      database,
      incidentId: "incident-1",
      now: new Date(timestamp.getTime() + 1000),
      reason: "Evidence shows intentional misrepresentation after review.",
      reviewerUserId: "manager-1",
    });

    expect(result.status).toBe("CONFIRMED_FRAUD");
    expect(state.reports[0]?.status).toBe("PUBLISHED");
    expect(
      mocks.publishProviderProfileStatusInTransaction
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "REMOVED_FOR_FRAUD",
        statusReason:
          "Evidence shows intentional misrepresentation after review.",
      })
    );
    expect(mocks.createNotificationEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "protection_provider_risk_incident.removed",
      })
    );
  });
});
