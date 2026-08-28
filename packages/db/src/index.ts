import { env } from "@avin/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export * from "./uuid";

const globalForDb = globalThis as unknown as {
  db: NodePgDatabase<typeof schema> | undefined;
};

export const createDb = (): NodePgDatabase<typeof schema> =>
  drizzle(env.DATABASE_URL, { schema });

export const db: NodePgDatabase<typeof schema> = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
