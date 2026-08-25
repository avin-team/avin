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
import { rememberRiskLookupHandoff } from "../risk-lookup-handoff";
import type { RiskLookupKind } from "../risk-lookup-handoff";

const lookupKindOptions = [
  { label: "Tự nhận diện", value: "AUTO" },
  { label: "SĐT hoặc tài khoản ngân hàng", value: "PHONE_OR_BANK" },
  { label: "Số điện thoại", value: "PHONE" },
  { label: "Số tài khoản ngân hàng", value: "BANK_ACCOUNT" },
  { label: "Website", value: "WEBSITE" },
  { label: "Link Facebook", value: "FACEBOOK" },
  { label: "Link TikTok", value: "TIKTOK" },
  { label: "Link Telegram", value: "TELEGRAM" },
] as const satisfies readonly { label: string; value: RiskLookupKind }[];

const identifierTypeLabels: Record<string, string> = {
  BANK_ACCOUNT: "Số tài khoản ngân hàng",
  PHONE: "Số điện thoại",
  PLATFORM_ACCOUNT: "Tài khoản trên nền tảng",
  SOCIAL_ACCOUNT: "Tài khoản social",
  WALLET_ACCOUNT: "Tài khoản ví điện tử",
  WEBSITE: "Website",
};

const lookupKindLabels = Object.fromEntries(
  lookupKindOptions.map(({ label, value }) => [value, label])
) as Record<RiskLookupKind, string>;

const lookupDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const lookupNumberFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? lookupDateFormatter.format(new Date(value)) : "Chưa có dữ liệu";

const formatMoney = (value: number): string =>
  `${lookupNumberFormatter.format(value)} VND`;

const getInputMode = (type: RiskLookupKind): "numeric" | "url" | "text" => {
  if (type === "PHONE" || type === "BANK_ACCOUNT" || type === "PHONE_OR_BANK") {
    return "numeric";
  }
  if (
    type === "WEBSITE" ||
    type === "FACEBOOK" ||
    type === "TIKTOK" ||
    type === "TELEGRAM"
  ) {
    return "url";
  }
  return "text";
};

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
      status: warnings[0]?.status ?? "UNDER_VERIFICATION",
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

const statusLabels = {
  CORRECTED: "Đã cập nhật",
  PUBLISHED: "Đã công khai",
  UNDER_VERIFICATION: "Đang xác minh",
} as const;

