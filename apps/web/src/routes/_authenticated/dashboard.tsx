import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";

import { orpc } from "@/utils/orpc";

const RouteComponent = () => {
  const { session } = useRouteContext({ from: "/_authenticated/dashboard" });

  const privateData = useQuery(orpc.privateData.queryOptions());

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>API: {privateData.data?.message}</p>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});
