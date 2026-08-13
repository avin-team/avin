import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import { order, orderItem } from "@avin/db/schema/commerce";
import { sellerApplication, sellerProfile } from "@avin/db/schema/seller";
import {
  sellerEnforcement,
  sellerEnforcementAction,
  sellerEnforcementAppeal,
  sellerEnforcementAppealEvidence,
  sellerEnforcementRemediation,
  sellerEnforcementRemediationItem,
} from "@avin/db/schema/seller-enforcement";
import { ledgerAccount } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import {
  aliasedTable,
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import {
  createNotificationEvent,
  listNotificationRecipientsByRole,
} from "../notifications/notification";
import {
  isSellerEnforcementAppealEvidenceKey,
  ORDER_FILES_BUCKET,
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES,
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_BYTES,
  SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT,
} from "../runtime/storage";
import {
  getSellerEnforcementTransition,
  sellerEnforcementReasonCodeValues,
  sellerEnforcementStateValues,
} from "./policy";
import type {
  SellerEnforcementReasonCode,
  SellerEnforcementState,
} from "./policy";

export { orderItemStatusValues as sellerEnforcementItemStatuses } from "@avin/db/schema/commerce";

export const SELLER_ENFORCEMENT_REASON_MAX_LENGTH = 2000;
export const SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH = 5000;
export const SELLER_ENFORCEMENT_IDEMPOTENCY_KEY_MAX_LENGTH = 128;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_DESCRIPTION_MAX_LENGTH = 5000;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_FILE_NAME_MAX_LENGTH = 255;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_STORAGE_KEY_MAX_LENGTH = 1024;
export const SELLER_ENFORCEMENT_APPEAL_EVIDENCE_SIGNED_URL_TTL_SECONDS = 600;

const sellerEnforcementBanConfirmationFields = [
  "confirmAffectedOrderItems",
  "confirmAffectedEscrowHolds",
  "confirmAffectedWithdrawals",
] as const;

export const sellerEnforcementReasonCodeSchema = z.enum(
  sellerEnforcementReasonCodeValues
);

export const sellerEnforcementStateSchema = z.enum(
  sellerEnforcementStateValues
);

export const sellerEnforcementCommandSchema = z
  .object({
    adminNote: z
      .string()
      .trim()
      .max(SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH)
      .nullable()
      .optional(),
    confirmAffectedEscrowHolds: z.boolean().optional(),
    confirmAffectedOrderItems: z.boolean().optional(),
    confirmAffectedWithdrawals: z.boolean().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    idempotencyKey: z
      .string()
      .trim()
      .min(1)
      .max(SELLER_ENFORCEMENT_IDEMPOTENCY_KEY_MAX_LENGTH),
    reasonCode: sellerEnforcementReasonCodeSchema,
    sellerId: z.string().trim().min(1),
    sellerReason: z
      .string()
      .trim()
      .min(1)
      .max(SELLER_ENFORCEMENT_REASON_MAX_LENGTH),
    state: z.enum(["SUSPENDED", "BANNED"]),
  })
  .superRefine((input, context) => {
    if (input.state !== "BANNED") {
      return;
    }
    for (const field of sellerEnforcementBanConfirmationFields) {
      if (input[field] !== true) {
        context.addIssue({
          code: "custom",
          message: "Banning requires confirmation of affected records",
          path: [field],
        });
      }
    }
  });

export const sellerEnforcementClearCommandSchema = z.object({
  adminNote: z
    .string()
    .trim()
    .max(SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH)
    .nullable()
    .optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(1)
    .max(SELLER_ENFORCEMENT_IDEMPOTENCY_KEY_MAX_LENGTH),
  reasonCode: sellerEnforcementReasonCodeSchema,
  sellerId: z.string().trim().min(1),
  sellerReason: z
    .string()
    .trim()
    .min(1)
    .max(SELLER_ENFORCEMENT_REASON_MAX_LENGTH),
});

export const sellerEnforcementReasonCorrectionCommandSchema = z.object({
  adminNote: z
    .string()
    .trim()
    .max(SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH)
    .nullable()
    .optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(1)
    .max(SELLER_ENFORCEMENT_IDEMPOTENCY_KEY_MAX_LENGTH),
  reasonCode: sellerEnforcementReasonCodeSchema,
  sellerId: z.string().trim().min(1),
  sellerReason: z
    .string()
    .trim()
    .min(1)
    .max(SELLER_ENFORCEMENT_REASON_MAX_LENGTH),
});

export const sellerEnforcementAppealCommandSchema = z.object({
  actionId: z.uuid(),
  evidence: z
    .array(
      z.object({
        byteSize: z
          .number()
          .int()
          .positive()
          .max(SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_BYTES),
        contentType: z.enum(SELLER_ENFORCEMENT_APPEAL_EVIDENCE_CONTENT_TYPES),
        description: z
          .string()
          .trim()
          .min(1)
          .max(SELLER_ENFORCEMENT_APPEAL_EVIDENCE_DESCRIPTION_MAX_LENGTH),
        fileName: z
          .string()
          .trim()
          .min(1)
          .max(SELLER_ENFORCEMENT_APPEAL_EVIDENCE_FILE_NAME_MAX_LENGTH),
        storageKey: z
          .string()
          .trim()
          .min(1)
          .max(SELLER_ENFORCEMENT_APPEAL_EVIDENCE_STORAGE_KEY_MAX_LENGTH),
      })
    )
    .min(1)
    .max(SELLER_ENFORCEMENT_APPEAL_EVIDENCE_MAX_COUNT),
  idempotencyKey: z
    .string()
    .trim()
    .min(1)
    .max(SELLER_ENFORCEMENT_IDEMPOTENCY_KEY_MAX_LENGTH),
  sellerReason: z
    .string()
    .trim()
    .min(1)
    .max(SELLER_ENFORCEMENT_REASON_MAX_LENGTH),
});

export type EnforcementExecutor = Pick<
  typeof db,
  "insert" | "select" | "update"
>;

export interface SellerEnforcementView {
  action: typeof sellerEnforcementAction.$inferSelect | null;
  expiresAt: Date | null;
  remediation: typeof sellerEnforcementRemediation.$inferSelect | null;
  sellerId: string;
  state: SellerEnforcementState;
  updatedAt: Date | null;
}

export interface SellerEnforcementSellerView {
  action: Pick<
    typeof sellerEnforcementAction.$inferSelect,
    | "actionType"
    | "createdAt"
    | "effectiveAt"
    | "expiresAt"
    | "id"
    | "newState"
    | "previousState"
    | "reasonCode"
    | "sellerId"
    | "sellerReason"
  > | null;
  expiresAt: Date | null;
  sellerId: string;
  state: SellerEnforcementState;
  updatedAt: Date | null;
}

export type SellerEnforcementAppealEvidence =
  typeof sellerEnforcementAppealEvidence.$inferSelect;

export interface SellerEnforcementAppealView {
  appeal: typeof sellerEnforcementAppeal.$inferSelect;
  evidence: SellerEnforcementAppealEvidence[];
}

export interface SellerEnforcementSellerAppealView {
  appeal: Omit<
    typeof sellerEnforcementAppeal.$inferSelect,
    "adminNote" | "reviewerUserId"
  >;
  evidence: SellerEnforcementAppealEvidence[];
}

const signedUrlResponseSchema = z.object({
  signedURL: z.string().min(1),
});

const toOrpcError = (error: unknown): never => {
  if (error instanceof ORPCError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new ORPCError("BAD_REQUEST", { message: error.message });
  }
  throw new ORPCError("BAD_REQUEST", {
    message: "Invalid Seller Enforcement transition",
  });
};

const getCurrentEnforcement = async (
  executor: EnforcementExecutor,
  sellerId: string,
  lock = false
): Promise<typeof sellerEnforcement.$inferSelect | null> => {
  const query = executor
    .select()
    .from(sellerEnforcement)
    .where(eq(sellerEnforcement.sellerId, sellerId));
  const rows = lock ? await query.for("update").limit(1) : await query.limit(1);
  return rows[0] ?? null;
};

const getLatestAction = async (
  executor: EnforcementExecutor,
  sellerId: string
): Promise<typeof sellerEnforcementAction.$inferSelect | null> => {
  const rows = await executor
    .select()
    .from(sellerEnforcementAction)
    .where(eq(sellerEnforcementAction.sellerId, sellerId))
    .orderBy(
      desc(sellerEnforcementAction.effectiveAt),
      desc(sellerEnforcementAction.createdAt)
    )
    .limit(1);
  return rows[0] ?? null;
};

const isAppealActionCurrent = async (
  executor: EnforcementExecutor,
  appealedAction: typeof sellerEnforcementAction.$inferSelect,
  latestAction: typeof sellerEnforcementAction.$inferSelect
): Promise<boolean> => {
  if (latestAction.id === appealedAction.id) {
    return true;
  }
  if (latestAction.actionType !== "REASON_CORRECTED") {
    return false;
  }

  const actions = await executor
    .select({
      actionType: sellerEnforcementAction.actionType,
      id: sellerEnforcementAction.id,
      supersedesActionId: sellerEnforcementAction.supersedesActionId,
    })
    .from(sellerEnforcementAction)
    .where(eq(sellerEnforcementAction.sellerId, appealedAction.sellerId));
  const actionsById = new Map(actions.map((action) => [action.id, action]));
  const visited = new Set<string>();
  let currentActionId = latestAction.id;
  let currentActionType: (typeof sellerEnforcementAction.$inferSelect)["actionType"] =
    latestAction.actionType;
  let currentSupersedesActionId = latestAction.supersedesActionId;
  while (currentActionId !== appealedAction.id) {
    if (
      currentActionType !== "REASON_CORRECTED" ||
      !currentSupersedesActionId ||
      visited.has(currentActionId)
    ) {
      return false;
    }
    visited.add(currentActionId);
    const previousAction = actionsById.get(currentSupersedesActionId);
    if (!previousAction) {
      return false;
    }
    currentActionId = previousAction.id;
    currentActionType = previousAction.actionType;
    currentSupersedesActionId = previousAction.supersedesActionId;
  }
  return true;
};

export const getSellerEnforcementView = async (
  database: typeof db,
  sellerId: string
): Promise<SellerEnforcementView> => {
  const [current, action, remediationRows] = await Promise.all([
    getCurrentEnforcement(database, sellerId),
    getLatestAction(database, sellerId),
    database
      .select()
      .from(sellerEnforcementRemediation)
      .where(eq(sellerEnforcementRemediation.sellerId, sellerId))
      .orderBy(desc(sellerEnforcementRemediation.createdAt))
      .limit(1),
  ]);
  const [remediation] = remediationRows;

  return {
    action,
    expiresAt: current?.expiresAt ?? null,
    remediation: remediation ?? null,
    sellerId,
    state: current?.state ?? "CLEAR",
    updatedAt: current?.updatedAt ?? null,
  };
};

export const getSellerEnforcementSellerView = async (
  database: typeof db,
  sellerId: string
): Promise<SellerEnforcementSellerView> => {
  const view = await getSellerEnforcementView(database, sellerId);
  return {
    action: view.action
      ? {
          actionType: view.action.actionType,
          createdAt: view.action.createdAt,
          effectiveAt: view.action.effectiveAt,
          expiresAt: view.action.expiresAt,
          id: view.action.id,
          newState: view.action.newState,
          previousState: view.action.previousState,
          reasonCode: view.action.reasonCode,
          sellerId: view.action.sellerId,
          sellerReason: view.action.sellerReason,
        }
      : null,
    expiresAt: view.expiresAt,
    sellerId: view.sellerId,
    state: view.state,
    updatedAt: view.updatedAt,
  };
};

export const listSellerEnforcementActions = (
  database: typeof db,
  sellerId: string,
  limit = 50
) =>
  database
    .select()
    .from(sellerEnforcementAction)
    .where(eq(sellerEnforcementAction.sellerId, sellerId))
    .orderBy(
      desc(sellerEnforcementAction.effectiveAt),
      desc(sellerEnforcementAction.createdAt)
    )
    .limit(Math.min(Math.max(limit, 1), 100));

export const listSellerEnforcementAppeals = (
  database: typeof db,
  sellerId: string,
  limit = 50
) =>
  database
    .select()
    .from(sellerEnforcementAppeal)
    .where(eq(sellerEnforcementAppeal.sellerId, sellerId))
    .orderBy(
      desc(sellerEnforcementAppeal.createdAt),
      desc(sellerEnforcementAppeal.updatedAt)
    )
    .limit(Math.min(Math.max(limit, 1), 100));

export const listSellerEnforcementSellerAppeals = async (
  database: typeof db,
  sellerId: string,
  limit = 50
): Promise<SellerEnforcementSellerAppealView["appeal"][]> => {
  const appeals = await listSellerEnforcementAppeals(database, sellerId, limit);
  return appeals.map((appeal) => {
    const {
      adminNote: _adminNote,
      reviewerUserId: _reviewerUserId,
      ...sellerAppeal
    } = appeal;
    return sellerAppeal;
  });
};

export const getSellerEnforcementAppeal = async ({
  appealId,
  database = db,
  sellerId,
}: {
  appealId: string;
  database?: typeof db;
  sellerId?: string;
}): Promise<SellerEnforcementAppealView> => {
  const [appeal] = await database
    .select()
    .from(sellerEnforcementAppeal)
    .where(eq(sellerEnforcementAppeal.id, appealId))
    .limit(1);
  if (!appeal) {
    throw new ORPCError("NOT_FOUND", { message: "Appeal not found" });
  }
  if (sellerId && appeal.sellerId !== sellerId) {
    throw new ORPCError("FORBIDDEN", {
      message: "You cannot view this appeal",
    });
  }

  const evidence = await database
    .select()
    .from(sellerEnforcementAppealEvidence)
    .where(eq(sellerEnforcementAppealEvidence.appealId, appealId))
    .orderBy(
      asc(sellerEnforcementAppealEvidence.submittedAt),
      asc(sellerEnforcementAppealEvidence.id)
    );
  return { appeal, evidence };
};

export const getSellerEnforcementSellerAppeal = async ({
  appealId,
  database = db,
  sellerId,
}: {
  appealId: string;
  database?: typeof db;
  sellerId: string;
}): Promise<SellerEnforcementSellerAppealView> => {
  const view = await getSellerEnforcementAppeal({
    appealId,
    database,
    sellerId,
  });
  const {
    adminNote: _adminNote,
    reviewerUserId: _reviewerUserId,
    ...appeal
  } = view.appeal;
  return { appeal, evidence: view.evidence };
};

const createSignedSellerEnforcementAppealEvidenceUrl = async (
  storageKey: string
): Promise<{ url: string }> => {
  const { env } = await import("@avin/env/server");
  const objectPath = storageKey.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(
    new URL(
      `/storage/v1/object/sign/${ORDER_FILES_BUCKET}/${objectPath}`,
      env.SUPABASE_URL
    ),
    {
      body: JSON.stringify({
        expiresIn: SELLER_ENFORCEMENT_APPEAL_EVIDENCE_SIGNED_URL_TTL_SECONDS,
      }),
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
      message: "Không thể tạo đường dẫn tải bằng chứng Appeal.",
    });
  }
  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn tải bằng chứng Appeal.",
    });
  }
  const result = signedUrlResponseSchema.safeParse(responseBody);
  if (!result.success) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn tải bằng chứng Appeal.",
    });
  }
  const signedPath = result.data.signedURL.startsWith("/storage/v1/")
    ? result.data.signedURL
    : `/storage/v1${result.data.signedURL}`;
  return { url: new URL(signedPath, env.SUPABASE_URL).toString() };
};

