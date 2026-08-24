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
  CalendarBlankIcon,
  CurrencyCircleDollarIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

const policyDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "long",
});

const policyMoneyFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const ProviderPolicyPageSkeleton = () => (
  <Shell as="div" className="gap-6" variant="default">
    <Skeleton className="h-8 w-44" />
    <Skeleton className="h-44 w-full rounded-3xl" />
    <div className="grid gap-4 sm:grid-cols-2">
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
    <Shell as="article" className="gap-6" variant="default">
      <Link
        className="inline-flex w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
        to="/avin-check/apply"
      >
        <ArrowLeftIcon aria-hidden="true" />
        Quay lại đăng ký đối tác
      </Link>

      <header className="rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-8 shadow-sm sm:px-8">
        <Badge className="mb-3 gap-1.5" variant="outline">
          <ShieldCheckIcon aria-hidden="true" />
          Quy chế Đối tác · {policy.version}
        </Badge>
        <h1 className="max-w-4xl font-bold text-3xl tracking-tight sm:text-4xl">
          {policy.title}
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground leading-7">
          {policy.summary}
        </p>
        <p className="mt-4 flex items-center gap-2 text-muted-foreground text-sm">
          <CalendarBlankIcon aria-hidden="true" className="size-4" />
          Có hiệu lực từ{" "}
          {policyDateFormatter.format(new Date(policy.effectiveAt))}
        </p>
      </header>

      <section
        aria-label="Mức phí và quỹ đảm bảo"
        className="grid gap-4 sm:grid-cols-2"
      >
        <Card size="sm">
          <CardHeader>
            <CardDescription>Quỹ đảm bảo tối thiểu</CardDescription>
            <CardTitle className="font-bold text-2xl text-primary">
              {policyMoneyFormatter.format(policy.minimumBondAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CurrencyCircleDollarIcon aria-hidden="true" className="size-4" />
              Phí thành viên
            </CardDescription>
            <CardTitle className="font-bold text-2xl">
              {policyMoneyFormatter.format(policy.membershipFeeAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl">Nội dung quy chế</CardTitle>
          <CardDescription>
            Vui lòng đọc kỹ toàn bộ nội dung trước khi xác nhận trong hồ sơ đăng
            ký.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm leading-7">
            {policy.terms}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Bạn đã đọc và hiểu quy chế?</p>
          <p className="text-muted-foreground text-sm">
            Quay lại hồ sơ để xác nhận và tiếp tục đăng ký đối tác.
          </p>
        </div>
        <Link className={buttonVariants()} to="/avin-check/apply">
          Tiếp tục đăng ký
        </Link>
      </div>
    </Shell>
  );
};
