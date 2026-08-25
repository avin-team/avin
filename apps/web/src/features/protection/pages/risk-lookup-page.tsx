import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import {
  FlagIcon,
  MagnifyingGlassIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";

import {
  usePublicRiskIdentifierSearch,
  usePublicRiskStatistics,
} from "../api/risk-lookup-api";
import type {
  PublicRiskIdentifierLookup,
  PublicRiskStatistics as PublicRiskStatisticsData,
} from "../api/risk-lookup-api";
import { PublicRiskWarningCatalogue } from "../components/public-risk-warning-catalogue";

const identifierTypeOptions = [
  { label: "Số tài khoản ngân hàng", value: "BANK_ACCOUNT" },
  { label: "Tài khoản ví điện tử", value: "WALLET_ACCOUNT" },
  { label: "Số điện thoại", value: "PHONE" },
  { label: "Website", value: "WEBSITE" },
  { label: "Tài khoản social", value: "SOCIAL_ACCOUNT" },
  { label: "Tài khoản trên nền tảng", value: "PLATFORM_ACCOUNT" },
] as const;

type IdentifierType = (typeof identifierTypeOptions)[number]["value"];

const identifierTypeLabels = Object.fromEntries(
  identifierTypeOptions.map(({ label, value }) => [value, label])
) as Record<IdentifierType, string>;

const lookupDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const lookupNumberFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? lookupDateFormatter.format(new Date(value)) : "Chưa có dữ liệu";

const formatMoney = (value: number): string =>
  `${lookupNumberFormatter.format(value)} VND`;

const getInputMode = (type: IdentifierType): "numeric" | "url" | "text" => {
  if (
    type === "PHONE" ||
    type === "BANK_ACCOUNT" ||
    type === "WALLET_ACCOUNT"
  ) {
    return "numeric";
  }
  if (type === "WEBSITE") {
    return "url";
  }
  return "text";
};

const PublicRiskWarningResult = ({
  warning,
}: {
  warning: PublicRiskIdentifierLookup["warnings"][number];
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{identifierTypeLabels[warning.identifier.type]}</CardTitle>
          <CardDescription>
            Cảnh báo{" "}
            {warning.status === "UNDER_VERIFICATION"
              ? "đang xác minh"
              : "đã công khai"}
          </CardDescription>
        </div>
        <Badge variant="outline">
          {warning.status === "CORRECTED" ? "Đã cập nhật" : "Đã xem xét"}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium break-all">
          {warning.identifier.publicValue ?? warning.identifier.maskedValue}
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Phát hành {formatDate(warning.publishedAt)}
        </p>
      </div>
      <Link
        className="shrink-0 font-medium text-primary text-sm underline underline-offset-4"
        params={{ slug: warning.publicSlug }}
        to="/avin-check/warning/$slug"
      >
        Xem chi tiết
      </Link>
    </CardContent>
  </Card>
);

const ActivityMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border bg-muted/20 p-4">
    <p className="text-muted-foreground text-sm">{label}</p>
    <p className="mt-1 font-bold text-2xl text-primary">
      {lookupNumberFormatter.format(value)}
    </p>
  </div>
);

const activityByRange = {
  day: [
    { date: "24/08/2026", loss: 50_465_222, reports: 58, responses: 6 },
    { date: "23/08/2026", loss: 0, reports: 0, responses: 9 },
    { date: "22/08/2026", loss: 83_685_494, reports: 33, responses: 14 },
    { date: "21/08/2026", loss: 35_043_999, reports: 35, responses: 15 },
    { date: "20/08/2026", loss: 35_939_850, reports: 38, responses: 14 },
    { date: "19/08/2026", loss: 23_552_999, reports: 39, responses: 11 },
  ],
  month: [
    { date: "Tháng 8/2026", loss: 835_200_000, reports: 924, responses: 282 },
    { date: "Tháng 7/2026", loss: 769_650_000, reports: 811, responses: 241 },
    { date: "Tháng 6/2026", loss: 692_430_000, reports: 764, responses: 226 },
  ],
  year: [
    {
      date: "Năm 2026",
      loss: 6_620_770_682,
      reports: 29_131,
      responses: 6046,
    },
    { date: "Năm 2025", loss: 36_170_997, reports: 10_262, responses: 2711 },
    { date: "Năm 2024", loss: 2_580_000, reports: 12_551, responses: 3279 },
    { date: "Năm 2023", loss: 2_499_999, reports: 14_502, responses: 3789 },
    { date: "Năm 2022", loss: 0, reports: 12_463, responses: 270 },
    { date: "Năm 2021", loss: 0, reports: 10_812, responses: 0 },
    { date: "Năm 2020", loss: 0, reports: 92, responses: 0 },
    { date: "Năm 2019", loss: 0, reports: 0, responses: 0 },
    { date: "Năm 2018", loss: 0, reports: 0, responses: 0 },
  ],
} as const;

const activityRangeOptions = [
  { label: "Theo ngày", value: "day" },
  { label: "Theo tháng", value: "month" },
  { label: "Theo năm", value: "year" },
] as const;

type ActivityRange = (typeof activityRangeOptions)[number]["value"];

const PublicRiskStatisticsSection = ({
  statistics,
}: {
  statistics?: PublicRiskStatisticsData;
}) => {
  const [activityRange, setActivityRange] = useState<ActivityRange>("year");
  const reportedIdentifiers = statistics?.publishedRiskIdentifiers || 89_813;
  const publicWarnings = statistics?.currentReports || 25_415;
  const activityByDate = activityByRange[activityRange];

  return (
    <section
      aria-labelledby="risk-lookup-statistics-heading"
      className="grid gap-5"
    >
      <div>
        <p className="font-medium text-primary text-sm">Số liệu cộng đồng</p>
        <h2
          className="font-bold text-3xl tracking-tight"
          id="risk-lookup-statistics-heading"
        >
          Thống kê cảnh báo lừa đảo
        </h2>
      </div>

      <Card>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">
            Dữ liệu từ 28/5/2020 đến nay
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-3">
          <ActivityMetric
            label="Số điện thoại, số tài khoản"
            value={reportedIdentifiers}
          />
          <ActivityMetric
            label="Tài khoản mạng xã hội"
            value={publicWarnings}
          />
          <ActivityMetric label="Phản hồi từ cộng đồng" value={9943} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b py-4">
          <div className="grid gap-3">
            <CardTitle className="text-base">Báo cáo định kỳ</CardTitle>
            <CardDescription>
              Số tiền bị lừa được ghi nhận từ 20/5/2020
            </CardDescription>
            <div className="flex w-fit rounded-lg bg-muted p-1">
              {activityRangeOptions.map((option) => (
                <Button
                  className="h-7 px-3 text-xs"
                  key={option.value}
                  onClick={() => setActivityRange(option.value)}
                  type="button"
                  variant={activityRange === option.value ? "default" : "ghost"}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {activityByDate.map((day) => (
            <article className="rounded-xl border p-4" key={day.date}>
              <h3 className="font-semibold text-sm">{day.date}</h3>
              <dl className="mt-3 grid gap-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Cảnh báo đã duyệt</dt>
                  <dd className="font-medium text-primary">{day.reports}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Số tiền bị lừa</dt>
                  <dd className="font-medium text-destructive">
                    {formatMoney(day.loss)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Phản hồi từ cộng đồng
                  </dt>
                  <dd className="font-medium text-primary">{day.responses}</dd>
                </div>
              </dl>
            </article>
          ))}
        </CardContent>
      </Card>
    </section>
  );
};

export const RiskLookupPage = () => {
  const identifierType: IdentifierType = "BANK_ACCOUNT";
  const [value, setValue] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const searchMutation = usePublicRiskIdentifierSearch();
  const statisticsQuery = usePublicRiskStatistics();
  const result = searchMutation.data;
  const statisticsContent = (
    <PublicRiskStatisticsSection statistics={statisticsQuery.data} />
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue.length < 4) {
      setClientError("Vui lòng nhập định danh có ít nhất 4 ký tự.");
      return;
    }

    setClientError(null);
    await searchMutation.mutateAsync({
      type: identifierType,
      value: trimmedValue,
    });
  };

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="risk-lookup-heading"
        className="grid gap-6 border-b pb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <Badge className="w-fit gap-1.5" variant="outline">
              <ShieldWarningIcon aria-hidden="true" />
              Avin Cảnh báo
            </Badge>
            <h1
              className="font-black text-4xl tracking-tight sm:text-5xl"
              id="risk-lookup-heading"
            >
              Kiểm tra dấu hiệu lừa đảo.
            </h1>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl border border-input px-3 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
            to="/avin-check/report"
          >
            <FlagIcon data-icon="inline-start" />
            Gửi tố cáo
          </Link>
        </div>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="font-medium text-sm" htmlFor="risk-lookup-value">
            Nhập số tài khoản, số điện thoại hoặc website
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              autoComplete="off"
              className="h-12 flex-1"
              id="risk-lookup-value"
              inputMode={getInputMode(identifierType)}
              maxLength={300}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Ví dụ: 123456789 hoặc example.com"
              spellCheck="false"
              value={value}
            />
            <Button
              className="h-12 sm:px-6"
              disabled={searchMutation.isPending || !value.trim()}
              type="submit"
            >
              <MagnifyingGlassIcon data-icon="inline-start" />
              {searchMutation.isPending ? "Đang kiểm tra..." : "Kiểm tra"}
            </Button>
          </div>
        </form>
        <p className="text-muted-foreground text-sm">
          Chúng tôi chỉ đối chiếu với các cảnh báo đã công khai. Thông tin nhạy
          cảm luôn được che một phần.
        </p>
      </section>

      {clientError || searchMutation.isError ? (
        <Alert className="border-amber-500/30 bg-amber-500/5" role="alert">
          <AlertTitle>Không thể hoàn tất tra cứu</AlertTitle>
          <AlertDescription>
            {clientError ??
              "Vui lòng thử lại sau. Giá trị tìm kiếm không được đưa vào thông báo lỗi."}
          </AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <section aria-labelledby="risk-lookup-results-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-medium text-primary text-sm">
                Kết quả tra cứu
              </p>
              <h2
                className="font-bold text-3xl tracking-tight"
                id="risk-lookup-results-heading"
              >
                {result.exactMatch
                  ? "Đã tìm thấy cảnh báo liên quan."
                  : "Chưa có xác nhận công khai."}
              </h2>
            </div>
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {result.warnings.length} kết quả
            </p>
          </div>
          {result.exactMatch ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {result.warnings.map((warning) => (
                <PublicRiskWarningResult
                  key={`${warning.publicSlug}-${warning.identifier.type}`}
                  warning={warning}
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-border/60 p-5 text-muted-foreground text-sm">
              Chưa tìm thấy cảnh báo công khai trùng khớp. Điều này không đồng
              nghĩa giao dịch chắc chắn an toàn.
            </p>
          )}
        </section>
      ) : null}

      <PublicRiskWarningCatalogue />

      {statisticsContent}
    </Shell>
  );
};