export const getSellerEnforcementAppealEvidenceUrl = async ({
  appealId,
  database = db,
  evidenceId,
  sellerId,
}: {
  appealId: string;
  database?: typeof db;
  evidenceId: string;
  sellerId?: string;
}): Promise<{ url: string }> => {
  await getSellerEnforcementAppeal({ appealId, database, sellerId });
  const [evidence] = await database
    .select({ storageKey: sellerEnforcementAppealEvidence.storageKey })
    .from(sellerEnforcementAppealEvidence)
    .where(
      and(
        eq(sellerEnforcementAppealEvidence.appealId, appealId),
        eq(sellerEnforcementAppealEvidence.id, evidenceId)
      )
    )
    .limit(1);
  if (!evidence) {
    throw new ORPCError("NOT_FOUND", {
      message: "Không tìm thấy bằng chứng Appeal.",
    });
  }
  return createSignedSellerEnforcementAppealEvidenceUrl(evidence.storageKey);
};

const lockSellerAccount = async (
  executor: EnforcementExecutor,
  sellerId: string
): Promise<void> => {
  await executor
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, sellerId))
    .for("update")
    .limit(1);
};

const assertApprovedSeller = async (
  executor: EnforcementExecutor,
  sellerId: string
): Promise<void> => {
  const [account] = await executor
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, sellerId))
    .for("update")
    .limit(1);
  if (!account || account.role !== "SELLER") {
    throw new ORPCError("NOT_FOUND", { message: "Seller not found" });
  }

  const [application] = await executor
    .select({ status: sellerApplication.status })
    .from(sellerApplication)
    .where(
      and(
        eq(sellerApplication.userId, sellerId),
        eq(sellerApplication.status, "APPROVED")
      )
    )
    .orderBy(desc(sellerApplication.createdAt))
    .limit(1);
  if (!application) {
    throw new ORPCError("FORBIDDEN", {
      message: "Only an approved Seller can be enforced",
    });
  }
};

