import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { requireGuest } from "@/features/auth/guards/require-guest";

const AuthRouteLayout = () => (
  <AuthLayout>
    <Outlet />
  </AuthLayout>
);

export const Route = createFileRoute("/(auth)")({
  beforeLoad: async ({ context }) => {
    await requireGuest(context?.queryClient);
  },
  component: AuthRouteLayout,
});
