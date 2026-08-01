import { SidebarInset, SidebarProvider } from "@avin/ui/components/sidebar";

import type { StoreSection } from "../data/store-mock-data";
import { SellerAppSidebar } from "./app-sidebar";

interface SellerLayoutProps {
  active: StoreSection;
  children: React.ReactNode;
  onChange: (section: StoreSection) => void;
}

export const SellerLayout = ({
  active,
  children,
  onChange,
}: SellerLayoutProps) => (
  <SidebarProvider className="min-h-[calc(100svh-4rem)]">
    <SellerAppSidebar active={active} onChange={onChange} />
    <SidebarInset className="min-h-[calc(100svh-4rem)]">
      {children}
    </SidebarInset>
  </SidebarProvider>
);