const validateExpiry = (
  state: Exclude<SellerEnforcementState, "CLEAR">,
  expiresAt: Date | null | undefined,
  now: Date
): Date | null => {
  if (state === "BANNED" && expiresAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "A banned Seller cannot have an expiry date",
    });
  }
  if (expiresAt && expiresAt <= now) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Suspension expiry must be in the future",
    });
  }
  return state === "SUSPENDED" ? (expiresAt ?? null) : null;
};

const assertMatchingEnforcementIdempotency = (
  action: typeof sellerEnforcementAction.$inferSelect,
  requestedActionType:
    | (typeof sellerEnforcementAction.$inferInsert)["actionType"]
    | undefined,
  nextState: Exclude<SellerEnforcementState, "CLEAR"> | "CLEAR",
  reasonCode: SellerEnforcementReasonCode,
  sellerReason: string,
  expiresAt: Date | null | undefined
): void => {
  const expectedActionType =
    requestedActionType ??
    (() => {
      try {
        return getSellerEnforcementTransition(action.previousState, nextState);
      } catch {
        return null;
      }
    })();
  const existingExpiresAt = action.expiresAt?.getTime() ?? null;
  const requestedExpiresAt = expiresAt?.getTime() ?? null;
  if (
    action.actionType !== expectedActionType ||
    action.newState !== nextState ||
    action.reasonCode !== reasonCode ||
    action.sellerReason !== sellerReason ||
    existingExpiresAt !== requestedExpiresAt
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Idempotency key was already used for another decision",
    });
  }
};

const createRemediation = async (
  executor: EnforcementExecutor,
  actionId: string,
  sellerId: string,
  now: Date
): Promise<void> => {
  const [enforcementAction] = await executor
    .select({ effectiveAt: sellerEnforcementAction.effectiveAt })
    .from(sellerEnforcementAction)
    .where(eq(sellerEnforcementAction.id, actionId))
    .limit(1);
  if (!enforcementAction) {
    throw new Error("Seller Enforcement action was not found");
  }

  const [remediation] = await executor
    .insert(sellerEnforcementRemediation)
    .values({
      actionId,
      createdAt: now,
      sellerId,
      status: "PENDING",
      totalItems: 0,
      updatedAt: now,
    })
    .returning();
  if (!remediation) {
    throw new Error("Seller Enforcement remediation was not created");
  }

  try {
    const targetedItems = await executor
      .select({ id: orderItem.id })
      .from(orderItem)
      .innerJoin(order, eq(order.id, orderItem.orderId))
      .where(
        and(
          eq(order.sellerId, sellerId),
          inArray(orderItem.status, ["AWAITING_SELLER", "IN_PROGRESS"]),
          lte(orderItem.createdAt, enforcementAction.effectiveAt)
        )
      )
      .orderBy(asc(orderItem.createdAt), asc(orderItem.id));

    if (targetedItems.length > 0) {
      await executor.insert(sellerEnforcementRemediationItem).values(
        targetedItems.map((item) => ({
          createdAt: now,
          orderItemId: item.id,
          remediationId: remediation.id,
          updatedAt: now,
        }))
      );
    }

    await executor
      .update(sellerEnforcementRemediation)
      .set({
        finishedAt: targetedItems.length === 0 ? now : null,
        status: targetedItems.length === 0 ? "COMPLETED" : "PENDING",
        totalItems: targetedItems.length,
        updatedAt: now,
      })
      .where(eq(sellerEnforcementRemediation.id, remediation.id));
  } catch (error) {
    await executor
      .update(sellerEnforcementRemediation)
      .set({
        lastError:
          error instanceof Error
            ? error.message
            : "Unable to enumerate Seller Enforcement remediation items",
        status: "NEEDS_ATTENTION",
        updatedAt: now,
      })
      .where(eq(sellerEnforcementRemediation.id, remediation.id));
    throw error;
  }
};

