import type { db } from "@avin/db";
import { generateUuidV7 } from "@avin/db";
import { user as userTable } from "@avin/db/schema/auth";
import { listing } from "@avin/db/schema/catalog";
import {
  orderItem,
  review,
  reviewModerationAudit,
} from "@avin/db/schema/commerce";
import { sellerProfile } from "@avin/db/schema/seller";
import { ORPCError } from "@orpc/server";
import { and, count, eq, lt, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  buyerProcedure,
  publicProcedure,
} from "../access/procedures";
import { createNotificationEvent } from "../notifications/notification";
import type { CommerceExecutor } from "./executor";
import {
  calculateStarDistribution,
  canReviewOrderItem,
  maskBuyerName,
} from "./review-logic";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbClient = typeof db | DbTransaction;
export type ReviewExecutor = DbClient | CommerceExecutor;

export const incrementCompletedOrderCounts = async (
  executor: ReviewExecutor,
  { listingId, sellerId }: { listingId: string; sellerId: string }
): Promise<void> => {
  await executor
    .update(listing)
    .set({
      completedOrderCount: sql`${listing.completedOrderCount} + 1`,
    })
    .where(eq(listing.id, listingId));

  await executor
    .update(sellerProfile)
    .set({
      completedOrderCount: sql`${sellerProfile.completedOrderCount} + 1`,
    })
    .where(eq(sellerProfile.userId, sellerId));
};

export const recalculateReviewMetrics = async (
  executor: ReviewExecutor,
  { listingId, sellerId }: { listingId: string; sellerId: string }
): Promise<void> => {
  // Recalculate listing metrics for non-hidden reviews
  const [listingMetric] = await executor
    .select({
      avgScore: sql<string>`COALESCE(ROUND(AVG(${review.rating}), 2)::text, '0')`,
      totalCount: count(review.id),
    })
    .from(review)
    .where(and(eq(review.listingId, listingId), eq(review.isHidden, false)));

  await executor
    .update(listing)
    .set({
      ratingCount: listingMetric?.totalCount ?? 0,
      ratingScore: listingMetric?.avgScore ?? "0",
    })
    .where(eq(listing.id, listingId));

  // Recalculate seller metrics for non-hidden reviews across all listings
  const [sellerMetric] = await executor
    .select({
      avgScore: sql<string>`COALESCE(ROUND(AVG(${review.rating}), 2)::text, '0')`,
      totalCount: count(review.id),
    })
    .from(review)
    .where(and(eq(review.sellerId, sellerId), eq(review.isHidden, false)));

  await executor
    .update(sellerProfile)
    .set({
      ratingCount: sellerMetric?.totalCount ?? 0,
      ratingScore: sellerMetric?.avgScore ?? "0",
    })
    .where(eq(sellerProfile.userId, sellerId));
};

export const createReviewInputSchema = z.object({
  comment: z.string().trim().max(2000).optional(),
  orderItemId: z.uuid(),
  rating: z.number().int().min(1).max(5),
});

export const hideReviewInputSchema = z.object({
  reason: z.string().trim().min(1, "Lý do ẩn đánh giá là bắt buộc"),
  reviewId: z.uuid(),
});

export const restoreReviewInputSchema = z.object({
  reason: z.string().trim().min(1, "Lý do khôi phục đánh giá là bắt buộc"),
  reviewId: z.uuid(),
});

