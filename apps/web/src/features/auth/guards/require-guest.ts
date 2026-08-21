import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { queryClient as defaultQueryClient } from "@/utils/orpc";

import { resolveSessionData } from "../api/session-query";

export const requireGuest = async (
  queryClient: QueryClient = defaultQueryClient
) => {
  const sessionData = await resolveSessionData(queryClient);

  if (sessionData?.user) {
    throw redirect({
      to: "/",
    });
  }
};
