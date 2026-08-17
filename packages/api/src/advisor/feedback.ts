import {
  advisorAttachment,
  advisorFeedback,
  advisorMessage,
  advisorRecommendation,
} from "@avin/db/schema/advisor";
import { env } from "@avin/env/server";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";

import type { AuditRecorder, Context } from "../runtime/context";
import { advisorVisitorCapabilitySchema } from "./advisor";
import {
  advisorAnalyticsMetadataSchema,
  recordAdvisorAnalyticsEventBestEffort,
} from "./analytics";
import { getOwnedAdvisorSession } from "./attachments";

type AdvisorDatabase = Context["db"];

const ADVISOR_FEEDBACK_REASON_MAX_LENGTH = 500;
const ADVISOR_FEEDBACK_ATTACHMENT_MAX_COUNT = 5;

export const advisorFeedbackSubmitInputSchema = z.strictObject({
  attachmentIds: z
    .array(z.uuid())
    .max(ADVISOR_FEEDBACK_ATTACHMENT_MAX_COUNT)
    .default([]),
  attachmentsConsent: z.boolean().default(false),
  includeConversation: z.boolean().default(false),
  reason: z.string().trim().max(ADVISOR_FEEDBACK_REASON_MAX_LENGTH).optional(),
  recommendationId: z.uuid(),
  sentiment: z.enum(["NEGATIVE", "POSITIVE"]),
  sessionId: z.uuid(),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

export const advisorFeedbackListInputSchema = z.strictObject({
  limit: z.number().int().min(1).max(100).default(50),
  sentiment: z.enum(["NEGATIVE", "POSITIVE"]).optional(),
});

export const advisorFeedbackDetailInputSchema = z.strictObject({
  feedbackId: z.uuid(),
});

export const advisorFeedbackAttachmentInputSchema = z.strictObject({
  attachmentId: z.uuid(),
  feedbackId: z.uuid(),
});

const getSharedAttachmentRows = async ({
  attachmentIds,
  database,
  now,
  requireAll = true,
  sessionId,
}: {
  attachmentIds: readonly string[];
  database: AdvisorDatabase;
  now: Date;
  requireAll?: boolean;
  sessionId: string;
}) => {
  if (attachmentIds.length === 0) {
    return [];
  }
  const uniqueIds = new Set(attachmentIds);
  if (uniqueIds.size !== attachmentIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Mỗi ảnh Feedback chỉ được chọn một lần.",
    });
  }
  const rows = await database.query.advisorAttachment.findMany({
    where: and(
      eq(advisorAttachment.sessionId, sessionId),
      eq(advisorAttachment.status, "COMMITTED"),
      gte(advisorAttachment.expiresAt, now),
      inArray(advisorAttachment.id, [...uniqueIds])
    ),
  });
  if (requireAll && rows.length !== attachmentIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Một hoặc nhiều ảnh Feedback không còn khả dụng.",
    });
  }
  return attachmentIds.flatMap((id) => {
    const row = rows.find((candidate) => candidate.id === id);
    return row ? [row] : [];
  });
};

export const submitAdvisorFeedback = async ({
  database,
  input,
  now = new Date(),
  owner,
}: {
  database: AdvisorDatabase;
  input: z.infer<typeof advisorFeedbackSubmitInputSchema>;
  now?: Date;
  owner: { userId: string | null; visitorCapabilityHash: string | null };
}) => {
  const session = await getOwnedAdvisorSession({
    database,
    now,
    owner,
    sessionId: input.sessionId,
  });
  const recommendation = await database.query.advisorRecommendation.findFirst({
    where: and(
      eq(advisorRecommendation.id, input.recommendationId),
      eq(advisorRecommendation.sessionId, session.id)
    ),
  });
  if (!recommendation) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor recommendation not found.",
    });
  }
  if (input.attachmentIds.length > 0 && !input.attachmentsConsent) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cần đồng ý riêng trước khi gửi ảnh kèm Feedback.",
    });
  }
  await getSharedAttachmentRows({
    attachmentIds: input.attachmentIds,
    database,
    now,
    sessionId: session.id,
  });
  const [saved] = await database
    .insert(advisorFeedback)
    .values({
      attachmentConsentAt: input.attachmentIds.length > 0 ? now : null,
      attachmentIds: input.attachmentIds,
      createdAt: now,
      reason: input.reason?.trim() || null,
      recommendationId: recommendation.id,
      sentiment: input.sentiment,
      sessionId: session.id,
      shareConversation: input.includeConversation,
      updatedAt: now,
      userId: owner.userId,
      visitorCapabilityHash: owner.visitorCapabilityHash,
    })
    .onConflictDoUpdate({
      set: {
        attachmentConsentAt: input.attachmentIds.length > 0 ? now : null,
        attachmentIds: input.attachmentIds,
        reason: input.reason?.trim() || null,
        sentiment: input.sentiment,
        shareConversation: input.includeConversation,
        updatedAt: now,
        userId: owner.userId,
        visitorCapabilityHash: owner.visitorCapabilityHash,
      },
      target: [advisorFeedback.sessionId, advisorFeedback.recommendationId],
    })
    .returning({ id: advisorFeedback.id });
  if (!saved) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Advisor Feedback could not be saved.",
    });
  }
  await recordAdvisorAnalyticsEventBestEffort({
    database,
    eventType: "FEEDBACK_SUBMITTED",
    metadata: {
      attachmentCount: input.attachmentIds.length,
      recommendationId: recommendation.id,
      sentiment: input.sentiment,
    },
    sessionId: session.id,
    userId: owner.userId,
  });
  return {
    attachmentCount: input.attachmentIds.length,
    feedbackId: saved.id,
    includeConversation: input.includeConversation,
    sentiment: input.sentiment,
  };
};

