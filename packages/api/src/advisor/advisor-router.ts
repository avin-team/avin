import {
  advisorAttachment,
  advisorConsent,
  advisorMessage,
  advisorRecommendation,
  advisorSession,
} from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  buyerProcedure,
  publicProcedure,
} from "../access/procedures";
import type { Context } from "../runtime/context";
import {
  ADVISOR_CONSENT_VERSION,
  advisorConsentRecordInputSchema,
  advisorSessionCreateInputSchema,
  advisorSessionIdInputSchema,
  advisorTurnInputSchema,
  advisorTurnResponseSchema,
  buildAdvisorMessageInsert,
  getAdvisorSessionExpiry,
  getAdvisorSubject,
  hashVisitorCapability,
  isAdvisorConsentOwnedBy,
  orchestrateAdvisorTurn,
  revalidateAdvisorRecommendation,
} from "./advisor";
import {
  advisorAnalyticsTrackInputSchema,
  getAdvisorAnalyticsOverview,
  recordAdvisorAnalyticsEventBestEffort,
} from "./analytics";
import {
  commitAdvisorAttachments,
  deleteAdvisorAttachmentObjects,
  getOwnedAdvisorSession,
  loadOwnedAdvisorAttachments,
  readAdvisorAttachmentBytes,
} from "./attachments";
import {
  advisorFeedbackAttachmentInputSchema,
  advisorFeedbackDetailInputSchema,
  advisorFeedbackListInputSchema,
  advisorFeedbackSubmitInputSchema,
  getAdvisorFeedback,
  getAdvisorFeedbackAttachmentUrl,
  listAdvisorFeedback,
  submitAdvisorFeedback,
} from "./feedback";
import {
  advisorHandoffConfirmationInputSchema,
  advisorHandoffCopyAttachmentsInputSchema,
  advisorRecommendationSelectionInputSchema,
  confirmAdvisorHandoff,
  copyAdvisorHandoffAttachmentsToCheckout,
  selectAdvisorRecommendation,
} from "./handoff";
import {
  enforceAdvisorSessionCreationLimit,
  estimateAdvisorTokenCount,
  reserveAdvisorModelRequest,
} from "./quota";

const TERMS_PATH = "/terms";
const PRIVACY_PATH = "/privacy";

const requireProviderReady = async (context: Context): Promise<void> => {
  if (!context.advisorProvider) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Service Advisor provider is unavailable.",
    });
  }

  try {
    const status = await context.advisorProvider.getStatus();
    if (status.state !== "ACTIVE" || !status.contractVerifiedAt) {
      let message = "Service Advisor provider is unavailable.";
      if (status.state === "DISABLED") {
        message = "Service Advisor is disabled by Admin.";
      } else if (status.state === "INVALID") {
        message = "Service Advisor configuration is invalid.";
      }
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message,
      });
    }
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Service Advisor provider is unavailable.",
    });
  }
};

const requireOwnedSession = async (
  context: Context,
  sessionId: string,
  visitorCapability: string | undefined,
  { allowExpired = false }: { allowExpired?: boolean } = {}
) => {
  const session = await context.db.query.advisorSession.findFirst({
    where: eq(advisorSession.id, sessionId),
  });
  if (
    !session ||
    session.status === "DELETED" ||
    (!allowExpired && session.status === "EXPIRED")
  ) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor session not found.",
    });
  }

  const subject = getAdvisorSubject(context, visitorCapability);
  const ownsSession =
    (subject.userId !== null && session.userId === subject.userId) ||
    (subject.visitorCapabilityHash !== null &&
      session.visitorCapabilityHash === subject.visitorCapabilityHash);
  if (!ownsSession) {
    throw new ORPCError("FORBIDDEN", {
      message: "You do not have access to this Advisor session.",
    });
  }

  if (!allowExpired && session.expiresAt.getTime() <= Date.now()) {
    await context.db
      .update(advisorSession)
      .set({ status: "EXPIRED", updatedAt: new Date() })
      .where(eq(advisorSession.id, session.id));
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "This Advisor session has expired. Start a new session.",
    });
  }

  return session;
};

