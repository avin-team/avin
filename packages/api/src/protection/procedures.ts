import {
  ACCOUNT_ROLE,
  adminRequiresTwoFactor,
  hasProtectionAdminCapability,
  isAccountRole,
} from "@avin/auth/permissions";
import type { ProtectionAdminCapability } from "@avin/auth/permissions";
import { ORPCError } from "@orpc/server";

import { protectedProcedure } from "../access/procedures";
import type { AuditEvent, Context } from "../runtime/context";
import { loadProtectionAdminCapabilities } from "./capabilities";

export interface ProtectionAdminActor {
  id: string;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
}

export interface ProtectionAuditTarget {
  id: string;
  type: string;
}

export interface ProtectionAdminProcedureOptions {
  action: string;
  capability: ProtectionAdminCapability | readonly ProtectionAdminCapability[];
  purpose: string;
  target?: ProtectionAuditTarget;
}

export const assertProtectionAdminAccess = (
  actor: ProtectionAdminActor,
  assignedCapabilities: readonly string[],
  requiredCapability:
    | ProtectionAdminCapability
    | readonly ProtectionAdminCapability[]
): void => {
  if (!isAccountRole(actor.role) || actor.role !== ACCOUNT_ROLE.ADMIN) {
    throw new ORPCError("FORBIDDEN");
  }

  if (adminRequiresTwoFactor(actor)) {
    throw new ORPCError("FORBIDDEN", {
      message:
        "Two-factor authentication is required for Avin Check Admin access.",
    });
  }

  const requiredCapabilities = Array.isArray(requiredCapability)
    ? requiredCapability
    : [requiredCapability];
  if (
    !requiredCapabilities.some((capability) =>
      hasProtectionAdminCapability(assignedCapabilities, capability)
    )
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: "A dedicated Avin Check Admin capability is required.",
    });
  }
};

const getAssignedCapabilities = (context: Context, userId: string) =>
  context.protectionCapabilities ??
  loadProtectionAdminCapabilities(context.db, userId);

const createProtectionAuditEvent = (
  session: NonNullable<Context["session"]>,
  options: ProtectionAdminProcedureOptions,
  outcome: AuditEvent["outcome"]
): AuditEvent => ({
  action: options.action,
  actorUserId: session.user.id,
  createdAt: new Date(),
  ipAddress: session.session.ipAddress ?? undefined,
  outcome,
  purpose: options.purpose,
  sessionId: session.session.id,
  targetId: options.target?.id,
  targetType: options.target?.type,
});

export const protectionAdminProcedure = (
  options: ProtectionAdminProcedureOptions
) =>
  protectedProcedure.use(async ({ context, next: proceed }) => {
    const { session } = context;
    if (!session) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const auditEvent = createProtectionAuditEvent(session, options, "FAILURE");

    try {
      const assignedCapabilities = await getAssignedCapabilities(
        context,
        session.user.id
      );
      assertProtectionAdminAccess(
        session.user,
        assignedCapabilities,
        options.capability
      );

      const result = await proceed();
      await context.audit.record({
        ...auditEvent,
        outcome: "SUCCESS",
      });
      return result;
    } catch (error) {
      await context.audit.record(auditEvent);
      throw error;
    }
  });
