import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { buttonVariants } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CalendarBlankIcon,
  ClockIcon,
  CurrencyCircleDollarIcon,
  PercentIcon,
  SealCheckIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { TIER_ICON_IMAGES } from "../data/provider-tier-constants";

const policyDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "long",
});

const policyMoneyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const TIER_BENEFITS = [
  {
    badge: "Hạng Khởi Điểm",
    icon: TIER_ICON_IMAGES.BRONZE,
    limit: "≤ 4.000.000 đ",
    minBond: "5.000.000 đ",
    name: "Hạng Đồng",
    perks: "Định danh hồ sơ xác minh cơ bản, cấp mã QR chống giả mạo.",
  },
  {
    badge: "Hạng Tiêu Chuẩn",
    icon: TIER_ICON_IMAGES.SILVER,
    limit: "≤ 8.000.000 đ",
    minBond: "10.000.000 đ",
    name: "Hạng Bạc",
    perks: "Bảo đảm giao dịch thông dụng, hiển thị huy hiệu xác thực cấp 2.",
  },
  {
    badge: "Hạng Uy Tín",
    icon: TIER_ICON_IMAGES.GOLD,
    limit: "≤ 16.000.000 đ",
    minBond: "20.000.000 đ",
    name: "Hạng Vàng",
    perks: "Ưu tiên hiển thị trên danh bạ, hạn mức bảo lãnh giao dịch cao.",
  },
  {
    badge: "Hạng Cao Cấp",
    icon: TIER_ICON_IMAGES.DIAMOND,
    limit: "≤ 40.000.000 đ",
    minBond: "50.000.000 đ",
    name: "Hạng Kim Cương",
    perks:
      "Huy hiệu cao cấp, bảo vệ thương hiệu tự động trên toàn hệ sinh thái.",
  },
  {
    badge: "Hạng Đặc Biệt",
    icon: TIER_ICON_IMAGES.VIP,
    limit: "≤ 80.000.000 đ",
    minBond: "100.000.000 đ",
    name: "Hạng VIP",
    perks:
      "Hạn mức bảo lãnh tối đa, hỗ trợ bảo vệ 24/7 và xác thực đa nền tảng.",
  },
];

const ProviderPolicyPageSkeleton = () => (
  <Shell as="div" className="gap-8" variant="default">
    <div className="grid gap-6 border-b pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-10 w-80 sm:w-96" />
        </div>
        <Skeleton className="h-9 w-36 rounded-4xl" />
      </div>
      <Skeleton className="h-5 w-full max-w-xl" />
    </div>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-28 w-full rounded-3xl" />
    </div>
    <Skeleton className="h-80 w-full rounded-3xl" />
  </Shell>
);

