import {
  advisorAttachment,
  advisorHandoff,
  advisorRecommendation,
} from "@avin/db/schema/advisor";
import { checkoutAttachmentDraft } from "@avin/db/schema/commerce";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { z } from "zod";

import { copyAdvisorAttachmentToCheckout } from "../commerce/checkout-attachments";
import type { Context } from "../runtime/context";
import {
  COMMERCE_IMAGE_MAX_COUNT,
  createCheckoutAttachmentKey,
} from "../runtime/storage";
import {
  advisorRecommendationPayloadSchema,
  advisorVisitorCapabilitySchema,
  revalidateAdvisorRecommendation,
} from "./advisor";
import { getOwnedAdvisorSession } from "./attachments";

type AdvisorDatabase = Context["db"];
type AdvisorRecommendationPayload = z.infer<
  typeof advisorRecommendationPayloadSchema
>;

const ADVISOR_SUMMARY_MAX_LENGTH = 2000;
const ADVISOR_HANDOFF_ATTACHMENT_MAX_COUNT = 5;

export const advisorRecommendationSelectionInputSchema = z.strictObject({
  recommendationId: z.uuid(),
  sessionId: z.uuid(),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

export const advisorHandoffConfirmationInputSchema = z.strictObject({
  attachmentIds: z.array(z.uuid()).max(ADVISOR_HANDOFF_ATTACHMENT_MAX_COUNT),
  handoffId: z.uuid(),
  includeSummaryInCheckout: z.boolean(),
  sessionId: z.uuid(),
  summary: z.string().trim().min(1).max(ADVISOR_SUMMARY_MAX_LENGTH),
  visitorCapability: advisorVisitorCapabilitySchema.optional(),
});

export const advisorHandoffCopyAttachmentsInputSchema = z.strictObject({
  attachmentIds: z.array(z.uuid()).max(COMMERCE_IMAGE_MAX_COUNT),
  checkoutKey: z.uuid(),
  handoffId: z.uuid(),
  listingId: z.uuid(),
  sessionId: z.uuid(),
});

const toAttachmentView = (
  attachment: typeof advisorAttachment.$inferSelect
) => ({
  byteSize: attachment.byteSize,
  contentType: attachment.contentType,
  fileName: attachment.fileName,
  height: attachment.height,
  id: attachment.id,
  width: attachment.width,
});

export const buildAdvisorySummary = ({
  recommendation,
  serviceNeed,
}: {
  recommendation: AdvisorRecommendationPayload;
  serviceNeed: string;
}): string => {
  const listingLines = recommendation.listings.map((listing) => {
    const packageText = listing.servicePackage
      ? ` — ${listing.servicePackage.name}, ${listing.servicePackage.priceAmount} VND`
      : "";
    return `- ${listing.title}${packageText}`;
  });
  const reasons = [
    ...new Set(recommendation.listings.flatMap((listing) => listing.reasons)),
  ].slice(0, 3);
  const summary = [
    `Nhu cầu: ${serviceNeed.trim()}`,
    `Gợi ý: ${recommendation.subCategoryName}`,
    "Lựa chọn tham khảo:",
    ...listingLines,
    reasons.length > 0 ? `Lý do: ${reasons.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return summary.slice(0, ADVISOR_SUMMARY_MAX_LENGTH);
};

const loadValidatedRecommendation = async ({
  database,
  recommendationId,
  sessionId,
}: {
  database: AdvisorDatabase;
  recommendationId: string;
  sessionId: string;
}) => {
  const row = await database.query.advisorRecommendation.findFirst({
    where: and(
      eq(advisorRecommendation.id, recommendationId),
      eq(advisorRecommendation.sessionId, sessionId)
    ),
  });
  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor recommendation not found.",
    });
  }
  const parsed = advisorRecommendationPayloadSchema.safeParse(row.payload);
  if (!parsed.success) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Advisor recommendation data is no longer valid.",
    });
  }
  const availability = await revalidateAdvisorRecommendation({
    database,
    recommendation: parsed.data,
  });
  if (parsed.data.listings.some((listing) => !availability[listing.id])) {
    throw new ORPCError("CONFLICT", {
      message:
        "Một Listing trong gợi ý đã thay đổi. Hãy chọn recommendation mới.",
    });
  }
  return { payload: parsed.data, row };
};

const requireOwnedHandoff = async ({
  database,
  handoffId,
  owner,
  sessionId,
}: {
  database: AdvisorDatabase;
  handoffId: string;
  owner: { userId: string | null; visitorCapabilityHash: string | null };
  sessionId: string;
}) => {
  await getOwnedAdvisorSession({ database, owner, sessionId });
  const handoff = await database.query.advisorHandoff.findFirst({
    where: and(
      eq(advisorHandoff.id, handoffId),
      eq(advisorHandoff.sessionId, sessionId)
    ),
  });
  if (!handoff) {
    throw new ORPCError("NOT_FOUND", {
      message: "Advisor handoff not found.",
    });
  }
  return handoff;
};

const loadHandoffAttachments = async ({
  attachmentIds,
  database,
  now,
  sessionId,
}: {
  attachmentIds: readonly string[];
  database: AdvisorDatabase;
  now: Date;
  sessionId: string;
}) => {
  if (attachmentIds.length > ADVISOR_HANDOFF_ATTACHMENT_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Tối đa ${ADVISOR_HANDOFF_ATTACHMENT_MAX_COUNT} Advisory Attachment được chọn.`,
    });
  }
  const uniqueIds = new Set(attachmentIds);
  if (uniqueIds.size !== attachmentIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Mỗi ảnh chỉ được chọn một lần.",
    });
  }
  if (attachmentIds.length === 0) {
    return [];
  }
  const attachments = await database.query.advisorAttachment.findMany({
    where: and(
      eq(advisorAttachment.sessionId, sessionId),
      eq(advisorAttachment.status, "COMMITTED"),
      gte(advisorAttachment.expiresAt, now),
      inArray(advisorAttachment.id, [...uniqueIds])
    ),
  });
  if (attachments.length !== attachmentIds.length) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Một hoặc nhiều Advisory Attachment không còn khả dụng.",
    });
  }
  return attachmentIds.flatMap((id) => {
    const attachment = attachments.find((item) => item.id === id);
    return attachment ? [attachment] : [];
  });
};

