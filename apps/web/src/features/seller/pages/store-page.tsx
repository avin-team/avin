import type { SellerOrderView } from "@avin/api/commerce/orders";
import type { StoreVisibilityReason } from "@avin/api/seller-store/profile";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { SidebarTrigger } from "@avin/ui/components/sidebar";
import {
  ArrowRightIcon,
  BankIcon,
  CaretRightIcon,
  ClockIcon,
  CopyIcon,
  PackageIcon,
  QuestionIcon,
  ShieldCheckIcon,
  StarIcon,
  StorefrontIcon,
  TicketIcon,
  UserCircleIcon,
  WalletIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import {
  formatOrderDeadline,
  getOrderItemStatusColorClassName,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
} from "@/features/commerce/order-status";
import { StoreOrdersPanel } from "@/features/seller/pages/store-orders-panel";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

import { sellerWalletSummaryQueryOptions } from "../api/seller-wallet-api";
import { SellerEnforcementBanner } from "../components/seller-enforcement-banner";
import { SellerWalletPanel } from "../components/seller-wallet-panel";
import { StoreProfilePanel } from "../components/store-profile-panel";
import { StoreSectionPlaceholder } from "../components/store-section-placeholder";
import type { StoreSection } from "../data/store-types";
import { SellerLayout } from "../layout/seller-layout";
import { getStoreProfileCompletion } from "./store-overview-logic";
import { StoreProductsPanel } from "./store-products-panel";

type PendingOrderItem = SellerOrderView["items"][number] & {
  buyer?: SellerOrderView["buyer"];
  buyerId: string;
  orderCreatedAt: string;
  orderId: string;
};

const getSectionLabel = (section: StoreSection): string => {
  const labels: Record<StoreSection, string> = {
    complaints: "Khiếu nại",
    discounts: "Mã giảm giá",
    finance: "Rút Tiền",
    orders: "Đơn hàng",
    overview: "Tổng quan",
    products: "Sản phẩm",
    profile: "Hồ sơ gian hàng",
  };

  return labels[section];
};

const getStoreVisibilityLabel = (reason: StoreVisibilityReason): string => {
  if (reason === "PUBLIC") {
    return "Đã public";
  }
  if (reason === "PENDING_APPROVAL") {
    return "Đang chờ duyệt";
  }
  if (reason === "ENFORCED") {
    return "Đang bị hạn chế";
  }
  return "Đang hoàn thiện hồ sơ";
};

const getStoreVisibilityMessage = (
  reason: StoreVisibilityReason,
  missingFields: number
): string => {
  if (reason === "PUBLIC") {
    return "Khách hàng có thể xem hồ sơ gian hàng của bạn.";
  }
  if (reason === "PENDING_APPROVAL") {
    return "Hồ sơ đã đủ thông tin và sẽ public sau khi Seller được duyệt.";
  }
  if (reason === "ENFORCED") {
    return "Gian hàng đang được ẩn trong thời gian Seller bị hạn chế.";
  }
  return `Hoàn thiện ${missingFields} trường bắt buộc để public hồ sơ.`;
};

const PLACEHOLDER_SECTIONS = {
  complaints: {
    description:
      "Theo dõi phản hồi và các vấn đề cần xử lý sau khi khách mua hàng.",
    icon: QuestionIcon,
    title: "Khiếu nại",
  },
  discounts: {
    description:
      "Tạo ưu đãi để thu hút khách hàng mới và chăm sóc khách hàng cũ.",
    icon: TicketIcon,
    title: "Mã giảm giá",
  },
  finance: {
    description: "Xem doanh thu, số dư có thể rút và lịch sử nhận tiền.",
    icon: BankIcon,
    title: "Rút Tiền",
  },
} as const;

// Shared Helper for Copying Store URL
const copyStoreLink = (slug: string | null | undefined) => {
  if (!slug) {
    toast.error("Gian hàng chưa cài đặt đường dẫn (slug)!");
    return;
  }
  const storeUrl = `${window.location.origin}/store/${slug}`;
  void navigator.clipboard.writeText(storeUrl);
  toast.success("Đã sao chép đường dẫn gian hàng!");
};

// Helper for Filtering Pending Orders in a Single Pass
const extractPendingOrders = (
  orders: SellerOrderView[]
): PendingOrderItem[] => {
  const result: PendingOrderItem[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (item.status === "AWAITING_SELLER" || item.status === "IN_PROGRESS") {
        result.push({
          ...item,
          buyer: order.buyer,
          buyerId: order.buyerId,
          orderCreatedAt: order.createdAt,
          orderId: order.id,
        });
      }
    }
  }
  return result;
};

