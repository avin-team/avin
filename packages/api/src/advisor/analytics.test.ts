import { describe, expect, it, vi } from "vitest";

import type { Context } from "../runtime/context";
import {
  advisorAnalyticsMetadataSchema,
  advisorAnalyticsTrackInputSchema,
  cleanupAdvisorAnalyticsEvents,
  getAdvisorAnalyticsOverview,
  recordAdvisorAnalyticsEvent,
} from "./analytics";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "user-1";

const createDatabase = () => {
  const insertValues = vi.fn(() => Promise.resolve());
  const insert = vi.fn(() => ({ values: insertValues }));
  return {
    database: { insert } as unknown as Context["db"],
    insert,
    insertValues,
  };
};

describe("Advisor analytics", () => {
  it("rejects prompt and private-content fields from event metadata", async () => {
    const { database, insert } = createDatabase();

    await expect(
      recordAdvisorAnalyticsEvent({
        database,
        eventType: "TURN_COMPLETED",
        metadata: {
          prompt: "private participant text",
        } as never,
        sessionId: SESSION_ID,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(insert).not.toHaveBeenCalled();
    expect(
      advisorAnalyticsMetadataSchema.safeParse({
        providerRequestId: "groq-request-1",
        status: "SUCCESS",
        toolName: "catalog.search",
      }).success
    ).toBe(true);
    expect(
      advisorAnalyticsTrackInputSchema.safeParse({
        eventType: "LISTING_CLICKED",
        metadata: {
          ipHash: "i".repeat(64),
          visitorHash: "v".repeat(64),
        },
        sessionId: SESSION_ID,
      }).success
    ).toBe(false);
    expect(
      advisorAnalyticsTrackInputSchema.safeParse({
        eventType: "SESSION_STARTED",
        sessionId: SESSION_ID,
      }).success
    ).toBe(false);
  });

  it("classifies technical request events separately from aggregate events", async () => {
    const { database, insertValues } = createDatabase();

    await recordAdvisorAnalyticsEvent({
      database,
      eventType: "MODEL_REQUEST",
      metadata: {
        latencyMs: 1200,
        model: "qwen/qwen3.6-27b",
        providerRequestId: "groq-request-2",
        status: "SUCCESS",
        tokenCount: 128,
      },
      sessionId: SESSION_ID,
      userId: USER_ID,
    });

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "MODEL_REQUEST",
        retention: "TECHNICAL",
        sessionId: SESSION_ID,
        userId: USER_ID,
      })
    );
  });

  it("includes the current UTC day in the overview window", async () => {
    const now = new Date("2026-08-18T15:30:00.000Z");
    const events = [
      {
        createdAt: new Date("2026-08-18T12:00:00.000Z"),
        eventType: "SESSION_STARTED",
        metadata: {},
        retention: "AGGREGATE",
      },
      {
        createdAt: new Date("2026-08-18T12:01:00.000Z"),
        eventType: "RECOMMENDATION_CREATED",
        metadata: {},
        retention: "AGGREGATE",
      },
    ];
    const database = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(events),
        })),
      })),
    } as unknown as Context["db"];

    const overview = await getAdvisorAnalyticsOverview({
      database,
      now,
      timeframe: "7d",
    });

    expect(overview.sessions).toBe(1);
    expect(overview.recommendations).toBe(1);
    expect(overview.days.at(-1)).toMatchObject({
      date: "2026-08-18",
      recommendations: 1,
      sessions: 1,
    });
  });

  it("deletes aggregate and technical events at their separate cutoffs", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "event-1" }]);
    const where = vi.fn(() => ({ returning }));
    const database = {
      delete: vi.fn(() => ({ where })),
    } as unknown as Context["db"];

    await expect(
      cleanupAdvisorAnalyticsEvents({
        database,
        now: new Date("2026-08-18T00:00:00.000Z"),
      })
    ).resolves.toBe(1);
    expect(where).toHaveBeenCalledTimes(1);
  });
});
