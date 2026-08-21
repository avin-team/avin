import {
  protectionProviderBondAccount,
  protectionProviderBondAdjustment,
  protectionProviderProfile,
  protectionProviderProfileVersion,
} from "@avin/db/schema/protection";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../notifications/notification", () => ({
  createNotificationEvent: vi.fn(() => Promise.resolve()),
}));

vi.mock("./configuration", () => ({
  getProtectionLaunchConfiguration: vi.fn(),
}));

const { getProtectionLaunchConfiguration } = await import("./configuration");
const {
  getProviderBondForProvider,
  publishProviderRecommendedTransactionLimit,
  recordProviderBondAdjustment,
  approveProviderBondAdjustment,
} = await import("./bond-service");
const { toProviderProfileView } =
  await import("./provider-application-service");

type Database = Parameters<typeof recordProviderBondAdjustment>[0]["database"];
type ProfileRow = typeof protectionProviderProfile.$inferSelect;
type ProfileVersionRow = typeof protectionProviderProfileVersion.$inferSelect;
type BondAccountRow = typeof protectionProviderBondAccount.$inferSelect;
type BondAdjustmentRow = typeof protectionProviderBondAdjustment.$inferSelect;

const timestamp = new Date("2026-08-21T00:00:00.000Z");

const createProfile = (): ProfileRow => ({
  applicationId: "application-1",
  createdAt: timestamp,
  displayName: "Provider One",
  id: "profile-1",
  officialChannels: { websiteUrl: "https://provider.example" },
  profileSlug: "provider-one",
  providerUserId: "provider-1",
  publishedAt: timestamp,
  services: "Game account support",
  status: "ACTIVE",
  statusReason: null,
  updatedAt: timestamp,
  verifiedAt: timestamp,
});

const createVersion = (
  recommendedTransactionLimit = 0,
  versionNumber = 1
): ProfileVersionRow => ({
  createdAt: timestamp,
  displayName: "Provider One",
  id: `profile-version-${versionNumber}`,
  officialChannels: { websiteUrl: "https://provider.example" },
  paymentAccount: null,
  policyVersionId: null,
  profileId: "profile-1",
  profileSlug: "provider-one",
  publishedAt: timestamp,
  publishedByUserId: "admin-1",
  recommendedTransactionLimit,
  services: "Game account support",
  sourceApplicationId: "application-1",
  status: "ACTIVE",
  statusReason: null,
  verifiedAt: timestamp,
  versionNumber,
});

const createAccount = (recognizedAmount = 0): BondAccountRow => ({
  createdAt: timestamp,
  id: "bond-account-1",
  providerProfileId: "profile-1",
  providerUserId: "provider-1",
  recognizedAmount,
  updatedAt: timestamp,
});

interface BondState {
  account: BondAccountRow;
  adjustments: BondAdjustmentRow[];
  profile: ProfileRow;
  versions: ProfileVersionRow[];
}

