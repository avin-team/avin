import type { protectionRiskReport } from "@avin/db/schema/protection";
import {
  protectionProviderBondAdjustment,
  protectionProviderProfile,
  protectionProviderProfileVersion,
  protectionProviderRiskIncident,
  protectionProviderRiskIncidentEvidence,
  protectionRiskEvidence,
  protectionSupportReview,
  protectionSupportReviewHistory,
} from "@avin/db/schema/protection";
import { beforeEach, describe, expect, it, vi } from "vitest";

const bondServiceMocks = vi.hoisted(() => ({
  approveProviderBondAdjustment: vi.fn(),
  recordProviderBondAdjustment: vi.fn(),
}));

vi.mock("./bond-service", () => bondServiceMocks);

const {
  assertSupportReviewTransition,
  supportReviewOutcomeInputSchema,
  supportReviewReconsiderInputSchema,
} = await import("./support-review");
const {
  approveSupportReview,
  evaluateSupportReview,
  getPublicSupportOutcome,
  recordSupportReviewOutcome,
  startSupportReview,
} = await import("./support-review-service");

type ProfileRow = typeof protectionProviderProfile.$inferSelect;
type ProfileVersionRow = typeof protectionProviderProfileVersion.$inferSelect;
type IncidentRow = typeof protectionProviderRiskIncident.$inferSelect;
type ReportRow = typeof protectionRiskReport.$inferSelect;
type ReviewRow = typeof protectionSupportReview.$inferSelect;
type HistoryRow = typeof protectionSupportReviewHistory.$inferSelect;
type BondAdjustmentRow = typeof protectionProviderBondAdjustment.$inferSelect;
type Database = Parameters<typeof startSupportReview>[0]["database"];

const timestamp = new Date("2026-08-21T00:00:00.000Z");
const profileId = "00000000-0000-4000-8000-000000000001";
const incidentId = "00000000-0000-4000-8000-000000000002";
const reportId = "00000000-0000-4000-8000-000000000003";
const reviewId = "00000000-0000-4000-8000-000000000004";
const versionOneId = "00000000-0000-4000-8000-000000000005";
const versionTwoId = "00000000-0000-4000-8000-000000000006";

const createProfile = (): ProfileRow => ({
  applicationId: "application-1",
  bio: null,
  createdAt: timestamp,
  displayName: "Provider One",
  id: profileId,
  location: "Ho Chi Minh City",
  officialChannels: { facebookUrl: "https://facebook.com/provider-one" },
  profileSlug: "provider-one",
  providerUserId: "provider-1",
  publishedAt: timestamp,
  services: "Game account support",
  source: "AVIN_NATIVE",
  status: "ACTIVE",
  statusReason: null,
  updatedAt: timestamp,
  verifiedAt: timestamp,
});

const createVersion = (
  id: string,
  versionNumber: number,
  publishedAt: Date,
  recommendedTransactionLimit: number
): ProfileVersionRow => ({
  bio: null,
  createdAt: publishedAt,
  displayName: "Provider One",
  id,
  location: "Ho Chi Minh City",
  officialChannels: { facebookUrl: "https://facebook.com/provider-one" },
  policyVersionId: null,
  profileId,
  profileSlug: "provider-one",
  publishedAt,
  publishedByUserId: "admin-1",
  recognizedBondAmount: 0,
  recommendedTransactionLimit,
  registeredBankAccounts: [
    {
      accountName: "PROVIDER ONE",
      accountNumber: "123456",
      bankCode: "VCB",
      isPrimary: true,
    },
  ],
  services: "Game account support",
  source: "AVIN_NATIVE",
  sourceApplicationId: "application-1",
  status: "ACTIVE",
  statusReason: null,
  tier: "NORMAL",
  verifiedAt: publishedAt,
  versionNumber,
});

const createReport = (): ReportRow => ({
  affectedVictimCount: 1,
  claimedLoss: 100,
  createdAt: timestamp,
  externalAdminHidden: false,
  externalBankName: null,
  externalImportRunId: null,
  externalLastSyncedAt: null,
  externalPayloadHash: null,
  externalPlatformUrl: null,
  externalRawPayload: null,
  externalSource: null,
  externalSourceCreatedAt: null,
  externalSourceId: null,
  externalSourceStatus: null,
  externalSourceUrl: null,
  externalSuspectName: null,
  externalTitle: null,
  id: reportId,
  narrative: "Moderated report",
  platform: "Facebook",
  policyVersionId: null,
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
});

