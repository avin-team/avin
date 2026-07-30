import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";

const AuthRouteLayout = () => (
  <AuthLayout>
    <Outlet />
  </AuthLayout>
);

export const Route = createFileRoute("/(auth)")({
  component: AuthRouteLayout,
});