export const createSellerEnforcementRemediation = createRemediation;

type EnforcementTransition = NonNullable<
  (typeof sellerEnforcementAction.$inferInsert)["actionType"]
>;

const assertBanImpactConfirmed = (
  nextState: SellerEnforcementState,
  actionType: EnforcementTransition | undefined,
  confirmations: {
    escrowHolds: boolean;
    orderItems: boolean;
    withdrawals: boolean;
  }
): void => {
  if (
    nextState === "BANNED" &&
    actionType !== "REASON_CORRECTED" &&
    (!confirmations.orderItems ||
      !confirmations.escrowHolds ||
      !confirmations.withdrawals)
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Banning requires confirmation of affected OrderItems, EscrowHolds, and WithdrawalRequests",
    });
  }
};

const resolveEnforcementTransition = (
  actionType: EnforcementTransition | undefined,
  previousState: SellerEnforcementState,
  nextState: SellerEnforcementState
): EnforcementTransition => {
  if (actionType === "REASON_CORRECTED") {
    return actionType;
  }
  if (actionType) {
    return actionType;
  }
  try {
    return getSellerEnforcementTransition(previousState, nextState);
  } catch (error) {
    return toOrpcError(error);
  }
};

const assertEnforcementTransitionAllowed = (
  transition: EnforcementTransition,
  previousState: SellerEnforcementState,
  nextState: SellerEnforcementState,
  allowOverturn: boolean
): void => {
  if (
    transition === "REASON_CORRECTED" &&
    (previousState === "CLEAR" || previousState !== nextState)
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Only an active enforcement reason can be corrected",
    });
  }
  if (
    transition === "EXPIRE" &&
    (previousState !== "SUSPENDED" || nextState !== "CLEAR")
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Only an active suspension can expire",
    });
  }
  if (
    transition === "LIFT" &&
    (previousState !== "SUSPENDED" || nextState !== "CLEAR")
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Only a suspension can be lifted",
    });
  }
  if (
    transition === "OVERTURN" &&
    (!allowOverturn || previousState !== "BANNED" || nextState !== "CLEAR")
  ) {
    throw new ORPCError("CONFLICT", {
      message: "A ban can only be cleared by an appeal or correction",
    });
  }
};

const resolveEnforcementExpiry = (
  transition: EnforcementTransition,
  currentExpiry: Date | null | undefined,
  nextState: SellerEnforcementState,
  requestedExpiry: Date | null | undefined,
  now: Date
): Date | null => {
  if (transition === "REASON_CORRECTED") {
    return currentExpiry ?? null;
  }
  if (nextState === "CLEAR") {
    return null;
  }
  return validateExpiry(nextState, requestedExpiry, now);
};

const getEnforcementMessage = (nextState: SellerEnforcementState): string => {
  if (nextState === "CLEAR") {
    return "Hạn chế tài khoản người bán của bạn đã được gỡ bỏ.";
  }
  if (nextState === "SUSPENDED") {
    return "Tài khoản người bán của bạn đang bị tạm đình chỉ do vi phạm quy định.";
  }
  return "Tài khoản người bán của bạn đã bị khóa vĩnh viễn do vi phạm quy định.";
};

const getEnforcementNotificationCopy = (nextState: SellerEnforcementState) => {
  if (nextState === "CLEAR") {
    return {
      eventType: "seller_enforcement.lifted" as const,
      subject: "Avin: Đã gỡ bỏ hạn chế tài khoản người bán",
      title: "Đã gỡ bỏ hạn chế tài khoản",
    };
  }
  return {
    eventType: "seller_enforcement.applied" as const,
    subject: "Avin: Cập nhật xử lý vi phạm tài khoản người bán",
    title: "Thông báo xử lý vi phạm tài khoản",
  };
};

const getSupersededActionId = (
  transition: EnforcementTransition,
  previousActionId: string | undefined
): string | null => {
  if (transition === "REASON_CORRECTED" || transition === "OVERTURN") {
    return previousActionId ?? null;
  }
  return null;
};

