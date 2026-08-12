import type { db } from "@avin/db";

export type CommerceExecutor = Pick<
  typeof db,
  "delete" | "insert" | "select" | "update"
>;
