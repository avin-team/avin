import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/avin-check/warnings")({
  beforeLoad: () => {
    throw redirect({ to: "/avin-check" });
  },
});
