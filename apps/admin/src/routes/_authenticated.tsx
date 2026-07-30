import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminLayout } from "@/components/layout/admin-layout";
import { requireAdminSession } from "@/features/auth/guards/require-admin-session";

const AuthenticatedLayout = () => (
  <AdminLayout>
    <Outlet />
  </AdminLayout>
);

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await requireAdminSession(location.href);
    return { session };
  },
  component: AuthenticatedLayout,
});
