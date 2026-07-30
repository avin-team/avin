import { Button } from "@avin/ui/components/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { cn } from "@avin/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const ToggleSidebar = ({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("aspect-square size-8 max-md:scale-125", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <X className="md:hidden" />
      <Menu className="max-md:hidden" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

export const AppTitle = () => {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="gap-0 py-0 hover:bg-transparent active:bg-transparent"
          render={<div />}
        >
          <Link
            to="/"
            onClick={() => setOpenMobile(false)}
            className="grid flex-1 text-start text-sm leading-tight"
          >
            <span className="truncate font-bold">Avin Admin</span>
            <span className="truncate text-xs">Marketplace operations</span>
          </Link>
          <ToggleSidebar />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