const PublicRiskLookupGroupResult = ({
  group,
}: {
  group: PublicRiskLookupGroup;
}) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{identifierTypeLabels[group.identifier.type]}</CardTitle>
          <CardDescription>
            {group.hasPublicWarning
              ? "Có cảnh báo công khai"
              : "Có tố cáo đang xác minh"}
          </CardDescription>
        </div>
        <Badge variant={group.hasPublicWarning ? "default" : "outline"}>
          {group.reportCount} báo cáo
        </Badge>
      </div>
      <p className="rounded-lg bg-muted/40 px-3 py-2 font-medium text-sm break-all">
        {group.identifier.publicValue ?? group.identifier.maskedValue}
      </p>
      <p className="text-muted-foreground text-xs">
        {group.sourceCount} nguồn · cập nhật{" "}
        {formatDate(group.latestPublishedAt)}
      </p>
    </CardHeader>
    <CardContent className="grid gap-3">
      {group.warnings.map((warning) => (
        <article
          className="grid gap-2 rounded-xl border border-border/60 p-3"
          key={warning.publicSlug}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">{statusLabels[warning.status]}</Badge>
            <span className="text-muted-foreground text-xs">
              {formatDate(warning.publishedAt)}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Nguồn: </span>
            {warning.externalSource.url ? (
              <a
                className="font-medium text-primary underline underline-offset-4"
                href={warning.externalSource.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {warning.externalSource.title ?? warning.externalSource.name}
              </a>
            ) : (
              <span className="font-medium">{warning.externalSource.name}</span>
            )}
          </div>
          {warning.publicSummary ? (
            <p className="text-muted-foreground text-sm leading-6">
              {warning.publicSummary}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              {warning.affectedVictimCount} người bị ảnh hưởng
              {warning.claimedLoss === null
                ? ""
                : ` · ${formatMoney(warning.claimedLoss)}`}
            </span>
            <Link
              className="font-medium text-primary underline underline-offset-4"
              params={{ slug: warning.publicSlug }}
              to="/avin-check/warning/$slug"
            >
              Xem chi tiết
            </Link>
          </div>
        </article>
      ))}
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
          <ActivityMetric label="Cảnh báo công khai" value={publicWarnings} />
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
  const [value, setValue] = useState("");
  const [selectedKind, setSelectedKind] = useState<RiskLookupKind>("AUTO");
  const [clientError, setClientError] = useState<string | null>(null);
  const searchMutation = usePublicRiskIdentifierSearch();
  const statisticsQuery = usePublicRiskStatistics();
  const [result, setResult] = useState<PublicRiskIdentifierLookup | null>(
    () => searchMutation.data ?? null
  );
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
    setResult(null);
    try {
      const nextResult = await searchMutation.mutateAsync({
        kind: selectedKind,
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
        kind: selectedKind,
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
            Nhập số điện thoại, số tài khoản, website hoặc link Facebook,
            TikTok, Telegram
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-12 shrink-0 items-center rounded-xl border border-input bg-background px-3 sm:w-64">
              <label className="sr-only" htmlFor="risk-lookup-kind">
                Loại định danh
              </label>
              <select
                aria-label={`Loại định danh: ${lookupKindLabels[selectedKind]}`}
                className="w-full bg-transparent font-medium text-sm outline-none"
                id="risk-lookup-kind"
                onChange={(event) => {
                  setSelectedKind(event.target.value as RiskLookupKind);
                  setResult(null);
                }}
                value={selectedKind}
              >
                {lookupKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              autoComplete="off"
              className="h-12 flex-1"
              id="risk-lookup-value"
              inputMode={getInputMode(selectedKind)}
              maxLength={300}
              onChange={(event) => {
                setValue(event.target.value);
                setResult(null);
              }}
              placeholder="Ví dụ: 0912345678, example.com hoặc @tiktok_user"
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
          cảm luôn được che một phần; tra cứu số chỉ cần nhập một lần.
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
                  : "Chưa có cảnh báo công khai trùng khớp."}
              </h2>
            </div>
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {result.totalReports} báo cáo
            </p>
          </div>
          {result.exactMatch ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {result.groups.map((group) => (
                <PublicRiskLookupGroupResult
                  group={group}
                  key={getGroupKey(group)}
                />
              ))}
              {result.hasMore ? (
                <div className="flex justify-center md:col-span-2">
                  <Button
                    disabled={searchMutation.isPending}
                    onClick={() => void handleLoadMore()}
                    type="button"
                    variant="outline"
                  >
                    {searchMutation.isPending ? "Đang tải..." : "Xem thêm"}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 rounded-2xl border border-border/60 p-5">
              <p className="text-muted-foreground text-sm">
                Chưa tìm thấy cảnh báo công khai trùng khớp. Điều này không có
                nghĩa đối tượng hoặc giao dịch an toàn.
              </p>
              <Link
                className="inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-4xl border border-input px-3 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
                state={(previous) => ({
                  ...previous,
                  riskLookup: {
                    kind: selectedKind,
                    value: value.trim(),
                  },
                })}
                onClick={() =>
                  rememberRiskLookupHandoff({
                    kind: selectedKind,
                    value: value.trim(),
                  })
                }
                to="/avin-check/report"
              >
                <FlagIcon data-icon="inline-start" />
                Gửi tố cáo về định danh này
              </Link>
            </div>
          )}
        </section>
      ) : null}

      <PublicRiskWarningCatalogue />

      {statisticsContent}
    </Shell>
  );
};