export const ProviderPolicyPage = () => {
  const policyQuery = useQuery(
    orpc.protection.providerPolicy.current.queryOptions()
  );

  if (policyQuery.isPending) {
    return <ProviderPolicyPageSkeleton />;
  }

  if (policyQuery.isError || !policyQuery.data) {
    return (
      <Shell as="div" className="gap-6" variant="default">
        <Link
          className="inline-flex w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
          to="/avin-check/apply"
        >
          <ArrowLeftIcon aria-hidden="true" />
          Quay lại đăng ký đối tác
        </Link>
        <Alert className="border-primary/20 bg-primary/5">
          <ShieldCheckIcon aria-hidden="true" />
          <AlertTitle>Chưa có quy chế được công bố</AlertTitle>
          <AlertDescription>
            Avin Check chưa phát hành phiên bản quy chế có hiệu lực. Vui lòng
            quay lại sau hoặc liên hệ hỗ trợ trước khi gửi hồ sơ.
          </AlertDescription>
        </Alert>
      </Shell>
    );
  }

  const policy = policyQuery.data;

  return (
    <Shell as="article" className="gap-8" variant="default">
      {/* Header Section */}
      <section
        aria-labelledby="provider-policy-heading"
        className="grid gap-6 border-b pb-8"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="w-fit gap-1.5" variant="outline">
                <ShieldCheckIcon aria-hidden="true" />
                Quy chế Đối tác · {policy.version}
              </Badge>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-semibold text-emerald-600 text-xs dark:text-emerald-400">
                Chính thức có hiệu lực
              </span>
            </div>
            <h1
              className="font-black text-3xl tracking-tight sm:text-4xl lg:text-5xl"
              id="provider-policy-heading"
            >
              {policy.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              className={buttonVariants({
                className: "rounded-4xl",
                variant: "outline",
              })}
              to="/avin-check/guide"
            >
              <BookOpenIcon aria-hidden="true" className="size-4" />
              Cẩm nang & 27 Điều khoản
            </Link>
            <Link
              className={buttonVariants({
                className: "rounded-4xl",
              })}
              to="/avin-check/apply"
            >
              Đăng ký đối tác
              <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
            </Link>
          </div>
        </div>

        <div className="grid gap-2">
          <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed sm:text-base">
            {policy.summary}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm">
            <CalendarBlankIcon aria-hidden="true" className="size-4" />
            Có hiệu lực từ{" "}
            {policyDateFormatter.format(new Date(policy.effectiveAt))}
          </p>
        </div>
      </section>

      {/* 4-Column Key Metrics Bar */}
      <section
        aria-label="Tổng quan điều kiện tài chính"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <ShieldCheckIcon
                aria-hidden="true"
                className="size-4 text-primary"
              />
              Quỹ bảo chứng tối thiểu
            </CardDescription>
            <CardTitle className="font-extrabold text-2xl text-primary">
              {policyMoneyFormatter.format(policy.minimumBondAmount)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <CurrencyCircleDollarIcon
                aria-hidden="true"
                className="size-4 text-emerald-500"
              />
              Phí thành viên & duy trì
            </CardDescription>
            <CardTitle className="font-extrabold text-2xl text-foreground">
              {policyMoneyFormatter.format(policy.membershipFeeAmount)}
              <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                (Miễn phí)
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <PercentIcon
                aria-hidden="true"
                className="size-4 text-amber-500"
              />
              Tỷ lệ bảo lãnh khuyến nghị
            </CardDescription>
            <CardTitle className="font-extrabold text-2xl text-foreground">
              {policy.recommendedLimitPercentage ?? 80}%
              <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                giá trị quỹ
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-1.5">
              <ClockIcon aria-hidden="true" className="size-4 text-blue-500" />
              Thời gian xét duyệt
            </CardDescription>
            <CardTitle className="font-extrabold text-2xl text-foreground">
              6 - 15
              <span className="ml-1.5 font-normal text-muted-foreground text-xs">
                ngày làm việc
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {/* Tier Ranking Matrix */}
      <section
        aria-labelledby="tier-matrix-heading"
        className="rounded-3xl border bg-card p-6 shadow-xs sm:p-8"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              className="font-bold text-xl tracking-tight text-foreground sm:text-2xl"
              id="tier-matrix-heading"
            >
              Hạng Thành Viên & Hạn Mức Quỹ Bảo Chứng
            </h2>
            <p className="mt-1 text-muted-foreground text-xs sm:text-sm">
              Hạn mức khuyến nghị an toàn giúp người dùng an tâm giao dịch trong
              phạm vi số tiền bảo lãnh thực tế.
            </p>
          </div>
          <Badge className="w-fit" variant="secondary">
            5 Hạng chính thức
          </Badge>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIER_BENEFITS.map((tier) => (
            <div
              className="flex flex-col justify-between rounded-2xl border border-border/80 bg-muted/20 p-4 transition hover:border-primary/40 hover:bg-muted/30"
              key={tier.name}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <img
                    alt={tier.name}
                    className="size-9 object-contain drop-shadow-xs"
                    src={tier.icon}
                  />
                  <span className="rounded-md bg-muted px-2 py-0.5 font-semibold text-[0.65rem] text-muted-foreground">
                    {tier.badge}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-foreground text-sm">
                    {tier.name}
                  </h3>
                  <p className="mt-1 font-extrabold text-[#84cc16] text-sm">
                    Quỹ ≥ {tier.minBond}
                  </p>
                  <p className="text-[0.75rem] text-muted-foreground">
                    Giao dịch:{" "}
                    <strong className="text-foreground">{tier.limit}</strong>
                  </p>
                </div>
              </div>

              <p className="mt-3 border-border/60 border-t pt-2.5 text-[0.7rem] text-muted-foreground leading-relaxed">
                {tier.perks}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Detailed Policy Terms Card */}
      <Card className="rounded-3xl">
        <CardHeader className="border-b p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="font-bold text-xl text-foreground sm:text-2xl">
                Nội Dung Quy Chế Chi Tiết
              </CardTitle>
              <CardDescription className="mt-1 text-xs sm:text-sm">
                Vui lòng đọc kỹ toàn bộ quy định dưới đây trước khi gửi hồ sơ
                xác nhận tham gia.
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#84cc16] text-xs">
              <SealCheckIcon className="size-4" weight="fill" />
              Áp dụng toàn bộ hệ thống
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <div className="whitespace-pre-wrap font-sans text-foreground text-sm leading-7">
            {policy.terms}
          </div>
        </CardContent>
      </Card>

      {/* Practical Guide Callout Banner */}
      <section className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-card p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <BookOpenIcon
              aria-hidden="true"
              className="size-5 text-primary"
              weight="fill"
            />
            <h3 className="font-bold text-foreground text-lg">
              Cẩm Nang & 27 Điều Khoản Nghiệp Vụ Thực Chiến
            </h3>
          </div>
          <p className="max-w-2xl text-muted-foreground text-xs sm:text-sm leading-relaxed">
            Xem trọn bộ quy tắc bảo vệ nhóm giao dịch, lưu trữ video 15 giây,
            quy trình xử lý chuyển sai nội dung và các cẩm nang phòng chống thủ
            đoạn lừa đảo tinh vi.
          </p>
        </div>

        <Link
          className={buttonVariants({
            className: "shrink-0 rounded-2xl",
            variant: "outline",
          })}
          to="/avin-check/guide"
        >
          Xem Cẩm nang chi tiết
          <ArrowRightIcon aria-hidden="true" data-icon="inline-end" />
        </Link>
      </section>
    </Shell>
  );
};
