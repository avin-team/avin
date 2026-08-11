/* eslint-disable no-await-in-loop */

import { db } from "@avin/db";
import { order, orderItem } from "@avin/db/schema/commerce";
import type { OrderItemStatus } from "@avin/db/schema/commerce";
import {
  sellerEnforcementAction,
  sellerEnforcement,
  sellerEnforcementRemediation,
  sellerEnforcementRemediationItem,
} from "@avin/db/schema/seller-enforcement";
import { ORPCError } from "@orpc/server";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lte,
  lt,
  not,
  notExists,
  or,
} from "drizzle-orm";

import { cancelOrderItemForSellerEnforcement } from "../commerce/fulfillment";
import { createSellerEnforcementRemediation } from "./service";

const MAX_REMEDIATION_ATTEMPTS = 5;
const DEFAULT_REMEDIATION_LIMIT = 100;

interface ActiveBannedRemediationScope {
  actionId: string;
  effectiveAt: Date;
}

const getActiveBannedRemediationScope = async (
  database: typeof db,
  sellerId: string
): Promise<ActiveBannedRemediationScope | null> => {
  const [currentEnforcement] = await database
    .select({ state: sellerEnforcement.state })
    .from(sellerEnforcement)
    .where(eq(sellerEnforcement.sellerId, sellerId))
    .limit(1);
  if (currentEnforcement?.state !== "BANNED") {
    return null;
  }

  const actions = await database
    .select({
      actionId: sellerEnforcementAction.id,
      actionType: sellerEnforcementAction.actionType,
      effectiveAt: sellerEnforcementAction.effectiveAt,
      newState: sellerEnforcementAction.newState,
      supersedesActionId: sellerEnforcementAction.supersedesActionId,
    })
    .from(sellerEnforcementAction)
    .where(eq(sellerEnforcementAction.sellerId, sellerId))
    .orderBy(
      desc(sellerEnforcementAction.effectiveAt),
      desc(sellerEnforcementAction.createdAt)
    );
  const [latestAction] = actions;
  if (!latestAction || latestAction.newState !== "BANNED") {
    return null;
  }

  const actionsById = new Map(
    actions.map((action) => [action.actionId, action])
  );
  const visited = new Set<string>();
  let rootAction = latestAction;
  while (rootAction.actionType === "REASON_CORRECTED") {
    if (!rootAction.supersedesActionId || visited.has(rootAction.actionId)) {
      return null;
    }
    visited.add(rootAction.actionId);
    const previousAction = actionsById.get(rootAction.supersedesActionId);
    if (!previousAction) {
      return null;
    }
    rootAction = previousAction;
  }

  if (rootAction.newState !== "BANNED") {
    return null;
  }
  return {
    actionId: rootAction.actionId,
    effectiveAt: rootAction.effectiveAt,
  };
};
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

const getCurrentItemStatus = async (
  database: typeof db,
  itemId: string
): Promise<OrderItemStatus | null> => {
  const [item] = await database
    .select({ status: orderItem.status })
    .from(orderItem)
    .where(eq(orderItem.id, itemId))
    .limit(1);
  return item?.status ?? null;
};

const requeueRestoredItems = async (
  database: typeof db,
  remediationId: string,
  sellerId: string,
  actionId: string,
  now: Date
): Promise<boolean> => {
  const activeScope = await getActiveBannedRemediationScope(database, sellerId);
  if (!activeScope || activeScope.actionId !== actionId) {
    return false;
  }

  const restored = await database
    .select({ id: sellerEnforcementRemediationItem.id })
    .from(sellerEnforcementRemediationItem)
    .innerJoin(
      orderItem,
      eq(orderItem.id, sellerEnforcementRemediationItem.orderItemId)
    )
    .where(
      and(
        eq(sellerEnforcementRemediationItem.remediationId, remediationId),
        eq(sellerEnforcementRemediationItem.status, "COMPLETED"),
        inArray(orderItem.status, ["AWAITING_SELLER", "IN_PROGRESS"])
      )
    );

  await Promise.all(
    restored.map((item) =>
      database
        .update(sellerEnforcementRemediationItem)
        .set({
          lastError: "OrderItem became eligible for ban remediation again",
          processedAt: null,
          status: "PENDING",
          updatedAt: now,
        })
        .where(eq(sellerEnforcementRemediationItem.id, item.id))
    )
  );
  if (restored.length > 0) {
    await database
      .update(sellerEnforcementRemediation)
      .set({ finishedAt: null, status: "PENDING", updatedAt: now })
      .where(eq(sellerEnforcementRemediation.id, remediationId));
  }
  return restored.length > 0;
};

