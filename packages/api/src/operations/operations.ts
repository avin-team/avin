import { db } from "@avin/db";
import { auditLog } from "@avin/db/schema/auth";
import { emailDelivery } from "@avin/db/schema/commerce";
import { ledgerTransaction, sepayPaymentEvent } from "@avin/db/schema/wallet";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

const DEFAULT_OPERATIONS_PAGE_SIZE = 25;
const MAX_OPERATIONS_PAGE_SIZE = 100;

interface OperationsCursor {
  createdAt: string;
  id: string;
}

export interface OperationsListInput {
  cursor?: string;
  limit?: number;
}

export interface DepositReconciliationView {
  amount: number;
  currency: string;
  depositRequestId: string | null;
  eventId: string;
  failureReason: string | null;
  ledgerTransactionId: string | null;
  paymentCode: string | null;
  processedAt: string | null;
  providerEventId: string;
  receivedAt: string;
  status: string;
  transactionAt: string;
}

export interface TransactionExplorerView {
  amount: number;
  createdAt: string;
  currency: string;
  description: string | null;
  id: string;
  reference: string;
  reversalOfId: string | null;
  type: string;
}

export interface AuditLogView {
  action: string;
  actorUserId: string;
  createdAt: string;
  id: string;
  outcome: string;
  targetId: string | null;
  targetType: string | null;
}

export interface EmailDeliveryHealthView {
  attemptCount: number;
  createdAt: string;
  eventType: string;
  id: string;
  lastAttemptAt: string | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  recipientUserId: string;
  sourceId: string;
  sourceType: string;
  status: string;
  updatedAt: string;
}

export interface OperationsPage<T> {
  items: T[];
  nextCursor: string | null;
}

const encodeCursor = (cursor: OperationsCursor): string =>
  encodeURIComponent(`${cursor.createdAt}|${cursor.id}`);

const createOperationsPage = <TRow extends { id: string }, TView>(
  rows: TRow[],
  pageSize: number,
  getCreatedAt: (row: TRow) => Date,
  toView: (row: TRow) => TView
): OperationsPage<TView> => {
  const pageRows = rows.slice(0, pageSize);
  const lastRow = pageRows.at(-1);

  return {
    items: pageRows.map(toView),
    nextCursor:
      rows.length > pageSize && lastRow
        ? encodeCursor({
            createdAt: getCreatedAt(lastRow).toISOString(),
            id: lastRow.id,
          })
        : null,
  };
};