const createIncident = (status: IncidentRow["status"]): IncidentRow => ({
  createdAt: timestamp,
  id: incidentId,
  noticeVerifiedAt: timestamp,
  policyVersionId: null,
  providerProfileId: profileId,
  providerProfileVersionId: versionTwoId,
  providerRespondedAt: timestamp,
  providerResponse: "Provider response with context",
  providerUserId: "provider-1",
  responseDeadlineAt: new Date(timestamp.getTime() + 48 * 60 * 60 * 1000),
  reviewReason: "Moderator review",
  reviewedAt: timestamp,
  reviewedByUserId: "moderator-1",
  riskReportId: reportId,
  status,
  updatedAt: timestamp,
});

const createReview = (status: ReviewRow["status"]): ReviewRow => ({
  approvalReason: null,
  approvedAt: null,
  approvedByUserId: null,
  approvedServiceConfirmed: null,
  bondAdjustmentId: null,
  createdAt: timestamp,
  eligibilityReason: null,
  evidenceSufficient: null,
  externalActionReference: null,
  historicalRecommendedTransactionLimit: null,
  id: reviewId,
  incidentId,
  ineligibilityReason: null,
  outcomeReason: null,
  outcomeRecordedAt: null,
  outcomeRecordedByUserId: null,
  policyVersionId: null,
  preTransactionVideoPresent: null,
  privateEvidenceReference: null,
  profileId,
  profileVersionId: versionTwoId,
  providerIdentityConfirmed: null,
  providerUserId: "provider-1",
  publicOutcome: null,
  recommendedSupportAmount: null,
  reconsiderationCount: 0,
  reconsiderationEvidenceReference: null,
  reconsiderationReason: null,
  reconsideredAt: null,
  registeredPaymentIdentityConfirmed: null,
  requiredProcessCompleted: null,
  reviewedAt: null,
  reviewedByUserId: null,
  riskReportId: reportId,
  startedAt: timestamp,
  startedByUserId: "moderator-1",
  status,
  supportAmount: null,
  transactionChannel: null,
  transactionLawfulConfirmed: null,
  transactionOccurredAt: null,
  transactionProfileVersionId: null,
  transactionScope: null,
  updatedAt: timestamp,
  verifiedActualLoss: null,
});

interface State {
  evidence: { id: string }[];
  history: HistoryRow[];
  incident: IncidentRow;
  profile: ProfileRow;
  reports: ReportRow;
  review: ReviewRow | null;
  bondAdjustment: BondAdjustmentRow | null;
  versions: ProfileVersionRow[];
}

