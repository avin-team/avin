import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { queryClient as defaultQueryClient } from "@/utils/orpc";

import { resolveSessionData } from "../api/session-query";

export const requireSession = async (
  queryClient: QueryClient = defaultQueryClient,
  redirectTo?: string
) => {
  const sessionData = await resolveSessionData(queryClient);

  if (!sessionData?.user) {
    throw redirect({
      ...(redirectTo ? { search: { redirectTo } } : {}),
      to: "/login",
    });
  }

  return { data: sessionData };
};