export const createReview = async ({
  buyerId,
  database,
  input,
  now = new Date(),
}: {
  buyerId: string;
  database: typeof db;
  input: z.infer<typeof createReviewInputSchema>;
  now?: Date;
}) =>
  await database.transaction(async (tx) => {
    // 1. Fetch OrderItem and Order details
    const itemRow = await tx.query.orderItem.findFirst({
      where: eq(orderItem.id, input.orderItemId),
      with: {
        order: true,
      },
    });

    if (!itemRow || !itemRow.order) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy thông tin sản phẩm đơn hàng.",
      });
    }

    // 2. Check existing review
    const existingReview = await tx.query.review.findFirst({
      where: eq(review.orderItemId, input.orderItemId),
    });

    const checkResult = canReviewOrderItem({
      buyerId: itemRow.order.buyerId,
      closedAt: itemRow.updatedAt,
      hasExistingReview: Boolean(existingReview),
      now,
      orderItemStatus: itemRow.status,
      requesterUserId: buyerId,
    });

    if (!checkResult.eligible) {
      throw new ORPCError("BAD_REQUEST", {
        message: checkResult.reason ?? "Không đủ điều kiện để đánh giá.",
      });
    }

    // Fetch buyer's user name for masking
    const buyerUser = await tx.query.user.findFirst({
      columns: { name: true },
      where: eq(userTable.id, buyerId),
    });

    const maskedName = maskBuyerName(buyerUser?.name ?? "");
    const servicePackageName = itemRow.servicePackageSnapshot?.name ?? null;

    // 3. Create review record
    const reviewId = generateUuidV7();
    const [newReview] = await tx
      .insert(review)
      .values({
        buyerId,
        comment: input.comment?.trim() || null,
        createdAt: now,
        id: reviewId,
        isHidden: false,
        listingId: itemRow.listingId,
        orderItemId: itemRow.id,
        rating: input.rating,
        reviewerMaskedName: maskedName,
        sellerId: itemRow.order.sellerId,
        servicePackageName,
        updatedAt: now,
      })
      .returning();

    if (!newReview) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Không thể lưu đánh giá.",
      });
    }

    // 4. Recalculate metrics for listing & seller
    await recalculateReviewMetrics(tx, {
      listingId: itemRow.listingId,
      sellerId: itemRow.order.sellerId,
    });

    // 5. Publish the generic review event without fabricating an OrderItem event.
    await createNotificationEvent(tx, {
      body: `Người mua vừa để lại đánh giá ${input.rating} sao cho đơn hàng.`,
      context: {
        listingId: itemRow.listingId,
        orderItemId: itemRow.id,
        rating: input.rating,
      },
      eventType: "review.created",
      now,
      recipients: [
        { targetPath: "/seller/store", userId: itemRow.order.sellerId },
      ],
      sourceId: reviewId,
      sourceType: "REVIEW",
      title: "Đánh giá mới từ người mua",
    });

    return newReview;
  });

export const getReviewsByListing = async ({
  cursor,
  database,
  limit = 10,
  listingId,
}: {
  cursor?: string;
  database: DbClient;
  limit?: number;
  listingId: string;
}) => {
  const effectiveLimit = Math.min(Math.max(limit, 1), 50);

  const whereConditions: SQL[] = [
    eq(review.listingId, listingId),
    eq(review.isHidden, false),
  ];

  if (cursor) {
    const cursorDate = new Date(cursor);
    if (!Number.isNaN(cursorDate.getTime())) {
      whereConditions.push(lt(review.createdAt, cursorDate));
    }
  }

  const items = await database.query.review.findMany({
    limit: effectiveLimit + 1,
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
    where: and(...whereConditions),
  });

  const hasMore = items.length > effectiveLimit;
  const reviews = items.slice(0, effectiveLimit);
  const nextCursor =
    hasMore && reviews.length > 0
      ? reviews.at(-1)?.createdAt.toISOString()
      : undefined;

  // Compute star distribution breakdown (1-5 counts)
  const distributionRows = await database
    .select({
      count: count(review.id),
      rating: review.rating,
    })
    .from(review)
    .where(and(eq(review.listingId, listingId), eq(review.isHidden, false)))
    .groupBy(review.rating);

  const starDistribution = calculateStarDistribution(distributionRows);

  return {
    nextCursor,
    reviews: reviews.map((r) => ({
      comment: r.comment,
      createdAt: r.createdAt,
      id: r.id,
      rating: r.rating,
      reviewerMaskedName: r.reviewerMaskedName,
      servicePackageName: r.servicePackageName,
    })),
    starDistribution,
  };
};

