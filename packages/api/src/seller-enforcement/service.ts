import { db } from "@avin/db";
import { user } from "@avin/db/schema/auth";
import { dispute, order, orderItem } from "@avin/db/schema/commerce";
import { sellerApplication } from "@avin/db/schema/seller";
import {
  sellerEnforcement,
  sellerEnforcementAction,
  sellerEnforcementAppeal,
  sellerEnforcementAppealEvidence,
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
  isNotNull,
  lte,
  notExists,
} from "drizzle-orm";
import { z } from "zod";

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

export const sellerEnforcementReasonCodeSchema = z.enum(
  sellerEnforcementReasonCodeValues
);

export const sellerEnforcementStateSchema = z.enum(
  sellerEnforcementStateValues
);

export const sellerEnforcementCommandSchema = z.object({
  adminNote: z
    .string()
    .trim()
    .max(SELLER_ENFORCEMENT_ADMIN_NOTE_MAX_LENGTH)
    .nullable()
    .optional(),
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
        description: z.string().trim().min(1).max(5000),
        fileName: z.string().trim().min(1).max(255),
        storageKey: z.string().trim().min(1).max(1024),
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

const toOrpcError = (error: unknown): never => {
  if (error instanceof ORPCError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new ORPCError("BAD_REQUEST", { message: error.message });
  }
  throw error;
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
      message: "Không thể tạo đường dẫn tải bằng chứng Appeal.",
    });
  }
  const result = (await response.json()) as { signedURL?: string };
  if (!result.signedURL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Không thể tạo đường dẫn tải bằng chứng Appeal.",
    });
  }
  const signedPath = result.signedURL.startsWith("/storage/v1/")
    ? result.signedURL
    : `/storage/v1${result.signedURL}`;
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

const assertApprovedSeller = async (
  executor: EnforcementExecutor,
  sellerId: string
): Promise<void> => {
  const [account] = await executor
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, sellerId))
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

const createRemediation = async (
  executor: EnforcementExecutor,
  actionId: string,
  sellerId: string,
  now: Date
): Promise<void> => {
  const targetedItems = await executor
    .select({ id: orderItem.id })
    .from(orderItem)
    .innerJoin(order, eq(order.id, orderItem.orderId))
    .where(
      and(
        eq(order.sellerId, sellerId),
        inArray(orderItem.status, ["AWAITING_SELLER", "IN_PROGRESS"]),
        notExists(
          executor
            .select({ id: dispute.id })
            .from(dispute)
            .where(eq(dispute.orderItemId, orderItem.id))
        )
      )
    )
    .orderBy(asc(orderItem.createdAt), asc(orderItem.id));

  const isComplete = targetedItems.length === 0;
  const [remediation] = await executor
    .insert(sellerEnforcementRemediation)
    .values({
      actionId,
      createdAt: now,
      finishedAt: isComplete ? now : null,
      sellerId,
      status: isComplete ? "COMPLETED" : "PENDING",
      totalItems: targetedItems.length,
      updatedAt: now,
    })
    .returning();
  if (!remediation) {
    throw new Error("Seller Enforcement remediation was not created");
  }

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
};

