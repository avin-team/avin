import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/")({
  beforeLoad: () => {
    throw redirect({ to: "/category" });
  },
});
