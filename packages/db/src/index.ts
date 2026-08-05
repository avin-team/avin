import { env } from "@avin/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export * from "./uuid";

export const createDb = (): NodePgDatabase<typeof schema> =>
  drizzle(env.DATABASE_URL, { schema });

export const db: NodePgDatabase<typeof schema> = createDb();