export const changeSellerEnforcement = async ({
  actionType,
  actorUserId,
  adminNote,
  allowOverturn = false,
  database = db,
  expiresAt,
  confirmAffectedEscrowHolds = false,
  confirmAffectedOrderItems = false,
  confirmAffectedWithdrawals = false,
  idempotencyKey,
  nextState,
  now = new Date(),
  reasonCode,
  sellerId,
  sellerReason,
}: {
  allowOverturn?: boolean;
  actionType?: (typeof sellerEnforcementAction.$inferInsert)["actionType"];
  actorUserId: string | null;
  adminNote?: string | null;
  database?: typeof db;
  confirmAffectedEscrowHolds?: boolean;
  confirmAffectedOrderItems?: boolean;
  confirmAffectedWithdrawals?: boolean;
  expiresAt?: Date | null;
  idempotencyKey: string;
  nextState: Exclude<SellerEnforcementState, "CLEAR"> | "CLEAR";
  now?: Date;
  reasonCode: SellerEnforcementReasonCode;
  sellerId: string;
  sellerReason: string;
}): Promise<SellerEnforcementView> => {
  const normalizedKey = idempotencyKey.trim();
  const normalizedReason = sellerReason.trim();
  if (!normalizedKey || !normalizedReason) {
    throw new ORPCError("BAD_REQUEST", {
      message:
        "Enforcement idempotency key and Seller-visible reason are required",
    });
  }
  let affectedBuyerRecipients: {
    targetPath: string;
    userId: string;
  }[] = [];
  const remediationAction = await database.transaction(async (transaction) => {
    let remediationActionId: string | null = null;
    const [existingAction] = await transaction
      .select()
      .from(sellerEnforcementAction)
      .where(
        and(
          eq(sellerEnforcementAction.sellerId, sellerId),
          eq(sellerEnforcementAction.idempotencyKey, normalizedKey)
        )
      )
      .limit(1);
    if (existingAction) {
      assertMatchingEnforcementIdempotency(
        existingAction,
        actionType,
        nextState,
        reasonCode,
        normalizedReason,
        expiresAt
      );
      return;
    }

    assertBanImpactConfirmed(nextState, actionType, {
      escrowHolds: confirmAffectedEscrowHolds,
      orderItems: confirmAffectedOrderItems,
      withdrawals: confirmAffectedWithdrawals,
    });

    await (actionType === "EXPIRE"
      ? lockSellerAccount(transaction, sellerId)
      : assertApprovedSeller(transaction, sellerId));

    // A concurrent retry can have passed the first read before waiting on the
    // seller-row lock. Re-read after the lock so idempotent retries return the
    // original action instead of surfacing a unique-key error.
    const [existingActionAfterLock] = await transaction
      .select()
      .from(sellerEnforcementAction)
      .where(
        and(
          eq(sellerEnforcementAction.sellerId, sellerId),
          eq(sellerEnforcementAction.idempotencyKey, normalizedKey)
        )
      )
      .limit(1);
    if (existingActionAfterLock) {
      assertMatchingEnforcementIdempotency(
        existingActionAfterLock,
        actionType,
        nextState,
        reasonCode,
        normalizedReason,
        expiresAt
      );
      return;
    }

    const [previousAction, current] = await Promise.all([
      getLatestAction(transaction, sellerId),
      getCurrentEnforcement(transaction, sellerId, true),
    ]);
    const previousState = current?.state ?? "CLEAR";
    if (nextState !== "CLEAR" && nextState !== previousState) {
      const affectedBuyers = await transaction
        .select({ buyerId: order.buyerId })
        .from(orderItem)
        .innerJoin(order, eq(order.id, orderItem.orderId))
        .where(
          and(
            eq(order.sellerId, sellerId),
            inArray(orderItem.status, [
              "AWAITING_SELLER",
              "IN_PROGRESS",
              "DELIVERED",
              "IN_WARRANTY",
              "DISPUTED",
            ])
          )
        );
      affectedBuyerRecipients = affectedBuyers.map(({ buyerId }) => ({
        targetPath: "/orders",
        userId: buyerId,
      }));
    }
    const transition = resolveEnforcementTransition(
      actionType,
      previousState,
      nextState
    );
    assertEnforcementTransitionAllowed(
      transition,
      previousState,
      nextState,
      allowOverturn
    );
    const nextExpiresAt = resolveEnforcementExpiry(
      transition,
      current?.expiresAt,
      nextState,
      expiresAt,
      now
    );
    const [action] = await transaction
      .insert(sellerEnforcementAction)
      .values({
        actionType: transition,
        actorUserId,
        adminNote: adminNote?.trim() || null,
        effectiveAt: now,
        expiresAt: nextExpiresAt,
        idempotencyKey: normalizedKey,
        newState: nextState,
        previousState,
        reasonCode,
        sellerId,
        sellerReason: normalizedReason,
        supersedesActionId: getSupersededActionId(
          transition,
          previousAction?.id
        ),
      })
      .returning();
    if (!action) {
      throw new Error("Seller Enforcement action was not created");
    }

    const supersedesOpenAppeal = [
      "ESCALATE",
      "EXPIRE",
      "LIFT",
      "OVERTURN",
    ].includes(transition);
    if (supersedesOpenAppeal) {
      await transaction
        .update(sellerEnforcementAppeal)
        .set({ status: "SUPERSEDED", updatedAt: now })
        .where(
          and(
            eq(sellerEnforcementAppeal.sellerId, sellerId),
            inArray(sellerEnforcementAppeal.status, [
              "SUBMITTED",
              "UNDER_REVIEW",
            ])
          )
        );
    }

    if (current) {
      await transaction
        .update(sellerEnforcement)
        .set({ expiresAt: nextExpiresAt, state: nextState, updatedAt: now })
        .where(eq(sellerEnforcement.sellerId, sellerId));
    }
    if (!current) {
      await transaction.insert(sellerEnforcement).values({
        createdAt: now,
        expiresAt: nextExpiresAt,
        sellerId,
        state: nextState,
        updatedAt: now,
      });
    }

    const enforcementMessage = getEnforcementMessage(nextState);
    const notificationCopy = getEnforcementNotificationCopy(nextState);

    await createNotificationEvent(transaction, {
      body: enforcementMessage,
      context: {
        actionId: action.id,
        sellerId,
        state: nextState,
      },
      email: {
        htmlBody: `<p>${enforcementMessage}</p>`,
        recipientUserIds: [sellerId],
        subject: notificationCopy.subject,
        textBody: enforcementMessage,
      },
      eventType: notificationCopy.eventType,
      recipients: [
        { targetPath: "/seller/store", userId: sellerId },
        ...(await listNotificationRecipientsByRole(transaction, {
          role: "ADMIN",
          targetPath: "/sellers",
        })),
      ],
      sourceId: action.id,
      sourceType: "SELLER_ENFORCEMENT_ACTION",
      title: notificationCopy.title,
    });

    if (affectedBuyerRecipients.length > 0) {
      await createNotificationEvent(transaction, {
        body: "Avin đang theo dõi việc xử lý các đơn hàng của bạn.",
        context: {},
        eventType: "seller_enforcement.applied",
        recipients: affectedBuyerRecipients,
        sourceId: action.id,
        sourceType: "SELLER_ENFORCEMENT_ACTION",
        title: "Cập nhật an toàn đơn hàng",
      });
    }

    if (nextState === "BANNED" && previousState !== "BANNED") {
      remediationActionId = action.id;
    }
    return remediationActionId;
  });

  if (remediationAction) {
    try {
      await createRemediation(database, remediationAction, sellerId, now);
    } catch {
      // The Enforcement Action is already committed; the maintenance worker
      // reconciles a missing or attention-needed remediation on its next run.
      try {
        await createNotificationEvent(database, {
          body: "Quy trình xử lý hoàn tiền vi phạm cần được Quản trị viên kiểm tra.",
          context: { actionId: remediationAction, sellerId },
          eventType: "enforcement_remediation.needs_attention",
          recipients: await listNotificationRecipientsByRole(database, {
            role: "ADMIN",
            targetPath: "/sellers",
          }),
          sourceId: remediationAction,
          sourceType: "SELLER_ENFORCEMENT_REMEDIATION",
          title: "Cần xử lý hoàn tiền vi phạm",
        });
      } catch {
        // Notification failure must not hide the already committed enforcement.
      }
    }
  }

  return getSellerEnforcementView(database, sellerId);
};

