import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/provider/")({
  beforeLoad: () => {
    throw redirect({ to: "/avin-check/workspace" });
  },
});
