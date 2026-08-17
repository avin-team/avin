import {
  advisorAnalyticsEvent,
  advisorAnalyticsEventType,
} from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, lt, or } from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../runtime/context";
import type { AdvisorRolloutGate, AdvisorRolloutStatus } from "./rollout";

type AdvisorDatabase = Context["db"];

const ADVISOR_ANALYTICS_MONTH_RETENTION = 13;
const ADVISOR_TECHNICAL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const ADVISOR_DAILY_REQUEST_LIMIT = 1000;
export const ADVISOR_DAILY_TOKEN_LIMIT = 200_000;
export const ADVISOR_QUOTA_WARNING_RATIO = 0.8;

export const advisorAnalyticsEventTypeSchema = z.enum(
  advisorAnalyticsEventType.enumValues
);

export const advisorAnalyticsMetadataSchema = z.strictObject({
  attachmentCount: z.number().int().nonnegative().max(5).optional(),
  errorCode: z.string().trim().min(1).max(120).optional(),
  eventVersion: z.string().trim().min(1).max(32).optional(),
  firstTokenLatencyMs: z.number().int().nonnegative().max(120_000).optional(),
  ipHash: z.string().trim().min(32).max(128).optional(),
  latencyMs: z.number().int().nonnegative().max(120_000).optional(),
  listingId: z.uuid().optional(),
  model: z.string().trim().min(1).max(120).optional(),
  providerRequestId: z.string().trim().min(1).max(160).optional(),
  recommendationId: z.uuid().optional(),
  sentiment: z.enum(["NEGATIVE", "POSITIVE"]).optional(),
  status: z
    .enum(["ERROR", "RATE_LIMITED", "STARTED", "SUCCESS", "TIMEOUT"])
    .optional(),
  tokenCount: z.number().int().nonnegative().max(1_000_000).optional(),
  toolName: z.string().trim().min(1).max(120).optional(),
  turnCount: z.number().int().nonnegative().max(100).optional(),
  visitorHash: z.string().trim().min(32).max(128).optional(),
});

const advisorPublicAnalyticsMetadataSchema =
  advisorAnalyticsMetadataSchema.omit({ ipHash: true, visitorHash: true });

