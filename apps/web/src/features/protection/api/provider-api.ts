import { useQuery } from "@tanstack/react-query";

import { providerOrpc } from "./provider-orpc";

export const useProviderWorkspace = () =>
  useQuery(providerOrpc.protection.providerWorkspace.queryOptions());
