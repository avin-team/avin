import { db } from "@avin/db";
import { auditLog } from "@avin/db/schema/auth";

import type { AuditRecorder } from "./context";

export const auditRecorder: AuditRecorder = {
  record: async (event) => {
    await db.insert(auditLog).values(event);
  },
};
