import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { SidebarTrigger } from "@avin/ui/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Code2,
  Landmark,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  TicketPercent,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

import { StoreProfilePanel } from "../components/store-profile-panel";
import { StoreSectionPlaceholder } from "../components/store-section-placeholder";
import type { StoreSection } from "../data/store-types";
import { SellerLayout } from "../layout/seller-layout";
import { getStoreProfileCompletion } from "./store-overview-logic";
import { StoreProductsPanel } from "./store-products-panel";

const getSectionLabel = (section: StoreSection): string => {
  const labels: Record<StoreSection, string> = {
    complaints: "Khiếu nại",
    developer: "Nhà phát triển",
    discounts: "Mã giảm giá",
    finance: "Tài chính",
    orders: "Đơn hàng",
    overview: "Tổng quan",
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
} as const;

const getStepCardStyle = (done: boolean, isLast: boolean) => {
  if (done) {
    return "border-emerald-500/40 bg-emerald-500/10";
  }
  if (isLast) {
    return "border-primary bg-primary/10 ring-2 ring-primary/20";
  }
  return "border-border/60 bg-card/40 opacity-70";
};

const StoreOverview = ({
  onNavigateSection,
}: {
  onNavigateSection: (section: StoreSection) => void;
}) => {
  const profileQuery = useQuery(orpc.sellerStore.getProfile.queryOptions());
  const listingsQuery = useQuery(
    orpc.listing.sellerWorkspace.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );
  if (profileQuery.isPending) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
        Đang tải tổng quan gian hàng...
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
        Không thể tải tổng quan gian hàng. Vui lòng thử lại.
      </div>
    );
  }

  const profileCompletion = getStoreProfileCompletion(
    profileQuery.data.profile
  );
  const listings = listingsQuery.data ?? [];
  const productCount = listings.length;
  const activeProductCount = listings.filter(
    (listing) => listing.status === "PUBLISHED"
  ).length;
  let productCountLabel = `${productCount} sản phẩm đã tạo`;
  let activeProductCountLabel = `${activeProductCount}`;
  if (listingsQuery.isPending) {
    productCountLabel = "Đang tải...";
    activeProductCountLabel = "—";
  } else if (listingsQuery.isError) {
    productCountLabel = "Không tải được sản phẩm";
    activeProductCountLabel = "—";
  }

  const steps = [
    {
      description: "Đăng ký tài khoản người bán",
      done: true,
      id: 1,
      title: "1. Tạo tài khoản",
    },
    {
      description: "Avatar, ảnh bìa & thông tin giới thiệu",
      done: profileCompletion.isComplete,
      id: 2,
      title: "2. Hồ sơ gian hàng",
    },
    {
      description: "Thêm ít nhất 1 sản phẩm bán",
      done: productCount > 0,
      id: 3,
      title: "3. Thêm sản phẩm",
    },
    {
      description: "Kiểm tra gian hàng trước khi công khai",
      done: false,
      id: 4,
      title: "4. Xem trước gian hàng",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Visual Stepper Hero */}
      <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-background p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h3 className="text-lg font-bold">Lộ trình thiết lập Gian hàng</h3>
            <p className="text-xs text-muted-foreground">
              Theo dõi 4 bước chuẩn bị trước khi gian hàng chính thức đón khách
            </p>
          </div>
          <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-300">
            Đang chuẩn bị
          </Badge>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {steps.map((step) => (
            <div
              className={`relative rounded-xl border p-4 transition-all ${getStepCardStyle(
                step.done,
                step.id === 4
              )}`}
              key={step.id}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Bước {step.id}
                </span>
                {step.done ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <div className="size-2 animate-pulse rounded-full bg-primary" />
                )}
              </div>
              <p className="mt-2 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Step 4 Action Callout */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-emerald-400" />
            <span className="text-sm font-medium">
              Xem lại gian hàng trước khi quyết định mở bán công khai.
            </span>
          </div>
          <Button render={<Link to="/seller/store-preview" />}>
            Xem trước gian hàng
            <ArrowRight />
          </Button>
        </div>
      </div>

      {/* Grid: Quick Navigation & Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h4 className="mb-4 text-base font-semibold">Thao tác trực tiếp</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => onNavigateSection("profile")}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold">Hồ sơ gian hàng</p>
                  <p className="text-xs text-muted-foreground">
                    Cập nhật logo, tên shop & giới thiệu
                  </p>
                </div>
                <UserRound className="size-5 text-primary" />
              </button>

              <button
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => onNavigateSection("products")}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold">Quản lý sản phẩm</p>
                  <p className="text-xs text-muted-foreground">
                    {productCountLabel}
                  </p>
                </div>
                <Package className="size-5 text-primary" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h4 className="mb-4 text-base font-semibold">Chỉ số gian hàng</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs text-muted-foreground">
                Hoàn thiện hồ sơ
              </span>
              <span className="text-sm font-bold">
                {profileCompletion.percentage}%
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs text-muted-foreground">
                Sản phẩm đang bán
              </span>
              <span className="text-sm font-bold">
                {activeProductCountLabel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Trạng thái</span>
              <Badge variant="outline">Nháp</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StoreContent = ({
  active,
  onNavigateSection,
}: {
  active: StoreSection;
  onNavigateSection: (section: StoreSection) => void;
}) => {
  if (active === "profile") {
    return <StoreProfilePanel />;
  }

  if (active === "overview") {
    return <StoreOverview onNavigateSection={onNavigateSection} />;
  }

  if (active === "products") {
    return <StoreProductsPanel />;
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
  const search = useSearch({ from: "/_authenticated/seller/store" });
  const [active, setActive] = useState<StoreSection>(
    search.section ?? "overview"
  );

  return (
    <SellerLayout active={active} onChange={setActive}>
      <div className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[2048px]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
            <div className="flex items-start gap-2">
              <SidebarTrigger className="mt-0.5 shrink-0" />
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
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-300">
              <AlertCircle className="size-3.5" />
              Chưa mở bán
            </div>
          </div>
          <div className="mt-6">
            <StoreContent
              active={active}
              onNavigateSection={(section) => setActive(section)}
            />
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};
