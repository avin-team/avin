import { PROTECTION_ADMIN_CAPABILITY } from "@avin/auth/permissions";

import { publicProcedure } from "../access/procedures";
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
};
