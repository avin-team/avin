import { SidebarInset, SidebarProvider } from "@avin/ui/components/sidebar";
import { cn } from "@avin/ui/lib/utils";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SkipToMain } from "@/components/skip-to-main";
import { LayoutProvider } from "@/context/layout-provider";
import { getCookie } from "@/lib/cookies";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const defaultOpen = getCookie("sidebar_state") !== "false";

  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <SidebarInset
          className={cn(
            "@container/content",
            "has-data-[layout=fixed]:h-svh",
            "peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]"
          )}
        >
          {children}
        </SidebarInset>
      </SidebarProvider>
    </LayoutProvider>
  );
};
