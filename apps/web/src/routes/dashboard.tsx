import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";

import { requireSession } from "@/features/auth/guards/require-session";
import { orpc } from "@/utils/orpc";

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/dashboard" });

  const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>API: {privateData.data?.message}</p>
    </div>
  );
};

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await requireSession();

    return { session };
  },
  component: RouteComponent,
});
