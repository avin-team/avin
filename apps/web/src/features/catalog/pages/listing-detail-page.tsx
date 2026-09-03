import type { AppRouterClient } from "@avin/api/router";
import { Button } from "@avin/ui/components/button";
import {
  WarningCircleIcon,
  BookOpenIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  HouseIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  StarIcon,
  StorefrontIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { useSession } from "@/features/auth/api/session-query";
import { AuthActionGuard } from "@/features/auth/components/auth-action-guard";
import { ListingMediaGallery } from "@/features/catalog/components/listing-media-gallery";
import { ListingReviewsSection } from "@/features/catalog/components/listing-reviews-section";
import { ServicePackageSelector } from "@/features/catalog/components/service-package-selector";
import { addCartItemOptimistically } from "@/features/commerce/cart-cache";
import type { CartView } from "@/features/commerce/cart-cache";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

type ListingDetail = NonNullable<
  Awaited<ReturnType<AppRouterClient["listing"]["discovery"]["listingById"]>>
>;

const getListingImages = (listing: ListingDetail | undefined): string[] => {
  if (listing?.images?.length) {
    return listing.images;
  }
  if (listing?.thumbnailUrl) {
    return [listing.thumbnailUrl];
  }
  return [];
};

const getSellerPresentation = (listing: ListingDetail | undefined) => ({
  sellerAvatar: listing?.seller?.image,
  sellerName: listing?.seller?.name || "Nhà cung cấp xác minh",
  sellerStoreSlug: listing?.seller?.storeSlug,
});

const getListingPresentation = (
  listing: ListingDetail | undefined,
  selectedPackageId: string | null
) => {
  const servicePackages = listing?.servicePackages ?? [];
  const selectedPackage =
    servicePackages.find(
      (packageItem) => packageItem.id === selectedPackageId
    ) ?? servicePackages[0];
  const selectedWarranty = selectedPackage?.warrantyPolicy;
  return {
    ...getSellerPresentation(listing),
    isService: listing?.type === "SERVICE",
    listingImages: getListingImages(listing),
    parentCategory: listing?.category?.parentCategory,
    selectedNoWarranty: selectedWarranty?.kind === "NO_WARRANTY",
    selectedPackage,
    selectedPrice: selectedPackage?.priceAmount ?? listing?.priceAmount ?? 0,
    selectedProcessingTime:
      selectedPackage?.processingTimeHours ?? listing?.processingTimeHours,
    selectedTimedWarranty:
      selectedWarranty?.kind === "TIMED" ? selectedWarranty : null,
    servicePackages,
    subCategory: listing?.category,
  };
};

const getAddToCartLabel = (
  isPending: boolean,
  isService: boolean,
  hasSelectedPackage: boolean
): string => {
  if (isPending) {
    return "Đang thêm...";
  }
  if (isService && !hasSelectedPackage) {
    return "Chọn gói để tiếp tục";
  }
  return "Thêm vào giỏ";
};

const ListingVisual = ({
  images,
  isService,
  title,
}: {
  images: string[];
  isService: boolean;
  title: string | null;
}) => {
  if (images.length > 0) {
    return <ListingMediaGallery images={images} title={title ?? "Listing"} />;
  }
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/40">
      <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-primary/10 via-muted/30 to-background p-8 text-center">
        {isService ? (
          <WrenchIcon className="h-16 w-16 text-primary/40" />
        ) : (
          <BookOpenIcon className="h-16 w-16 text-primary/40" />
        )}
        <span className="mt-3 text-sm font-semibold text-muted-foreground">
          {title ?? "Untitled listing"}
        </span>
      </div>
    </div>
  );
};

const ListingWarrantyDetails = ({
  isService,
  listing,
  selectedNoWarranty,
  selectedTimedWarranty,
}: {
  isService: boolean;
  listing: ListingDetail;
  selectedNoWarranty: boolean;
  selectedTimedWarranty: { durationHours: number; kind: "TIMED" } | null;
}) => (
  <>
    {isService && selectedNoWarranty ? (
      <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 font-bold text-amber-600 text-sm">
          <ShieldCheckIcon className="h-5 w-5" />
          <span>Không có bảo hành</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Vẫn có 48 giờ để xem xét sau khi Seller giao hàng.
        </p>
      </div>
    ) : null}
    {!isService && listing.warrantyDurationHours ? (
      <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-emerald-500 text-sm">
            <ShieldCheckIcon className="h-5 w-5" />
            <span>Bảo đảm cho người mua</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-500 text-xs">
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
      <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-emerald-500 text-sm">
            <ShieldCheckIcon className="h-5 w-5" />
            <span>Bảo đảm cho người mua</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-500 text-xs">
            Bảo hành {selectedTimedWarranty.durationHours} giờ
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Cam kết hỗ trợ xử lý sự cố trong suốt thời hạn bảo hành.
        </p>
      </div>
    ) : null}
  </>
);

