import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/seller/login")({
  beforeLoad: () => {
    throw redirect({
      search: { role: "seller" },
      to: "/login",
    });
  },
});
