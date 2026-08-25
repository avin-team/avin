import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@avin/ui/components/item";
import { ArrowRightIcon, ShieldWarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import type { PublicRiskWarning } from "../api/risk-warning-api";
import { usePublicRiskWarnings } from "../api/risk-warning-api";

const RISK_REPORT_TYPE_LABELS = {
  BANK_WALLET_PHONE: "Tài khoản ngân hàng, ví điện tử hoặc số điện thoại",
  MALICIOUS_WEBSITE: "Website có dấu hiệu rủi ro",
  SOCIAL_GAME_ACCOUNT: "Tài khoản mạng xã hội hoặc game",
} as const;

const riskWarningDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});

const formatDate = (value: string | null): string =>
  value ? riskWarningDateFormatter.format(new Date(value)) : "Chưa xác định";

const formatWarningStatus = (status: PublicRiskWarning["status"]): string => {
  if (status === "CORRECTED") {
    return "Đã cập nhật";
  }
  if (status === "REMOVED") {
    return "Đã gỡ";
  }
  if (status === "UNDER_VERIFICATION") {
    return "Đang xác minh";
  }
  return "Đã xem xét";
};

const getWarningIdentifiers = (warning: PublicRiskWarning): string =>
  warning.identifiers
    .map((identifier) => identifier.publicValue ?? identifier.maskedValue)
    .join(" · ");

const getWarningTitle = (warning: PublicRiskWarning): string =>
  warning.externalSource?.title || getWarningIdentifiers(warning);

const draftWarnings = [
  {
    date: "21 thg 8, 2026",
    identifier: "**** 6789",
    summary: "Định danh đã được xem xét và che một phần trước khi công khai.",
    type: "Tài khoản ngân hàng",
  },
  {
    date: "18 thg 8, 2026",
    identifier: "example-scam.vn",
    summary: "Website có dấu hiệu mạo danh. Kiểm tra kỹ trước khi giao dịch.",
    type: "Website rủi ro",
  },
  {
    date: "15 thg 8, 2026",
    identifier: "09••• 1234",
    summary: "Số điện thoại liên quan đến một cảnh báo đã được phát hành.",
    type: "Số điện thoại",
  },
] as const;

const PublicRiskWarningListItem = ({
  warning,
}: {
  warning: PublicRiskWarning;
}) => (
  <Item className="rounded-none border-0 border-b border-border/70 px-5 py-5 last:border-b-0 sm:px-6">
    <ItemMedia className="bg-primary/10 text-primary" variant="icon">
      <ShieldWarningIcon aria-hidden="true" />
    </ItemMedia>
    <ItemContent className="gap-1">
      <ItemTitle className="font-semibold">
        {getWarningTitle(warning)}
      </ItemTitle>
      <ItemDescription className="text-primary/80">
        {RISK_REPORT_TYPE_LABELS[warning.type]}
      </ItemDescription>
      {warning.externalSource ? (
        <ItemDescription>
          Nguồn {warning.externalSource.name} · chưa được Avin xác minh độc lập
        </ItemDescription>
      ) : null}
      <ItemDescription className="max-w-2xl leading-6">
        {warning.publicSummary}
      </ItemDescription>
    </ItemContent>
    <ItemActions className="ml-auto flex-col items-end gap-2 sm:min-w-32">
      <Badge variant="outline">{formatWarningStatus(warning.status)}</Badge>
      <span className="text-muted-foreground text-xs">
        {formatDate(warning.publishedAt)}
      </span>
      <Link
        className="inline-flex items-center gap-1 font-medium text-primary text-sm underline underline-offset-4"
        params={{ slug: warning.publicSlug }}
        to="/avin-check/warning/$slug"
      >
        Xem chi tiết
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </ItemActions>
  </Item>
);

const DraftWarningListItem = ({
  warning,
}: {
  warning: (typeof draftWarnings)[number];
}) => (
  <Item variant="outline">
    <ItemMedia variant="icon">
      <ShieldWarningIcon aria-hidden="true" />
    </ItemMedia>
    <ItemContent>
      <ItemTitle>{warning.identifier}</ItemTitle>
      <ItemDescription>
        {warning.type} · {warning.summary}
      </ItemDescription>
    </ItemContent>
    <ItemActions className="ml-auto flex-col items-end gap-1">
      <Badge variant="outline">Đã xem xét</Badge>
      <span className="text-muted-foreground text-xs">{warning.date}</span>
    </ItemActions>
  </Item>
);

export const PublicRiskWarningCatalogue = () => {
  const warningsQuery = usePublicRiskWarnings();
  const warnings = warningsQuery.data ?? [];
  const showsDraftWarnings = !warningsQuery.isPending && warnings.length === 0;
  return (
    <section
      aria-labelledby="risk-warning-results-heading"
      className="grid gap-5"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-medium text-primary text-sm">Duyệt toàn bộ</p>
          <h2
            className="font-bold text-3xl tracking-tight"
            id="risk-warning-results-heading"
          >
            Cảnh báo đã công khai
          </h2>
        </div>
        <Badge variant="secondary">
          {showsDraftWarnings ? draftWarnings.length : warnings.length} cảnh báo
        </Badge>
      </div>

      {warningsQuery.isError ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Không thể tải cảnh báo</AlertTitle>
          <AlertDescription>
            Vui lòng thử lại sau. Không có dữ liệu riêng tư nào được đưa vào
            thông báo lỗi.
          </AlertDescription>
        </Alert>
      ) : null}

      {warningsQuery.isError ? null : (
        <ItemGroup>
          {showsDraftWarnings
            ? draftWarnings.map((warning) => (
                <DraftWarningListItem
                  key={warning.identifier}
                  warning={warning}
                />
              ))
            : warnings.map((warning) => (
                <PublicRiskWarningListItem
                  key={warning.publicSlug}
                  warning={warning}
                />
              ))}
        </ItemGroup>
      )}
    </section>
  );
};
