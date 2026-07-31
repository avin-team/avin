import { redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

const ADMIN_SESSION_CACHE_DURATION_MS = 5 * 60 * 1000;

type SessionData = Awaited<ReturnType<typeof authClient.getSession>>["data"];

let cachedAdminSession: SessionData | null = null;
let cachedAdminSessionExpiresAt = 0;
let cacheVersion = 0;
let pendingSessionRequest: Promise<SessionData> | undefined;

export const clearAdminSessionCache = (): void => {
  cacheVersion += 1;
  cachedAdminSession = null;
  cachedAdminSessionExpiresAt = 0;
  pendingSessionRequest = undefined;
};

const fetchAdminSession = async (
  requestCacheVersion: number
): Promise<SessionData> => {
  try {
    const { data } = await authClient.getSession();

    if (data?.user?.role === "ADMIN" && requestCacheVersion === cacheVersion) {
      cachedAdminSession = data;
      cachedAdminSessionExpiresAt =
        Date.now() + ADMIN_SESSION_CACHE_DURATION_MS;
    }

    return data;
  } finally {
    if (requestCacheVersion === cacheVersion) {
      pendingSessionRequest = undefined;
    }
  }
};

const getAdminSession = (): Promise<SessionData> => {
  if (cachedAdminSession && cachedAdminSessionExpiresAt > Date.now()) {
    return Promise.resolve(cachedAdminSession);
  }

  if (pendingSessionRequest) {
    return pendingSessionRequest;
  }

  const requestCacheVersion = cacheVersion;
  pendingSessionRequest = fetchAdminSession(requestCacheVersion);

  return pendingSessionRequest;
};

export const requireAdminSession = async (locationHref?: string) => {
  let sessionData = null;

  try {
    sessionData = await getAdminSession();
  } catch {
    // Catch network errors (e.g., Failed to fetch when backend server is offline)
    // and treat as unauthenticated session instead of throwing unhandled error.
  }

  if (!sessionData?.user || sessionData.user.role !== "ADMIN") {
    throw redirect({
      search: {
        redirect: locationHref,
      },
      to: "/sign-in",
    });
  }

  return sessionData;
};