const touchSession = async (
  context: Context,
  session: typeof advisorSession.$inferSelect,
  now = new Date()
) => {
  const expiresAt = getAdvisorSessionExpiry(now, { userId: session.userId });
  const [updated] = await context.db
    .update(advisorSession)
    .set({ expiresAt, updatedAt: now })
    .where(eq(advisorSession.id, session.id))
    .returning();
  return updated ?? { ...session, expiresAt, updatedAt: now };
};

const stoppedTurnResponse = {
  browsePath: null,
  completed: false,
  kind: "STOPPED" as const,
  message: "Lượt tư vấn đã dừng và chưa tạo recommendation hoàn tất.",
  question: null,
  recommendation: null,
};

const containsLikelySecret = (text: string): boolean =>
  /\b(?:password|passwd|mật khẩu|otp|one[- ]time password|api[- ]?key|access[- ]?token|secret key|cvv|credit card)\b/iu.test(
    text
  );

const getAdvisorTurnErrorCode = (error: unknown): string =>
  error instanceof ORPCError ? error.code : "ADVISOR_TURN_FAILED";

const getAdvisorTurnErrorStatus = (
  error: unknown
): "ERROR" | "RATE_LIMITED" | "TIMEOUT" => {
  const code = getAdvisorTurnErrorCode(error);
  if (code === "TOO_MANY_REQUESTS") {
    return "RATE_LIMITED";
  }
  if (
    code === "TIMEOUT" ||
    (error instanceof Error && /timeout/iu.test(error.message))
  ) {
    return "TIMEOUT";
  }
  return "ERROR";
};

const toMessage = (message: typeof advisorMessage.$inferSelect) => ({
  createdAt: message.createdAt.toISOString(),
  id: message.id,
  metadata: message.metadata,
  role: message.role,
  sequence: message.sequence,
  text: message.text,
});

const toRecommendation = (
  recommendation: typeof advisorRecommendation.$inferSelect,
  availability: Readonly<Record<string, boolean>> = {}
) => {
  const payload = advisorTurnResponseSchema.shape.recommendation.safeParse(
    recommendation.payload
  );
  if (!payload.success || !payload.data) {
    return null;
  }

  const listings = payload.data.listings.map((listing) => ({
    ...listing,
    isAvailable: availability[listing.id] ?? true,
  }));
  return {
    createdAt: recommendation.createdAt.toISOString(),
    id: recommendation.id,
    ...payload.data,
    isAvailable: listings.every((listing) => listing.isAvailable),
    isCurrent: recommendation.isCurrent,
    listings,
  };
};

const sessionOutput = async (context: Context, sessionId: string) => {
  const [session, messages, recommendations] = await Promise.all([
    context.db.query.advisorSession.findFirst({
      where: eq(advisorSession.id, sessionId),
    }),
    context.db.query.advisorMessage.findMany({
      orderBy: [asc(advisorMessage.sequence)],
      where: eq(advisorMessage.sessionId, sessionId),
    }),
    context.db.query.advisorRecommendation.findMany({
      orderBy: [desc(advisorRecommendation.createdAt)],
      where: eq(advisorRecommendation.sessionId, sessionId),
    }),
  ]);
  if (!session) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor session not found.",
    });
  }

  const recommendationViews = await Promise.all(
    recommendations.map(async (item) => {
      const payload = advisorTurnResponseSchema.shape.recommendation.safeParse(
        item.payload
      );
      if (!payload.success || !payload.data) {
        return null;
      }

      const availability = await revalidateAdvisorRecommendation({
        database: context.db,
        recommendation: payload.data,
      });
      const isAvailable = Object.values(availability).every(Boolean);
      if (item.isCurrent && !isAvailable) {
        await context.db
          .update(advisorRecommendation)
          .set({ isCurrent: false })
          .where(eq(advisorRecommendation.id, item.id));
      }
      return toRecommendation(
        isAvailable ? item : { ...item, isCurrent: false },
        availability
      );
    })
  );

  return {
    expiresAt: session.expiresAt.toISOString(),
    generationStatus: session.generationStatus,
    id: session.id,
    messages: messages.map(toMessage),
    pinnedPlaybookId: session.pinnedPlaybookId,
    recommendations: recommendationViews.flatMap((item) =>
      item ? [item] : []
    ),
    serviceNeed: session.serviceNeed,
    status: session.status,
    turnCount: session.turnCount,
  };
};