const getSellerMetrics = (
  listing: ListingDetail,
  selectedProcessingTime: number | null | undefined
) => {
  const ratingScore = Number(listing.seller?.ratingScore ?? 0);
  const ratingCount = listing.seller?.ratingCount ?? 0;
  return {
    completedOrderCount: listing.seller?.completedOrderCount ?? 0,
    processingTimeLabel: selectedProcessingTime
      ? `Dự kiến ${selectedProcessingTime}h`
      : "Dự kiến 4h",
    ratingLabel:
      ratingCount > 0
        ? `${ratingCount} đánh giá (${ratingScore.toFixed(1)}⭐)`
        : "Chưa có đánh giá công khai",
    ratingScoreLabel: ratingScore > 0 ? ratingScore.toFixed(1) : "Mới",
  };
};

const SellerDetails = ({
  listing,
  selectedProcessingTime,
  sellerAvatar,
  sellerName,
  sellerStoreSlug,
}: {
  listing: ListingDetail;
  selectedProcessingTime: number | null | undefined;
  sellerAvatar: string | null | undefined;
  sellerName: string;
  sellerStoreSlug: string | null | undefined;
}) => {
  const metrics = getSellerMetrics(listing, selectedProcessingTime);
  const sellerNameContent = (
    <>
      <span>{sellerName}</span>
      <CheckCircleIcon className="h-4 w-4 shrink-0 text-primary" />
    </>
  );
  return (
    <div className="space-y-4 border-border/60 border-t pt-8">
      <h2 className="font-bold text-foreground text-lg">Người bán</h2>
      <div className="space-y-5">
        <div className="flex items-center gap-3.5">
          {sellerAvatar ? (
            <img
              alt={sellerName}
              className="h-12 w-12 rounded-full border border-border object-cover shadow-xs"
              src={sellerAvatar}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <StorefrontIcon className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {sellerStoreSlug ? (
                <Link
                  className="flex items-center gap-1.5 font-bold text-base text-foreground transition-colors hover:text-primary"
                  params={{ slug: sellerStoreSlug }}
                  to="/store/$slug"
                >
                  {sellerNameContent}
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 font-bold text-base text-foreground">
                  {sellerNameContent}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-[11px] text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Offline 1 ngày
              </span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground text-xs">
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <StarIcon className="h-3.5 w-3.5 fill-amber-500" />
                {metrics.ratingScoreLabel}
              </span>
              <span>•</span>
              <span>{listing.seller?.ratingCount ?? 0} đánh giá</span>
              <span>•</span>
              <span>{metrics.completedOrderCount} đơn hoàn thành</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-border/40 border-t pt-3 text-xs sm:grid-cols-3">
          <div>
            <span className="block font-medium text-muted-foreground">
              Đánh giá gian hàng
            </span>
            <span className="block truncate font-semibold text-foreground">
              {metrics.ratingLabel}
            </span>
          </div>
          <div>
            <span className="block font-medium text-muted-foreground">
              Đơn hoàn thành
            </span>
            <span className="block font-semibold text-foreground">
              {metrics.completedOrderCount} đơn
            </span>
          </div>
          <div>
            <span className="block font-medium text-muted-foreground">
              Thời gian xử lý
            </span>
            <span className="block font-semibold text-foreground">
              {metrics.processingTimeLabel}
            </span>
          </div>
        </div>
        {sellerStoreSlug ? (
          <Link
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-center font-bold text-primary text-sm transition-all hover:border-primary/60 hover:bg-primary/10 active:scale-[0.99]"
            params={{ slug: sellerStoreSlug }}
            to="/store/$slug"
          >
            Xem gian hàng
          </Link>
        ) : (
          <div className="flex w-full items-center justify-center rounded-xl border border-border bg-muted/20 px-4 py-3 text-center font-bold text-muted-foreground text-sm opacity-60">
            Xem gian hàng
          </div>
        )}
      </div>
    </div>
  );
};

const RenderWhen = ({
  children,
  when,
}: {
  children: ReactNode;
  when: boolean;
}) => (when ? children : null);

const ListingTypeBadge = ({ isService }: { isService: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-semibold text-xs ${
      isService
        ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
        : "border-purple-500/20 bg-purple-500/10 text-purple-500"
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
);

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
  const {
    isService,
    listingImages,
    parentCategory,
    selectedNoWarranty,
    selectedPackage,
    selectedPrice,
    selectedProcessingTime,
    selectedTimedWarranty,
    sellerAvatar,
    sellerName,
    sellerStoreSlug,
    servicePackages,
    subCategory,
  } = getListingPresentation(listing, selectedPackageId);
  const { data: session } = useSession();
  const isCurrentSeller = session?.user?.role === "SELLER";
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
          : "Không thể thêm sản phẩm vào Giỏ hàng."
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
      if (!isCurrentSeller) {
        await queryClient.invalidateQueries({ queryKey: cartQueryKey });
      }
    },
    onSuccess: async (cart) => {
      queryClient.setQueryData(cartQueryKey, cart);
      await navigate({ to: "/cart" });
    },
  });
  const addToCartLabel = getAddToCartLabel(
    addToCartMutation.isPending,
    isService,
    Boolean(selectedPackage)
  );

  return (
    <Shell variant="default">
      <div className="space-y-6 py-6">
        {/* Loading State */}
        <RenderWhen when={listingQuery.isLoading}>
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
        </RenderWhen>

        {/* Error / Not Found State */}
        <RenderWhen when={listingQuery.isError}>
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
        </RenderWhen>

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
                  <ListingTypeBadge isService={isService} />

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
                <ListingVisual
                  images={listingImages}
                  isService={isService}
                  title={listing.title}
                />

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
                <ListingWarrantyDetails
                  isService={isService}
                  listing={listing}
                  selectedNoWarranty={selectedNoWarranty}
                  selectedTimedWarranty={selectedTimedWarranty}
                />

                {/* Store / Seller Info Section */}
                <SellerDetails
                  listing={listing}
                  selectedProcessingTime={selectedProcessingTime}
                  sellerAvatar={sellerAvatar}
                  sellerName={sellerName}
                  sellerStoreSlug={sellerStoreSlug}
                />

                {/* Reviews Section */}
                <ListingReviewsSection
                  completedOrderCount={listing.completedOrderCount ?? 0}
                  listingId={listing.id}
                  ratingCount={listing.ratingCount ?? 0}
                  ratingScore={listing.ratingScore ?? "0"}
                />
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
                    <RenderWhen when={isService}>
                      <div className="mt-1 text-sm font-medium text-emerald-500">
                        Còn hàng
                      </div>
                    </RenderWhen>
                  </div>

                  {/* Package Selector */}
                  <RenderWhen when={isService}>
                    <ServicePackageSelector
                      onChange={setSelectedPackageId}
                      packages={servicePackages}
                      selectedPackageId={selectedPackage?.id ?? null}
                    />
                  </RenderWhen>

                  {/* Action CTA */}
                  <AuthActionGuard>
                    {({
                      isSeller: isGuardSeller,
                      isSessionPending,
                      runAuthenticatedAction,
                      session: guardSession,
                    }) => {
                      const isOwn =
                        isGuardSeller &&
                        Boolean(
                          guardSession?.user?.id &&
                          (guardSession.user.id === listing.sellerId ||
                            guardSession.user.id === listing.seller?.id)
                        );
                      const isPurchaseActionDisabled =
                        isSessionPending ||
                        isGuardSeller ||
                        addToCartMutation.isPending ||
                        (isService && !selectedPackage);
                      const addListingToCart = (): void => {
                        runAuthenticatedAction(() => {
                          addToCartMutation.mutate({
                            listingId: listing.id,
                            packageId: selectedPackage?.id,
                          });
                        });
                      };

                      if (isOwn) {
                        return (
                          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <StorefrontIcon className="h-5 w-5" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground text-sm">
                                Sản phẩm của bạn
                              </p>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                Bạn đang xem sản phẩm do chính mình đăng bán.
                                Bạn không thể tự mua hoặc thêm vào giỏ hàng.
                              </p>
                            </div>
                            <Button
                              className="w-full font-semibold"
                              render={
                                <Link
                                  params={{ id: listing.id }}
                                  to="/seller/listings/$id"
                                />
                              }
                              size="sm"
                              variant="outline"
                            >
                              <PencilSimpleIcon className="mr-1.5 h-4 w-4" />
                              <span>Chỉnh sửa sản phẩm</span>
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          {isGuardSeller ? (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                              <div className="flex items-start gap-2.5">
                                <WarningCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                <div className="space-y-1">
                                  <p className="font-semibold text-foreground">
                                    Tài khoản Người bán không thể mua hàng
                                  </p>
                                  <p className="text-muted-foreground dark:text-amber-300/80 leading-relaxed">
                                    Vui lòng đăng nhập tài khoản Người mua để
                                    đặt hàng.
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          <Button
                            className="h-11 w-full font-bold shadow-md hover:shadow-lg hover:shadow-primary/20"
                            disabled={isPurchaseActionDisabled}
                            onClick={addListingToCart}
                            size="lg"
                            title={
                              isGuardSeller
                                ? "Tài khoản Người bán không thể mua hàng"
                                : undefined
                            }
                            type="button"
                          >
                            <span>Mua ngay</span>
                          </Button>

                          <Button
                            className="h-11 w-full border-2 border-primary/20 bg-primary/5 font-bold text-primary hover:bg-primary/10"
                            disabled={isPurchaseActionDisabled}
                            onClick={addListingToCart}
                            size="lg"
                            title={
                              isGuardSeller
                                ? "Tài khoản Người bán không thể mua hàng"
                                : undefined
                            }
                            type="button"
                            variant="secondary"
                          >
                            <ShoppingCartIcon className="h-4 w-4" />
                            <span>{addToCartLabel}</span>
                          </Button>
                        </div>
                      );
                    }}
                  </AuthActionGuard>

                  {/* Trust badges */}
                  <div className="space-y-2 text-xs text-muted-foreground pt-4 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Thanh toán an toàn</span>
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