export const advisorAnalyticsTrackInputSchema = z.strictObject({
  eventType: advisorAnalyticsEventTypeSchema.exclude([
    "MODEL_REQUEST",
    "SESSION_STARTED",
  ]),
  metadata: advisorPublicAnalyticsMetadataSchema.default({}),
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
  errors: {
    byCode: { code: string; count: number }[];
    count: number;
    providerUnavailable: number;
    rate: number;
    rateLimited: number;
    timeout: number;
  };
  latency: {
    firstTokenP95Ms: number | null;
    imageTurnP95Ms: number | null;
    turnP95Ms: number | null;
  };
  model: string | null;
  noMatches: number;
  quota: {
    exhausted: boolean;
    requestLimit: number;
    requests: number;
    tokenLimit: number;
    tokens: number;
    warning: boolean;
  };
  rollout: AdvisorRolloutStatus;
  recommendations: number;
  sessions: number;
  technicalTokens: number;
  technicalRequests: number;
  turns: number;
}

const percentile = (values: number[], ratio: number): number | null => {
  if (values.length === 0) {
    return null;
  }
  const sorted = values.toSorted((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * ratio) - 1
  );
  return sorted[index] ?? null;
};

interface AdvisorAnalyticsRow {
  createdAt: Date;
  eventType: AdvisorAnalyticsEventType;
  metadata: AdvisorAnalyticsMetadata;
  retention: "AGGREGATE" | "TECHNICAL";
}

const getTimeframeDays = (timeframe: "7d" | "30d" | "90d"): number => {
  if (timeframe === "7d") {
    return 7;
  }
  if (timeframe === "90d") {
    return 90;
  }
  return 30;
};

const summarizeTechnicalEvents = (events: AdvisorAnalyticsRow[]) => {
  const modelNames = new Set<string>();
  let tokens = 0;
  for (const event of events) {
    const { model, tokenCount } = event.metadata;
    if (typeof model === "string") {
      modelNames.add(model);
    }
    if (typeof tokenCount === "number") {
      tokens += tokenCount;
    }
  }
  let model: string | null = null;
  if (modelNames.size === 1) {
    model = modelNames.values().next().value ?? null;
  } else if (modelNames.size > 1) {
    model = "multiple";
  }
  return { model, tokens };
};

const summarizeTurnEvents = (turnEvents: AdvisorAnalyticsRow[]) => {
  const errorCounts = new Map<string, number>();
  const firstTokenLatencies: number[] = [];
  const imageTurnLatencies: number[] = [];
  const turnLatencies: number[] = [];
  let providerUnavailable = 0;
  let rateLimited = 0;
  let timeout = 0;

  for (const event of turnEvents) {
    const {
      attachmentCount,
      errorCode,
      firstTokenLatencyMs,
      latencyMs,
      status,
    } = event.metadata;
    if (typeof firstTokenLatencyMs === "number") {
      firstTokenLatencies.push(firstTokenLatencyMs);
    }
    if (typeof latencyMs === "number") {
      turnLatencies.push(latencyMs);
      if (attachmentCount && attachmentCount > 0) {
        imageTurnLatencies.push(latencyMs);
      }
    }
    if (status === "RATE_LIMITED") {
      rateLimited += 1;
    }
    if (status === "TIMEOUT") {
      timeout += 1;
    }
    if (errorCode === "SERVICE_UNAVAILABLE") {
      providerUnavailable += 1;
    }
    if (status === undefined || status === "SUCCESS") {
      continue;
    }
    const code = typeof errorCode === "string" ? errorCode : status;
    errorCounts.set(code, (errorCounts.get(code) ?? 0) + 1);
  }

  const errorCount = [...errorCounts.values()].reduce(
    (total, count) => total + count,
    0
  );
  return {
    errorCount,
    errorCounts,
    firstTokenP95Ms: percentile(firstTokenLatencies, 0.95),
    imageTurnP95Ms: percentile(imageTurnLatencies, 0.95),
    providerUnavailable,
    rateLimited,
    timeout,
    turnP95Ms: percentile(turnLatencies, 0.95),
  };
};

const getTrendDays = (
  aggregateEvents: AdvisorAnalyticsRow[],
  days: number,
  start: Date
): AdvisorAnalyticsOverview["days"] => {
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
  return [...dayMap.values()];
};

export const getAdvisorAnalyticsOverview = async ({
  database,
  now = new Date(),
  rollout,
  timeframe = "30d",
}: {
  database: AdvisorDatabase;
  now?: Date;
  rollout?: AdvisorRolloutGate;
  timeframe?: "7d" | "30d" | "90d";
}): Promise<AdvisorAnalyticsOverview> => {
  const days = getTimeframeDays(timeframe);
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const events = (await database
    .select({
      createdAt: advisorAnalyticsEvent.createdAt,
      eventType: advisorAnalyticsEvent.eventType,
      metadata: advisorAnalyticsEvent.metadata,
      retention: advisorAnalyticsEvent.retention,
    })
    .from(advisorAnalyticsEvent)
    .where(
      gte(advisorAnalyticsEvent.createdAt, start)
    )) as AdvisorAnalyticsRow[];

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
  const technicalEvents = events.filter(
    (event) => event.retention === "TECHNICAL"
  );
  const turnEvents = aggregateEvents.filter(
    (event) => event.eventType === "TURN_COMPLETED"
  );
  const errorEvents = turnEvents.filter(
    (event) =>
      event.metadata.status !== undefined && event.metadata.status !== "SUCCESS"
  );
  const technical = summarizeTechnicalEvents(technicalEvents);
  const turnHealth = summarizeTurnEvents(turnEvents);
  const quotaDayStart = new Date(now);
  quotaDayStart.setUTCHours(0, 0, 0, 0);
  const quotaEvents = technicalEvents.filter(
    (event) => event.createdAt >= quotaDayStart
  );
  let quotaTokens = 0;
  for (const event of quotaEvents) {
    const { tokenCount } = event.metadata;
    if (typeof tokenCount === "number") {
      quotaTokens += tokenCount;
    }
  }
  const quota = {
    exhausted:
      quotaEvents.length >= ADVISOR_DAILY_REQUEST_LIMIT ||
      quotaTokens >= ADVISOR_DAILY_TOKEN_LIMIT,
    requestLimit: ADVISOR_DAILY_REQUEST_LIMIT,
    requests: quotaEvents.length,
    tokenLimit: ADVISOR_DAILY_TOKEN_LIMIT,
    tokens: quotaTokens,
    warning:
      quotaEvents.length >=
        ADVISOR_DAILY_REQUEST_LIMIT * ADVISOR_QUOTA_WARNING_RATIO ||
      quotaTokens >= ADVISOR_DAILY_TOKEN_LIMIT * ADVISOR_QUOTA_WARNING_RATIO,
  };
  const trendDays = getTrendDays(aggregateEvents, days, start);
  const ratio = (numerator: number): number =>
    sessions === 0 ? 0 : Number((numerator / sessions).toFixed(4));
  const turns = aggregateEvents.filter(
    (event) =>
      event.eventType === "TURN_COMPLETED" &&
      (event.metadata.status === undefined ||
        event.metadata.status === "SUCCESS")
  ).length;
  return {
    conversion: {
      checkoutRate: ratio(checkouts),
      feedbackRate: ratio(feedback.length),
      recommendationRate: ratio(recommendations),
    },
    days: trendDays,
    errors: {
      byCode: [...turnHealth.errorCounts.entries()]
        .map(([code, count]) => ({ code, count }))
        .toSorted((left, right) => right.count - left.count),
      count: turnHealth.errorCount,
      providerUnavailable: turnHealth.providerUnavailable,
      rate:
        turnEvents.length === 0
          ? 0
          : Number((errorEvents.length / turnEvents.length).toFixed(4)),
      rateLimited: turnHealth.rateLimited,
      timeout: turnHealth.timeout,
    },
    feedback: { negative, positive, total: feedback.length },
    latency: {
      firstTokenP95Ms: turnHealth.firstTokenP95Ms,
      imageTurnP95Ms: turnHealth.imageTurnP95Ms,
      turnP95Ms: turnHealth.turnP95Ms,
    },
    model: technical.model,
    noMatches: countEvents("NO_MATCH"),
    quota,
    recommendations,
    rollout: rollout?.getStatus() ?? {
      allowlistSize: 0,
      enabled: true,
      percentage: 100,
    },
    sessions,
    technicalRequests: technicalEvents.length,
    technicalTokens: technical.tokens,
    turns,
  };
};
