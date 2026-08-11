import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@avin/ui/components/collapsible";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@avin/ui/components/sidebar";
import { CaretRightIcon, ShoppingBagIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import type { StoreSection } from "../data/store-types";
import type { SellerNavGroup as SellerNavGroupData } from "./types";

interface SellerNavGroupProps extends SellerNavGroupData {
  active: StoreSection;
  onChange?: (section: StoreSection) => void;
}

export const SellerNavGroup = ({
  active,
  items,
  onChange,
  title,
}: SellerNavGroupProps) => {
  const { setOpenMobile } = useSidebar();

  if (items.length === 1 && items[0]) {
    const [item] = items;
    const isActive = active === item.value;
    const Icon = item.icon;

    return (
      <SidebarGroup className="py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive}
              render={
                <Link
                  aria-label={item.label}
                  onClick={(event) => {
                    setOpenMobile(false);
                    if (onChange) {
                      event.preventDefault();
                      onChange(item.value);
                    }
                  }}
                  search={{ section: item.value }}
                  to="/seller/store"
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
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  const isAnyActive = items.some((item) => item.value === active);

  return (
    <Collapsible
      defaultOpen={isAnyActive}
      render={<SidebarGroup className="py-0" />}
    >
      <SidebarMenu>
        <SidebarMenuItem>
          <CollapsibleTrigger
            className="group w-full"
            render={
              <SidebarMenuButton tooltip={title}>
                <ShoppingBagIcon />
                <span>{title}</span>
                <CaretRightIcon className="ms-auto transition-transform duration-200 group-data-panel-open:rotate-90 rtl:rotate-180" />
              </SidebarMenuButton>
            }
          />
          <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-all duration-300 ease-out data-ending-style:h-0 data-starting-style:h-0 [&[hidden]:not([hidden='until-found'])]:hidden">
            <SidebarMenuSub>
              {items.map((item) => {
                const isActive = active === item.value;
                const Icon = item.icon;

                return (
                  <SidebarMenuSubItem key={item.value}>
                    <SidebarMenuSubButton
                      isActive={isActive}
                      render={
                        <Link
                          aria-label={item.label}
                          className="w-full"
                          onClick={(event) => {
                            setOpenMobile(false);
                            if (onChange) {
                              event.preventDefault();
                              onChange(item.value);
                            }
                          }}
                          search={{ section: item.value }}
                          to="/seller/store"
                        />
                      }
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </SidebarMenu>
    </Collapsible>
  );
};
