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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  ChartLineUpIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Shell } from "@/components/shell";

import {
  usePublicRiskIdentifierSearch,
  usePublicRiskStatistics,
} from "../api/risk-lookup-api";
import type {
  PublicRiskIdentifierLookup,
  PublicRiskStatistics as PublicRiskStatisticsData,
} from "../api/risk-lookup-api";

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

const providerStatusLabels = {
  ACTIVE: "Đang hoạt động",
  REMOVED_FOR_FRAUD: "Đã gỡ vì gian lận",
  SUSPENDED_PENDING_REVIEW: "Tạm dừng để xem xét",
  WITHDRAWAL_PENDING: "Đang chờ rút khỏi chương trình",
  WITHDRAWN: "Đã rút khỏi chương trình",
} as const;

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
        Xem warning
      </Link>
    </CardContent>
  </Card>
);

const PublicRiskStatisticsSection = ({
  statistics,
}: {
  statistics: PublicRiskStatisticsData;
}) => (
  <section aria-labelledby="risk-lookup-statistics-heading">
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="font-medium text-primary text-sm">Avin Check activity</p>
        <h2
          className="font-bold text-3xl tracking-tight"
          id="risk-lookup-statistics-heading"
        >
          Thống kê công khai, có thời điểm cập nhật.
        </h2>
      </div>
      <p className="text-muted-foreground text-xs">
        Cập nhật {formatDate(statistics.lastUpdatedAt)}
      </p>
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Risk Identifier đã phát hành</CardDescription>
          <CardTitle className="text-3xl">
            {lookupNumberFormatter.format(statistics.publishedRiskIdentifiers)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Warning đang công khai</CardDescription>
          <CardTitle className="text-3xl">
            {lookupNumberFormatter.format(statistics.currentReports)}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Tổng tổn thất khai báo đã xem xét</CardDescription>
          <CardTitle className="text-xl">
            {formatMoney(statistics.verifiedClaimedLoss)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Warning theo tháng phát hành</CardTitle>
          <CardDescription>
            Chỉ gồm warning còn đang được công khai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statistics.reportsByPeriod.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có dữ liệu.</p>
          ) : (
            <dl className="grid gap-2 text-sm">
              {statistics.reportsByPeriod.map((period) => (
                <div
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                  key={period.period}
                >
                  <dt className="text-muted-foreground">{period.period}</dt>
                  <dd className="font-medium">{period.count}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Provider theo trạng thái</CardTitle>
          <CardDescription>
            Trạng thái hiện tại của từng profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm">
            {statistics.providersByStatus.map((provider) => (
              <div
                className="flex items-center justify-between rounded-lg border px-3 py-2"
                key={provider.status}
              >
                <dt className="text-muted-foreground">
                  {providerStatusLabels[provider.status]}
                </dt>
                <dd className="font-medium">{provider.count}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  </section>
);

export const RiskLookupPage = () => {
  const [identifierType, setIdentifierType] =
    useState<IdentifierType>("BANK_ACCOUNT");
  const [value, setValue] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const searchMutation = usePublicRiskIdentifierSearch();
  const statisticsQuery = usePublicRiskStatistics();
  const result = searchMutation.data;
  let statisticsContent: ReactNode = null;

  if (statisticsQuery.isError) {
    statisticsContent = (
      <Alert className="border-destructive/30 bg-destructive/5" role="alert">
        <ChartLineUpIcon aria-hidden="true" />
        <AlertTitle>Không thể tải thống kê</AlertTitle>
        <AlertDescription>
          Số liệu công khai tạm thời không khả dụng. Bạn vẫn có thể thử tra cứu
          lại sau.
        </AlertDescription>
      </Alert>
    );
  } else if (statisticsQuery.data) {
    statisticsContent = (
      <PublicRiskStatisticsSection statistics={statisticsQuery.data} />
    );
  }

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
        className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10"
      >
        <Badge className="mb-4 gap-1.5" variant="outline">
          <ShieldCheckIcon aria-hidden="true" />
          Avin Check · Risk Identifier
        </Badge>
        <h1
          className="font-black text-4xl tracking-tight sm:text-5xl"
          id="risk-lookup-heading"
        >
          Kiểm tra định danh rủi ro chính xác.
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Nhập đúng số tài khoản, số điện thoại, hostname, URL profile hoặc ID
          nền tảng để đối chiếu với warning đang công khai. Kết quả không fuzzy
          match và giá trị nhạy cảm luôn được che một phần.
        </p>
        <form className="mt-7 grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-end">
            <div>
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="risk-lookup-type"
              >
                Loại định danh
              </label>
              <Select
                items={identifierTypeOptions}
                onValueChange={(selectedValue) =>
                  setIdentifierType(selectedValue as IdentifierType)
                }
                value={identifierType}
              >
                <SelectTrigger
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  id="risk-lookup-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {identifierTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label
                className="mb-2 block font-medium text-sm"
                htmlFor="risk-lookup-value"
              >
                Giá trị cần tra cứu
              </label>
              <div className="relative">
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  autoComplete="off"
                  className="h-11 pl-9"
                  id="risk-lookup-value"
                  inputMode={getInputMode(identifierType)}
                  maxLength={300}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Nhập giá trị, không thêm khoảng trắng thừa"
                  spellCheck="false"
                  value={value}
                />
              </div>
            </div>
            <Button
              className="h-11 sm:px-6"
              disabled={searchMutation.isPending || !value.trim()}
              type="submit"
            >
              {searchMutation.isPending ? "Đang kiểm tra..." : "Kiểm tra"}
            </Button>
          </div>
        </form>
        <p className="mt-3 text-muted-foreground text-xs">
          Không lưu giá trị tra cứu vào URL, lịch sử trình duyệt hoặc
          autocomplete. Tra cứu quá ngắn hoặc gần đúng sẽ không tạo xác nhận.
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
                Kết quả exact-match
              </p>
              <h2
                className="font-bold text-3xl tracking-tight"
                id="risk-lookup-results-heading"
              >
                {result.exactMatch
                  ? "Đã tìm thấy warning phù hợp."
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
              Không có warning công khai nào khớp chính xác. Điều này không phải
              là bảo đảm an toàn cho giao dịch.
            </p>
          )}
        </section>
      ) : null}

      {statisticsContent}
    </Shell>
  );
};
