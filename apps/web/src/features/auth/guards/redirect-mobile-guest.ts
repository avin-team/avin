import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { isMobileViewport } from "@/utils/mobile-viewport";
import { queryClient as defaultQueryClient } from "@/utils/orpc";

import { resolveSessionData } from "../api/session-query";

export const redirectMobileGuest = async (
  queryClient: QueryClient = defaultQueryClient
) => {
  if (!isMobileViewport()) {
    return;
  }

  const sessionData = await resolveSessionData(queryClient);

  if (!sessionData?.user) {
    throw redirect({ to: "/login" });
  }
};