export const listAdvisorFeedback = async ({
  database,
  input,
}: {
  database: AdvisorDatabase;
  input: z.infer<typeof advisorFeedbackListInputSchema>;
}) => {
  const rows = await database
    .select()
    .from(advisorFeedback)
    .where(
      input.sentiment
        ? eq(advisorFeedback.sentiment, input.sentiment)
        : undefined
    )
    .orderBy(desc(advisorFeedback.createdAt))
    .limit(input.limit);
  return rows.map((row) => ({
    attachmentCount: row.attachmentIds.length,
    createdAt: row.createdAt.toISOString(),
    feedbackId: row.id,
    includeConversation: row.shareConversation,
    reason: row.reason,
    sentiment: row.sentiment,
  }));
};

const toSharedMessage = (message: typeof advisorMessage.$inferSelect) => ({
  createdAt: message.createdAt.toISOString(),
  id: message.id,
  role: message.role,
  sequence: message.sequence,
  text: message.text,
});

const toSharedAttachment = (
  attachment: typeof advisorAttachment.$inferSelect
) => ({
  byteSize: attachment.byteSize,
  contentType: attachment.contentType,
  fileName: attachment.fileName,
  height: attachment.height,
  id: attachment.id,
  width: attachment.width,
});

export const getAdvisorFeedback = async ({
  audit,
  database,
  feedbackId,
  now = new Date(),
  adminUserId,
}: {
  adminUserId: string;
  audit: AuditRecorder;
  database: AdvisorDatabase;
  feedbackId: string;
  now?: Date;
}) => {
  const row = await database.query.advisorFeedback.findFirst({
    where: eq(advisorFeedback.id, feedbackId),
  });
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor Feedback not found.",
    });
  }
  await audit.record({
    action: "advisor.feedback.sensitive_read",
    actorUserId: adminUserId,
    metadata: {
      attachmentCount: row.attachmentIds.length,
      sharedConversation: row.shareConversation,
    },
    outcome: "SUCCESS",
    targetId: row.id,
    targetType: "ADVISOR_FEEDBACK",
  });
  const [messages, attachments] = await Promise.all([
    row.shareConversation
      ? database.query.advisorMessage.findMany({
          orderBy: [asc(advisorMessage.sequence)],
          where: eq(advisorMessage.sessionId, row.sessionId),
        })
      : Promise.resolve([]),
    getSharedAttachmentRows({
      attachmentIds: row.attachmentIds,
      database,
      now,
      requireAll: false,
      sessionId: row.sessionId,
    }),
  ]);
  return {
    attachments: attachments.map(toSharedAttachment),
    conversation: row.shareConversation ? messages.map(toSharedMessage) : null,
    createdAt: row.createdAt.toISOString(),
    feedbackId: row.id,
    includeConversation: row.shareConversation,
    reason: row.reason,
    sentiment: row.sentiment,
  };
};

const createSignedAdvisorAttachmentUrl = async (
  storageKey: string
): Promise<{ url: string }> => {
  const objectPath = storageKey.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    new URL(
      `/storage/v1/object/sign/advisor-attachments/${objectPath}`,
      env.SUPABASE_URL
    ),
    {
      body: JSON.stringify({ expiresIn: 600 }),
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SECRET_KEY,
      },
      method: "POST",
    }
  );
  if (!response.ok) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn mở ảnh Feedback.",
    });
  }
  const result = (await response.json()) as { signedURL?: string };
  if (!result.signedURL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn mở ảnh Feedback.",
    });
  }
  const signedPath = result.signedURL.startsWith("/storage/v1/")
    ? result.signedURL
    : `/storage/v1${result.signedURL}`;
  return { url: new URL(signedPath, env.SUPABASE_URL).toString() };
};

export const getAdvisorFeedbackAttachmentUrl = async ({
  adminUserId,
  audit,
  attachmentId,
  database,
  feedbackId,
  now = new Date(),
}: {
  adminUserId: string;
  audit: AuditRecorder;
  attachmentId: string;
  database: AdvisorDatabase;
  feedbackId: string;
  now?: Date;
}) => {
  const row = await database.query.advisorFeedback.findFirst({
    where: eq(advisorFeedback.id, feedbackId),
  });
  if (!row || !row.attachmentIds.includes(attachmentId)) {
    throw new ORPCError("NOT_FOUND", {
      message: "Ảnh Feedback không được chia sẻ hoặc không tồn tại.",
    });
  }
  const attachment = await database.query.advisorAttachment.findFirst({
    where: and(
      eq(advisorAttachment.id, attachmentId),
      eq(advisorAttachment.sessionId, row.sessionId),
      eq(advisorAttachment.status, "COMMITTED"),
      gte(advisorAttachment.expiresAt, now)
    ),
  });
  if (!attachment) {
    throw new ORPCError("NOT_FOUND", {
      message: "Ảnh Feedback không còn khả dụng.",
    });
  }
  await audit.record({
    action: "advisor.feedback.attachment_read",
    actorUserId: adminUserId,
    metadata: advisorAnalyticsMetadataSchema.parse({
      attachmentCount: 1,
    }),
    outcome: "SUCCESS",
    targetId: feedbackId,
    targetType: "ADVISOR_FEEDBACK_ATTACHMENT",
  });
  return createSignedAdvisorAttachmentUrl(attachment.storageKey);
};
