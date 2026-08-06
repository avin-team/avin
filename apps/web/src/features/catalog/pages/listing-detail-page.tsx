import {
  WarningCircleIcon,
  BookOpenIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  HouseIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StarIcon,
  StorefrontIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { ListingMediaGallery } from "@/features/catalog/components/listing-media-gallery";
import { ServicePackageSelector } from "@/features/catalog/components/service-package-selector";
import { addCartItemOptimistically } from "@/features/commerce/cart-cache";
import type { CartView } from "@/features/commerce/cart-cache";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

// oxlint-disable-next-line complexity
export const ListingDetailPage = () => {
  const { id } = useParams({ from: "/(public)/listing/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );

  const listingQuery = useQuery(
    orpc.listing.discovery.listingById.queryOptions({
      input: { slug: id },
    })
  );

  const listing = listingQuery.data;
  const isService = listing?.type === "SERVICE";
  const sellerStoreSlug = listing?.seller?.storeSlug;
  const sellerName = listing?.seller?.name || "Nhà cung cấp xác minh";
  const sellerAvatar = listing?.seller?.image;
  const servicePackages = listing?.servicePackages ?? [];
  const selectedPackage =
    servicePackages.find(
      (packageItem) => packageItem.id === selectedPackageId
    ) ?? servicePackages[0];
  const selectedWarranty = selectedPackage?.warrantyPolicy;
  const selectedTimedWarranty =
    selectedWarranty?.kind === "TIMED" ? selectedWarranty : null;
  const selectedNoWarranty = selectedWarranty?.kind === "NO_WARRANTY";
  const selectedPrice =
    selectedPackage?.priceAmount ?? listing?.priceAmount ?? 0;
  const selectedProcessingTime =
    selectedPackage?.processingTimeHours ?? listing?.processingTimeHours;
  let listingImages: string[] = [];
  if (listing?.images?.length) {
    listingImages = listing.images;
  } else if (listing?.thumbnailUrl) {
    listingImages = [listing.thumbnailUrl];
  }
  const cartQueryKey = orpc.commerce.cart.get.queryOptions().queryKey;
  const addToCartMutation = useMutation({
    ...orpc.commerce.cart.add.mutationOptions(),
    onError: (error, _variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartQueryKey, context.previousCart);
      } else {
        queryClient.removeQueries({ exact: true, queryKey: cartQueryKey });
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể thêm Listing vào Cart."
      );
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousCart = queryClient.getQueryData<CartView>(cartQueryKey);

      if (listing) {
        queryClient.setQueryData<CartView>(cartQueryKey, (currentCart) =>
          addCartItemOptimistically(currentCart, listing, selectedPackage?.id)
        );
      }

      return { previousCart };
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
    onSuccess: async (cart) => {
      queryClient.setQueryData(cartQueryKey, cart);
      await navigate({ to: "/cart" });
    },
  });
  let addToCartLabel = "Thêm vào giỏ";
  if (addToCartMutation.isPending) {
    addToCartLabel = "Đang thêm...";
  } else if (isService && !selectedPackage) {
    addToCartLabel = "Chọn gói để tiếp tục";
  }
  const parentCategory = listing?.category?.parentCategory;
  const subCategory = listing?.category;

  return (
    <Shell variant="default">
      <div className="space-y-6 py-6">
        {/* Loading State */}
        {listingQuery.isLoading ? (
          <div className="space-y-6">
            <div className="h-6 w-64 animate-pulse rounded-md bg-muted" />
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="h-72 animate-pulse rounded-2xl bg-muted" />
                <div className="h-32 animate-pulse rounded-2xl bg-muted" />
              </div>
              <div className="h-64 animate-pulse rounded-2xl bg-muted" />
            </div>
          </div>
        ) : null}

        {/* Error / Not Found State */}
        {listingQuery.isError ? (
          <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-12 text-center">
            <WarningCircleIcon className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-xl font-bold text-foreground">
              Không tìm thấy tin đăng
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tin đăng này có thể đã bị xóa hoặc tạm thời không khả dụng.
            </p>
            <div className="mt-6">
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                to="/category"
              >
                <span>Quay lại Dịch vụ</span>
              </Link>
            </div>
          </div>
        ) : null}

        {listing ? (
          <div className="space-y-6">
            {/* Category Breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Link className="flex items-center hover:text-foreground" to="/">
                <HouseIcon className="h-3.5 w-3.5" />
              </Link>
              <CaretRightIcon className="h-3.5 w-3.5 opacity-50" />
              <Link className="hover:text-foreground" to="/category">
                Dịch vụ
              </Link>
              {parentCategory ? (
                <>
                  <CaretRightIcon className="h-3.5 w-3.5 opacity-50" />
                  <Link
                    className="hover:text-foreground"
                    params={{ parentSlug: parentCategory.slug }}
                    to="/category/$parentSlug"
                  >
                    {parentCategory.name}
                  </Link>
                </>
              ) : null}
              {subCategory ? (
                <>
                  <CaretRightIcon className="h-3.5 w-3.5 opacity-50" />
                  <span className="text-muted-foreground">
                    {subCategory.name}
                  </span>
                </>
              ) : null}
              <CaretRightIcon className="h-3.5 w-3.5 opacity-50" />
              <span className="max-w-50 truncate font-semibold text-foreground">
                {listing.title ?? "Untitled listing"}
              </span>
            </nav>

            {/* Main Content Layout */}
            <div className="mt-6 grid gap-8 lg:grid-cols-12">
              {/* Left Column: Info & Details */}
              <div className="space-y-8 lg:col-span-8">
                {/* Type Badge & Category Tag */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      isService
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                    }`}
                  >
                    {isService ? (
                      <>
                        <WrenchIcon className="h-3.5 w-3.5" /> Dịch vụ số
                      </>
                    ) : (
                      <>
                        <BookOpenIcon className="h-3.5 w-3.5" /> Khóa học online
                      </>
                    )}
                  </span>

                  {subCategory ? (
                    <span className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                      {subCategory.name}
                    </span>
                  ) : null}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {listing.title ?? "Untitled listing"}
                </h1>

                {/* Listing media gallery */}
                <div>
                  {listingImages.length > 0 ? (
                    <ListingMediaGallery
                      images={listingImages}
                      title={listing.title ?? "Listing"}
                    />
                  ) : (
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/40">
                      <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-primary/10 via-muted/30 to-background p-8 text-center">
                        {isService ? (
                          <WrenchIcon className="h-16 w-16 text-primary/40" />
                        ) : (
                          <BookOpenIcon className="h-16 w-16 text-primary/40" />
                        )}
                        <span className="mt-3 text-sm font-semibold text-muted-foreground">
                          {listing.title ?? "Untitled listing"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description Section */}
                <div className="space-y-3">
                  <h2 className="text-lg font-bold text-foreground">
                    Tổng quan & Chi tiết
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                    {listing.description || "Chưa có mô tả."}
                  </p>
                </div>

                {/* Warranty & Terms Section */}
                {isService && selectedNoWarranty ? (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                      <ShieldCheckIcon className="h-5 w-5" />
                      <span>Không có bảo hành</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vẫn có 48 giờ để xem xét sau khi Seller giao hàng.
                    </p>
                  </div>
                ) : null}

                {!isService && listing.warrantyDurationHours ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                        <ShieldCheckIcon className="h-5 w-5" />
                        <span>Bảo hành bảo vệ người mua</span>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                        Bảo hành {listing.warrantyDurationHours} giờ
                      </span>
                    </div>
                    {listing.warrantyTerms ? (
                      <p className="text-xs text-muted-foreground">
                        {listing.warrantyTerms}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {isService && selectedTimedWarranty ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                        <ShieldCheckIcon className="h-5 w-5" />
                        <span>Bảo hành bảo vệ người mua</span>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                        Bảo hành {selectedTimedWarranty.durationHours} giờ
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cam kết hỗ trợ xử lý sự cố trong suốt thời hạn bảo hành.
                    </p>
                  </div>
                ) : null}

                {/* Store / Seller Info Section */}
                <div className="pt-8 border-t border-border/60 space-y-4">
                  <h2 className="text-lg font-bold text-foreground">
                    Người bán
                  </h2>

                  <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        {sellerAvatar ? (
                          <img
                            alt={sellerName}
                            className="h-12 w-12 rounded-full object-cover border border-border shadow-xs"
                            src={sellerAvatar}
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
                            <StorefrontIcon className="h-6 w-6" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {sellerStoreSlug ? (
                              <Link
                                className="font-bold text-base text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                                params={{ slug: sellerStoreSlug }}
                                to="/store/$slug"
                              >
                                <span>{sellerName}</span>
                                <CheckCircleIcon className="h-4 w-4 text-primary shrink-0" />
                              </Link>
                            ) : (
                              <span className="font-bold text-base text-foreground flex items-center gap-1.5">
                                <span>{sellerName}</span>
                                <CheckCircleIcon className="h-4 w-4 text-primary shrink-0" />
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Offline 1 ngày
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-semibold text-amber-500">
                              <StarIcon className="h-3.5 w-3.5 fill-amber-500" />
                              <span>5.0</span>
                            </span>
                            <span>•</span>
                            <span>0 đánh giá</span>
                            <span>•</span>
                            <span>Đã bán 0</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/40 text-xs">
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium block">
                          Đánh giá
                        </span>
                        <span className="font-semibold text-foreground block truncate">
                          Chưa có đánh giá công khai
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium block">
                          Đơn hàng
                        </span>
                        <span className="font-semibold text-foreground block">
                          Tin mới
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-medium block">
                          Thời gian phản hồi
                        </span>
                        <span className="font-semibold text-foreground block">
                          {selectedProcessingTime
                            ? `Dự kiến ${selectedProcessingTime}h`
                            : "Dự kiến 4h"}
                        </span>
                      </div>
                    </div>

                    {sellerStoreSlug ? (
                      <Link
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/5 py-3 px-4 font-bold text-sm text-rose-500 transition-all hover:bg-rose-500/10 hover:border-rose-500/60 active:scale-[0.99] text-center"
                        params={{ slug: sellerStoreSlug }}
                        to="/store/$slug"
                      >
                        <span>Xem gian hàng</span>
                      </Link>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 py-3 px-4 font-bold text-sm text-muted-foreground text-center opacity-60">
                        <span>Xem gian hàng</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing & Seller CTA Card */}
              <div className="space-y-6 lg:col-span-4">
                <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-sm backdrop-blur-md space-y-6">
                  {/* Price Box */}
                  <div>
                    <span className="text-xs font-medium text-foreground font-semibold">
                      {isService ? "Gói đã chọn" : "Giá bán"}
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tight text-primary">
                        {formatVND(selectedPrice)}
                      </span>
                    </div>
                    {isService ? (
                      <div className="mt-1 text-sm font-medium text-emerald-500">
                        Còn hàng
                      </div>
                    ) : null}
                  </div>

                  {/* Package Selector */}
                  {isService ? (
                    <ServicePackageSelector
                      onChange={setSelectedPackageId}
                      packages={servicePackages}
                      selectedPackageId={selectedPackage?.id ?? null}
                    />
                  ) : null}

                  {/* Action CTA */}
                  <div className="space-y-3">
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 px-6 font-bold text-sm text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                      disabled={
                        addToCartMutation.isPending ||
                        (isService && !selectedPackage)
                      }
                      onClick={() => {
                        if (listing) {
                          addToCartMutation.mutate({
                            listingId: listing.id,
                            packageId: selectedPackage?.id,
                          });
                        }
                      }}
                      type="button"
                    >
                      <span>Mua ngay</span>
                    </button>

                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/20 bg-primary/5 py-3.5 px-6 font-bold text-sm text-primary transition-all hover:bg-primary/10 active:scale-[0.98]"
                      disabled={
                        addToCartMutation.isPending ||
                        (isService && !selectedPackage)
                      }
                      onClick={() => {
                        if (listing) {
                          addToCartMutation.mutate({
                            listingId: listing.id,
                            packageId: selectedPackage?.id,
                          });
                        }
                      }}
                      type="button"
                    >
                      <ShoppingCartIcon className="h-4 w-4" />
                      <span>{addToCartLabel}</span>
                    </button>
                  </div>

                  {/* Trust badges */}
                  <div className="space-y-2 text-xs text-muted-foreground pt-4 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Thanh toán bảo vệ qua Escrow</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        {selectedProcessingTime
                          ? `${selectedProcessingTime} giờ xử lý`
                          : "Giao hàng nhanh / Tự động"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Shell>
  );
};
