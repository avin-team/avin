import type { QueryClient } from "@tanstack/react-query";
import { queryOptions, useQuery } from "@tanstack/react-query";

import { authClient } from "./auth-client";

export const sessionQueryKey = ["auth", "session"] as const;

export const SESSION_STALE_TIME_MS = 5 * 60 * 1000;
export const SESSION_GC_TIME_MS = 10 * 60 * 1000;

export type SessionData = Awaited<
  ReturnType<typeof authClient.getSession>
>["data"];

export const sessionQueryOptions = () =>
  queryOptions({
    gcTime: SESSION_GC_TIME_MS,
    queryFn: async (): Promise<SessionData> => {
      const { data } = await authClient.getSession();
      return data ?? null;
    },
    queryKey: sessionQueryKey,
    retry: false,
    staleTime: SESSION_STALE_TIME_MS,
  });

export const useSession = () => useQuery(sessionQueryOptions());

export const resolveSessionData = async (
  queryClient: QueryClient
): Promise<SessionData> => {
  try {
    return await queryClient.ensureQueryData(sessionQueryOptions());
  } catch {
    return null;
  }
};

export const invalidateAuthSession = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: sessionQueryKey });

export const clearAuthSession = (queryClient: QueryClient) => {
  queryClient.setQueryData(sessionQueryKey, null);
};