const getPageSize = (limit: number | undefined): number => {
  const value = limit ?? DEFAULT_OPERATIONS_PAGE_SIZE;
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_OPERATIONS_PAGE_SIZE
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Operations limit must be between 1 and ${MAX_OPERATIONS_PAGE_SIZE}.`,
    });
  }
  return value;
};

const decodeCursor = (value: string): OperationsCursor | null => {
  try {
    const [createdAt, id] = decodeURIComponent(value).split("|");
    if (!createdAt || !id || Number.isNaN(new Date(createdAt).getTime())) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
};

const cursorCondition = (
  column: AnyColumn,
  idColumn: AnyColumn,
  cursor: string
) => {
  const decoded = decodeCursor(cursor);
  if (!decoded) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Operations cursor is invalid.",
    });
  }
  const date = new Date(decoded.createdAt);
  return or(lt(column, date), and(eq(column, date), lt(idColumn, decoded.id)));
};

export const listDepositReconciliation = async ({
  database = db,
  input,
}: {
  database?: typeof db;
  input?: OperationsListInput & {
    status?: (typeof sepayPaymentEvent.status.enumValues)[number];
  };
}): Promise<OperationsPage<DepositReconciliationView>> => {
  const pageSize = getPageSize(input?.limit);
  const conditions = [];
  if (input?.status) {
    conditions.push(eq(sepayPaymentEvent.status, input.status));
  }
  if (input?.cursor) {
    conditions.push(
      cursorCondition(
        sepayPaymentEvent.receivedAt,
        sepayPaymentEvent.id,
        input.cursor
      )
    );
  }
  const rows = await database
    .select()
    .from(sepayPaymentEvent)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sepayPaymentEvent.receivedAt), desc(sepayPaymentEvent.id))
    .limit(pageSize + 1);
  return createOperationsPage(
    rows,
    pageSize,
    (row) => row.receivedAt,
    (row) => ({
      amount: row.amount,
      currency: row.currency,
      depositRequestId: row.depositRequestId,
      eventId: row.id,
      failureReason: row.failureReason,
      ledgerTransactionId: row.ledgerTransactionId,
      paymentCode: row.paymentCode,
      processedAt: row.processedAt?.toISOString() ?? null,
      providerEventId: row.providerEventId,
      receivedAt: row.receivedAt.toISOString(),
      status: row.status,
      transactionAt: row.transactionAt.toISOString(),
    })
  );
};

export const listTransactions = async ({
  database = db,
  input,
}: {
  database?: typeof db;
  input?: OperationsListInput & {
    type?: (typeof ledgerTransaction.type.enumValues)[number];
  };
}): Promise<OperationsPage<TransactionExplorerView>> => {
  const pageSize = getPageSize(input?.limit);
  const conditions = [];
  if (input?.type) {
    conditions.push(eq(ledgerTransaction.type, input.type));
  }
  if (input?.cursor) {
    conditions.push(
      cursorCondition(
        ledgerTransaction.createdAt,
        ledgerTransaction.id,
        input.cursor
      )
    );
  }
  const rows = await database
    .select()
    .from(ledgerTransaction)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(ledgerTransaction.createdAt), desc(ledgerTransaction.id))
    .limit(pageSize + 1);
  return createOperationsPage(
    rows,
    pageSize,
    (row) => row.createdAt,
    (row) => ({
      amount: row.amount,
      createdAt: row.createdAt.toISOString(),
      currency: row.currency,
      description: row.description,
      id: row.id,
      reference: row.reference,
      reversalOfId: row.reversalOfId,
      type: row.type,
    })
  );
};

export const listAuditLogs = async ({
  database = db,
  input,
}: {
  database?: typeof db;
  input?: OperationsListInput & {
    action?: string;
    outcome?: "FAILURE" | "SUCCESS";
    targetType?: string;
  };
}): Promise<OperationsPage<AuditLogView>> => {
  const pageSize = getPageSize(input?.limit);
  const conditions = [];
  if (input?.action) {
    conditions.push(eq(auditLog.action, input.action));
  }
  if (input?.outcome) {
    conditions.push(eq(auditLog.outcome, input.outcome));
  }
  if (input?.targetType) {
    conditions.push(eq(auditLog.targetType, input.targetType));
  }
  if (input?.cursor) {
    conditions.push(
      cursorCondition(auditLog.createdAt, auditLog.id, input.cursor)
    );
  }
  const rows = await database
    .select()
    .from(auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(pageSize + 1);
  return createOperationsPage(
    rows,
    pageSize,
    (row) => row.createdAt,
    (row) => ({
      action: row.action,
      actorUserId: row.actorUserId,
      createdAt: row.createdAt.toISOString(),
      id: row.id,
      outcome: row.outcome,
      targetId: row.targetId,
      targetType: row.targetType,
    })
  );
};

export const listEmailDeliveryHealth = async ({
  database = db,
  input,
}: {
  database?: typeof db;
  input?: OperationsListInput & {
    status?: "failed" | "pending" | "retrying" | "sent";
  };
}): Promise<OperationsPage<EmailDeliveryHealthView>> => {
  const pageSize = getPageSize(input?.limit);
  const conditions = [];
  if (input?.status) {
    conditions.push(eq(emailDelivery.status, input.status));
  }
  if (input?.cursor) {
    conditions.push(
      cursorCondition(emailDelivery.createdAt, emailDelivery.id, input.cursor)
    );
  }
  const rows = await database
    .select()
    .from(emailDelivery)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(emailDelivery.createdAt), desc(emailDelivery.id))
    .limit(pageSize + 1);
  return createOperationsPage(
    rows,
    pageSize,
    (row) => row.createdAt,
    (row) => ({
      attemptCount: row.attemptCount,
      createdAt: row.createdAt.toISOString(),
      eventType: row.eventType,
      id: row.id,
      lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
      lastError: row.lastError,
      nextAttemptAt: row.nextAttemptAt?.toISOString() ?? null,
      recipientUserId: row.recipientUserId,
      sourceId: row.sourceId,
      sourceType: row.sourceType,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    })
  );
};
