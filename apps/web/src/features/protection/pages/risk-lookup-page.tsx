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
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  ClockCounterClockwiseIcon,
  FlagIcon,
  MagnifyingGlassIcon,
  ShieldWarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { useSession } from "@/features/auth/api/session-query";
import { orpc } from "@/utils/orpc";

import {
  usePublicRiskIdentifierSearch,
  usePublicRiskStatistics,
} from "../api/risk-lookup-api";
import type {
  PublicRiskIdentifierLookup,
  PublicRiskStatistics as PublicRiskStatisticsData,
} from "../api/risk-lookup-api";
import { PublicRiskWarningCatalogue } from "../components/public-risk-warning-catalogue";
import { rememberRiskLookupHandoff } from "../risk-lookup-handoff";

const identifierFilterLabels: Record<string, string> = {
  BANK_ACCOUNT: "STK",
  PHONE: "SĐT",
  PLATFORM_ACCOUNT: "Tài khoản nền tảng",
  SOCIAL_ACCOUNT: "Tài khoản social",
  WALLET_ACCOUNT: "Ví điện tử",
  WEBSITE: "Website",
};

const lookupNumberFormatter = new Intl.NumberFormat("vi-VN");

const formatMoney = (value: number): string =>
  `${lookupNumberFormatter.format(value)} VND`;

type PublicRiskLookupGroup = PublicRiskIdentifierLookup["groups"][number];

const getGroupKey = (group: PublicRiskLookupGroup): string => group.groupId;

const sortGroups = (groups: PublicRiskLookupGroup[]): PublicRiskLookupGroup[] =>
  groups.toSorted((left, right) => {
    if (left.hasPublicWarning !== right.hasPublicWarning) {
      return left.hasPublicWarning ? -1 : 1;
    }
    if (left.reportCount !== right.reportCount) {
      return right.reportCount - left.reportCount;
    }
    return (right.latestPublishedAt ?? "").localeCompare(
      left.latestPublishedAt ?? ""
    );
  });

const mergeLookupResults = (
  current: PublicRiskIdentifierLookup,
  next: PublicRiskIdentifierLookup
): PublicRiskIdentifierLookup => {
  const groupsByKey = new Map(
    current.groups.map((group) => [getGroupKey(group), group])
  );

  for (const nextGroup of next.groups) {
    const key = getGroupKey(nextGroup);
    const currentGroup = groupsByKey.get(key);
    if (!currentGroup) {
      groupsByKey.set(key, nextGroup);
      continue;
    }

    const warningsBySlug = new Map(
      currentGroup.warnings.map((warning) => [warning.publicSlug, warning])
    );
    for (const warning of nextGroup.warnings) {
      warningsBySlug.set(warning.publicSlug, warning);
    }
    const warnings = [...warningsBySlug.values()].toSorted((left, right) =>
      (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "")
    );
    const hasPublicWarning = warnings.some(
      (warning) =>
        warning.status === "PUBLISHED" || warning.status === "CORRECTED"
    );

    groupsByKey.set(key, {
      ...nextGroup,
      hasPublicWarning,
      latestPublishedAt: warnings[0]?.publishedAt ?? null,
      reportCount: warnings.length,
      sourceCount: new Set(
        warnings.map((warning) => warning.externalSource.name)
      ).size,
      status: warnings[0]?.status ?? "PUBLISHED",
      warnings,
    });
  }

  const groups = sortGroups([...groupsByKey.values()]);
  return {
    ...next,
    exactMatch: groups.length > 0,
    groups,
    totalReports: Math.max(current.totalReports, next.totalReports),
    warnings: groups.flatMap((group) => group.warnings),
  };
};

const getFilteredLookupResult = (
  result: PublicRiskIdentifierLookup | null,
  groupId: string | null
): PublicRiskIdentifierLookup | null => {
  if (!result || !groupId) {
    return result;
  }

  const groups = result.groups.filter((group) => group.groupId === groupId);
  const warnings = groups.flatMap((group) => group.warnings);
  return {
    ...result,
    groups,
    hasMore: false,
    nextCursor: null,
    totalReports: warnings.length,
    warnings,
  };
};

const getLookupFilterLabel = (group: PublicRiskLookupGroup): string => {
  const identifier =
    group.identifier.publicValue ?? group.identifier.maskedValue;
  const type = identifierFilterLabels[group.identifier.type] ?? "Định danh";
  return `${type}: ${identifier}`;
};