// oxlint-disable-next-line complexity
export const changeSellerEnforcement = async ({
  actionType,
  actorUserId,
  adminNote,
  allowOverturn = false,
  database = db,
  expiresAt,
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

  // oxlint-disable-next-line complexity
  await database.transaction(async (transaction) => {
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
      const existingExpiresAt = existingAction.expiresAt?.getTime() ?? null;
      const requestedExpiresAt = expiresAt?.getTime() ?? null;
      if (
        existingAction.newState !== nextState ||
        existingAction.reasonCode !== reasonCode ||
        existingAction.sellerReason !== normalizedReason ||
        existingExpiresAt !== requestedExpiresAt
      ) {
        throw new ORPCError("CONFLICT", {
          message: "Idempotency key was already used for another decision",
        });
      }
      return;
    }

    if (actionType !== "EXPIRE") {
      await assertApprovedSeller(transaction, sellerId);
    }

    const [previousAction, current] = await Promise.all([
      getLatestAction(transaction, sellerId),
      getCurrentEnforcement(transaction, sellerId, true),
    ]);
    const previousState = current?.state ?? "CLEAR";
    const transition =
      actionType === "REASON_CORRECTED"
        ? "REASON_CORRECTED"
        : (actionType ??
          (() => {
            try {
              return getSellerEnforcementTransition(previousState, nextState);
            } catch (error) {
              return toOrpcError(error);
            }
          })());

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

    let nextExpiresAt: Date | null;
    if (transition === "REASON_CORRECTED") {
      nextExpiresAt = current?.expiresAt ?? null;
    } else if (nextState === "CLEAR") {
      nextExpiresAt = null;
    } else {
      nextExpiresAt = validateExpiry(nextState, expiresAt, now);
    }
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
        supersedesActionId:
          transition === "REASON_CORRECTED" || transition === "OVERTURN"
            ? previousAction?.id
            : null,
      })
      .returning();
    if (!action) {
      throw new Error("Seller Enforcement action was not created");
    }

    if (previousAction) {
      await transaction
        .update(sellerEnforcementAppeal)
        .set({ status: "SUPERSEDED", updatedAt: now })
        .where(
          and(
            eq(sellerEnforcementAppeal.actionId, previousAction.id),
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

    if (nextState === "BANNED" && previousState !== "BANNED") {
      await createRemediation(transaction, action.id, sellerId, now);
    }
  });

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
  outcome: "UPHELD" | "OVERTURNED";
  outcomeReason: string;
  reasonCode: SellerEnforcementReasonCode;
  reviewerUserId: string;
  now?: Date;
}): Promise<typeof sellerEnforcementAppeal.$inferSelect> =>
  database.transaction(async (transaction) => {
    const [appeal] = await transaction
      .select()
      .from(sellerEnforcementAppeal)
      .where(eq(sellerEnforcementAppeal.id, appealId))
      .limit(1);
    const normalizedOutcomeReason = outcomeReason.trim();
    if (!normalizedOutcomeReason) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Appeal outcome reason is required",
      });
    }
    if (!appeal) {
      throw new ORPCError("NOT_FOUND", { message: "Appeal not found" });
    }
    if (appeal.status !== "SUBMITTED" && appeal.status !== "UNDER_REVIEW") {
      throw new ORPCError("CONFLICT", {
        message: "This appeal has already been resolved",
      });
    }

    const [[appealedAction], latestAction] = await Promise.all([
      transaction
        .select()
        .from(sellerEnforcementAction)
        .where(eq(sellerEnforcementAction.id, appeal.actionId))
        .limit(1),
      getLatestAction(transaction, appeal.sellerId),
    ]);
    if (
      !appealedAction ||
      appealedAction.newState === "CLEAR" ||
      !latestAction ||
      latestAction.id !== appealedAction.id
    ) {
      throw new ORPCError("CONFLICT", {
        message: "This appeal has been superseded by a newer decision",
      });
    }

    if (outcome === "OVERTURNED") {
      const current = await getCurrentEnforcement(
        transaction,
        appeal.sellerId,
        true
      );
      if (
        !current ||
        current.state === "CLEAR" ||
        current.state !== appealedAction.newState
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
          adminNote: adminNote?.trim() || null,
          effectiveAt: now,
          idempotencyKey: `appeal:${appeal.id}:overturn`,
          newState: "CLEAR",
          previousState: current.state,
          reasonCode,
          sellerId: appeal.sellerId,
          sellerReason: normalizedOutcomeReason,
          supersedesActionId: appeal.actionId,
        })
        .returning();
      if (!action) {
        throw new Error("Appeal overturn action was not created");
      }
      await transaction
        .update(sellerEnforcement)
        .set({ expiresAt: null, state: "CLEAR", updatedAt: now })
        .where(eq(sellerEnforcement.sellerId, appeal.sellerId));
    }

    const [updatedAppeal] = await transaction
      .update(sellerEnforcementAppeal)
      .set({
        adminNote: adminNote?.trim() || null,
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

const MAX_REMEDIATION_ATTEMPTS = 5;
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
        throw error;
      }
    })
  );
  expiredSellerIds.push(
    ...expired.filter((sellerId): sellerId is string => Boolean(sellerId))
  );
  return { expiredSellerIds };
};

export interface SellerEnforcementRemediationRunResult {
  completedItemIds: string[];
  failedItemIds: string[];
  remediationIds: string[];
}

export const getRemediationAttemptLimit = (): number =>
  MAX_REMEDIATION_ATTEMPTS;
