import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/provider/login")({
  beforeLoad: () => {
    throw redirect({
      search: { redirectTo: "/avin-check/workspace" },
      to: "/login",
    });
  },
});
