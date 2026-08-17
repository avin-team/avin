import {
  advisorAnalyticsEvent,
  advisorAnalyticsEventType,
} from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";

type AdvisorDatabase = Context["db"];

const ADVISOR_ANALYTICS_MONTH_RETENTION = 13;
const ADVISOR_TECHNICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const advisorAnalyticsEventTypeSchema = z.enum(
  advisorAnalyticsEventType.enumValues
);

export const advisorAnalyticsMetadataSchema = z.strictObject({
  attachmentCount: z.number().int().nonnegative().max(5).optional(),
  errorCode: z.string().trim().min(1).max(120).optional(),
  eventVersion: z.string().trim().min(1).max(32).optional(),
  latencyMs: z.number().int().nonnegative().max(120_000).optional(),
  listingId: z.uuid().optional(),
  model: z.string().trim().min(1).max(120).optional(),
  providerRequestId: z.string().trim().min(1).max(160).optional(),
  recommendationId: z.uuid().optional(),
  sentiment: z.enum(["NEGATIVE", "POSITIVE"]).optional(),
  status: z.enum(["ERROR", "RATE_LIMITED", "SUCCESS", "TIMEOUT"]).optional(),
  tokenCount: z.number().int().nonnegative().max(1_000_000).optional(),
  toolName: z.string().trim().min(1).max(120).optional(),
  turnCount: z.number().int().nonnegative().max(100).optional(),
});

export const advisorAnalyticsTrackInputSchema = z.strictObject({
  eventType: advisorAnalyticsEventTypeSchema.exclude(["MODEL_REQUEST"]),
  metadata: advisorAnalyticsMetadataSchema.default({}),
  sessionId: z.uuid(),
  visitorCapability: z.string().trim().min(32).max(256).optional(),
});

export type AdvisorAnalyticsEventType = z.infer<
  typeof advisorAnalyticsEventTypeSchema
>;
export type AdvisorAnalyticsMetadata = z.infer<
  typeof advisorAnalyticsMetadataSchema
>;

const subtractMonths = (value: Date, months: number): Date => {
  const result = new Date(value);
  result.setUTCMonth(result.getUTCMonth() - months);
  return result;
};

const getEventRetention = (
  eventType: AdvisorAnalyticsEventType
): "AGGREGATE" | "TECHNICAL" =>
  eventType === "MODEL_REQUEST" ? "TECHNICAL" : "AGGREGATE";

export const recordAdvisorAnalyticsEvent = async ({
  database,
  eventType,
  metadata = {},
  sessionId = null,
  userId = null,
}: {
  database: AdvisorDatabase;
  eventType: AdvisorAnalyticsEventType;
  metadata?: AdvisorAnalyticsMetadata;
  sessionId?: string | null;
  userId?: string | null;
}): Promise<void> => {
  const parsedMetadata = advisorAnalyticsMetadataSchema.safeParse(metadata);
  if (!parsedMetadata.success) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Advisor analytics metadata is not content-free.",
    });
  }
  await database.insert(advisorAnalyticsEvent).values({
    eventType,
    metadata: parsedMetadata.data,
    retention: getEventRetention(eventType),
    sessionId,
    userId,
  });
};

export const recordAdvisorAnalyticsEventBestEffort = async (input: {
  database: AdvisorDatabase;
  eventType: AdvisorAnalyticsEventType;
  metadata?: AdvisorAnalyticsMetadata;
  sessionId?: string | null;
  userId?: string | null;
}): Promise<void> => {
  try {
    await recordAdvisorAnalyticsEvent(input);
  } catch {
    // Analytics must never block Advisor or commerce behavior.
  }
};

export const cleanupAdvisorAnalyticsEvents = async ({
  database,
  now = new Date(),
}: {
  database: AdvisorDatabase;
  now?: Date;
}): Promise<number> => {
  const aggregateCutoff = subtractMonths(
    now,
    ADVISOR_ANALYTICS_MONTH_RETENTION
  );
  const technicalCutoff = new Date(
    now.getTime() - ADVISOR_TECHNICAL_RETENTION_MS
  );
  const deleted = await database
    .delete(advisorAnalyticsEvent)
    .where(
      or(
        and(
          eq(advisorAnalyticsEvent.retention, "AGGREGATE"),
          lt(advisorAnalyticsEvent.createdAt, aggregateCutoff)
        ),
        and(
          eq(advisorAnalyticsEvent.retention, "TECHNICAL"),
          lt(advisorAnalyticsEvent.createdAt, technicalCutoff)
        )
      )
    )
    .returning({ id: advisorAnalyticsEvent.id });
  return deleted.length;
};

