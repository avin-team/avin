import { env } from "@avin/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export const createDb = () => drizzle(env.DATABASE_URL, { schema });

export const db = createDb();