// Sub-component for Top KPI Cards Grid
const StoreOverviewKpiGrid = ({
  activeProductCount,
  availableBalance,
  isWalletPending,
  onNavigateSection,
  pendingCount,
  pendingBalance,
  productCount,
  profileCompletionPercentage,
  ratingCount,
  ratingScore,
}: {
  activeProductCount: number;
  availableBalance: number;
  isWalletPending: boolean;
  onNavigateSection: (section: StoreSection) => void;
  pendingCount: number;
  pendingBalance: number;
  productCount: number;
  profileCompletionPercentage: number;
  ratingCount: number;
  ratingScore: string;
}) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <button
      aria-label="Xem chi tiết số dư tài chính và rút tiền"
      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => onNavigateSection("finance")}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Số dư khả dụng
        </span>
        <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400">
          <WalletIcon className="size-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold text-foreground">
          {isWalletPending ? "..." : formatVND(availableBalance)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Chờ giải ngân: {formatVND(pendingBalance)}
        </p>
      </div>
    </button>

    <button
      aria-label="Xem các đơn hàng chờ xử lý"
      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => onNavigateSection("orders")}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Đơn hàng chờ xử lý
        </span>
        <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
          <ClockIcon className="size-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold text-foreground">
          {pendingCount}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {pendingCount > 0
            ? "Cần tiếp nhận & bàn giao ngay"
            : "Không có đơn tồn đọng"}
        </p>
      </div>
    </button>

    <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Đánh giá Shop
        </span>
        <div className="rounded-xl bg-amber-400/10 p-2 text-amber-400">
          <StarIcon className="size-5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-extrabold text-foreground">
            {ratingScore}
          </p>
          <span className="text-xs text-amber-400 font-semibold">★</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {ratingCount} đánh giá
        </p>
      </div>
    </div>

    <button
      aria-label="Xem danh sách sản phẩm"
      className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => onNavigateSection("products")}
      type="button"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Sản phẩm đang bán
        </span>
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <PackageIcon className="size-5" />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-extrabold text-foreground">
          {activeProductCount} / {productCount}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hoàn thiện hồ sơ: {profileCompletionPercentage}%
        </p>
      </div>
    </button>
  </div>
);

