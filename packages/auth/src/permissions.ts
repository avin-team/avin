import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const ACCOUNT_ROLE = {
  ADMIN: "ADMIN",
  BUYER: "BUYER",
  SELLER: "SELLER",
} as const;

export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];

interface AdminAccessActor {
  id: string;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
}

export const adminRequiresTwoFactor = (
  actor: AdminAccessActor | null | undefined
): actor is AdminAccessActor & { role: typeof ACCOUNT_ROLE.ADMIN } =>
  actor?.role === ACCOUNT_ROLE.ADMIN && actor.twoFactorEnabled !== true;

export const marketplaceAccessControl = createAccessControl(defaultStatements);

export const buyerRole = marketplaceAccessControl.newRole({
  session: [],
  user: [],
});

export const sellerRole = marketplaceAccessControl.newRole({
  session: [],
  user: [],
});

export const adminRole = marketplaceAccessControl.newRole({
  ...adminAc.statements,
});

export const marketplaceRoles = {
  [ACCOUNT_ROLE.ADMIN]: adminRole,
  [ACCOUNT_ROLE.BUYER]: buyerRole,
  [ACCOUNT_ROLE.SELLER]: sellerRole,
};
