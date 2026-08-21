import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export const useProtectionLaunchStatus = () =>
  useQuery(orpc.protection.launchStatus.queryOptions());
