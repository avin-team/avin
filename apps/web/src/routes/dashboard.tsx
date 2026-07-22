import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  redirect,
  useRouteContext,
} from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
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
    const session = await authClient.getSession();
    if (!session.data) {
      redirect({
        throw: true,
        to: "/login",
      });
    }
    return { session };
  },
  component: RouteComponent,
});
