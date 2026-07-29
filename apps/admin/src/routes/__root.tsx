import { Toaster } from "@avin/ui/components/sonner";
import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";

import { AdminLayout } from "@/components/layout/admin-layout";

import "../index.css";

const RootComponent = () => (
  <>
    <HeadContent />
    <AdminLayout>
      <Outlet />
    </AdminLayout>
    <Toaster richColors />
  </>
);

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    links: [{ href: "/favicon.ico", rel: "icon" }],
    meta: [
      { title: "Avin Admin" },
      {
        content: "Avin marketplace operations dashboard",
        name: "description",
      },
    ],
  }),
});
