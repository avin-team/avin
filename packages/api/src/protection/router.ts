import {
  ACCOUNT_ROLE,
  PROTECTION_ADMIN_CAPABILITY,
} from "@avin/auth/permissions";

import { providerProcedure, publicProcedure } from "../access/procedures";
import { getProtectionLaunchConfiguration } from "./configuration";
import {
  PROTECTION_MODULE_NAME,
  getProtectionLaunchStatus,
} from "./launch-gates";
import { protectionAdminProcedure } from "./procedures";

export const protectionRouter = {
  adminLaunchStatus: protectionAdminProcedure({
    action: "protection.launch_status.read",
    capability: PROTECTION_ADMIN_CAPABILITY.PROTECTION_MANAGER,
    purpose: "Review Avin Check launch gates before protected operations",
    target: { id: PROTECTION_MODULE_NAME, type: "PROTECTION_MODULE" },
  }).handler(() =>
    getProtectionLaunchStatus(getProtectionLaunchConfiguration())
  ),

  launchStatus: publicProcedure.handler(() =>
    getProtectionLaunchStatus(getProtectionLaunchConfiguration())
  ),

  providerWorkspace: providerProcedure.handler(({ context }) => ({
    identity: {
      id: context.session.user.id,
      name: context.session.user.name,
      role: ACCOUNT_ROLE.PROVIDER,
    },
    privateProviderRecord: {
      source: "PROVIDER_IDENTITY",
      visibility: "PRIVATE",
    },
    publicProfile: {
      source: "PUBLISHED_PROVIDER_PROFILE_VERSION",
      status: "NOT_PUBLISHED",
      visibility: "PUBLIC",
    },
  })),
};