const StoreOverview = ({
  onNavigateSection,
}: {
  onNavigateSection: (section: StoreSection) => void;
}) => {
  const profileQuery = useQuery(orpc.sellerStore.getProfile.queryOptions());
  const walletSummaryQuery = useQuery(sellerWalletSummaryQueryOptions());
  const listingsQuery = useQuery(
    orpc.listing.sellerWorkspace.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );
  const ordersQuery = useQuery(
    orpc.commerce.orders.listMine.queryOptions({
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

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
        Không thể tải tổng quan gian hàng. Vui lòng thử lại.
      </div>
    );
  }

  const { profile, status, visibilityReason } = profileQuery.data;
  const profileCompletion = getStoreProfileCompletion(profile);
  const listings = listingsQuery.data ?? [];
  const productCount = listings.length;
  const activeProductCount = listings.filter(
    (l) => l.status === "PUBLISHED"
  ).length;

  const orders = ordersQuery.data ?? [];
  const pendingOrders = extractPendingOrders(orders);

  const availableBalance = walletSummaryQuery.data?.availableBalance ?? 0;
  const pendingBalance = walletSummaryQuery.data?.pendingBalance ?? 0;

  const statusLabel = getStoreVisibilityLabel(visibilityReason);
  const statusMessage = getStoreVisibilityMessage(
    visibilityReason,
    4 - profileCompletion.completedFields
  );

  return (
    <div className="space-y-6">
      {/* Storefront status banner */}
      <div className="rounded-2xl border border-border bg-linear-to-b from-card to-background p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div>
            <h3 className="text-lg font-bold">Trạng thái gian hàng</h3>
            <p className="text-xs text-muted-foreground">
              Trạng thái được xác định từ hồ sơ và quyền bán hàng của bạn
            </p>
          </div>
          <Badge
            className={
              status === "PUBLIC"
                ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                : "border-amber-500/30 bg-amber-500/20 text-amber-300"
            }
          >
            {statusLabel}
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="size-5 text-emerald-400" />
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile?.storeSlug ? (
              <Button
                onClick={() => copyStoreLink(profile.storeSlug)}
                size="sm"
                variant="outline"
              >
                <CopyIcon />
                Sao chép link
              </Button>
            ) : (
              <Button
                onClick={() => onNavigateSection("profile")}
                size="sm"
                variant="outline"
              >
                Chưa đặt link shop
              </Button>
            )}
            <Button
              render={<Link to="/seller/store-preview" />}
              size="sm"
              variant="default"
            >
              Xem trước gian hàng
              <ArrowRightIcon />
            </Button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards Grid */}
      <StoreOverviewKpiGrid
        activeProductCount={activeProductCount}
        availableBalance={availableBalance}
        isWalletPending={walletSummaryQuery.isPending}
        onNavigateSection={onNavigateSection}
        pendingBalance={pendingBalance}
        pendingCount={pendingOrders.length}
        productCount={productCount}
        profileCompletionPercentage={profileCompletion.percentage}
        ratingCount={profile?.ratingCount ?? 0}
        ratingScore={profile?.ratingScore ?? "5.0"}
      />

      {/* Grid: Quick Actions & Pending Orders Preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions (3 buttons) */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h4 className="mb-4 text-base font-semibold">Thao tác trực tiếp</h4>
            <div className="flex flex-col gap-3">
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
                <UserCircleIcon className="size-5 text-primary shrink-0" />
              </button>

              <button
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => onNavigateSection("products")}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold">Quản lý sản phẩm</p>
                  <p className="text-xs text-muted-foreground">
                    {listingsQuery.isPending
                      ? "Đang tải..."
                      : `${productCount} sản phẩm đã tạo`}
                  </p>
                </div>
                <PackageIcon className="size-5 text-primary shrink-0" />
              </button>

              <button
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 text-left transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => onNavigateSection("finance")}
                type="button"
              >
                <div>
                  <p className="text-sm font-semibold">Rút tiền & Ví</p>
                  <p className="text-xs text-muted-foreground">
                    Theo dõi số dư & gửi yêu cầu rút tiền
                  </p>
                </div>
                <WalletIcon className="size-5 text-primary shrink-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Pending Orders Preview List */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
            <div>
              <h4 className="text-base font-semibold">Đơn hàng cần xử lý</h4>
              <p className="text-xs text-muted-foreground">
                Hiển thị các đơn hàng cần Seller tiếp nhận hoặc bàn giao ngay
              </p>
            </div>
            <Button
              onClick={() => onNavigateSection("orders")}
              size="sm"
              variant="ghost"
            >
              Xem tất cả <CaretRightIcon />
            </Button>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <ShieldCheckIcon className="size-10 text-emerald-400/80 mb-2" />
              <p className="text-sm font-medium text-foreground">
                Không có đơn hàng nào đang chờ xử lý.
              </p>
              <p className="text-xs mt-1">
                Tất cả đơn hàng của bạn đã hoàn thành hoặc chưa phát sinh đơn
                mới.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {pendingOrders.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate text-foreground">
                      {item.listing.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Khách hàng:{" "}
                      <span className="font-medium text-foreground">
                        {item.buyer?.name ?? item.buyerId}
                      </span>{" "}
                      · Hạn: {formatOrderDeadline(item.processingDeadlineAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      className={getOrderItemStatusColorClassName(item.status)}
                      variant={getOrderItemStatusVariant(item.status)}
                    >
                      {getOrderItemStatusLabel(item.status, "seller")}
                    </Badge>
                    <Button
                      onClick={() => onNavigateSection("orders")}
                      size="sm"
                      variant="outline"
                    >
                      Xử lý
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Store Content Component
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
    return <StoreOrdersPanel />;
  }

  if (active === "finance") {
    return <SellerWalletPanel />;
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
  const active: StoreSection =
    search.section === "developer" || search.section === undefined
      ? "overview"
      : search.section;

  const navigate = useNavigate({ from: "/seller/store" });
  const handleNavigateSection = (section: StoreSection) => {
    void navigate({ search: { section } });
  };

  return (
    <SellerLayout active={active} onChange={handleNavigateSection}>
      <div className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-512">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
            <div className="flex items-start gap-2">
              <SidebarTrigger className="mt-0.5 shrink-0" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StorefrontIcon className="size-5 text-primary" />
                  <p className="font-semibold">Kênh bán hàng</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Không gian bán hàng · {getSectionLabel(active)}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            <SellerEnforcementBanner />
            <StoreContent
              active={active}
              onNavigateSection={handleNavigateSection}
            />
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};
