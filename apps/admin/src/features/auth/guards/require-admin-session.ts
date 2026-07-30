import { redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const requireAdminSession = async (locationHref?: string) => {
  let sessionData = null;

  try {
    const session = await authClient.getSession();
    sessionData = session.data;
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
