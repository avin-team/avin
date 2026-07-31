import { TooltipProvider } from "@avin/ui/components/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { ThemeProvider } from "./context/theme-provider";
import { queryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
  Wrap: ({ children }: { readonly children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  ),
  context: { queryClient },
  defaultPendingComponent: () => <Loader />,
  defaultPreload: false,
  routeTree,
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.querySelector("#app");

if (!rootElement) {
  throw new Error("Root element not found");
}

if (rootElement.childElementCount === 0) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ThemeProvider>
        <TooltipProvider>
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
