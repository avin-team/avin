/* oxlint-disable react-doctor/nextjs-no-img-element */
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  ShieldCheck,
  UserCheck,
  Wrench,
} from "lucide-react";

import { Shell } from "@/components/shell";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

export const ListingDetailPage = () => {
  const { id } = useParams({ from: "/(public)/listing/$id" });

  const listingQuery = useQuery(
    orpc.catalog.listingById.queryOptions({
      input: { id },
    })
  );

  const listing = listingQuery.data;
  const isService = listing?.type === "SERVICE";
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
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
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
                <span>Quay lại Danh mục</span>
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
                <Home className="h-3.5 w-3.5" />
              </Link>
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <Link className="hover:text-foreground" to="/category">
                Danh mục
              </Link>
              {parentCategory ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
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
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                  <span className="text-muted-foreground">
                    {subCategory.name}
                  </span>
                </>
              ) : null}
              <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              <span className="max-w-[200px] truncate font-semibold text-foreground">
                {listing.title}
              </span>
            </nav>

            {/* Main Content Layout */}
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Left Column: Info & Details */}
              <div className="space-y-6 lg:col-span-2">
                {/* Hero Card */}
                <div className="overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xs backdrop-blur-md sm:p-8">
                  {/* Type Badge & Category Tag */}
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                        isService
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                          : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                      }`}
                    >
                      {isService ? (
                        <>
                          <Wrench className="h-3.5 w-3.5" /> Dịch vụ số
                        </>
                      ) : (
                        <>
                          <BookOpen className="h-3.5 w-3.5" /> Khóa học online
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
                    {listing.title}
                  </h1>

                  {/* Thumbnail Banner */}
                  <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl bg-muted/40 border border-border/40">
                    {listing.thumbnailUrl ? (
                      <img
                        alt={listing.title}
                        className="h-full w-full object-cover"
                        src={listing.thumbnailUrl}
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-muted/30 to-background p-8 text-center">
                        {isService ? (
                          <Wrench className="h-16 w-16 text-primary/40" />
                        ) : (
                          <BookOpen className="h-16 w-16 text-primary/40" />
                        )}
                        <span className="mt-3 text-sm font-semibold text-muted-foreground">
                          {listing.title}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description Section */}
                  <div className="mt-8 space-y-3">
                    <h2 className="text-lg font-bold text-foreground">
                      Tổng quan & Chi tiết
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {listing.description || "Chưa có mô tả."}
                    </p>
                  </div>

                  {/* Service Input Requirements if applicable */}
                  {listing.serviceInputFields &&
                  listing.serviceInputFields.length > 0 ? (
                    <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-3">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Thông tin yêu cầu từ người mua
                      </h3>
                      <ul className="space-y-1.5 text-xs text-muted-foreground">
                        {listing.serviceInputFields.map((field) => (
                          <li
                            key={field.id}
                            className="flex items-center gap-2"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="font-semibold text-foreground">
                              {field.label}
                            </span>
                            {field.required ? (
                              <span className="text-destructive font-semibold">
                                (Bắt buộc)
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Warranty & Terms Section */}
                  {listing.warrantyDurationHours ? (
                    <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                          <ShieldCheck className="h-5 w-5" />
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
                </div>
              </div>

              {/* Right Column: Pricing & Seller CTA Card */}
              <div className="space-y-6">
                <div className="sticky top-24 rounded-3xl border border-border bg-card p-6 shadow-sm backdrop-blur-md space-y-6">
                  {/* Price Box */}
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Giá bán
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tight text-primary">
                        {formatVND(listing.priceAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Action CTA */}
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 px-6 font-bold text-sm text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                    type="button"
                  >
                    <span>Đặt hàng ngay</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="border-t border-border/40 pt-4 space-y-4">
                    {/* Seller Info */}
                    <div className="flex items-center gap-3">
                      {listing.seller?.image ? (
                        <img
                          alt={listing.seller.name ?? "Seller"}
                          className="h-10 w-10 rounded-full object-cover border border-border"
                          src={listing.seller.image}
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserCheck className="h-5 w-5" />
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">
                          Người bán
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {listing.seller?.name ?? "Nhà cung cấp xác minh"}
                        </span>
                      </div>
                    </div>

                    {/* Trust badges */}
                    <div className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Thanh toán bảo vệ qua Escrow</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <span>Giao hàng nhanh / Tự động</span>
                      </div>
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
