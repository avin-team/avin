import { protectionRiskIdentifier } from "@avin/db/schema/protection";
import { eq } from "drizzle-orm";

import type { Context } from "../runtime/context";
import {
  getRiskIdentifierPublicValue,
  maskRiskIdentifier,
  normalizeRiskIdentifier,
} from "./risk-report";
import type { RiskReportIdentifierType } from "./risk-report";

type Database = Context["db"];
type RiskIdentifierRow = Pick<
  typeof protectionRiskIdentifier.$inferSelect,
  | "id"
  | "maskedValue"
  | "normalizedValue"
  | "publicValue"
  | "reportId"
  | "type"
  | "value"
>;

export interface RiskIdentifierBackfillChange {
  id: string;
  nextMaskedValue: string;
  nextNormalizedValue: string;
  nextPublicValue: string | null;
  previousMaskedValue: string;
  previousNormalizedValue: string;
  previousPublicValue: string | null;
  reportId: string;
  type: RiskReportIdentifierType;
}

export interface RiskIdentifierBackfillInvalidRow {
  error: string;
  id: string;
  reportId: string;
  type: RiskReportIdentifierType;
  value: string;
}

export interface RiskIdentifierBackfillCollision {
  identifierIds: string[];
  normalizedValue: string;
  reportIds: string[];
  type: RiskReportIdentifierType;
}

export interface RiskIdentifierBackfillPlan {
  changes: RiskIdentifierBackfillChange[];
  collisions: RiskIdentifierBackfillCollision[];
  invalid: RiskIdentifierBackfillInvalidRow[];
  unchangedCount: number;
}

const getCollisionKey = (
  type: RiskReportIdentifierType,
  normalizedValue: string
): string => `${type}:${normalizedValue}`;

export const buildRiskIdentifierBackfillPlan = (
  rows: readonly RiskIdentifierRow[]
): RiskIdentifierBackfillPlan => {
  const changes: RiskIdentifierBackfillChange[] = [];
  const invalid: RiskIdentifierBackfillInvalidRow[] = [];
  const unchangedRows = new Set<string>();
  const collisionsByKey = new Map<
    string,
    {
      identifierIds: string[];
      normalizedValue: string;
      reportIds: Set<string>;
      type: RiskReportIdentifierType;
    }
  >();

  for (const row of rows) {
    let normalizedValue: string;
    let maskedValue: string;
    let publicValue: string | null;
    try {
      normalizedValue = normalizeRiskIdentifier(row.type, row.value);
      maskedValue = maskRiskIdentifier(row.type, normalizedValue);
      publicValue = getRiskIdentifierPublicValue(row.type, normalizedValue);
    } catch (error) {
      invalid.push({
        error: error instanceof Error ? error.message : "Invalid identifier",
        id: row.id,
        reportId: row.reportId,
        type: row.type,
        value: row.value,
      });
      continue;
    }

    const collisionKey = getCollisionKey(row.type, normalizedValue);
    const collision = collisionsByKey.get(collisionKey) ?? {
      identifierIds: [],
      normalizedValue,
      reportIds: new Set<string>(),
      type: row.type,
    };
    collision.identifierIds.push(row.id);
    collision.reportIds.add(row.reportId);
    collisionsByKey.set(collisionKey, collision);

    if (
      row.normalizedValue === normalizedValue &&
      row.maskedValue === maskedValue &&
      row.publicValue === publicValue
    ) {
      unchangedRows.add(row.id);
      continue;
    }

    changes.push({
      id: row.id,
      nextMaskedValue: maskedValue,
      nextNormalizedValue: normalizedValue,
      nextPublicValue: publicValue,
      previousMaskedValue: row.maskedValue,
      previousNormalizedValue: row.normalizedValue,
      previousPublicValue: row.publicValue,
      reportId: row.reportId,
      type: row.type,
    });
  }

  const collisions: RiskIdentifierBackfillCollision[] = [];
  for (const {
    identifierIds,
    normalizedValue,
    reportIds,
    type,
  } of collisionsByKey.values()) {
    if (reportIds.size <= 1) {
      continue;
    }
    collisions.push({
      identifierIds,
      normalizedValue,
      reportIds: [...reportIds],
      type,
    });
  }

  return {
    changes,
    collisions,
    invalid,
    unchangedCount: unchangedRows.size,
  };
};

export const backfillRiskIdentifiers = async (
  database: Database,
  { dryRun }: { dryRun: boolean }
): Promise<RiskIdentifierBackfillPlan> => {
  const rows = await database.select().from(protectionRiskIdentifier);
  const plan = buildRiskIdentifierBackfillPlan(rows);

  if (dryRun || plan.invalid.length > 0 || plan.changes.length === 0) {
    return plan;
  }

  await database.transaction(async (transaction) => {
    for (const change of plan.changes) {
      await transaction
        .update(protectionRiskIdentifier)
        .set({
          maskedValue: change.nextMaskedValue,
          normalizedValue: change.nextNormalizedValue,
          publicValue: change.nextPublicValue,
        })
        .where(eq(protectionRiskIdentifier.id, change.id));
    }
  });

  return plan;
};
