import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  BarChart3,
  Code2,
  Eye,
  ImageIcon,
  Landmark,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  TicketPercent,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";

import type { StoreSection } from "../data/store-mock-data";

type StoreIcon = ComponentType<{ className?: string }>;

const NAV_GROUPS: {
  items: { icon: StoreIcon; label: string; value: StoreSection }[];
  title: string;
}[] = [
  {
    items: [{ icon: LayoutDashboard, label: "Tổng quan", value: "overview" }],
    title: "Tổng quan",
  },
  {
    items: [
      { icon: UserRound, label: "Hồ sơ gian hàng", value: "profile" },
      { icon: ImageIcon, label: "Hình ảnh & Banner", value: "images" },
      { icon: Wallet, label: "Thanh toán", value: "payments" },
    ],
    title: "Thiết lập gian hàng",
  },
  {
    items: [
      { icon: Package, label: "Sản phẩm", value: "products" },
      { icon: ShoppingBag, label: "Đơn hàng", value: "orders" },
      { icon: BarChart3, label: "Khiếu nại", value: "complaints" },
      { icon: TicketPercent, label: "Mã giảm giá", value: "discounts" },
    ],
    title: "Bán hàng",
  },
  {
    items: [{ icon: Landmark, label: "Tài chính", value: "finance" }],
    title: "Tài chính",
  },
  {
    items: [{ icon: Code2, label: "Nhà phát triển", value: "developer" }],
    title: "Nhà phát triển",
  },
];

interface StoreSidebarProps {
  active: StoreSection;
  onChange: (section: StoreSection) => void;
}

export const StoreSidebar = ({ active, onChange }: StoreSidebarProps) => (
  <aside className="border-border bg-card p-4 lg:sticky lg:top-0 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:border-r">
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Store className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Kênh bán hàng</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Không gian bán hàng
        </p>
      </div>
    </div>

    <nav aria-label="Quản lý gian hàng" className="mt-5 space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.value;

              return (
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors ${isActive ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  key={item.value}
                  onClick={() => onChange(item.value)}
                  type="button"
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.value === "profile" && !isActive ? (
                    <span className="ms-auto size-1.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>

    <div className="mt-5 border-t border-border/60 pt-4">
      <Button className="w-full" size="sm" variant="outline">
        <Eye />
        Xem trang gian hàng
      </Button>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Trạng thái</span>
        <Badge
          className="border-amber-400/30 bg-amber-400/10 text-amber-300"
          variant="outline"
        >
          Chưa bắt đầu
        </Badge>
      </div>
    </div>
  </aside>
);
