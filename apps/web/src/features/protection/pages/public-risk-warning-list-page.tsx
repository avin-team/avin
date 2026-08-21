import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { ArrowRightIcon, ShieldWarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Shell } from "@/components/shell";

import type { PublicRiskWarning } from "../api/risk-warning-api";
import { usePublicRiskWarnings } from "../api/risk-warning-api";

const RISK_REPORT_TYPE_LABELS = {
  BANK_WALLET_PHONE: "Bank · ví điện tử · số điện thoại",
  MALICIOUS_WEBSITE: "Website có dấu hiệu rủi ro",
  SOCIAL_GAME_ACCOUNT: "Tài khoản social / game",
} as const;

const riskWarningDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});
const riskWarningLossFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? riskWarningDateFormatter.format(new Date(value)) : "Chưa xác định";

const formatLoss = (value: number | null): string =>
  value === null
    ? "Chưa công bố"
    : `${riskWarningLossFormatter.format(value)} VND`;

const PublicRiskWarningCard = ({ warning }: { warning: PublicRiskWarning }) => (
  <Card className="h-full">
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{RISK_REPORT_TYPE_LABELS[warning.type]}</CardTitle>
          <CardDescription className="mt-1">
            Phát hành {formatDate(warning.publishedAt)}
          </CardDescription>
        </div>
        <Badge className="shrink-0" variant="outline">
          {warning.status === "CORRECTED" ? "Đã cập nhật" : "Đã xem xét"}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="flex h-full flex-col gap-4">
      <div className="grid gap-2 text-sm">
        {warning.identifiers.map((identifier) => (
          <div
            className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-3 py-2"
            key={`${identifier.type}-${identifier.maskedValue}`}
          >
            <span className="text-muted-foreground">{identifier.type}</span>
            <span className="font-medium break-all">
              {identifier.publicValue ?? identifier.maskedValue}
            </span>
          </div>
        ))}
      </div>
      <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6">
        {warning.publicSummary}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          Tổn thất khai báo: {formatLoss(warning.claimedLoss)}
        </span>
        <Link
          className="inline-flex shrink-0 items-center gap-1 font-medium text-primary underline underline-offset-4"
          params={{ slug: warning.publicSlug }}
          to="/avin-check/warning/$slug"
        >
          Xem warning
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </CardContent>
  </Card>
);

export const PublicRiskWarningListPage = () => {
  const warningsQuery = usePublicRiskWarnings();
  const warnings = warningsQuery.data ?? [];

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="risk-warning-list-heading"
        className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10"
      >
        <Badge className="mb-4 gap-1.5" variant="outline">
          <ShieldWarningIcon aria-hidden="true" />
          Avin Check · Public warnings
        </Badge>
        <h1
          className="font-black text-4xl tracking-tight sm:text-5xl"
          id="risk-warning-list-heading"
        >
          Cảnh báo rủi ro đã được xem xét.
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Chỉ warning ở trạng thái công khai mới xuất hiện tại đây. Giá trị định
          danh được che một phần; bằng chứng hiển thị là derivative đã được gỡ
          metadata, redaction PII và đóng watermark.
        </p>
      </section>

      {warningsQuery.isError ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Không thể tải cảnh báo</AlertTitle>
          <AlertDescription>
            Vui lòng thử lại sau. Không có dữ liệu riêng tư nào được đưa vào
            thông báo lỗi.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="risk-warning-results-heading">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-medium text-primary text-sm">Risk Moderator</p>
            <h2
              className="font-bold text-3xl tracking-tight"
              id="risk-warning-results-heading"
            >
              Danh mục warning
            </h2>
          </div>
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {warningsQuery.isPending
              ? "Đang tải…"
              : `${warnings.length} warning`}
          </p>
        </div>

        {!warningsQuery.isPending && warnings.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-border/60 p-5 text-muted-foreground text-sm">
            Chưa có warning nào được phát hành công khai.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {warnings.map((warning) => (
            <PublicRiskWarningCard key={warning.publicSlug} warning={warning} />
          ))}
        </div>
      </section>
    </Shell>
  );
};
