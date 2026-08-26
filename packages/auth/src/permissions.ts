import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const ACCOUNT_ROLE = {
  ADMIN: "ADMIN",
  BUYER: "BUYER",
  SELLER: "SELLER",
} as const;

export type AccountRole = (typeof ACCOUNT_ROLE)[keyof typeof ACCOUNT_ROLE];

export const PROTECTION_ADMIN_CAPABILITY = {
  BOND_OPERATOR: "BOND_OPERATOR",
  PROTECTION_EXPORTER: "PROTECTION_EXPORTER",
  PROTECTION_MANAGER: "PROTECTION_MANAGER",
  PROVIDER_REVIEWER: "PROVIDER_REVIEWER",
  RISK_MODERATOR: "RISK_MODERATOR",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export const protectionAdminCapabilities = [
  PROTECTION_ADMIN_CAPABILITY.PROVIDER_REVIEWER,
  PROTECTION_ADMIN_CAPABILITY.RISK_MODERATOR,
  PROTECTION_ADMIN_CAPABILITY.BOND_OPERATOR,
  PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
  PROTECTION_ADMIN_CAPABILITY.PROTECTION_EXPORTER,
  PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN,
] as const;

export type ProtectionAdminCapability =
  (typeof protectionAdminCapabilities)[number];

export const isProtectionAdminCapability = (
  capability: string | null | undefined
): capability is ProtectionAdminCapability =>
  protectionAdminCapabilities.some(
    (knownCapability) => knownCapability === capability
  );

export const hasProtectionAdminCapability = (
  assignedCapabilities: readonly string[],
  requiredCapability: ProtectionAdminCapability
): boolean =>
  assignedCapabilities.includes(requiredCapability) ||
  assignedCapabilities.includes(PROTECTION_ADMIN_CAPABILITY.SUPER_ADMIN);

export const isAccountRole = (
  role: string | null | undefined
): role is AccountRole =>
  Object.values(ACCOUNT_ROLE).some((accountRole) => accountRole === role);

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
