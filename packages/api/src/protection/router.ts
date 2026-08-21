import { publicProcedure } from "../access/procedures";
import { getProtectionLaunchConfiguration } from "./configuration";
import { getProtectionLaunchStatus } from "./launch-gates";

export const protectionRouter = {
  launchStatus: publicProcedure.handler(() =>
    getProtectionLaunchStatus(getProtectionLaunchConfiguration())
  ),
};