export const advisorSessionRouter = {
  create: publicProcedure
    .input(advisorSessionCreateInputSchema)
    .handler(async ({ context, input }) => {
      const subject = getAdvisorSubject(context, input.visitorCapability);
      const consent = await context.db.query.advisorConsent.findFirst({
        where: eq(advisorConsent.id, input.consentId),
      });
      if (
        !consent ||
        consent.version !== ADVISOR_CONSENT_VERSION ||
        !isAdvisorConsentOwnedBy(consent, subject)
      ) {
        throw new ORPCError("FORBIDDEN", {
          message: "Record Advisor Consent before starting a session.",
        });
      }

      const now = new Date();
      await enforceAdvisorSessionCreationLimit({
        database: context.db,
        now,
        requestIpHash: context.requestIpHash,
        subject,
      });
      const [created] = await context.db
        .insert(advisorSession)
        .values({
          consentId: consent.id,
          creationIpHash: context.requestIpHash ?? null,
          expiresAt: getAdvisorSessionExpiry(now, subject),
          userId: subject.userId,
          visitorCapabilityHash: subject.visitorCapabilityHash,
        })
        .returning({
          expiresAt: advisorSession.expiresAt,
          id: advisorSession.id,
        });
      if (!created) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: "Advisor session could not be created.",
        });
      }

      await recordAdvisorAnalyticsEventBestEffort({
        database: context.db,
        eventType: "SESSION_STARTED",
        metadata: {
          eventVersion: "v1",
          ...(context.requestIpHash ? { ipHash: context.requestIpHash } : {}),
          ...(subject.visitorCapabilityHash
            ? { visitorHash: subject.visitorCapabilityHash }
            : {}),
        },
        sessionId: created.id,
        userId: subject.userId,
      });

      return {
        expiresAt: created.expiresAt.toISOString(),
        id: created.id,
        privacyPath: PRIVACY_PATH,
        termsPath: TERMS_PATH,
      };
    }),

  delete: publicProcedure
    .input(advisorSessionIdInputSchema)
    .handler(async ({ context, input }) => {
      const session = await requireOwnedSession(
        context,
        input.sessionId,
        input.visitorCapability,
        { allowExpired: true }
      );
      await recordAdvisorAnalyticsEventBestEffort({
        database: context.db,
        eventType: "SESSION_ABANDONED",
        metadata: { eventVersion: "v1" },
        sessionId: session.id,
        userId: session.userId,
      });
      if (context.storage) {
        const attachments =
          (await context.db.query.advisorAttachment.findMany({
            where: eq(advisorAttachment.sessionId, session.id),
          })) ?? [];
        await deleteAdvisorAttachmentObjects({
          attachments,
          storage: context.storage,
        });
      }
      await context.db
        .delete(advisorSession)
        .where(eq(advisorSession.id, session.id));
      return { deleted: true, id: session.id };
    }),

  get: publicProcedure
    .input(advisorSessionIdInputSchema)
    .handler(async ({ context, input }) => {
      const session = await requireOwnedSession(
        context,
        input.sessionId,
        input.visitorCapability
      );
      await touchSession(context, session);
      return sessionOutput(context, input.sessionId);
    }),

  link: publicProcedure
    .input(advisorSessionIdInputSchema)
    .handler(async ({ context, input }) => {
      const userId = context.session?.user.id;
      if (!userId) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Sign in before linking an Advisor session.",
        });
      }
      if (!input.visitorCapability) {
        throw new ORPCError("BAD_REQUEST", {
          message: "The original Visitor capability is required to link.",
        });
      }

      const session = await context.db.query.advisorSession.findFirst({
        where: eq(advisorSession.id, input.sessionId),
      });
      if (
        !session ||
        session.status === "DELETED" ||
        session.status === "EXPIRED"
      ) {
        throw new ORPCError("NOT_FOUND", {
          message: "Advisor session not found.",
        });
      }
      if (
        session.userId ||
        session.visitorCapabilityHash !==
          hashVisitorCapability(input.visitorCapability)
      ) {
        throw new ORPCError("FORBIDDEN", {
          message: "You do not have access to link this Advisor session.",
        });
      }
      if (session.expiresAt.getTime() <= Date.now()) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "This Advisor session has expired and cannot be linked.",
        });
      }

      const now = new Date();
      const [linked] = await context.db
        .update(advisorSession)
        .set({
          expiresAt: getAdvisorSessionExpiry(now, { userId }),
          updatedAt: now,
          userId,
          visitorCapabilityHash: null,
        })
        .where(
          and(
            eq(advisorSession.id, session.id),
            isNull(advisorSession.userId),
            eq(
              advisorSession.visitorCapabilityHash,
              hashVisitorCapability(input.visitorCapability)
            )
          )
        )
        .returning({
          expiresAt: advisorSession.expiresAt,
          id: advisorSession.id,
        });
      if (!linked) {
        throw new ORPCError("CONFLICT", {
          message: "Advisor session changed before it could be linked.",
        });
      }

      return {
        expiresAt: linked.expiresAt.toISOString(),
        id: linked.id,
        linked: true,
      };
    }),

  stop: publicProcedure
    .input(advisorSessionIdInputSchema)
    .handler(async ({ context, input }) => {
      const session = await requireOwnedSession(
        context,
        input.sessionId,
        input.visitorCapability
      );
      await touchSession(context, session);
      const now = new Date();
      const [stopped] = await context.db
        .update(advisorSession)
        .set({
          generationStartedAt: null,
          generationStatus: "STOPPED",
          updatedAt: now,
        })
        .where(
          and(
            eq(advisorSession.id, session.id),
            eq(advisorSession.generationStatus, "RUNNING")
          )
        )
        .returning({ id: advisorSession.id });
      return { id: session.id, stopped: Boolean(stopped) };
    }),

  turn: publicProcedure
    .input(advisorTurnInputSchema)
    .handler(async ({ context, input }) => {
      if (containsLikelySecret(input.text)) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Không gửi password, OTP, access token, thông tin thanh toán hoặc khóa bí mật cho Advisor.",
        });
      }
      const ownedSession = await requireOwnedSession(
        context,
        input.sessionId,
        input.visitorCapability
      );
      const session = await touchSession(context, ownedSession);

      if (input.idempotencyKey === session.lastIdempotencyKey) {
        const previous = advisorTurnResponseSchema.safeParse(
          session.lastTurnResponse
        );
        if (previous.success) {
          return { response: previous.data, sessionId: session.id };
        }
      }
      const attachmentIds = input.attachmentIds ?? [];
      const attachments = await loadOwnedAdvisorAttachments({
        attachmentIds,
        database: context.db,
        sessionId: session.id,
      });
      let attachmentBytes: Uint8Array[];
      try {
        attachmentBytes = await Promise.all(
          attachments.map((attachment) =>
            readAdvisorAttachmentBytes({
              attachment,
              storage: context.storage,
            })
          )
        );
      } catch {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Một hoặc nhiều ảnh Advisor không còn đọc được. Hãy tải ảnh mới hoặc tiếp tục bằng mô tả chữ.",
        });
      }
      if (attachmentBytes.some((bytes) => bytes.byteLength === 0)) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Một hoặc nhiều ảnh Advisor không còn đọc được. Hãy tải ảnh mới rồi thử lại.",
        });
      }
      const providerCheckStartedAt = Date.now();
      try {
        await requireProviderReady(context);
      } catch (error) {
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: "TURN_COMPLETED",
          metadata: {
            errorCode: getAdvisorTurnErrorCode(error),
            latencyMs: Date.now() - providerCheckStartedAt,
            status: getAdvisorTurnErrorStatus(error),
          },
          sessionId: session.id,
          userId: session.userId,
        });
        throw error;
      }

      const now = new Date();

      const [started] = await context.db
        .update(advisorSession)
        .set({
          generationStartedAt: now,
          generationStatus: "RUNNING",
          updatedAt: now,
        })
        .where(
          and(
            eq(advisorSession.id, session.id),
            inArray(advisorSession.generationStatus, [
              "IDLE",
              "STOPPED",
              "FAILED",
            ])
          )
        )
        .returning({ id: advisorSession.id });
      if (!started) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Another Advisor turn is already active.",
        });
      }

      const turnStartedAt = Date.now();
      try {
        await reserveAdvisorModelRequest({
          attachmentCount: attachments.length,
          database: context.db,
          estimatedTokenCount: estimateAdvisorTokenCount(
            input.text,
            attachments.length
          ),
          sessionId: session.id,
          turnCount: session.turnCount + 1,
          userId: session.userId,
        });
      } catch (error) {
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: "TURN_COMPLETED",
          metadata: {
            errorCode: getAdvisorTurnErrorCode(error),
            latencyMs: Date.now() - turnStartedAt,
            status: getAdvisorTurnErrorStatus(error),
          },
          sessionId: session.id,
          userId: session.userId,
        });
        await context.db
          .update(advisorSession)
          .set({
            generationStartedAt: null,
            generationStatus: "FAILED",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(advisorSession.id, session.id),
              eq(advisorSession.generationStatus, "RUNNING")
            )
          );
        throw error;
      }

      await recordAdvisorAnalyticsEventBestEffort({
        database: context.db,
        eventType: "ANSWER_SUBMITTED",
        metadata: {
          attachmentCount: attachments.length,
          turnCount: session.turnCount + 1,
        },
        sessionId: session.id,
        userId: session.userId,
      });

      let computation;
      try {
        computation = await orchestrateAdvisorTurn({
          database: context.db,
          session,
          text: input.text,
        });
      } catch (error) {
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: "TURN_COMPLETED",
          metadata: {
            errorCode: getAdvisorTurnErrorCode(error),
            latencyMs: Date.now() - turnStartedAt,
            status: getAdvisorTurnErrorStatus(error),
          },
          sessionId: session.id,
          userId: session.userId,
        });
        await context.db
          .update(advisorSession)
          .set({
            generationStartedAt: null,
            generationStatus: "FAILED",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(advisorSession.id, session.id),
              eq(advisorSession.generationStatus, "RUNNING")
            )
          );
        throw error;
      }
      let response: ReturnType<typeof advisorTurnResponseSchema.parse>;
      try {
        response = advisorTurnResponseSchema.parse({
          ...computation.response,
          message:
            attachments.length > 0
              ? `${computation.response.message} Mình đã nhận ${attachments.length} ảnh riêng tư làm ngữ cảnh cho lượt này; ảnh không được hiển thị công khai.`
              : computation.response.message,
        });
        await context.db.transaction(async (transaction) => {
          const [finalized] = await transaction
            .update(advisorSession)
            .set({
              answers: computation.answers,
              expiresAt: getAdvisorSessionExpiry(now, {
                userId: session.userId,
              }),
              generationStartedAt: null,
              generationStatus: "IDLE",
              lastIdempotencyKey: input.idempotencyKey,
              lastTurnResponse: response,
              pendingQuestionId: computation.pendingQuestionId,
              pinnedPlaybookId: computation.pinnedPlaybookId,
              pinnedSubCategoryId: computation.pinnedSubCategoryId,
              serviceNeed: computation.serviceNeed,
              turnCount: session.turnCount + 1,
              updatedAt: now,
            })
            .where(
              and(
                eq(advisorSession.id, session.id),
                eq(advisorSession.generationStatus, "RUNNING")
              )
            )
            .returning({ id: advisorSession.id });
          if (!finalized) {
            throw new ORPCError("PRECONDITION_FAILED", {
              message: "Advisor turn was stopped before completion.",
            });
          }

          const userSequence = session.turnCount * 2 + 1;
          if (response.kind === "RECOMMENDATION") {
            await transaction
              .update(advisorRecommendation)
              .set({ isCurrent: false })
              .where(
                and(
                  eq(advisorRecommendation.sessionId, session.id),
                  eq(advisorRecommendation.isCurrent, true)
                )
              );
          }

          const userMessageId = crypto.randomUUID();
          const assistantMessageId = crypto.randomUUID();
          await transaction.insert(advisorMessage).values(
            buildAdvisorMessageInsert({
              attachmentIds,
              id: userMessageId,
              role: "USER",
              sequence: userSequence,
              sessionId: session.id,
              text: input.text,
            })
          );
          await transaction.insert(advisorMessage).values(
            buildAdvisorMessageInsert({
              id: assistantMessageId,
              response,
              role: "ASSISTANT",
              sequence: userSequence + 1,
              sessionId: session.id,
              text: response.message,
            })
          );

          await commitAdvisorAttachments({
            attachments,
            database: transaction as unknown as Context["db"],
            expiresAt: session.expiresAt,
            messageId: userMessageId,
            sessionId: session.id,
          });

          if (response.kind === "RECOMMENDATION" && response.recommendation) {
            const playbookId =
              computation.pinnedPlaybookId ?? session.pinnedPlaybookId;
            if (!playbookId) {
              throw new ORPCError("SERVICE_UNAVAILABLE", {
                message: "Advisor recommendation is missing its Playbook pin.",
              });
            }
            await transaction.insert(advisorRecommendation).values({
              payload: response.recommendation,
              playbookId,
              sessionId: session.id,
            });
          }
        });
      } catch (error) {
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: "TURN_COMPLETED",
          metadata: {
            errorCode: getAdvisorTurnErrorCode(error),
            latencyMs: Date.now() - turnStartedAt,
            status: getAdvisorTurnErrorStatus(error),
          },
          sessionId: session.id,
          userId: session.userId,
        });
        await context.db
          .update(advisorSession)
          .set({
            generationStartedAt: null,
            generationStatus: "FAILED",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(advisorSession.id, session.id),
              eq(advisorSession.generationStatus, "RUNNING")
            )
          );
        const latest = await context.db.query.advisorSession.findFirst({
          where: eq(advisorSession.id, session.id),
        });
        if (latest?.generationStatus === "STOPPED") {
          await context.db
            .update(advisorSession)
            .set({ generationStartedAt: null, generationStatus: "IDLE" })
            .where(eq(advisorSession.id, session.id));
          return { response: stoppedTurnResponse, sessionId: session.id };
        }
        throw error;
      }

      await recordAdvisorAnalyticsEventBestEffort({
        database: context.db,
        eventType: "TURN_COMPLETED",
        metadata: {
          attachmentCount: attachments.length,
          firstTokenLatencyMs: Date.now() - turnStartedAt,
          latencyMs: Date.now() - turnStartedAt,
          status: "SUCCESS",
          turnCount: session.turnCount + 1,
        },
        sessionId: session.id,
        userId: session.userId,
      });
      if (response.kind === "RECOMMENDATION") {
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: "RECOMMENDATION_CREATED",
          metadata: { turnCount: session.turnCount + 1 },
          sessionId: session.id,
          userId: session.userId,
        });
      } else if (response.kind === "NO_MATCH") {
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: "NO_MATCH",
          metadata: { turnCount: session.turnCount + 1 },
          sessionId: session.id,
          userId: session.userId,
        });
      }

      return { response, sessionId: session.id };
    }),
};