const createDatabase = (state: State): Database => {
  const select = vi.fn((selection?: Record<string, unknown>) => {
    let table: unknown;
    const resolve = () => {
      if (selection && "review" in selection) {
        return state.review
          ? [
              {
                incident: state.incident,
                profile: state.profile,
                profileVersion: state.versions.find(
                  (version) => version.id === state.review?.profileVersionId
                ),
                report: state.reports,
                review: state.review,
              },
            ]
          : [];
      }
      if (selection && "incident" in selection) {
        return [
          {
            incident: state.incident,
            profile: state.profile,
            profileVersion: state.versions.find(
              (version) =>
                version.id === state.incident.providerProfileVersionId
            ),
            report: state.reports,
          },
        ];
      }
      if (table === protectionProviderProfile) {
        return [state.profile];
      }
      if (table === protectionProviderProfileVersion) {
        return state.versions;
      }
      if (table === protectionProviderRiskIncident) {
        return [state.incident];
      }
      if (table === protectionRiskEvidence) {
        return state.evidence;
      }
      if (table === protectionProviderRiskIncidentEvidence) {
        return [];
      }
      if (table === protectionProviderBondAdjustment) {
        return state.bondAdjustment ? [state.bondAdjustment] : [];
      }
      if (table === protectionSupportReview) {
        return state.review ? [state.review] : [];
      }
      if (table === protectionSupportReviewHistory) {
        return state.history;
      }
      return [];
    };
    const query = {
      execute: vi.fn(() => Promise.resolve(resolve())),
      for: vi.fn(() => query),
      from: vi.fn((nextTable: unknown) => {
        table = nextTable;
        return query;
      }),
      innerJoin: vi.fn(() => query),
      limit: vi.fn((count = 1) => Promise.resolve(resolve().slice(0, count))),
      orderBy: vi.fn(() => query),
      where: vi.fn(() => query),
    };
    return query;
  });

  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((values: Record<string, unknown>) => {
      if (table === protectionSupportReviewHistory) {
        state.history.push({
          ...values,
          id: `history-${state.history.length + 1}`,
        } as HistoryRow);
      }
      return {
        returning: vi.fn(() => {
          if (table === protectionSupportReview) {
            state.review = {
              ...createReview("ELIGIBILITY_REVIEW"),
              ...values,
              id: reviewId,
            } as ReviewRow;
            return Promise.resolve([state.review]);
          }
          if (table === protectionSupportReviewHistory) {
            return Promise.resolve([state.history.at(-1)]);
          }
          return Promise.resolve([]);
        }),
      };
    }),
  }));

  const update = vi.fn((table: unknown) => ({
    set: vi.fn((values: Record<string, unknown>) => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => {
          if (table === protectionSupportReview && state.review) {
            state.review = { ...state.review, ...values } as ReviewRow;
            return Promise.resolve([state.review]);
          }
          return Promise.resolve([]);
        }),
      })),
    })),
  }));

  const database = {
    insert,
    select,
    transaction: <T>(callback: (transaction: Database) => Promise<T>) =>
      callback(database as unknown as Database),
    update,
  };
  return database as unknown as Database;
};

const createState = (incidentStatus: IncidentRow["status"]): State => ({
  bondAdjustment: null,
  evidence: [{ id: "report-evidence-1" }],
  history: [],
  incident: createIncident(incidentStatus),
  profile: createProfile(),
  reports: createReport(),
  review: null,
  versions: [
    createVersion(versionOneId, 1, new Date("2026-08-01T00:00:00.000Z"), 50),
    createVersion(versionTwoId, 2, timestamp, 100),
  ],
});

const eligibilityInput = {
  approvedServiceConfirmed: true,
  evidenceSufficient: true,
  preTransactionVideoPresent: true,
  privateEvidenceReference: "private/support-evidence-1",
  providerIdentityConfirmed: true,
  reason: "Đã kiểm tra đúng Provider và quy trình giao dịch.",
  registeredPaymentIdentityConfirmed: true,
  requiredProcessCompleted: true,
  reviewId,
  transactionChannel: "FACEBOOK" as const,
  transactionLawfulConfirmed: true,
  transactionOccurredAt: "2026-08-10T00:00:00.000Z",
  transactionProfileVersionId: versionOneId,
  transactionScope: "DIRECT" as const,
  verifiedActualLoss: 80,
};

beforeEach(() => {
  vi.restoreAllMocks();
  bondServiceMocks.approveProviderBondAdjustment.mockReset();
  bondServiceMocks.recordProviderBondAdjustment.mockReset();
});

describe("Support Review policy contracts", () => {
  it("allows only the intended state transitions", () => {
    expect(() => assertSupportReviewTransition("ELIGIBLE", "APPROVED")).toThrow(
      /not allowed/u
    );
    expect(() =>
      assertSupportReviewTransition("PENDING_APPROVAL", "APPROVED")
    ).not.toThrow();
  });

  it("rejects support above the historical eligibility cap", () => {
    expect(() =>
      supportReviewOutcomeInputSchema.parse({
        externalActionReference: "external-action-1",
        privateEvidenceReference: "private/support-evidence-1",
        publicOutcome: "HANDLED_BY_PROVIDER",
        reason: "External handling completed.",
        reviewId,
        supportAmount: 1,
      })
    ).toThrow(/handled by the program/u);
  });

  it("requires private evidence when reconsideration is based on new evidence", () => {
    expect(() =>
      supportReviewReconsiderInputSchema.parse({
        basis: "NEW_EVIDENCE",
        reason: "Có bằng chứng mới cần xem xét lại.",
        reviewId,
      })
    ).toThrow(/new evidence/iu);
  });
});

