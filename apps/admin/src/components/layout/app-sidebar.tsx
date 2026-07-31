import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@avin/ui/components/sidebar";

import { useLayout } from "@/context/layout-provider";

import { AppTitle } from "./app-title";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import type { User } from "./types";

interface AppSidebarProps {
  readonly user?: User;
}

export const AppSidebar = ({ user }: AppSidebarProps) => {
  const { collapsible, variant } = useLayout();
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user ?? sidebarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
