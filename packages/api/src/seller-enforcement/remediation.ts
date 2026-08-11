/* eslint-disable no-await-in-loop */

import { db } from "@avin/db";
import { dispute, orderItem } from "@avin/db/schema/commerce";
import {
  sellerEnforcementRemediation,
  sellerEnforcementRemediationItem,
} from "@avin/db/schema/seller-enforcement";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, inArray, lte, lt, not, or } from "drizzle-orm";

import { cancelOrderItemForSellerEnforcement } from "../commerce/fulfillment";

const MAX_REMEDIATION_ATTEMPTS = 5;
const DEFAULT_REMEDIATION_LIMIT = 100;
const STALE_REMEDIATION_ITEM_MS = 5 * 60 * 1000;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown remediation error";

const claimNextItem = (
  database: typeof db,
  remediationId: string,
  now: Date,
  attemptedItemIds: string[]
) =>
  database.transaction(async (transaction) => {
    const staleBefore = new Date(now.getTime() - STALE_REMEDIATION_ITEM_MS);
    await transaction
      .update(sellerEnforcementRemediationItem)
      .set({
        lastError: "Remediation worker lease expired after maximum attempts",
        status: "FAILED",
        updatedAt: now,
      })
      .where(
        and(
          eq(sellerEnforcementRemediationItem.remediationId, remediationId),
          eq(sellerEnforcementRemediationItem.status, "RUNNING"),
          lte(sellerEnforcementRemediationItem.updatedAt, staleBefore),
          lte(
            sellerEnforcementRemediationItem.attempts,
            MAX_REMEDIATION_ATTEMPTS
          )
        )
      );
    const whereClause = and(
      eq(sellerEnforcementRemediationItem.remediationId, remediationId),
      or(
        inArray(sellerEnforcementRemediationItem.status, ["PENDING", "FAILED"]),
        and(
          eq(sellerEnforcementRemediationItem.status, "RUNNING"),
          lte(sellerEnforcementRemediationItem.updatedAt, staleBefore)
        )
      ),
      lt(sellerEnforcementRemediationItem.attempts, MAX_REMEDIATION_ATTEMPTS),
      attemptedItemIds.length > 0
        ? not(inArray(sellerEnforcementRemediationItem.id, attemptedItemIds))
        : undefined
    );
    const [candidate] = await transaction
      .select()
      .from(sellerEnforcementRemediationItem)
      .where(whereClause)
      .orderBy(
        asc(sellerEnforcementRemediationItem.createdAt),
        asc(sellerEnforcementRemediationItem.id)
      )
      .for("update")
      .limit(1);
    if (!candidate) {
      return null;
    }

    const [claimed] = await transaction
      .update(sellerEnforcementRemediationItem)
      .set({
        attempts: candidate.attempts + 1,
        lastError: null,
        status: "RUNNING",
        updatedAt: now,
      })
      .where(
        and(
          eq(sellerEnforcementRemediationItem.id, candidate.id),
          or(
            inArray(sellerEnforcementRemediationItem.status, [
              "PENDING",
              "FAILED",
            ]),
            and(
              eq(sellerEnforcementRemediationItem.status, "RUNNING"),
              lte(sellerEnforcementRemediationItem.updatedAt, staleBefore)
            )
          )
        )
      )
      .returning();
    if (!claimed) {
      return null;
    }

    await transaction
      .update(sellerEnforcementRemediation)
      .set({
        startedAt: now,
        status: "RUNNING",
        updatedAt: now,
      })
      .where(eq(sellerEnforcementRemediation.id, remediationId));

    return claimed;
  });

const itemNoLongerNeedsCancellation = async (
  database: typeof db,
  itemId: string
): Promise<boolean> => {
  const [item] = await database
    .select({ id: orderItem.id, status: orderItem.status })
    .from(orderItem)
    .where(eq(orderItem.id, itemId))
    .limit(1);
  if (
    !item ||
    (item.status !== "AWAITING_SELLER" && item.status !== "IN_PROGRESS")
  ) {
    return true;
  }

  const [existingDispute] = await database
    .select({ id: dispute.id })
    .from(dispute)
    .where(eq(dispute.orderItemId, itemId))
    .limit(1);
  return Boolean(existingDispute);
};

