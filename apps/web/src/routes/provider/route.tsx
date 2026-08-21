import { Outlet, createFileRoute } from "@tanstack/react-router";

import { ProviderLayout } from "@/features/protection/components/provider-layout";

export const Route = createFileRoute("/provider")({
  component: () => (
    <ProviderLayout>
      <Outlet />
    </ProviderLayout>
  ),
});