const reconcileMissingRemediations = async (
  database: typeof db,
  now: Date,
  limit: number
): Promise<void> => {
  const actions = await database
    .select({
      actionId: sellerEnforcementAction.id,
      sellerId: sellerEnforcementAction.sellerId,
    })
    .from(sellerEnforcementAction)
    .where(
      and(
        inArray(sellerEnforcementAction.actionType, ["BAN", "ESCALATE"]),
        eq(sellerEnforcementAction.newState, "BANNED"),
        notExists(
          database
            .select({ id: sellerEnforcementRemediation.id })
            .from(sellerEnforcementRemediation)
            .where(
              eq(
                sellerEnforcementRemediation.actionId,
                sellerEnforcementAction.id
              )
            )
        )
      )
    )
    .orderBy(
      desc(sellerEnforcementAction.effectiveAt),
      desc(sellerEnforcementAction.createdAt)
    )
    .limit(limit);

  await Promise.all(
    actions.map(async (action) => {
      try {
        await createSellerEnforcementRemediation(
          database,
          action.actionId,
          action.sellerId,
          now
        );
      } catch {
        // Keep processing other Sellers; the action remains enforced and can
        // be reconciled again on the next maintenance run.
      }
    })
  );
};

const reconcileRemediationTargets = async (
  database: typeof db,
  remediation: typeof sellerEnforcementRemediation.$inferSelect,
  now: Date
): Promise<void> => {
  const activeScope = await getActiveBannedRemediationScope(
    database,
    remediation.sellerId
  );
  if (!activeScope || activeScope.actionId !== remediation.actionId) {
    return;
  }

  const eligibleItems = await database
    .select({ id: orderItem.id })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(
        eq(order.sellerId, remediation.sellerId),
        inArray(orderItem.status, ["AWAITING_SELLER", "IN_PROGRESS"]),
        lte(orderItem.createdAt, activeScope.effectiveAt),
        notExists(
          database
            .select({ id: sellerEnforcementRemediationItem.id })
            .from(sellerEnforcementRemediationItem)
            .where(
              and(
                eq(
                  sellerEnforcementRemediationItem.remediationId,
                  remediation.id
                ),
                eq(sellerEnforcementRemediationItem.orderItemId, orderItem.id)
              )
            )
        )
      )
    )
    .orderBy(asc(orderItem.createdAt), asc(orderItem.id));

  if (eligibleItems.length > 0) {
    await database
      .insert(sellerEnforcementRemediationItem)
      .values(
        eligibleItems.map((item) => ({
          createdAt: now,
          orderItemId: item.id,
          remediationId: remediation.id,
          updatedAt: now,
        }))
      )
      .onConflictDoNothing({
        target: [
          sellerEnforcementRemediationItem.remediationId,
          sellerEnforcementRemediationItem.orderItemId,
        ],
      });
  }

  if (eligibleItems.length > 0 || remediation.status === "COMPLETED") {
    const items = await database
      .select({ id: sellerEnforcementRemediationItem.id })
      .from(sellerEnforcementRemediationItem)
      .where(
        eq(sellerEnforcementRemediationItem.remediationId, remediation.id)
      );
    await database
      .update(sellerEnforcementRemediation)
      .set({
        finishedAt: eligibleItems.length > 0 ? null : remediation.finishedAt,
        status: eligibleItems.length > 0 ? "PENDING" : remediation.status,
        totalItems: items.length,
        updatedAt: now,
      })
      .where(eq(sellerEnforcementRemediation.id, remediation.id));
  }
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
  await reconcileMissingRemediations(database, now, limit);

  const candidateRemediations = await database
    .select()
    .from(sellerEnforcementRemediation)
    .where(
      inArray(sellerEnforcementRemediation.status, [
        "PENDING",
        "RUNNING",
        "COMPLETED",
      ])
    )
    .orderBy(asc(sellerEnforcementRemediation.createdAt))
    .limit(Math.max(1, Math.min(limit, DEFAULT_REMEDIATION_LIMIT)));
  await Promise.all(
    candidateRemediations.map(async (remediation) => {
      await reconcileRemediationTargets(database, remediation, now);
      await requeueRestoredItems(
        database,
        remediation.id,
        remediation.sellerId,
        remediation.actionId,
        now
      );
    })
  );

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
    await requeueRestoredItems(
      database,
      remediation.id,
      remediation.sellerId,
      remediation.actionId,
      now
    );
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
        if (error instanceof ORPCError && error.code === "CONFLICT") {
          const currentStatus = await getCurrentItemStatus(
            database,
            item.orderItemId
          );
          if (currentStatus === "DISPUTED") {
            await database
              .update(sellerEnforcementRemediationItem)
              .set({
                attempts: Math.max(item.attempts - 1, 0),
                lastError: "Waiting for the active Dispute to resolve",
                processedAt: null,
                status: "PENDING",
                updatedAt: now,
              })
              .where(eq(sellerEnforcementRemediationItem.id, item.id));
            continue;
          }
          if (
            currentStatus === null ||
            (currentStatus !== "AWAITING_SELLER" &&
              currentStatus !== "IN_PROGRESS")
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
