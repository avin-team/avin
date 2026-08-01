import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";

export const SellerAppTitle = () => {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          className="gap-0 py-0 hover:bg-transparent active:bg-transparent"
          render={<div />}
          size="lg"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Store className="size-4" />
          </div>
          <Link
            className="grid flex-1 text-start text-sm leading-tight"
            onClick={() => setOpenMobile(false)}
            to="/seller/store"
          >
            <span className="truncate font-bold">Kênh bán hàng</span>
            <span className="truncate text-xs">Không gian bán hàng</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
