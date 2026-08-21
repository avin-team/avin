import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { ArrowLeftIcon, ShieldWarningIcon } from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";

import { Shell } from "@/components/shell";

import { usePublicRiskWarning } from "../api/risk-warning-api";

const RISK_REPORT_TYPE_LABELS = {
  BANK_WALLET_PHONE: "Bank · ví điện tử · số điện thoại",
  MALICIOUS_WEBSITE: "Website có dấu hiệu rủi ro",
  SOCIAL_GAME_ACCOUNT: "Tài khoản social / game",
} as const;

const riskWarningDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const riskWarningLossFormatter = new Intl.NumberFormat("vi-VN");

const formatDate = (value: string | null): string =>
  value ? riskWarningDateFormatter.format(new Date(value)) : "Chưa xác định";

const formatLoss = (value: number | null): string =>
  value === null
    ? "Chưa công bố"
    : `${riskWarningLossFormatter.format(value)} VND`;

const formatHistoryStatus = (status: string): string => {
  if (status === "CORRECTED") {
    return "Đã cập nhật";
  }
  if (status === "REMOVED") {
    return "Đã gỡ";
  }
  if (status === "PUBLISHED") {
    return "Đã công khai";
  }
  return status;
};

export const PublicRiskWarningDetailPage = () => {
  const { slug } = useParams({
    from: "/(public)/avin-check/warning/$slug",
  });
  const warningQuery = usePublicRiskWarning(slug);

  if (warningQuery.isPending) {
    return <output aria-live="polite">Đang tải warning…</output>;
  }

  if (warningQuery.isError) {
    return (
      <Shell as="div" className="gap-6" variant="default">
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Không tìm thấy warning</AlertTitle>
          <AlertDescription>
            Warning có thể chưa được phát hành hoặc đường dẫn không còn hợp lệ.
          </AlertDescription>
        </Alert>
        <Link
          className="inline-flex w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
          to="/avin-check/warnings"
        >
          <ArrowLeftIcon aria-hidden="true" />
          Quay lại danh mục warning
        </Link>
      </Shell>
    );
  }

  const warning = warningQuery.data;

  return (
    <Shell as="div" className="gap-6" variant="default">
      <Link
        className="inline-flex w-fit items-center gap-2 font-medium text-primary underline underline-offset-4"
        to="/avin-check/warnings"
      >
        <ArrowLeftIcon aria-hidden="true" />
        Quay lại danh mục warning
      </Link>

      <header className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10">
        <Badge className="mb-4 gap-1.5" variant="outline">
          <ShieldWarningIcon aria-hidden="true" />
          Avin Check ·{" "}
          {warning.status === "CORRECTED" ? "Đã cập nhật" : "Đã xem xét"}
        </Badge>
        <h1 className="font-black text-4xl tracking-tight sm:text-5xl">
          {RISK_REPORT_TYPE_LABELS[warning.type]}
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Warning này chỉ hiển thị dữ liệu đã được Risk Moderator xem xét và phê
          duyệt công khai. Bản gốc, thông tin liên hệ và định danh đầy đủ không
          thuộc public projection.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tóm tắt đã redaction</CardTitle>
            <CardDescription>
              Cập nhật lần gần nhất: {formatDate(warning.publishedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <p className="whitespace-pre-wrap text-sm leading-7">
              {warning.publicSummary}
            </p>
            <div className="grid gap-2">
              <p className="font-medium text-sm">Định danh được che</p>
              {warning.identifiers.map((identifier) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                  key={`${identifier.type}-${identifier.maskedValue}`}
                >
                  <span className="text-muted-foreground">
                    {identifier.type}
                  </span>
                  <span className="font-medium break-all">
                    {identifier.publicValue ?? identifier.maskedValue}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              Tổn thất khai báo: {formatLoss(warning.claimedLoss)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bằng chứng derivative</CardTitle>
            <CardDescription>
              Các tệp public đã được xử lý riêng khỏi bản gốc.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {warning.evidence.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Không có tệp public được đính kèm.
              </p>
            ) : (
              warning.evidence.map((evidence) => (
                <a
                  className="rounded-xl border p-3 text-sm transition hover:bg-muted/50"
                  href={evidence.publicUrl}
                  key={evidence.id}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="block font-medium">{evidence.kind}</span>
                  <span className="text-muted-foreground">
                    Mở derivative đã watermark ({evidence.contentType})
                  </span>
                </a>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lịch sử public</CardTitle>
          <CardDescription>
            Chỉ các thay đổi đã được phép công khai mới xuất hiện trong
            timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3">
            {warning.history.map((item) => (
              <li
                className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm"
                key={`${item.status}-${item.createdAt}`}
              >
                <span className="font-medium">
                  {formatHistoryStatus(item.status)}
                </span>
                <time
                  className="text-muted-foreground"
                  dateTime={item.createdAt}
                >
                  {formatDate(item.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </Shell>
  );
};
