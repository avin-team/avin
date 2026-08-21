import {
  ACCOUNT_ROLE,
  adminRequiresTwoFactor,
  isAccountRole,
} from "@avin/auth/permissions";
import type { AccountRole } from "@avin/auth/permissions";
import { ORPCError, os } from "@orpc/server";

import type { Context } from "../runtime/context";

interface AccountActor {
  id: string;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
}

export const assertAccountAccess = (
  actor: AccountActor,
  accountId: string
): void => {
  if (actor.id === accountId) {
    return;
  }

  if (actor.role === ACCOUNT_ROLE.ADMIN && actor.twoFactorEnabled) {
    return;
  }

  throw new ORPCError("FORBIDDEN");
};

export const o = os.$context<Context>();

export const publicProcedure = o;

export const authenticatedProcedure = publicProcedure.use(
  ({ context, next }) => {
    if (!context.session?.user) {
      throw new ORPCError("UNAUTHORIZED");
    }

    return next({
      context: {
        session: context.session,
      },
    });
  }
);

export const protectedProcedure = authenticatedProcedure.use(
  ({ context, next }) => {
    const { role } = context.session.user;
    if (!isAccountRole(role) || role === ACCOUNT_ROLE.PROVIDER) {
      throw new ORPCError("FORBIDDEN");
    }

    return next();
  }
);

export const providerProcedure = authenticatedProcedure.use(
  ({ context, next }) => {
    if (context.session.user.banned) {
      throw new ORPCError("FORBIDDEN", {
        message: "This account is locked and cannot access Avin Check.",
      });
    }

    if (
      context.session.user.role !== ACCOUNT_ROLE.BUYER &&
      context.session.user.role !== ACCOUNT_ROLE.SELLER
    ) {
      throw new ORPCError("FORBIDDEN");
    }

    return next();
  }
);

export const providerSensitiveProcedure = providerProcedure.use(
  ({ context, next }) => {
    if (!context.session.user.twoFactorEnabled) {
      throw new ORPCError("FORBIDDEN", {
        message:
          "Two-factor authentication is required for this Avin Check action.",
      });
    }

    return next();
  }
);

const procedureForRoles = (roles: readonly AccountRole[]) =>
  protectedProcedure.use(({ context, next }) => {
    const { role } = context.session.user;
    if (!isAccountRole(role) || !roles.includes(role)) {
      throw new ORPCError("FORBIDDEN");
    }

    if (adminRequiresTwoFactor(context.session.user)) {
      throw new ORPCError("FORBIDDEN", {
        message: "Two-factor authentication is required for Admin access.",
      });
    }

    return next();
  });

export const adminProcedure = procedureForRoles([ACCOUNT_ROLE.ADMIN]);
export const buyerProcedure = procedureForRoles([ACCOUNT_ROLE.BUYER]);
export const sellerProcedure = procedureForRoles([ACCOUNT_ROLE.SELLER]);

export const auditedAdminProcedure = (action: string) =>
  adminProcedure.use(async ({ context, next: proceed }) => {
    const result = await proceed();
    await context.audit.record({
      action,
      actorUserId: context.session.user.id,
      outcome: "SUCCESS",
    });
    return result;
  });
