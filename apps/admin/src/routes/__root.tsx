import { Toaster } from "@avin/ui/components/sonner";
import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";

import { GeneralError } from "@/features/errors/general-error";
import { NotFoundError } from "@/features/errors/not-found-error";

import "../index.css";

const RootComponent = () => (
  <>
    <HeadContent />
    <Outlet />
    <Toaster richColors />
  </>
);

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: GeneralError,
  head: () => ({
    links: [{ href: "/favicon.png", rel: "icon" }],
    meta: [
      { title: "Avin Admin" },
      {
        content: "Avin marketplace operations dashboard",
        name: "description",
      },
    ],
  }),
  notFoundComponent: NotFoundError,
});
