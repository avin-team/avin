import { isProtectionAdminCapability } from "@avin/auth/permissions";
import type { ProtectionAdminCapability } from "@avin/auth/permissions";
import type { db } from "@avin/db";
import { protectionAdminAssignment } from "@avin/db/schema/auth";
import { eq } from "drizzle-orm";

export const loadProtectionAdminCapabilities = async (
  database: typeof db,
  userId: string
): Promise<ProtectionAdminCapability[]> => {
  const assignments = await database
    .select({ capability: protectionAdminAssignment.capability })
    .from(protectionAdminAssignment)
    .where(eq(protectionAdminAssignment.userId, userId));

  return assignments.flatMap(({ capability }) =>
    isProtectionAdminCapability(capability) ? [capability] : []
  );
};
