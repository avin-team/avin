import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";

import { AdminLayout } from "@/components/layout/admin-layout";
import { requireAdminSession } from "@/features/auth/guards/require-admin-session";

const AuthenticatedLayout = () => {
  const { session } = useRouteContext({ from: "/_authenticated" });

  return (
    <AdminLayout
      user={{
        avatar: session.user.image ?? "",
        email: session.user.email,
        name: session.user.name ?? "",
      }}
    >
      <Outlet />
    </AdminLayout>
  );
};

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await requireAdminSession(location.href);
    return { session };
  },
  component: AuthenticatedLayout,
});