export const selectAdvisorRecommendation = async ({
  database,
  now = new Date(),
  owner,
  recommendationId,
  sessionId,
}: {
  database: AdvisorDatabase;
  now?: Date;
  owner: { userId: string | null; visitorCapabilityHash: string | null };
  recommendationId: string;
  sessionId: string;
}) => {
  const session = await getOwnedAdvisorSession({
    database,
    now,
    owner,
    sessionId,
  });
  const { payload } = await loadValidatedRecommendation({
    database,
    recommendationId,
    sessionId,
  });
  const summary = buildAdvisorySummary({
    recommendation: payload,
    serviceNeed: session.serviceNeed,
  });
  const [handoff] = await database
    .insert(advisorHandoff)
    .values({
      attachmentIds: [],
      recommendationId,
      sessionId,
      summary,
    })
    .onConflictDoUpdate({
      set: {
        attachmentIds: [],
        confirmedAt: null,
        includeSummaryInCheckout: false,
        recommendationId,
        summary,
        updatedAt: now,
      },
      target: advisorHandoff.sessionId,
    })
    .returning();
  if (!handoff) {
    throw new ORPCError("SERVICE_UNAVAILABLE", {
      message: "Advisor handoff could not be created.",
    });
  }
  const attachments = await database.query.advisorAttachment.findMany({
    where: and(
      eq(advisorAttachment.sessionId, sessionId),
      eq(advisorAttachment.status, "COMMITTED"),
      gte(advisorAttachment.expiresAt, now)
    ),
  });
  return {
    attachments: attachments.map(toAttachmentView),
    handoffId: handoff.id,
    recommendationId,
    summary,
  };
};

