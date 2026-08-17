import {
  advisorConsent,
  advisorMessage,
  advisorRecommendation,
  advisorSession,
} from "@avin/db/schema/advisor";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";

import { publicProcedure } from "../access/procedures";
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
  isAdvisorConsentOwnedBy,
  orchestrateAdvisorTurn,
} from "./advisor";

const TERMS_PATH = "/terms";
const PRIVACY_PATH = "/privacy";

const requireProviderReady = async (context: Context): Promise<void> => {
  if (!context.advisorProvider) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Service Advisor is temporarily unavailable.",
    });
  }

  try {
    const status = await context.advisorProvider.getStatus();
    if (status.state !== "ACTIVE" || !status.contractVerifiedAt) {
      throw new ORPCError("SERVICE_UNAVAILABLE", {
        message: "Service Advisor is temporarily unavailable.",
      });
    }
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Service Advisor is temporarily unavailable.",
    });
  }
};

const requireOwnedSession = async (
  context: Context,
  sessionId: string,
  visitorCapability: string | undefined
) => {
  const session = await context.db.query.advisorSession.findFirst({
    where: eq(advisorSession.id, sessionId),
  });
  if (!session || session.status === "DELETED") {
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

  if (session.expiresAt.getTime() <= Date.now()) {
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

const containsLikelySecret = (text: string): boolean =>
  /\b(?:password|passwd|mật khẩu|otp|one[- ]time password|api[- ]?key|access[- ]?token|secret key|cvv|credit card)\b/iu.test(
    text
  );

const toMessage = (message: typeof advisorMessage.$inferSelect) => ({
  createdAt: message.createdAt.toISOString(),
  id: message.id,
  metadata: message.metadata,
  role: message.role,
  sequence: message.sequence,
  text: message.text,
});

const toRecommendation = (
  recommendation: typeof advisorRecommendation.$inferSelect
) => {
  const payload = advisorTurnResponseSchema.shape.recommendation.safeParse(
    recommendation.payload
  );
  if (!payload.success || !payload.data) {
    return null;
  }

  return {
    createdAt: recommendation.createdAt.toISOString(),
    id: recommendation.id,
    isCurrent: recommendation.isCurrent,
    ...payload.data,
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

  return {
    expiresAt: session.expiresAt.toISOString(),
    id: session.id,
    messages: messages.map(toMessage),
    pinnedPlaybookId: session.pinnedPlaybookId,
    recommendations: recommendations.flatMap((item) => {
      const value = toRecommendation(item);
      return value ? [value] : [];
    }),
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
      const [created] = await context.db
        .insert(advisorSession)
        .values({
          consentId: consent.id,
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

      return {
        expiresAt: created.expiresAt.toISOString(),
        id: created.id,
        privacyPath: PRIVACY_PATH,
        termsPath: TERMS_PATH,
      };
    }),

  get: publicProcedure
    .input(advisorSessionIdInputSchema)
    .handler(async ({ context, input }) => {
      await requireOwnedSession(
        context,
        input.sessionId,
        input.visitorCapability
      );
      return sessionOutput(context, input.sessionId);
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
      const session = await requireOwnedSession(
        context,
        input.sessionId,
        input.visitorCapability
      );
      await requireProviderReady(context);

      if (input.idempotencyKey === session.lastIdempotencyKey) {
        const previous = advisorTurnResponseSchema.safeParse(
          session.lastTurnResponse
        );
        if (previous.success) {
          return { response: previous.data, sessionId: session.id };
        }
      }

      const computation = await orchestrateAdvisorTurn({
        database: context.db,
        session,
        text: input.text,
      });
      const response = advisorTurnResponseSchema.parse(computation.response);
      const now = new Date();

      await context.db.transaction(async (transaction) => {
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

        await transaction.insert(advisorMessage).values(
          buildAdvisorMessageInsert({
            role: "USER",
            sequence: userSequence,
            sessionId: session.id,
            text: input.text,
          })
        );
        await transaction.insert(advisorMessage).values(
          buildAdvisorMessageInsert({
            response,
            role: "ASSISTANT",
            sequence: userSequence + 1,
            sessionId: session.id,
            text: response.message,
          })
        );

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

        await transaction
          .update(advisorSession)
          .set({
            answers: computation.answers,
            lastIdempotencyKey: input.idempotencyKey,
            lastTurnResponse: response,
            pendingQuestionId: computation.pendingQuestionId,
            pinnedPlaybookId: computation.pinnedPlaybookId,
            pinnedSubCategoryId: computation.pinnedSubCategoryId,
            serviceNeed: computation.serviceNeed,
            turnCount: session.turnCount + 1,
            updatedAt: now,
          })
          .where(eq(advisorSession.id, session.id));
      });

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
  consent: advisorConsentRouter,
  session: advisorSessionRouter,
};
