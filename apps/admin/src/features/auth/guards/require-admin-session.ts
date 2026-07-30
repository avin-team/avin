import { redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const requireAdminSession = async (locationHref?: string) => {
  const session = await authClient.getSession();

  if (!session.data?.user || session.data.user.role !== "ADMIN") {
    throw redirect({
      search: {
        redirect: locationHref,
      },
      to: "/sign-in",
    });
  }

  return session.data;
};
