import { db } from "@avin/db";

import { backfillRiskIdentifiers } from "../packages/api/src/protection/risk-identifier-backfill";

const argumentsSet = new Set(Bun.argv.slice(2));
const apply = argumentsSet.has("--apply");
const dryRun = argumentsSet.has("--dry-run") || !apply;

if (apply && argumentsSet.has("--dry-run")) {
  throw new Error("Choose either --dry-run or --apply, not both.");
}

const plan = await backfillRiskIdentifiers(db, { dryRun });

console.info(`Risk identifier backfill ${dryRun ? "dry-run" : "applied"}.`);
console.info(`Changes: ${plan.changes.length}`);
console.info(`Unchanged: ${plan.unchangedCount}`);
console.info(`Cross-report collisions: ${plan.collisions.length}`);
console.info(`Invalid rows: ${plan.invalid.length}`);

for (const collision of plan.collisions) {
  console.info(
    `Collision ${collision.type}: ${collision.identifierIds.length} identifiers across ${collision.reportIds.length} reports`
  );
}

if (plan.invalid.length > 0) {
  throw new Error(
    "Backfill stopped because invalid identifiers require manual review."
  );
}