export const confirmAdvisorHandoff = async ({
  attachmentIds,
  database,
  handoffId,
  includeSummaryInCheckout,
  now = new Date(),
  owner,
  sessionId,
  summary,
}: {
  attachmentIds: readonly string[];
  database: AdvisorDatabase;
  handoffId: string;
  includeSummaryInCheckout: boolean;
  now?: Date;
  owner: { userId: string | null; visitorCapabilityHash: string | null };
  sessionId: string;
  summary: string;
}) => {
  const handoff = await requireOwnedHandoff({
    database,
    handoffId,
    owner,
    sessionId,
  });
  await loadValidatedRecommendation({
    database,
    recommendationId: handoff.recommendationId,
    sessionId,
  });
  const attachments = await loadHandoffAttachments({
    attachmentIds,
    database,
    now,
    sessionId,
  });
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Advisory Summary không được để trống.",
    });
  }
  const [updated] = await database
    .update(advisorHandoff)
    .set({
      attachmentIds: [...attachmentIds],
      confirmedAt: now,
      includeSummaryInCheckout,
      summary: trimmedSummary,
      updatedAt: now,
    })
    .where(eq(advisorHandoff.id, handoff.id))
    .returning();
  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Advisor handoff changed before confirmation.",
    });
  }
  return {
    attachments: attachments.map(toAttachmentView),
    confirmedAt: now.toISOString(),
    handoffId: updated.id,
    includeSummaryInCheckout,
    recommendationId: updated.recommendationId,
    summary: trimmedSummary,
  };
};

export const copyAdvisorHandoffAttachmentsToCheckout = async ({
  attachmentIds,
  buyerId,
  checkoutKey,
  database,
  handoffId,
  listingId,
  sessionId,
  storage,
}: {
  attachmentIds: readonly string[];
  buyerId: string;
  checkoutKey: string;
  database: AdvisorDatabase;
  handoffId: string;
  listingId: string;
  sessionId: string;
  storage: Context["storage"];
}) => {
  const handoff = await requireOwnedHandoff({
    database,
    handoffId,
    owner: { userId: buyerId, visitorCapabilityHash: null },
    sessionId,
  });
  if (!handoff.confirmedAt) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Xác nhận Advisory Summary trước khi đưa vào Checkout.",
    });
  }
  const selectedIds = new Set(handoff.attachmentIds);
  if (attachmentIds.some((id) => !selectedIds.has(id))) {
    throw new ORPCError("FORBIDDEN", {
      message: "Ảnh Checkout phải nằm trong lựa chọn đã xác nhận.",
    });
  }
  const recommendation = await loadValidatedRecommendation({
    database,
    recommendationId: handoff.recommendationId,
    sessionId,
  });
  if (
    !recommendation.payload.listings.some((listing) => listing.id === listingId)
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Listing không thuộc recommendation đã chọn.",
    });
  }
  const [attachments, existingDrafts] = await Promise.all([
    loadHandoffAttachments({
      attachmentIds,
      database,
      now: new Date(),
      sessionId,
    }),
    database
      .select({ storageKey: checkoutAttachmentDraft.storageKey })
      .from(checkoutAttachmentDraft)
      .where(
        and(
          eq(checkoutAttachmentDraft.checkoutKey, checkoutKey),
          eq(checkoutAttachmentDraft.listingId, listingId),
          eq(checkoutAttachmentDraft.userId, buyerId)
        )
      ),
  ]);
  const existingKeys = new Set(existingDrafts.map((draft) => draft.storageKey));
  const newAttachmentCount = attachments.filter(
    (attachment) =>
      !existingKeys.has(
        createCheckoutAttachmentKey(
          checkoutKey,
          buyerId,
          listingId,
          attachment.contentType,
          attachment.id
        )
      )
  ).length;
  if (existingDrafts.length + newAttachmentCount > COMMERCE_IMAGE_MAX_COUNT) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Mỗi Listing chỉ được đính kèm tối đa ${COMMERCE_IMAGE_MAX_COUNT} ảnh.`,
    });
  }
  const copied = [];
  for (const attachment of attachments) {
    copied.push(
      await copyAdvisorAttachmentToCheckout({
        advisorAttachment: attachment,
        buyerId,
        checkoutKey,
        database,
        listingId,
        storage,
      })
    );
  }
  return {
    attachments: copied,
    includeSummaryInCheckout: handoff.includeSummaryInCheckout,
    listingId,
    summary: handoff.summary,
  };
};
