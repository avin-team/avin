import { describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import {
  enforceAdvisorSessionCreationLimit,
  estimateAdvisorTokenCount,
  getAdvisorQuotaStatus,
  reserveAdvisorModelRequest,
} from "./quota";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const VISITOR_HASH = "v".repeat(64);
const IP_HASH = "i".repeat(64);

const createDatabase = ({
  analyticsEvents = [],
}: {
  analyticsEvents?: {
    eventType?: "MODEL_REQUEST" | "SESSION_STARTED";
    metadata: Record<string, unknown>;
    userId?: string | null;
  }[];
} = {}) => {
  const values = vi.fn(() => Promise.resolve());
  const database = {
    insert: vi.fn(() => ({ values })),
    query: {
      advisorAnalyticsEvent: {
        findMany: vi.fn().mockResolvedValue(analyticsEvents),
      },
    },
  } as unknown as Context["db"];
  return { database, values };
};

describe("Advisor quota controls", () => {
  it("estimates text and image token usage without retaining content", () => {
    expect(estimateAdvisorTokenCount("12345678", 2)).toBe(1026);
  });

  it("warns at 80 percent and blocks the daily request limit", async () => {
    const warningEvents = Array.from({ length: 800 }, () => ({ metadata: {} }));
    const warning = await getAdvisorQuotaStatus({
      database: createDatabase({ analyticsEvents: warningEvents }).database,
      now: new Date("2026-08-18T12:00:00.000Z"),
    });
    expect(warning.warning).toBe(true);
    expect(warning.exhausted).toBe(false);

    const exhaustedEvents = Array.from({ length: 1000 }, () => ({
      metadata: {},
    }));
    await expect(
      reserveAdvisorModelRequest({
        attachmentCount: 0,
        database: createDatabase({ analyticsEvents: exhaustedEvents }).database,
        estimatedTokenCount: 10,
        sessionId: SESSION_ID,
        turnCount: 1,
        userId: null,
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("blocks the token limit before reserving another model request", async () => {
    const events = Array.from({ length: 100 }, () => ({
      metadata: { tokenCount: 2000 },
    }));
    const { database, values } = createDatabase({ analyticsEvents: events });

    await expect(
      reserveAdvisorModelRequest({
        attachmentCount: 0,
        database,
        estimatedTokenCount: 1,
        sessionId: SESSION_ID,
        turnCount: 1,
        userId: null,
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(values).not.toHaveBeenCalled();
  });

  it("enforces the authenticated user session limit independently", async () => {
    const { database } = createDatabase({
      analyticsEvents: Array.from({ length: 20 }, () => ({
        eventType: "SESSION_STARTED" as const,
        metadata: {},
        userId: "user-1",
      })),
    });

    await expect(
      enforceAdvisorSessionCreationLimit({
        database,
        subject: { userId: "user-1", visitorCapabilityHash: null },
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("enforces visitor browser and network session limits", async () => {
    const { database } = createDatabase({
      analyticsEvents: Array.from({ length: 5 }, () => ({
        eventType: "SESSION_STARTED" as const,
        metadata: {
          ipHash: IP_HASH,
          visitorHash: VISITOR_HASH,
        },
      })),
    });
    await expect(
      enforceAdvisorSessionCreationLimit({
        database,
        requestIpHash: IP_HASH,
        subject: {
          userId: null,
          visitorCapabilityHash: VISITOR_HASH,
        },
      })
    ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});
