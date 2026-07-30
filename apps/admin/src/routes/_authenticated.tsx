import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireAdminSession } from "@/features/auth/guards/require-admin-session";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await requireAdminSession(location.href);
    return { session };
  },
  component: Outlet,
});