export const correctSellerEnforcementReason = async ({
  actorUserId,
  adminNote,
  database = db,
  idempotencyKey,
  reasonCode,
  sellerId,
  sellerReason,
}: {
  actorUserId: string;
  adminNote?: string | null;
  database?: typeof db;
  idempotencyKey: string;
  reasonCode: SellerEnforcementReasonCode;
  sellerId: string;
  sellerReason: string;
}): Promise<SellerEnforcementView> => {
  const current = await getCurrentEnforcement(database, sellerId);
  if (!current || current.state === "CLEAR") {
    throw new ORPCError("CONFLICT", {
      message: "Only an active enforcement reason can be corrected",
    });
  }
  return changeSellerEnforcement({
    actionType: "REASON_CORRECTED",
    actorUserId,
    adminNote,
    database,
    expiresAt: current.expiresAt,
    idempotencyKey,
    nextState: current.state,
    reasonCode,
    sellerId,
    sellerReason,
  });
};

export const correctSellerEnforcementDecision = ({
  actorUserId,
  adminNote,
  database = db,
  idempotencyKey,
  reasonCode,
  sellerId,
  sellerReason,
}: {
  actorUserId: string;
  adminNote?: string | null;
  database?: typeof db;
  idempotencyKey: string;
  reasonCode: SellerEnforcementReasonCode;
  sellerId: string;
  sellerReason: string;
}): Promise<SellerEnforcementView> =>
  changeSellerEnforcement({
    actionType: "OVERTURN",
    actorUserId,
    adminNote,
    allowOverturn: true,
    database,
    idempotencyKey,
    nextState: "CLEAR",
    reasonCode,
    sellerId,
    sellerReason,
  });

export const submitSellerEnforcementAppeal = ({
  actionId,
  database = db,
  evidence,
  idempotencyKey,
  sellerId,
  sellerReason,
}: {
  actionId: string;
  database?: typeof db;
  evidence: z.infer<typeof sellerEnforcementAppealCommandSchema>["evidence"];
  idempotencyKey: string;
  sellerId: string;
  sellerReason: string;
}): Promise<typeof sellerEnforcementAppeal.$inferSelect> =>
  database.transaction(async (transaction) => {
    const normalizedKey = idempotencyKey.trim();
    const normalizedReason = sellerReason.trim();
    if (!normalizedKey || !normalizedReason) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Appeal idempotency key and Seller reason are required",
      });
    }

    // Serialize appeal submission with enforcement decisions. This prevents a
    // seller from inserting an appeal for an action after a concurrent lift,
    // expiry, or escalation has superseded it.
    await lockSellerAccount(transaction, sellerId);

    const [action] = await transaction
      .select()
      .from(sellerEnforcementAction)
      .where(
        and(
          eq(sellerEnforcementAction.id, actionId),
          eq(sellerEnforcementAction.sellerId, sellerId)
        )
      )
      .limit(1);
    if (!action || action.newState === "CLEAR") {
      throw new ORPCError("NOT_FOUND", {
        message: "The enforcement action is not appealable",
      });
    }
    const latestAction = await getLatestAction(transaction, sellerId);
    if (!latestAction || latestAction.id !== action.id) {
      throw new ORPCError("CONFLICT", {
        message: "This enforcement action has been superseded",
      });
    }

    const [[existing], [existingKey]] = await Promise.all([
      transaction
        .select()
        .from(sellerEnforcementAppeal)
        .where(eq(sellerEnforcementAppeal.actionId, actionId))
        .limit(1),
      transaction
        .select()
        .from(sellerEnforcementAppeal)
        .where(
          and(
            eq(sellerEnforcementAppeal.sellerId, sellerId),
            eq(sellerEnforcementAppeal.idempotencyKey, normalizedKey)
          )
        )
        .limit(1),
    ]);
    if (existingKey && existingKey.actionId !== actionId) {
      throw new ORPCError("CONFLICT", {
        message: "Appeal idempotency key was already used for another action",
      });
    }
    if (existing) {
      if (existing.idempotencyKey !== normalizedKey) {
        throw new ORPCError("CONFLICT", {
          message: "An appeal already exists for this enforcement action",
        });
      }
      return existing;
    }

    const [appeal] = await transaction
      .insert(sellerEnforcementAppeal)
      .values({
        actionId,
        idempotencyKey: normalizedKey,
        sellerId,
        sellerReason: normalizedReason,
        status: "SUBMITTED",
      })
      .returning();
    if (!appeal) {
      throw new Error("Seller Enforcement appeal was not created");
    }
    await transaction.insert(sellerEnforcementAppealEvidence).values(
      evidence.map((file) => {
        if (
          !isSellerEnforcementAppealEvidenceKey(
            file.storageKey,
            action.id,
            sellerId
          )
        ) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "Appeal evidence must be uploaded through the evidence route",
          });
        }
        return {
          appealId: appeal.id,
          byteSize: file.byteSize,
          contentType: file.contentType,
          description: file.description.trim(),
          fileName: file.fileName.trim(),
          storageKey: file.storageKey.trim(),
          submittedByUserId: sellerId,
        };
      })
    );
    return appeal;
  });

const assertAppealReviewStatus = (
  outcome: "UNDER_REVIEW" | "UPHELD" | "OVERTURNED",
  status: (typeof sellerEnforcementAppeal.$inferSelect)["status"]
): void => {
  if (outcome === "UNDER_REVIEW" && status !== "SUBMITTED") {
    throw new ORPCError("CONFLICT", {
      message: "This appeal is already under review or resolved",
    });
  }
  if (outcome !== "UNDER_REVIEW" && status !== "UNDER_REVIEW") {
    throw new ORPCError("CONFLICT", {
      message: "This appeal has already been resolved",
    });
  }
};

const normalizeAdminNote = (
  adminNote: string | null | undefined
): string | null => adminNote?.trim() || null;

const assertAppealedActionIsCurrent = async (
  transaction: EnforcementExecutor,
  appealedAction: typeof sellerEnforcementAction.$inferSelect | undefined,
  latestAction: typeof sellerEnforcementAction.$inferSelect | null
): Promise<{
  appealedAction: typeof sellerEnforcementAction.$inferSelect;
  latestAction: typeof sellerEnforcementAction.$inferSelect;
}> => {
  if (!appealedAction || appealedAction.newState === "CLEAR" || !latestAction) {
    throw new ORPCError("CONFLICT", {
      message: "This appeal has been superseded by a newer decision",
    });
  }
  if (
    !(await isAppealActionCurrent(transaction, appealedAction, latestAction))
  ) {
    throw new ORPCError("CONFLICT", {
      message: "This appeal has been superseded by a newer decision",
    });
  }
  return { appealedAction, latestAction };
};