export const getReviewForOrderItem = async ({
  database,
  orderItemId,
}: {
  database: DbClient;
  orderItemId: string;
}) => {
  const existingReview = await database.query.review.findFirst({
    where: eq(review.orderItemId, orderItemId),
  });

  return existingReview ?? null;
};

export const hideReview = async ({
  adminUserId,
  database,
  input,
  now = new Date(),
}: {
  adminUserId: string;
  database: typeof db;
  input: z.infer<typeof hideReviewInputSchema>;
  now?: Date;
}) =>
  await database.transaction(async (tx) => {
    const targetReview = await tx.query.review.findFirst({
      where: eq(review.id, input.reviewId),
    });

    if (!targetReview) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy đánh giá.",
      });
    }

    if (targetReview.isHidden) {
      return targetReview;
    }

    const [updated] = await tx
      .update(review)
      .set({
        hiddenAt: now,
        hiddenByUserId: adminUserId,
        hiddenReason: input.reason.trim(),
        isHidden: true,
        updatedAt: now,
      })
      .where(eq(review.id, input.reviewId))
      .returning();

    await tx.insert(reviewModerationAudit).values({
      action: "HIDE",
      actorUserId: adminUserId,
      createdAt: now,
      id: generateUuidV7(),
      reason: input.reason.trim(),
      reviewId: input.reviewId,
    });

    await recalculateReviewMetrics(tx, {
      listingId: targetReview.listingId,
      sellerId: targetReview.sellerId,
    });

    return updated;
  });

export const restoreReview = async ({
  adminUserId,
  database,
  input,
  now = new Date(),
}: {
  adminUserId: string;
  database: typeof db;
  input: z.infer<typeof restoreReviewInputSchema>;
  now?: Date;
}) =>
  await database.transaction(async (tx) => {
    const targetReview = await tx.query.review.findFirst({
      where: eq(review.id, input.reviewId),
    });

    if (!targetReview) {
      throw new ORPCError("NOT_FOUND", {
        message: "Không tìm thấy đánh giá.",
      });
    }

    if (!targetReview.isHidden) {
      return targetReview;
    }

    const [updated] = await tx
      .update(review)
      .set({
        hiddenAt: null,
        hiddenByUserId: null,
        hiddenReason: null,
        isHidden: false,
        updatedAt: now,
      })
      .where(eq(review.id, input.reviewId))
      .returning();

    await tx.insert(reviewModerationAudit).values({
      action: "RESTORE",
      actorUserId: adminUserId,
      createdAt: now,
      id: generateUuidV7(),
      reason: input.reason.trim(),
      reviewId: input.reviewId,
    });

    await recalculateReviewMetrics(tx, {
      listingId: targetReview.listingId,
      sellerId: targetReview.sellerId,
    });

    return updated;
  });

export const reviewRouter = {
  create: buyerProcedure
    .input(createReviewInputSchema)
    .handler(({ context, input }) =>
      createReview({
        buyerId: context.session.user.id,
        database: context.db,
        input,
      })
    ),

  getByListing: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(10),
        listingId: z.uuid(),
      })
    )
    .handler(({ context, input }) =>
      getReviewsByListing({
        cursor: input.cursor,
        database: context.db,
        limit: input.limit,
        listingId: input.listingId,
      })
    ),

  getForOrderItem: publicProcedure
    .input(z.object({ orderItemId: z.uuid() }))
    .handler(({ context, input }) =>
      getReviewForOrderItem({
        database: context.db,
        orderItemId: input.orderItemId,
      })
    ),

  hide: adminProcedure
    .input(hideReviewInputSchema)
    .handler(({ context, input }) =>
      hideReview({
        adminUserId: context.session.user.id,
        database: context.db,
        input,
      })
    ),

  restore: adminProcedure
    .input(restoreReviewInputSchema)
    .handler(({ context, input }) =>
      restoreReview({
        adminUserId: context.session.user.id,
        database: context.db,
        input,
      })
    ),
};