const ActivityMetric = ({
  isLoading = false,
  label,
  value,
}: {
  isLoading?: boolean;
  label: string;
  value?: number;
}) => (
  <div className="rounded-xl border bg-muted/20 p-4">
    <p className="text-muted-foreground text-sm">{label}</p>
    {isLoading ? (
      <Skeleton className="mt-2 h-7 w-24 rounded-md" />
    ) : (
      <p className="mt-1 font-bold text-2xl text-primary">
        {value === undefined ? "—" : lookupNumberFormatter.format(value)}
      </p>
    )}
  </div>
);

const activityRangeOptions = [
  { label: "Theo ngày", value: "day" },
  { label: "Theo tháng", value: "month" },
  { label: "Theo năm", value: "year" },
] as const;

type ActivityRange = (typeof activityRangeOptions)[number]["value"];

const formatActivityPeriod = (period: string, range: ActivityRange): string => {
  if (range === "year") {
    return `Năm ${period}`;
  }
  if (range === "month") {
    const [year, month] = period.split("-");
    return `Tháng ${Number(month)}/${year}`;
  }
  const [year, month, day] = period.split("-");
  return `${day}/${month}/${year}`;
};

const PublicRiskStatisticsSection = ({
  isLoading = false,
  statistics,
}: {
  isLoading?: boolean;
  statistics?: PublicRiskStatisticsData;
}) => {
  const [activityRange, setActivityRange] = useState<ActivityRange>("year");
  const activityByDate = statistics?.activity[activityRange] ?? [];

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
            isLoading={isLoading}
            label="Số điện thoại, số tài khoản"
            value={statistics?.publishedRiskIdentifiers}
          />
          <ActivityMetric
            isLoading={isLoading}
            label="Cảnh báo công khai"
            value={statistics?.currentReports}
          />
          <ActivityMetric
            isLoading={isLoading}
            label="Tổng số tiền người tố cáo khai"
            value={statistics?.reportedClaimedLoss}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b py-4">
          <div className="grid gap-3">
            <CardTitle className="text-base">Báo cáo định kỳ</CardTitle>
            <CardDescription>
              Tổng số tiền người tố cáo khai từ 20/5/2020
            </CardDescription>
            <div className="flex w-fit rounded-lg bg-muted p-1">
              {activityRangeOptions.map((option) => (
                <Button
                  className="h-7 px-3 text-xs"
                  disabled={isLoading}
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
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <article className="rounded-xl border p-4" key={index}>
                <Skeleton className="h-4 w-28 rounded-md" />
                <dl className="mt-3 grid gap-2">
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                  </div>
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-4 w-32 rounded-md" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <>
              {activityByDate.map((period) => (
                <article className="rounded-xl border p-4" key={period.period}>
                  <h3 className="font-semibold text-sm">
                    {formatActivityPeriod(period.period, activityRange)}
                  </h3>
                  <dl className="mt-3 grid gap-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Cảnh báo đã duyệt
                      </dt>
                      <dd className="font-medium text-primary">
                        {lookupNumberFormatter.format(period.reports)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Số tiền người tố cáo khai
                      </dt>
                      <dd className="font-medium text-destructive">
                        {formatMoney(period.claimedLoss)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
              {activityByDate.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Chưa có dữ liệu báo cáo công khai.
                </p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export const RiskLookupPage = () => {
  const [value, setValue] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const { data: session } = useSession();
  const myReports = useQuery({
    ...orpc.protection.riskReport.getMine.queryOptions({ input: {} }),
    enabled: Boolean(session),
  });
  const hasMyReports = Boolean(myReports.data && myReports.data.length > 0);

  const searchMutation = usePublicRiskIdentifierSearch();
  const statisticsQuery = usePublicRiskStatistics();
  const [result, setResult] = useState<PublicRiskIdentifierLookup | null>(
    () => searchMutation.data ?? null
  );
  const filteredResult = getFilteredLookupResult(result, selectedGroupId);
  const statisticsContent = (
    <PublicRiskStatisticsSection
      isLoading={statisticsQuery.isPending}
      statistics={statisticsQuery.data}
    />
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = value.trim();
    if (trimmedValue.length < 4) {
      setClientError("Vui lòng nhập định danh có ít nhất 4 ký tự.");
      return;
    }

    setClientError(null);
    setResult(null);
    setSelectedGroupId(null);
    try {
      const nextResult = await searchMutation.mutateAsync({
        kind: "AUTO",
        value: trimmedValue,
      });
      setResult(nextResult);
    } catch {
      setResult(null);
    }
  };

  const handleLoadMore = async (): Promise<void> => {
    if (!result?.nextCursor) {
      return;
    }

    try {
      const nextResult = await searchMutation.mutateAsync({
        cursor: result.nextCursor,
        kind: "AUTO",
        value: value.trim(),
      });
      setResult((currentResult) =>
        currentResult
          ? mergeLookupResults(currentResult, nextResult)
          : nextResult
      );
    } catch {
      setClientError("Không thể tải thêm kết quả. Vui lòng thử lại.");
    }
  };

  const handleClear = (): void => {
    setClientError(null);
    setResult(null);
    setSelectedGroupId(null);
    setValue("");
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
          <div className="flex flex-wrap items-center gap-2">
            {hasMyReports ? (
              <Link
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl border border-input px-3.5 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
                to="/avin-check/reports"
              >
                <ClockCounterClockwiseIcon data-icon="inline-start" />
                Báo cáo của tôi
              </Link>
            ) : null}
            <Link
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-4xl border border-input px-3.5 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
              to="/avin-check/report"
            >
              <FlagIcon data-icon="inline-start" />
              Gửi tố cáo
            </Link>
          </div>
        </div>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="font-medium text-sm" htmlFor="risk-lookup-value">
            Nhập số điện thoại, số tài khoản, website hoặc link Facebook,
            TikTok, Telegram
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Input
                autoComplete="off"
                className="h-12 pr-11"
                id="risk-lookup-value"
                inputMode="text"
                maxLength={300}
                onChange={(event) => {
                  setValue(event.target.value);
                  setResult(null);
                  setSelectedGroupId(null);
                }}
                placeholder="SĐT, số tài khoản, website hoặc link mạng xã hội"
                spellCheck="false"
                value={value}
              />
              {value ? (
                <Button
                  aria-label="Xóa nội dung tra cứu"
                  className="absolute top-1/2 right-2 size-8 -translate-y-1/2 rounded-full p-0 text-muted-foreground hover:text-foreground"
                  onClick={handleClear}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </Button>
              ) : null}
            </div>
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
          cảm luôn được che một phần; tra cứu số chỉ cần nhập một lần.
        </p>
        {result?.exactMatch ? (
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Lọc kết quả theo định danh</legend>
            <Button
              aria-pressed={selectedGroupId === null}
              className="rounded-full font-medium"
              onClick={() => setSelectedGroupId(null)}
              size="sm"
              type="button"
              variant={selectedGroupId === null ? "default" : "outline"}
            >
              Tất cả ({result.totalReports})
            </Button>
            {result.groups.map((group) => (
              <Button
                aria-pressed={selectedGroupId === group.groupId}
                className="rounded-full font-medium"
                key={group.groupId}
                onClick={() => setSelectedGroupId(group.groupId)}
                size="sm"
                type="button"
                variant={
                  selectedGroupId === group.groupId ? "default" : "outline"
                }
              >
                {getLookupFilterLabel(group)} ({group.reportCount})
              </Button>
            ))}
          </fieldset>
        ) : null}
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

      <PublicRiskWarningCatalogue
        emptyLookupContent={
          result ? (
            <Link
              className="inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-4xl border border-input px-3 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
              onClick={() =>
                rememberRiskLookupHandoff({
                  kind: "AUTO",
                  value: value.trim(),
                })
              }
              state={(previous) => ({
                ...previous,
                riskLookup: {
                  kind: "AUTO",
                  value: value.trim(),
                },
              })}
              to="/avin-check/report"
            >
              <FlagIcon data-icon="inline-start" />
              Gửi tố cáo về định danh này
            </Link>
          ) : null
        }
        isLoading={searchMutation.isPending}
        isLoadingMore={searchMutation.isPending && Boolean(result?.nextCursor)}
        lookupResult={filteredResult}
        onLoadMore={() => void handleLoadMore()}
      />

      {statisticsContent}
    </Shell>
  );
};