export const reviewSellerEnforcementAppeal = ({
  adminNote,
  appealId,
  database = db,
  outcome,
  outcomeReason,
  reasonCode,
  reviewerUserId,
  now = new Date(),
}: {
  adminNote?: string | null;
  appealId: string;
  database?: typeof db;
  outcome: "UNDER_REVIEW" | "UPHELD" | "OVERTURNED";
  outcomeReason?: string | null;
  reasonCode: SellerEnforcementReasonCode;
  reviewerUserId: string;
  now?: Date;
}): Promise<typeof sellerEnforcementAppeal.$inferSelect> =>
  database.transaction(async (transaction) => {
    const [appealSnapshot] = await transaction
      .select()
      .from(sellerEnforcementAppeal)
      .where(eq(sellerEnforcementAppeal.id, appealId))
      .limit(1);
    if (!appealSnapshot) {
      throw new ORPCError("NOT_FOUND", { message: "Appeal not found" });
    }

    // Use the same seller-row lock as enforcement decisions and submissions,
    // then lock the appeal row before validating/updating its status.
    await lockSellerAccount(transaction, appealSnapshot.sellerId);
    const [appeal] = await transaction
      .select()
      .from(sellerEnforcementAppeal)
      .where(eq(sellerEnforcementAppeal.id, appealId))
      .for("update")
      .limit(1);
    if (!appeal) {
      throw new ORPCError("NOT_FOUND", { message: "Appeal not found" });
    }
    assertAppealReviewStatus(outcome, appeal.status);

    const [[appealedAction], latestAction] = await Promise.all([
      transaction
        .select()
        .from(sellerEnforcementAction)
        .where(eq(sellerEnforcementAction.id, appeal.actionId))
        .limit(1),
      getLatestAction(transaction, appeal.sellerId),
    ]);
    const currentAppealDecision = await assertAppealedActionIsCurrent(
      transaction,
      appealedAction,
      latestAction
    );

    if (outcome === "UNDER_REVIEW") {
      const [updatedAppeal] = await transaction
        .update(sellerEnforcementAppeal)
        .set({
          adminNote: normalizeAdminNote(adminNote),
          reviewerUserId,
          status: "UNDER_REVIEW",
          updatedAt: now,
        })
        .where(eq(sellerEnforcementAppeal.id, appealId))
        .returning();
      if (!updatedAppeal) {
        throw new Error("Appeal was not updated for review");
      }
      return updatedAppeal;
    }

    const normalizedOutcomeReason = outcomeReason?.trim() ?? "";
    if (!normalizedOutcomeReason) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Appeal outcome reason is required",
      });
    }

    let overturnActionId: string | null = null;
    if (outcome === "OVERTURNED") {
      const current = await getCurrentEnforcement(
        transaction,
        appeal.sellerId,
        true
      );
      if (
        !current ||
        current.state === "CLEAR" ||
        current.state !== currentAppealDecision.appealedAction.newState
      ) {
        throw new ORPCError("CONFLICT", {
          message: "The appealed enforcement is no longer active",
        });
      }

      const [action] = await transaction
        .insert(sellerEnforcementAction)
        .values({
          actionType: "OVERTURN",
          actorUserId: reviewerUserId,
          adminNote: normalizeAdminNote(adminNote),
          effectiveAt: now,
          idempotencyKey: `appeal:${appeal.id}:overturn`,
          newState: "CLEAR",
          previousState: current.state,
          reasonCode,
          sellerId: appeal.sellerId,
          sellerReason: normalizedOutcomeReason,
          supersedesActionId: currentAppealDecision.latestAction.id,
        })
        .returning();
      if (!action) {
        throw new Error("Appeal overturn action was not created");
      }
      overturnActionId = action.id;
      await transaction
        .update(sellerEnforcement)
        .set({ expiresAt: null, state: "CLEAR", updatedAt: now })
        .where(eq(sellerEnforcement.sellerId, appeal.sellerId));
    }

    const [updatedAppeal] = await transaction
      .update(sellerEnforcementAppeal)
      .set({
        adminNote: normalizeAdminNote(adminNote),
        outcomeReason: normalizedOutcomeReason,
        reviewedAt: now,
        reviewerUserId,
        status: outcome,
        updatedAt: now,
      })
      .where(eq(sellerEnforcementAppeal.id, appealId))
      .returning();
    if (!updatedAppeal) {
      throw new Error("Appeal was not updated");
    }
    const recipients = [
      { targetPath: "/seller/store", userId: appeal.sellerId },
      ...(await listNotificationRecipientsByRole(transaction, {
        role: "ADMIN",
        targetPath: "/sellers",
      })),
    ];
    const appealMessage =
      outcome === "UPHELD"
        ? "Yêu cầu kháng nghị của bạn đã được xem xét và giữ nguyên quyết định xử lý."
        : "Yêu cầu kháng nghị của bạn đã được chấp thuận.";
    await createNotificationEvent(transaction, {
      body: appealMessage,
      context: { appealId: appeal.id, outcome, sellerId: appeal.sellerId },
      email: {
        htmlBody: `<p>${appealMessage}</p>`,
        recipientUserIds: [appeal.sellerId],
        subject: "Avin: Kết quả kháng nghị tài khoản",
        textBody: appealMessage,
      },
      eventType: "seller_enforcement.appeal_resolved",
      recipients,
      sourceId: appeal.id,
      sourceType: "SELLER_ENFORCEMENT_APPEAL",
      title:
        outcome === "UPHELD"
          ? "Kết quả kháng nghị: Giữ nguyên quyết định"
          : "Kết quả kháng nghị: Đã chấp thuận",
    });
    if (overturnActionId) {
      await createNotificationEvent(transaction, {
        body: "Tài khoản của bạn đã được gỡ bỏ hạn chế sau khi kháng nghị thành công.",
        context: { actionId: overturnActionId, sellerId: appeal.sellerId },
        eventType: "seller_enforcement.lifted",
        recipients,
        sourceId: overturnActionId,
        sourceType: "SELLER_ENFORCEMENT_ACTION",
        title: "Đã gỡ bỏ hạn chế tài khoản",
      });
    }
    return updatedAppeal;
  });

export const getEnforcementRemediationItems = (
  database: typeof db,
  remediationId: string
) =>
  database
    .select()
    .from(sellerEnforcementRemediationItem)
    .where(eq(sellerEnforcementRemediationItem.remediationId, remediationId))
    .orderBy(asc(sellerEnforcementRemediationItem.createdAt));

const MAX_REMEDIATION_ITEMS_PER_RUN = 100;

export const retrySellerEnforcementRemediation = ({
  database = db,
  remediationId,
  now = new Date(),
}: {
  database?: typeof db;
  remediationId: string;
  now?: Date;
}): Promise<typeof sellerEnforcementRemediation.$inferSelect> =>
  database.transaction(async (transaction) => {
    const [remediation] = await transaction
      .select()
      .from(sellerEnforcementRemediation)
      .where(eq(sellerEnforcementRemediation.id, remediationId))
      .limit(1);
    if (!remediation) {
      throw new ORPCError("NOT_FOUND", {
        message: "Seller Enforcement remediation not found",
      });
    }

    if (
      remediation.status === "COMPLETED" ||
      remediation.status === "RUNNING"
    ) {
      throw new ORPCError("CONFLICT", {
        message: "This remediation cannot be retried in its current state",
      });
    }

    await transaction
      .update(sellerEnforcementRemediationItem)
      .set({
        attempts: 0,
        lastError: null,
        processedAt: null,
        status: "PENDING",
        updatedAt: now,
      })
      .where(
        and(
          eq(sellerEnforcementRemediationItem.remediationId, remediationId),
          eq(sellerEnforcementRemediationItem.status, "FAILED")
        )
      );

    const [updated] = await transaction
      .update(sellerEnforcementRemediation)
      .set({
        finishedAt: null,
        lastError: null,
        status: "PENDING",
        updatedAt: now,
      })
      .where(eq(sellerEnforcementRemediation.id, remediationId))
      .returning();
    if (!updated) {
      throw new Error("Seller Enforcement remediation was not updated");
    }
    return updated;
  });