describe("Support Review service", () => {
  it("starts only from a moderated Provider incident", async () => {
    const state = createState("UNDER_REVIEW");
    const database = createDatabase(state);

    const review = await startSupportReview({
      database,
      incidentId,
      reviewerUserId: "moderator-1",
    });

    expect(review.status).toBe("ELIGIBILITY_REVIEW");
    expect(state.history).toHaveLength(1);

    const blockedState = createState("PROVIDER_RESPONDED");
    await expect(
      startSupportReview({
        database: createDatabase(blockedState),
        incidentId,
        reviewerUserId: "moderator-1",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("caps eligible support at the historical profile version limit", async () => {
    const state = createState("UNDER_REVIEW");
    const database = createDatabase(state);
    await startSupportReview({
      database,
      incidentId,
      reviewerUserId: "moderator-1",
    });

    const review = await evaluateSupportReview({
      database,
      input: eligibilityInput,
      reviewerUserId: "moderator-1",
    });

    expect(review.status).toBe("ELIGIBLE");
    expect(review.historicalRecommendedTransactionLimit).toBe(50);
    expect(review.recommendedSupportAmount).toBe(50);
    expect(review.transactionProfileVersionId).toBe(versionOneId);
  });

  it("allows SUPER_ADMIN to complete a Bond-backed support outcome", async () => {
    const state = createState("UNDER_REVIEW");
    state.review = {
      ...createReview("ELIGIBLE"),
      recommendedSupportAmount: 50,
    };
    state.bondAdjustment = {
      id: "adjustment-1",
      status: "PENDING_APPROVAL",
    } as BondAdjustmentRow;
    const database = createDatabase(state);
    bondServiceMocks.recordProviderBondAdjustment.mockResolvedValue({
      adjustments: [
        {
          id: "adjustment-1",
          idempotencyKey: `support-review-${reviewId}-0`,
        },
      ],
    });

    const pending = await recordSupportReviewOutcome({
      database,
      input: {
        externalActionReference: "provider-support-1",
        privateEvidenceReference: "private/support-outcome-1",
        publicOutcome: "HANDLED_BY_PROGRAM",
        reason: "Đã hỗ trợ ngoài nền tảng và lưu xác nhận riêng tư.",
        reviewId,
        supportAmount: 50,
      },
      recorderUserId: "operator-1",
    });

    expect(pending.status).toBe("PENDING_APPROVAL");
    expect(pending.bondAdjustment?.id).toBe("adjustment-1");
    expect(pending.outcomeRecordedByUserId).toBe("operator-1");
    expect(bondServiceMocks.recordProviderBondAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          deltaAmount: -50,
          kind: "SUPPORT_ALLOCATION",
        }),
        recordedByUserId: "operator-1",
      })
    );

    const approved = await approveSupportReview({
      approverUserId: "operator-1",
      database,
      input: {
        decision: "APPROVED",
        reason: "Đã đối soát bằng chứng và external action reference.",
        reviewId,
      },
    });

    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedByUserId).toBe("operator-1");
    expect(bondServiceMocks.approveProviderBondAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          adjustmentId: "adjustment-1",
          decision: "APPROVED",
        }),
        reviewerUserId: "operator-1",
      })
    );
  });

  it("keeps missing pre-transaction video separate from public warning eligibility", async () => {
    const state = createState("UNDER_REVIEW");
    const database = createDatabase(state);
    await startSupportReview({
      database,
      incidentId,
      reviewerUserId: "moderator-1",
    });

    const review = await evaluateSupportReview({
      database,
      input: { ...eligibilityInput, preTransactionVideoPresent: false },
      reviewerUserId: "moderator-1",
    });

    expect(review.status).toBe("INELIGIBLE");
    expect(review.publicOutcome).toBe("INELIGIBLE");
    expect(review.ineligibilityReason).toMatch(/screen video/u);
  });

  it("projects only a privacy-safe public outcome", async () => {
    const state = createState("UNDER_REVIEW");
    state.review = {
      ...createReview("ELIGIBLE"),
      publicOutcome: "HANDLED_BY_PROGRAM",
      supportAmount: 50,
    };
    const outcome = await getPublicSupportOutcome(
      createDatabase(state),
      reportId
    );

    expect(outcome).toEqual({ status: "HANDLED_BY_PROGRAM" });
  });
});
