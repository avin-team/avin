import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  AlertCircle,
  BarChart3,
  Check,
  CircleHelp,
  Code2,
  ImageIcon,
  Landmark,
  Package,
  Plus,
  ShoppingBag,
  Store,
  TicketPercent,
  UserRound,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Shell } from "@/components/shell";

import { StoreProfilePanel } from "../components/store-profile-panel";
import { StoreSectionPlaceholder } from "../components/store-section-placeholder";
import { StoreSidebar } from "../components/store-sidebar";
import { MOCK_PRODUCTS } from "../data/store-mock-data";
import type { MockProduct, StoreSection } from "../data/store-mock-data";

const getSectionLabel = (section: StoreSection): string => {
  const labels: Record<StoreSection, string> = {
    complaints: "Khiếu nại",
    developer: "Nhà phát triển",
    discounts: "Mã giảm giá",
    finance: "Tài chính",
    images: "Hình ảnh & Banner",
    orders: "Đơn hàng",
    overview: "Tổng quan",
    payments: "Thanh toán",
    products: "Sản phẩm",
    profile: "Hồ sơ gian hàng",
  };

  return labels[section];
};

const PLACEHOLDER_SECTIONS = {
  complaints: {
    description:
      "Theo dõi phản hồi và các vấn đề cần xử lý sau khi khách mua hàng.",
    icon: CircleHelp,
    title: "Khiếu nại",
  },
  developer: {
    description: "Các công cụ mở rộng và tích hợp dành cho gian hàng của bạn.",
    icon: Code2,
    title: "Nhà phát triển",
  },
  discounts: {
    description:
      "Tạo ưu đãi để thu hút khách hàng mới và chăm sóc khách hàng cũ.",
    icon: TicketPercent,
    title: "Mã giảm giá",
  },
  finance: {
    description: "Xem doanh thu, số dư có thể rút và lịch sử nhận tiền.",
    icon: Landmark,
    title: "Tài chính",
  },
  images: {
    description:
      "Tạo diện mạo giúp khách nhận ra gian hàng của bạn ngay từ lần đầu ghé thăm.",
    icon: ImageIcon,
    title: "Hình ảnh & Banner",
  },
  payments: {
    description:
      "Thiết lập nơi nhận tiền sau khi đơn hàng hoàn tất. Thông tin này chỉ bạn và Avin có thể xem.",
    icon: Wallet,
    title: "Thanh toán",
  },
} as const;

const StoreOverview = () => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <AlertCircle className="size-4" />
          </div>
          <div>
            <p className="font-semibold">Gian hàng chưa mở bán</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Hoàn thiện hồ sơ và ít nhất một sản phẩm. Bạn sẽ được xem trước
              mọi thứ trước khi mở cho khách hàng.
            </p>
          </div>
        </div>
        <Button>Mở gian hàng</Button>
      </div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[
        { icon: UserRound, label: "Hồ sơ", value: "0%" },
        { icon: Package, label: "Sản phẩm", value: "3" },
        { icon: BarChart3, label: "Đang bán", value: "1" },
      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            className="rounded-2xl border border-border bg-card p-5"
            key={stat.label}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-2xl font-bold">{stat.value}</p>
          </div>
        );
      })}
    </div>
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Việc cần làm</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ba việc nhỏ để gian hàng sẵn sàng đón khách.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">1/3 hoàn thành</span>
      </div>
      <div className="mt-4 space-y-2">
        {[
          { action: "Đã xong", done: true, label: "Tạo tài khoản seller" },
          {
            action: "Thiết lập",
            done: false,
            label: "Hoàn thiện hồ sơ gian hàng",
          },
          {
            action: "Thiết lập",
            done: false,
            label: "Chọn sản phẩm để mở bán",
          },
        ].map((task) => (
          <div
            className="flex items-center gap-3 rounded-xl bg-muted/30 p-3"
            key={task.label}
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full ${task.done ? "bg-primary text-primary-foreground" : "border border-border text-transparent"}`}
            >
              <Check className="size-3.5" />
            </span>
            <span
              className={`flex-1 text-sm ${task.done ? "text-muted-foreground line-through" : "font-medium"}`}
            >
              {task.label}
            </span>
            <Button size="sm" variant={task.done ? "ghost" : "outline"}>
              {task.action}
            </Button>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MockProductRow = ({ product }: { product: MockProduct }) => (
  <div className="flex items-start gap-3 py-4">
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <ImageIcon className="size-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <Badge
          className={
            product.status === "Đang bán"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-amber-400/30 bg-amber-400/10 text-amber-300"
          }
          variant="outline"
        >
          {product.status}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {product.category} · {product.price}
      </p>
      {product.status === "Đang chuẩn bị" ? (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${product.progress}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {product.progress}%
          </span>
        </div>
      ) : null}
    </div>
    <Button size="sm" variant="ghost">
      Mở
    </Button>
  </div>
);

const ProductPanel = () => (
  <section className="rounded-2xl border border-border bg-card p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-lg font-semibold">Sản phẩm</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Mỗi sản phẩm là một thứ bạn cung cấp cho khách hàng.
        </p>
      </div>
      <Button>
        <Plus />
        Thêm sản phẩm
      </Button>
    </div>
    <div className="mt-4 divide-y divide-border/60">
      {MOCK_PRODUCTS.map((product) => (
        <MockProductRow key={product.name} product={product} />
      ))}
    </div>
  </section>
);

const StoreContent = ({ active }: { active: StoreSection }) => {
  if (active === "profile") {
    return <StoreProfilePanel />;
  }

  if (active === "overview") {
    return <StoreOverview />;
  }

  if (active === "products") {
    return <ProductPanel />;
  }

  if (active === "orders") {
    return (
      <StoreSectionPlaceholder
        active={active}
        description="Khi bạn mở bán và có khách mua, bạn sẽ theo dõi việc giao hàng và trao đổi ngay trong khu vực này."
        icon={ShoppingBag}
        title="Đơn hàng"
      />
    );
  }

  const section = PLACEHOLDER_SECTIONS[active];
  return (
    <StoreSectionPlaceholder
      active={active}
      description={section.description}
      icon={section.icon}
      title={section.title}
    />
  );
};

export const StorePage = () => {
  const [active, setActive] = useState<StoreSection>("profile");

  return (
    <Shell className="max-w-none px-0 pb-16" variant="default">
      <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 overflow-hidden border-y border-border bg-background lg:grid-cols-[250px_minmax(0,1fr)]">
        <StoreSidebar active={active} onChange={setActive} />
        <div className="min-w-0 p-5 sm:p-7 lg:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Store className="size-5 text-primary" />
                <p className="font-semibold">Kênh bán hàng</p>
                <Badge variant="outline">Chưa bắt đầu</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Không gian bán hàng · Mới bắt đầu · {getSectionLabel(active)}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-300">
              <AlertCircle className="size-3.5" />
              Chưa mở bán
            </div>
          </div>
          <div className="mt-6">
            <StoreContent active={active} />
          </div>
        </div>
      </div>
    </Shell>
  );
};