export const advisorConsentRouter = {
  record: publicProcedure
    .input(advisorConsentRecordInputSchema)
    .handler(async ({ context, input }) => {
      const subject = getAdvisorSubject(context, input.visitorCapability);
      const now = new Date();
      const [created] = await context.db
        .insert(advisorConsent)
        .values({
          acceptedAt: now,
          userId: subject.userId,
          version: input.version,
          visitorCapabilityHash: subject.visitorCapabilityHash,
        })
        .returning({
          acceptedAt: advisorConsent.acceptedAt,
          id: advisorConsent.id,
        });
      if (!created) {
        throw new ORPCError("SERVICE_UNAVAILABLE", {
          message: "Advisor Consent could not be recorded.",
        });
      }

      return {
        acceptedAt: created.acceptedAt.toISOString(),
        consentId: created.id,
        privacyPath: PRIVACY_PATH,
        termsPath: TERMS_PATH,
        version: input.version,
      };
    }),
};

export const advisorPublicRouter = {
  analytics: {
    overview: adminProcedure
      .input(
        z.strictObject({
          timeframe: z.enum(["7d", "30d", "90d"]).default("30d"),
        })
      )
      .handler(({ context, input }) =>
        getAdvisorAnalyticsOverview({
          database: context.db,
          timeframe: input.timeframe,
        })
      ),
    track: publicProcedure
      .input(advisorAnalyticsTrackInputSchema)
      .handler(async ({ context, input }) => {
        const owner = getAdvisorSubject(context, input.visitorCapability);
        const session = await getOwnedAdvisorSession({
          database: context.db,
          owner,
          sessionId: input.sessionId,
        });
        await recordAdvisorAnalyticsEventBestEffort({
          database: context.db,
          eventType: input.eventType,
          metadata: input.metadata,
          sessionId: session.id,
          userId: owner.userId,
        });
        return { recorded: true };
      }),
  },
  consent: advisorConsentRouter,
  feedback: {
    attachmentUrl: adminProcedure
      .input(advisorFeedbackAttachmentInputSchema)
      .handler(({ context, input }) =>
        getAdvisorFeedbackAttachmentUrl({
          adminUserId: context.session.user.id,
          attachmentId: input.attachmentId,
          audit: context.audit,
          database: context.db,
          feedbackId: input.feedbackId,
        })
      ),
    detail: adminProcedure
      .input(advisorFeedbackDetailInputSchema)
      .handler(({ context, input }) =>
        getAdvisorFeedback({
          adminUserId: context.session.user.id,
          audit: context.audit,
          database: context.db,
          feedbackId: input.feedbackId,
        })
      ),
    list: adminProcedure
      .input(advisorFeedbackListInputSchema)
      .handler(({ context, input }) =>
        listAdvisorFeedback({ database: context.db, input })
      ),
    submit: publicProcedure
      .input(advisorFeedbackSubmitInputSchema)
      .handler(({ context, input }) =>
        submitAdvisorFeedback({
          database: context.db,
          input,
          owner: getAdvisorSubject(context, input.visitorCapability),
        })
      ),
  },
  handoff: {
    confirm: publicProcedure
      .input(advisorHandoffConfirmationInputSchema)
      .handler(({ context, input }) =>
        confirmAdvisorHandoff({
          attachmentIds: input.attachmentIds,
          database: context.db,
          handoffId: input.handoffId,
          includeSummaryInCheckout: input.includeSummaryInCheckout,
          owner: getAdvisorSubject(context, input.visitorCapability),
          sessionId: input.sessionId,
          summary: input.summary,
        })
      ),
    copyAttachments: buyerProcedure
      .input(advisorHandoffCopyAttachmentsInputSchema)
      .handler(({ context, input }) =>
        copyAdvisorHandoffAttachmentsToCheckout({
          attachmentIds: input.attachmentIds,
          buyerId: context.session.user.id,
          checkoutKey: input.checkoutKey,
          database: context.db,
          handoffId: input.handoffId,
          listingId: input.listingId,
          sessionId: input.sessionId,
          storage: context.storage,
        })
      ),
    select: publicProcedure
      .input(advisorRecommendationSelectionInputSchema)
      .handler(({ context, input }) =>
        selectAdvisorRecommendation({
          database: context.db,
          owner: getAdvisorSubject(context, input.visitorCapability),
          recommendationId: input.recommendationId,
          sessionId: input.sessionId,
        })
      ),
  },
  session: advisorSessionRouter,
};
