import { advisorAnalyticsEvent } from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, sql } from "drizzle-orm";

import type { Context } from "../runtime/context";
import {
  ADVISOR_DAILY_REQUEST_LIMIT,
  ADVISOR_DAILY_TOKEN_LIMIT,
  ADVISOR_QUOTA_WARNING_RATIO,
  recordAdvisorAnalyticsEvent,
} from "./analytics";
import { ADVISOR_MODEL_ID } from "./provider";

type AdvisorDatabase = Context["db"];
interface AdvisorSubject {
  userId: string | null;
  visitorCapabilityHash: string | null;
}

export const ADVISOR_VISITOR_SESSION_DAILY_LIMIT = 5;
export const ADVISOR_USER_SESSION_DAILY_LIMIT = 20;

const getUtcDayStart = (now: Date): Date => {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  return start;
};

const quotaError = (message: string) =>
  new ORPCError("TOO_MANY_REQUESTS", { message });

const countSessionStarts = async ({
  database,
  limit,
  now,
  where,
}: {
  database: AdvisorDatabase;
  limit: number;
  now: Date;
  where: ReturnType<typeof and>;
}): Promise<number> => {
  const rows = await database.query.advisorAnalyticsEvent.findMany({
    columns: { id: true },
    limit: limit + 1,
    where: and(
      where,
      eq(advisorAnalyticsEvent.eventType, "SESSION_STARTED"),
      gte(advisorAnalyticsEvent.createdAt, getUtcDayStart(now))
    ),
  });
  return rows.length;
};

export const enforceAdvisorSessionCreationLimit = async ({
  database,
  now = new Date(),
  requestIpHash,
  subject,
}: {
  database: AdvisorDatabase;
  now?: Date;
  requestIpHash?: string | null;
  subject: AdvisorSubject;
}): Promise<void> => {
  if (subject.userId) {
    const count = await countSessionStarts({
      database,
      limit: ADVISOR_USER_SESSION_DAILY_LIMIT,
      now,
      where: eq(advisorAnalyticsEvent.userId, subject.userId),
    });
    if (count >= ADVISOR_USER_SESSION_DAILY_LIMIT) {
      throw quotaError(
        "Bạn đã đạt giới hạn 20 Advisor session mới trong ngày. Hãy thử lại ngày mai."
      );
    }
    return;
  }

  if (!subject.visitorCapabilityHash) {
    return;
  }

  const browserCount = await countSessionStarts({
    database,
    limit: ADVISOR_VISITOR_SESSION_DAILY_LIMIT,
    now,
    where: eq(
      sql<string>`${advisorAnalyticsEvent.metadata}->>'visitorHash'`,
      subject.visitorCapabilityHash
    ),
  });
  if (browserCount >= ADVISOR_VISITOR_SESSION_DAILY_LIMIT) {
    throw quotaError(
      "Bạn đã đạt giới hạn 5 Advisor session mới trong ngày trên trình duyệt này."
    );
  }

  if (requestIpHash) {
    const ipCount = await countSessionStarts({
      database,
      limit: ADVISOR_VISITOR_SESSION_DAILY_LIMIT,
      now,
      where: eq(
        sql<string>`${advisorAnalyticsEvent.metadata}->>'ipHash'`,
        requestIpHash
      ),
    });
    if (ipCount >= ADVISOR_VISITOR_SESSION_DAILY_LIMIT) {
      throw quotaError(
        "Bạn đã đạt giới hạn Advisor session mới trong ngày từ mạng này."
      );
    }
  }
};

export interface AdvisorQuotaStatus {
  exhausted: boolean;
  requestLimit: number;
  requests: number;
  tokenLimit: number;
  tokens: number;
  warning: boolean;
}

const toQuotaStatus = (
  events: { metadata: Record<string, boolean | number | string | null> }[]
): AdvisorQuotaStatus => {
  let tokens = 0;
  for (const event of events) {
    const { tokenCount } = event.metadata;
    if (typeof tokenCount === "number") {
      tokens += tokenCount;
    }
  }
  const requests = events.length;
  return {
    exhausted:
      requests >= ADVISOR_DAILY_REQUEST_LIMIT ||
      tokens >= ADVISOR_DAILY_TOKEN_LIMIT,
    requestLimit: ADVISOR_DAILY_REQUEST_LIMIT,
    requests,
    tokenLimit: ADVISOR_DAILY_TOKEN_LIMIT,
    tokens,
    warning:
      requests >= ADVISOR_DAILY_REQUEST_LIMIT * ADVISOR_QUOTA_WARNING_RATIO ||
      tokens >= ADVISOR_DAILY_TOKEN_LIMIT * ADVISOR_QUOTA_WARNING_RATIO,
  };
};

export const getAdvisorQuotaStatus = async ({
  database,
  now = new Date(),
}: {
  database: AdvisorDatabase;
  now?: Date;
}): Promise<AdvisorQuotaStatus> => {
  const events = await database.query.advisorAnalyticsEvent.findMany({
    columns: { metadata: true },
    where: and(
      eq(advisorAnalyticsEvent.eventType, "MODEL_REQUEST"),
      gte(advisorAnalyticsEvent.createdAt, getUtcDayStart(now))
    ),
  });
  return toQuotaStatus(events);
};

export const estimateAdvisorTokenCount = (
  text: string,
  attachmentCount: number
): number =>
  Math.min(
    1_000_000,
    Math.max(1, Math.ceil(text.length / 4) + attachmentCount * 512)
  );

export const reserveAdvisorModelRequest = async ({
  attachmentCount,
  database,
  estimatedTokenCount,
  now = new Date(),
  sessionId,
  turnCount,
  userId,
}: {
  attachmentCount: number;
  database: AdvisorDatabase;
  estimatedTokenCount: number;
  now?: Date;
  sessionId: string;
  turnCount: number;
  userId: string | null;
}): Promise<AdvisorQuotaStatus> => {
  const current = await getAdvisorQuotaStatus({ database, now });
  if (
    current.exhausted ||
    current.requests + 1 > current.requestLimit ||
    current.tokens + estimatedTokenCount > current.tokenLimit
  ) {
    throw quotaError(
      "Advisor đã đạt giới hạn quota Groq trong ngày. Hãy thử lại sau hoặc duyệt danh mục dịch vụ."
    );
  }

  try {
    await recordAdvisorAnalyticsEvent({
      database,
      eventType: "MODEL_REQUEST",
      metadata: {
        attachmentCount,
        eventVersion: "v1",
        model: ADVISOR_MODEL_ID,
        status: "STARTED",
        tokenCount: estimatedTokenCount,
        turnCount,
      },
      sessionId,
      userId,
    });
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Advisor quota service is temporarily unavailable.",
    });
  }

  return {
    ...current,
    requests: current.requests + 1,
    tokens: current.tokens + estimatedTokenCount,
    warning:
      current.requests + 1 >=
        current.requestLimit * ADVISOR_QUOTA_WARNING_RATIO ||
      current.tokens + estimatedTokenCount >=
        current.tokenLimit * ADVISOR_QUOTA_WARNING_RATIO,
  };
};
