import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/seller/login")({
  beforeLoad: () => {
    throw redirect({
      search: { role: "seller" },
      to: "/login",
    });
  },
});
