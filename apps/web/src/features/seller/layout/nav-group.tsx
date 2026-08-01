import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@avin/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { ChevronRight } from "lucide-react";

import type { StoreSection } from "../data/store-mock-data";
import type { SellerNavGroup as SellerNavGroupData } from "./types";

interface SellerNavGroupProps extends SellerNavGroupData {
  active: StoreSection;
  onChange: (section: StoreSection) => void;
}

export const SellerNavGroup = ({
  active,
  items,
  title,
  onChange,
}: SellerNavGroupProps) => {
  const { setOpenMobile } = useSidebar();

  return (
    <Collapsible
      defaultOpen={items.some((item) => item.value === active)}
      render={<SidebarGroup />}
    >
      <CollapsibleTrigger
        className="group w-full"
        render={<SidebarGroupLabel />}
      >
        <span>{title}</span>
        <ChevronRight className="ms-auto transition-transform duration-200 group-data-panel-open:rotate-90 rtl:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-all duration-300 ease-out data-ending-style:h-0 data-starting-style:h-0 [&[hidden]:not([hidden='until-found'])]:hidden">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = active === item.value;
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.value}>
                <SidebarMenuButton
                  isActive={isActive}
                  render={
                    <button
                      aria-label={item.label}
                      onClick={() => {
                        onChange(item.value);
                        setOpenMobile(false);
                      }}
                      type="button"
                    />
                  }
                  tooltip={item.label}
                >
                  <Icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
                {item.needsAttention && !isActive ? (
                  <SidebarMenuBadge>
                    <span className="size-1.5 rounded-full bg-primary" />
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
};