export const expireSellerEnforcements = async ({
  database = db,
  limit = MAX_REMEDIATION_ITEMS_PER_RUN,
  now = new Date(),
}: {
  database?: typeof db;
  limit?: number;
  now?: Date;
}): Promise<{ expiredSellerIds: string[] }> => {
  const due = await database
    .select({
      expiresAt: sellerEnforcement.expiresAt,
      sellerId: sellerEnforcement.sellerId,
    })
    .from(sellerEnforcement)
    .where(
      and(
        eq(sellerEnforcement.state, "SUSPENDED"),
        isNotNull(sellerEnforcement.expiresAt),
        lte(sellerEnforcement.expiresAt, now)
      )
    )
    .orderBy(asc(sellerEnforcement.expiresAt), asc(sellerEnforcement.sellerId))
    .limit(limit);

  const expiredSellerIds: string[] = [];
  const expired = await Promise.all(
    due.map(async (enforcement) => {
      if (!enforcement.expiresAt) {
        return null;
      }
      try {
        await changeSellerEnforcement({
          actionType: "EXPIRE",
          actorUserId: null,
          database,
          idempotencyKey: `seller-enforcement-expire:${enforcement.sellerId}:${enforcement.expiresAt.toISOString()}`,
          nextState: "CLEAR",
          now,
          reasonCode: "OTHER",
          sellerId: enforcement.sellerId,
          sellerReason: "Suspension period expired",
        });
        return enforcement.sellerId;
      } catch (error) {
        if (error instanceof ORPCError && error.code === "CONFLICT") {
          return null;
        }
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to expire seller enforcement", {
          cause: error,
        });
      }
    })
  );
  expiredSellerIds.push(
    ...expired.filter((sellerId): sellerId is string => Boolean(sellerId))
  );
  return { expiredSellerIds };
};

const resolveEnforcementStatus = (
  state: string | null,
  expiresAt: Date | null,
  now: Date
): "ACTIVE" | "SUSPENDED" | "BANNED" => {
  if (state === "BANNED") {
    return "BANNED";
  }
  if (state === "SUSPENDED" && (!expiresAt || expiresAt > now)) {
    return "SUSPENDED";
  }
  return "ACTIVE";
};

const matchesSearch = (
  p: {
    storefrontName: string;
    userName: string;
    userEmail: string;
    phone: string | null;
  },
  search: string
): boolean =>
  [p.storefrontName, p.userName, p.userEmail, p.phone ?? ""].some((f) =>
    f.toLowerCase().includes(search)
  );

export const listAdminSellers = async (
  database: typeof db,
  options?: {
    search?: string;
    status?: "ALL" | "ACTIVE" | "SUSPENDED" | "BANNED";
  }
) => {
  const sellerAvailableAccount = aliasedTable(
    ledgerAccount,
    "seller_available_account"
  );
  const sellerHeldAccount = aliasedTable(ledgerAccount, "seller_held_account");

  const [profiles, activeAppeals] = await Promise.all([
    database
      .select({
        availableBalance: sellerAvailableAccount.balanceAmount,
        avatarUrl: sellerProfile.avatarUrl,
        completedOrderCount: sellerProfile.completedOrderCount,
        createdAt: sellerProfile.createdAt,
        enforcementExpiresAt: sellerEnforcement.expiresAt,
        enforcementState: sellerEnforcement.state,
        heldBalance: sellerHeldAccount.balanceAmount,
        id: sellerProfile.id,
        phone: sellerProfile.phone,
        ratingCount: sellerProfile.ratingCount,
        ratingScore: sellerProfile.ratingScore,
        storeSlug: sellerProfile.storeSlug,
        storefrontName: sellerProfile.storefrontName,
        userEmail: user.email,
        userId: user.id,
        userName: user.name,
      })
      .from(sellerProfile)
      .innerJoin(user, eq(sellerProfile.userId, user.id))
      .leftJoin(
        sellerEnforcement,
        eq(sellerProfile.userId, sellerEnforcement.sellerId)
      )
      .leftJoin(
        sellerAvailableAccount,
        eq(
          sellerAvailableAccount.accountKey,
          sql<string>`'SELLER_WALLET_AVAILABLE:' || ${sellerProfile.userId}`
        )
      )
      .leftJoin(
        sellerHeldAccount,
        eq(
          sellerHeldAccount.accountKey,
          sql<string>`'SELLER_WALLET_HELD:' || ${sellerProfile.userId}`
        )
      )
      .orderBy(desc(sellerProfile.createdAt)),
    database
      .select({
        sellerId: sellerEnforcementAppeal.sellerId,
      })
      .from(sellerEnforcementAppeal)
      .where(
        inArray(sellerEnforcementAppeal.status, ["SUBMITTED", "UNDER_REVIEW"])
      ),
  ]);
  const activeAppealsSet = new Set(activeAppeals.map((a) => a.sellerId));

  const now = new Date();
  const search = options?.search?.trim().toLowerCase();
  const statusFilter = options?.status ?? "ALL";

  const result = [];
  for (const p of profiles) {
    const enforcementStatus = resolveEnforcementStatus(
      p.enforcementState,
      p.enforcementExpiresAt,
      now
    );

    if (statusFilter !== "ALL" && enforcementStatus !== statusFilter) {
      continue;
    }

    if (search && search.length > 0 && !matchesSearch(p, search)) {
      continue;
    }

    result.push({
      activeListingsCount: 0,
      applicantName: p.userName || "Chủ gian hàng",
      availableBalanceVnd: p.availableBalance ?? 0,
      averageRating: Number(p.ratingScore || "5.0") || 5,
      completedOrdersCount: p.completedOrderCount || 0,
      email: p.userEmail,
      enforcementStatus,
      expiresAt: p.enforcementExpiresAt,
      hasActiveAppeal: activeAppealsSet.has(p.userId),
      heldBalanceVnd: p.heldBalance ?? 0,
      id: p.userId,
      joinedAt: p.createdAt.toISOString(),
      phone: p.phone || "",
      ratingCount: p.ratingCount || 0,
      storeSlug: p.storeSlug,
      storefrontName: p.storefrontName,
    });
  }

  return result;
};