const createDatabase = (state: BondState): Database => {
  const select = vi.fn(() => {
    let table: unknown;
    const read = () => {
      if (table === protectionProviderProfile) {
        return [state.profile];
      }
      if (table === protectionProviderProfileVersion) {
        return state.versions.toSorted(
          (left, right) => right.versionNumber - left.versionNumber
        );
      }
      if (table === protectionProviderBondAccount) {
        return [state.account];
      }
      if (table === protectionProviderBondAdjustment) {
        return state.adjustments;
      }
      return [];
    };
    const query = {
      execute: vi.fn(() => Promise.resolve(read())),
      for: vi.fn(() => query),
      from: vi.fn((nextTable: unknown) => {
        table = nextTable;
        return query;
      }),
      limit: vi.fn(() => Promise.resolve(read())),
      orderBy: vi.fn(() => query),
      where: vi.fn(() => query),
    };
    return query;
  });

  const insert = vi.fn((table: unknown) => ({
    values: vi.fn((values: Record<string, unknown>) => ({
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
      returning: vi.fn(() => {
        if (table === protectionProviderBondAdjustment) {
          const adjustment = {
            ...values,
            approvedAt: null,
            approvedByUserId: null,
            createdAt: timestamp,
            id: `adjustment-${state.adjustments.length + 1}`,
          } as BondAdjustmentRow;
          state.adjustments.push(adjustment);
          return Promise.resolve([adjustment]);
        }
        if (table === protectionProviderProfileVersion) {
          const version = {
            ...state.versions.at(-1),
            ...values,
            createdAt: timestamp,
            id: `profile-version-${state.versions.length + 1}`,
          } as ProfileVersionRow;
          state.versions.push(version);
          return Promise.resolve([version]);
        }
        return Promise.resolve([]);
      }),
    })),
  }));

  const update = vi.fn((table: unknown) => ({
    set: vi.fn((values: Record<string, unknown>) => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => {
          if (table === protectionProviderBondAccount) {
            state.account = { ...state.account, ...values } as BondAccountRow;
            return Promise.resolve([state.account]);
          }
          if (table === protectionProviderBondAdjustment) {
            const [adjustment] = state.adjustments;
            if (!adjustment) {
              return Promise.resolve([]);
            }
            state.adjustments[0] = {
              ...adjustment,
              ...values,
            } as BondAdjustmentRow;
            return Promise.resolve([state.adjustments[0]]);
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

const liveConfiguration = {
  gates: {
    custody: true,
    dataGovernance: true,
    legalReview: true,
    programEntity: true,
  },
  mode: "LIVE" as const,
};

const noMoneyConfiguration = {
  ...liveConfiguration,
  mode: "NO_MONEY_PILOT" as const,
};

const createState = (recognizedAmount = 0, limit = 0): BondState => ({
  account: createAccount(recognizedAmount),
  adjustments: [],
  profile: createProfile(),
  versions: [createVersion(limit)],
});

const depositInput = {
  deltaAmount: 100,
  evidenceReference: "private-evidence/deposit-1",
  externalBankReference: "BANK-REF-1",
  idempotencyKey: "deposit-idempotency-1",
  kind: "DEPOSIT" as const,
  profileId: "00000000-0000-4000-8000-000000000001",
  reason: "Đã đối soát khoản Bond ngoài hệ thống.",
};

beforeEach(() => {
  vi.mocked(getProtectionLaunchConfiguration).mockReturnValue(
    liveConfiguration
  );
});

describe("Provider Bond service", () => {
  it("rejects real Bond recognition in the no-money pilot", async () => {
    vi.mocked(getProtectionLaunchConfiguration).mockReturnValue(
      noMoneyConfiguration
    );
    const state = createState();
    const database = createDatabase(state);

    await expect(
      recordProviderBondAdjustment({
        database,
        input: depositInput,
        recordedByUserId: "bond-operator-1",
      })
    ).rejects.toMatchObject({ code: "PROTECTION_LAUNCH_GATE_BLOCKED" });
    expect(state.account.recognizedAmount).toBe(0);
    expect(state.adjustments).toHaveLength(0);
  });

  it("applies a reconciled deposit once and lowers an unsupported limit", async () => {
    const state = createState(0, 200);
    const database = createDatabase(state);

    await recordProviderBondAdjustment({
      database,
      input: depositInput,
      recordedByUserId: "bond-operator-1",
    });
    await recordProviderBondAdjustment({
      database,
      input: depositInput,
      recordedByUserId: "bond-operator-1",
    });

    expect(state.account.recognizedAmount).toBe(100);
    expect(state.adjustments).toHaveLength(1);
    expect(state.adjustments[0]?.status).toBe("APPLIED");
    expect(state.versions.at(-1)?.recommendedTransactionLimit).toBe(100);
  });

  it("requires reconciliation evidence for every Bond increase", async () => {
    const state = createState();
    const database = createDatabase(state);

    await expect(
      recordProviderBondAdjustment({
        database,
        input: {
          ...depositInput,
          deltaAmount: 40,
          evidenceReference: undefined,
          externalBankReference: undefined,
          idempotencyKey: "correction-increase-1",
          kind: "CORRECTION",
        },
        recordedByUserId: "bond-operator-1",
      })
    ).rejects.toThrow(/external bank reference/iu);
    expect(state.account.recognizedAmount).toBe(0);
    expect(state.adjustments).toHaveLength(0);
  });

  it("requires a different Protection Manager for a Bond decrease", async () => {
    const state = createState(100, 100);
    const database = createDatabase(state);
    const result = await recordProviderBondAdjustment({
      database,
      input: {
        ...depositInput,
        deltaAmount: -40,
        evidenceReference: undefined,
        externalBankReference: undefined,
        idempotencyKey: "withdrawal-idempotency-1",
        kind: "WITHDRAWAL",
        reason: "Provider đã hoàn tất cooling period.",
      },
      recordedByUserId: "bond-operator-1",
    });
    const adjustmentId = result.adjustments[0]?.id;
    expect(adjustmentId).toBeTruthy();
    expect(state.account.recognizedAmount).toBe(100);
    expect(state.adjustments[0]?.status).toBe("PENDING_APPROVAL");

    await expect(
      approveProviderBondAdjustment({
        database,
        input: { adjustmentId: adjustmentId ?? "", decision: "APPROVED" },
        reviewerUserId: "bond-operator-1",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await approveProviderBondAdjustment({
      database,
      input: { adjustmentId: adjustmentId ?? "", decision: "APPROVED" },
      reviewerUserId: "protection-manager-1",
    });
    expect(state.account.recognizedAmount).toBe(60);
    expect(state.adjustments[0]?.status).toBe("APPLIED");
  });

  it("keeps private Bond references out of the Provider view", async () => {
    const state = createState(100, 100);
    const database = createDatabase(state);
    await recordProviderBondAdjustment({
      database,
      input: depositInput,
      recordedByUserId: "bond-operator-1",
    });

    const providerView = await getProviderBondForProvider({
      database,
      providerUserId: "provider-1",
    });
    expect(providerView).toMatchObject({
      recognizedAmount: 200,
      recommendedTransactionLimit: 100,
    });
    expect(providerView?.adjustments[0]).not.toHaveProperty(
      "externalBankReference"
    );
    expect(providerView?.adjustments[0]).not.toHaveProperty(
      "evidenceReference"
    );

    const publicView = toProviderProfileView(
      state.profile,
      state.versions.at(-1),
      state.versions
    );
    expect(publicView).toMatchObject({ recommendedTransactionLimit: 100 });
    expect(publicView).not.toHaveProperty("recognizedAmount");
  });

  it("rejects a public limit above the recognized private Bond", async () => {
    const state = createState(60, 0);
    const database = createDatabase(state);

    await expect(
      publishProviderRecommendedTransactionLimit({
        database,
        input: {
          profileId: "00000000-0000-4000-8000-000000000001",
          recommendedTransactionLimit: 61,
        },
        publisherUserId: "protection-manager-1",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