const refreshRemediation = async (
  database: typeof db,
  remediationId: string,
  now: Date
): Promise<typeof sellerEnforcementRemediation.$inferSelect | null> => {
  const items = await database
    .select({
      attempts: sellerEnforcementRemediationItem.attempts,
      lastError: sellerEnforcementRemediationItem.lastError,
      status: sellerEnforcementRemediationItem.status,
    })
    .from(sellerEnforcementRemediationItem)
    .where(eq(sellerEnforcementRemediationItem.remediationId, remediationId));

  const completedItems = items.filter(
    (item) => item.status === "COMPLETED"
  ).length;
  const failedItems = items.filter((item) => item.status === "FAILED").length;
  const lastError =
    items.toReversed().find((item) => item.status === "FAILED")?.lastError ??
    null;
  const hasRunning = items.some((item) => item.status === "RUNNING");
  const hasRetryable = items.some(
    (item) =>
      (item.status === "PENDING" || item.status === "FAILED") &&
      item.attempts < MAX_REMEDIATION_ATTEMPTS
  );
  const isComplete = items.length === completedItems;
  let status: "COMPLETED" | "NEEDS_ATTENTION" | "PENDING" | "RUNNING";
  if (isComplete) {
    status = "COMPLETED";
  } else if (hasRunning) {
    status = "RUNNING";
  } else if (hasRetryable) {
    status = "PENDING";
  } else {
    status = "NEEDS_ATTENTION";
  }

  const [updated] = await database
    .update(sellerEnforcementRemediation)
    .set({
      completedItems,
      failedItems,
      finishedAt: isComplete ? now : null,
      lastError,
      status,
      updatedAt: now,
    })
    .where(eq(sellerEnforcementRemediation.id, remediationId))
    .returning();
  return updated ?? null;
};

export interface SellerEnforcementRemediationRunResult {
  completedItemIds: string[];
  failedItemIds: string[];
  remediationIds: string[];
}

export const runSellerEnforcementRemediation = async ({
  database = db,
  limit = DEFAULT_REMEDIATION_LIMIT,
  now = new Date(),
}: {
  database?: typeof db;
  limit?: number;
  now?: Date;
} = {}): Promise<SellerEnforcementRemediationRunResult> => {
  const remediations = await database
    .select()
    .from(sellerEnforcementRemediation)
    .where(inArray(sellerEnforcementRemediation.status, ["PENDING", "RUNNING"]))
    .orderBy(asc(sellerEnforcementRemediation.createdAt))
    .limit(Math.max(1, Math.min(limit, DEFAULT_REMEDIATION_LIMIT)));

  const completedItemIds: string[] = [];
  const failedItemIds: string[] = [];
  const remediationIds: string[] = [];
  let processed = 0;

  for (const remediation of remediations) {
    if (processed >= limit) {
      break;
    }
    remediationIds.push(remediation.id);
    const attemptedItemIds: string[] = [];
    while (processed < limit) {
      const item = await claimNextItem(
        database,
        remediation.id,
        now,
        attemptedItemIds
      );
      if (!item) {
        break;
      }
      attemptedItemIds.push(item.id);
      processed += 1;

      try {
        await cancelOrderItemForSellerEnforcement({
          actionId: remediation.actionId,
          database,
          itemId: item.orderItemId,
          now,
        });
        await database
          .update(sellerEnforcementRemediationItem)
          .set({
            lastError: null,
            processedAt: now,
            status: "COMPLETED",
            updatedAt: now,
          })
          .where(eq(sellerEnforcementRemediationItem.id, item.id));
        completedItemIds.push(item.orderItemId);
      } catch (error) {
        if (
          error instanceof ORPCError &&
          error.code === "CONFLICT" &&
          (await itemNoLongerNeedsCancellation(database, item.orderItemId))
        ) {
          await database
            .update(sellerEnforcementRemediationItem)
            .set({
              lastError: null,
              processedAt: now,
              status: "COMPLETED",
              updatedAt: now,
            })
            .where(eq(sellerEnforcementRemediationItem.id, item.id));
          completedItemIds.push(item.orderItemId);
          continue;
        }

        await database
          .update(sellerEnforcementRemediationItem)
          .set({
            lastError: getErrorMessage(error),
            processedAt: null,
            status: "FAILED",
            updatedAt: now,
          })
          .where(eq(sellerEnforcementRemediationItem.id, item.id));
        failedItemIds.push(item.orderItemId);
      }
    }
    await refreshRemediation(database, remediation.id, now);
  }

  return { completedItemIds, failedItemIds, remediationIds };
};
