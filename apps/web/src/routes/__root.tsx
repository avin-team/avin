import { Toaster } from "@avin/ui/components/sonner";
import { TooltipProvider } from "@avin/ui/components/tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { LazyMotion, domAnimation } from "motion/react";

import { ThemeProvider } from "@/components/theme-provider";
import { GeneralError } from "@/features/errors/general-error";
import { NotFoundError } from "@/features/errors/not-found-error";
import type { orpc } from "@/utils/orpc";

import "../index.css";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

const RootComponent = () => (
  <>
    <HeadContent />
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      storageKey="vite-ui-theme"
    >
      <TooltipProvider>
        <LazyMotion features={domAnimation}>
          <Outlet />
          <Toaster richColors />
        </LazyMotion>
      </TooltipProvider>
    </ThemeProvider>
    <TanStackRouterDevtools position="bottom-left" />
    <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
  </>
);

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  errorComponent: GeneralError,
  head: () => ({
    links: [
      {
        href: "/favicon.png",
        rel: "icon",
      },
    ],
    meta: [
      {
        title: "avin",
      },
      {
        content: "avin is a web application",
        name: "description",
      },
    ],
  }),
  notFoundComponent: NotFoundError,
});