const dateKey = (value: Date): string => value.toISOString().slice(0, 10);

export interface AdvisorAnalyticsOverview {
  conversion: {
    checkoutRate: number;
    feedbackRate: number;
    recommendationRate: number;
  };
  days: {
    checkouts: number;
    noMatches: number;
    recommendations: number;
    sessions: number;
    date: string;
  }[];
  feedback: {
    negative: number;
    positive: number;
    total: number;
  };
  noMatches: number;
  recommendations: number;
  sessions: number;
  technicalRequests: number;
  turns: number;
}

export const getAdvisorAnalyticsOverview = async ({
  database,
  now = new Date(),
  timeframe = "30d",
}: {
  database: AdvisorDatabase;
  now?: Date;
  timeframe?: "7d" | "30d" | "90d";
}): Promise<AdvisorAnalyticsOverview> => {
  let days = 30;
  if (timeframe === "7d") {
    days = 7;
  } else if (timeframe === "90d") {
    days = 90;
  }
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const events = await database
    .select({
      createdAt: advisorAnalyticsEvent.createdAt,
      eventType: advisorAnalyticsEvent.eventType,
      metadata: advisorAnalyticsEvent.metadata,
      retention: advisorAnalyticsEvent.retention,
    })
    .from(advisorAnalyticsEvent)
    .where(gte(advisorAnalyticsEvent.createdAt, start));

  const aggregateEvents = events.filter(
    (event) => event.retention === "AGGREGATE"
  );
  const countEvents = (eventType: AdvisorAnalyticsEventType): number =>
    aggregateEvents.filter((event) => event.eventType === eventType).length;
  const sessions = countEvents("SESSION_STARTED");
  const recommendations = countEvents("RECOMMENDATION_CREATED");
  const feedback = aggregateEvents.filter(
    (event) => event.eventType === "FEEDBACK_SUBMITTED"
  );
  const positive = feedback.filter(
    (event) => event.metadata.sentiment === "POSITIVE"
  ).length;
  const negative = feedback.filter(
    (event) => event.metadata.sentiment === "NEGATIVE"
  ).length;
  const checkouts = countEvents("CHECKOUT_COMPLETED");
  const dayMap = new Map<string, AdvisorAnalyticsOverview["days"][number]>();
  for (let index = 0; index < days; index += 1) {
    const day = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    dayMap.set(dateKey(day), {
      checkouts: 0,
      date: dateKey(day),
      noMatches: 0,
      recommendations: 0,
      sessions: 0,
    });
  }
  for (const event of aggregateEvents) {
    const day = dayMap.get(dateKey(event.createdAt));
    if (!day) {
      continue;
    }
    if (event.eventType === "SESSION_STARTED") {
      day.sessions += 1;
    } else if (event.eventType === "RECOMMENDATION_CREATED") {
      day.recommendations += 1;
    } else if (event.eventType === "NO_MATCH") {
      day.noMatches += 1;
    } else if (event.eventType === "CHECKOUT_COMPLETED") {
      day.checkouts += 1;
    }
  }
  const ratio = (numerator: number): number =>
    sessions === 0 ? 0 : Number((numerator / sessions).toFixed(4));
  return {
    conversion: {
      checkoutRate: ratio(checkouts),
      feedbackRate: ratio(feedback.length),
      recommendationRate: ratio(recommendations),
    },
    days: [...dayMap.values()],
    feedback: { negative, positive, total: feedback.length },
    noMatches: countEvents("NO_MATCH"),
    recommendations,
    sessions,
    technicalRequests: events.filter((event) => event.retention === "TECHNICAL")
      .length,
    turns: countEvents("TURN_COMPLETED"),
  };
};
