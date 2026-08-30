import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button, buttonVariants } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Skeleton } from "@avin/ui/components/skeleton";
import { Textarea } from "@avin/ui/components/textarea";
import {
  ArrowUUpLeftIcon,
  ClockIcon,
  CreditCardIcon,
  FlagIcon,
  GlobeIcon,
  PencilSimpleIcon,
  ShieldWarningIcon,
  TrashIcon,
  UserSwitchIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

import { riskReportWithdrawalFormSchema } from "../schemas/risk-report-workspace-schema";

const REPORT_TYPE_LABELS: Record<string, string> = {
  BANK_WALLET_PHONE: "Chuyển tiền · STK / Ví / SĐT",
  MALICIOUS_WEBSITE: "Website lừa đảo · Giả mạo",
  SOCIAL_GAME_ACCOUNT: "Tài khoản MXH / Game",
};

const REPORT_TYPE_ICONS: Record<string, typeof CreditCardIcon> = {
  BANK_WALLET_PHONE: CreditCardIcon,
  MALICIOUS_WEBSITE: GlobeIcon,
  SOCIAL_GAME_ACCOUNT: UserSwitchIcon,
};

const REPORT_STATUS_CONFIG: Record<
  string,
  {
    badgeClass?: string;
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  CHANGES_REQUESTED: {
    label: "Cần bổ sung thông tin",
    variant: "destructive",
  },
  CORRECTED: {
    badgeClass: "border-primary/40 bg-primary/10 text-primary",
    label: "Đã đính chính",
    variant: "outline",
  },
  DRAFT: {
    label: "Bản nháp",
    variant: "secondary",
  },
  PUBLISHED: {
    badgeClass: "border-primary/40 bg-primary/20 text-primary",
    label: "Đã công khai",
    variant: "default",
  },
  REJECTED: {
    badgeClass: "border-destructive/30 text-destructive",
    label: "Đã từ chối",
    variant: "outline",
  },
  REMOVED: {
    label: "Đã gỡ bỏ",
    variant: "outline",
  },
  SUBMITTED: {
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    label: "Đã gửi",
    variant: "secondary",
  },
  UNDER_REVIEW: {
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    label: "Đang xem xét",
    variant: "outline",
  },
  UNDER_VERIFICATION: {
    badgeClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
    label: "Đang xác minh",
    variant: "outline",
  },
};

const REPORT_STATUS_DESCRIPTIONS: Record<string, string> = {
  CHANGES_REQUESTED:
    "Kiểm duyệt viên đã yêu cầu bổ sung thêm thông tin hoặc chứng cứ. Vui lòng bấm 'Bổ sung thông tin' để hoàn thiện báo cáo.",
  CORRECTED:
    "Báo cáo đã được tiếp nhận yêu cầu đính chính và cập nhật lại thông tin.",
  DRAFT:
    "Bản nháp chưa gửi. Bạn có thể tiếp tục chỉnh sửa và gửi khi đã sẵn sàng.",
  PUBLISHED:
    "Báo cáo đã được kiểm duyệt và công khai trên hệ thống Avin Cảnh báo nhằm bảo vệ cộng đồng.",
  REJECTED:
    "Báo cáo không đủ thông tin xác thực hoặc không đáp ứng tiêu chuẩn kiểm duyệt của Avin.",
  REMOVED: "Báo cáo này đã được gỡ bỏ khỏi hệ thống cảnh báo công khai.",
  SUBMITTED:
    "Báo cáo của bạn đã gửi thành công và đang chờ đội ngũ kiểm duyệt tiếp nhận xử lý.",
  UNDER_REVIEW:
    "Đội ngũ kiểm duyệt viên đang xem xét thông tin và các bằng chứng bạn cung cấp.",
  UNDER_VERIFICATION:
    "Báo cáo đang trong giai đoạn đối soát và xác minh kỹ thuật chuyên sâu.",
};

const CORRECTION_STATUS_CONFIG: Record<
  string,
  {
    badgeClass?: string;
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  APPROVED: {
    badgeClass: "border-primary/40 bg-primary/20 text-primary",
    label: "Đã chấp thuận",
    variant: "default",
  },
  PENDING: {
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    label: "Đang chờ duyệt",
    variant: "outline",
  },
  REJECTED: {
    badgeClass: "border-destructive/30 text-destructive",
    label: "Đã từ chối",
    variant: "outline",
  },
};

const reportDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("vi-VN");

const formatReportDate = (isoString: string): string => {
  try {
    return reportDateFormatter.format(new Date(isoString));
  } catch {
    return isoString;
  }
};

const formatCurrency = (amount: number): string =>
  `${currencyFormatter.format(amount)} ₫`;

interface ReportIdentifier {
  displayName?: string | null;
  holderName?: string | null;
  institutionName?: string | null;
  isPrimary?: boolean;
  maskedValue?: string | null;
  publicValue?: string | null;
  type?: string;
  value?: string;
}

const getReportIdentifierTitle = (report: {
  identifiers?: ReportIdentifier[];
  type: string;
}): string => {
  if (report.identifiers && report.identifiers.length > 0) {
    const primary =
      report.identifiers.find((item) => item.isPrimary) ??
      report.identifiers[0];
    const val = primary.publicValue ?? primary.maskedValue ?? primary.value;

    if (primary.institutionName && val) {
      const holder = primary.holderName ? ` (${primary.holderName})` : "";
      return `${primary.institutionName}: ${val}${holder}`;
    }

    if (primary.displayName && val) {
      return `${primary.displayName}: ${val}`;
    }

    if (val) {
      return val;
    }
  }

  return REPORT_TYPE_LABELS[report.type] ?? report.type;
};

export const RiskReportWorkspacePage = () => {
  const [withdrawalReportId, setWithdrawalReportId] = useState<string>();

  const reports = useQuery(
    orpc.protection.riskReport.getMine.queryOptions({ input: {} })
  );
  const corrections = useQuery(
    orpc.protection.riskReport.correctionsMine.queryOptions()
  );
  const deleteDraft = useMutation(
    orpc.protection.riskReport.deleteDraft.mutationOptions({
      onSuccess: () => reports.refetch(),
    })
  );
  const requestWithdrawal = useMutation(
    orpc.protection.riskReport.requestWithdrawal.mutationOptions({
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể gửi yêu cầu rút lại báo cáo."
        );
      },
      onSuccess: async () => {
        setWithdrawalReportId(undefined);
        await reports.refetch();
      },
    })
  );
  const withdrawalForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      if (!withdrawalReportId) {
        return;
      }

      try {
        await requestWithdrawal.mutateAsync({
          reason: value.reason.trim(),
          reportId: withdrawalReportId,
        });
        withdrawalForm.reset();
        toast.success("Đã gửi yêu cầu rút lại báo cáo.");
      } catch {
        // The mutation's onError callback provides the user-facing message.
      }
    },
    validators: { onSubmit: riskReportWithdrawalFormSchema },
  });

  const handleWithdrawalStart = (reportId: string) => {
    withdrawalForm.reset();
    setWithdrawalReportId(reportId);
  };

  const handleWithdrawalCancel = () => {
    withdrawalForm.reset();
    setWithdrawalReportId(undefined);
  };

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="risk-report-workspace-heading"
        className="grid gap-6 border-b pb-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <Badge className="w-fit gap-1.5" variant="outline">
              <ShieldWarningIcon aria-hidden="true" />
              Avin Cảnh báo · Báo cáo của tôi
            </Badge>
            <h1
              className="font-black text-4xl tracking-tight sm:text-5xl"
              id="risk-report-workspace-heading"
            >
              Theo dõi các báo cáo rủi ro.
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
              Quản lý tiến trình xử lý, bổ sung tài liệu minh chứng hoặc chỉnh
              sửa các báo cáo lừa đảo bạn đã gửi đến hệ thống Avin.
            </p>
          </div>
          <Link
            className={buttonVariants({ size: "sm", variant: "outline" })}
            to="/avin-check/report"
          >
            <FlagIcon data-icon="inline-start" />
            Gửi tố cáo mới
          </Link>
        </div>
      </section>

      {reports.isPending ? (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          {Array.from({ length: 2 }).map((_, index) => (
            <Card className="overflow-hidden" key={index}>
              <CardHeader className="gap-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-60 rounded-md" />
                    <Skeleton className="h-4 w-40 rounded-md" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-9 w-32 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {reports.isError ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Không thể tải danh sách báo cáo</AlertTitle>
          <AlertDescription>
            Đã xảy ra lỗi khi lấy thông tin báo cáo của bạn. Vui lòng thử tải
            lại trang.
          </AlertDescription>
        </Alert>
      ) : null}

      {!reports.isPending && !reports.isError && reports.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShieldWarningIcon className="size-6" />
          </div>
          <div className="grid gap-1">
            <h3 className="font-semibold text-lg">Chưa có báo cáo nào</h3>
            <p className="max-w-md text-muted-foreground text-sm">
              Bạn có thể tạo báo cáo mới bất cứ lúc nào để cảnh báo cộng đồng về
              các dấu hiệu lừa đảo và tài khoản rủi ro.
            </p>
          </div>
          <Link
            className={buttonVariants({ variant: "default" })}
            to="/avin-check/report"
          >
            <FlagIcon data-icon="inline-start" />
            Tạo báo cáo đầu tiên
          </Link>
        </div>
      ) : null}

      {reports.data && reports.data.length > 0 ? (
        <section
          aria-labelledby="risk-report-list-heading"
          className="grid gap-5"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                className="font-bold text-2xl tracking-tight"
                id="risk-report-list-heading"
              >
                Lịch sử báo cáo
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Danh sách các báo cáo rủi ro và tiến trình kiểm duyệt của bạn.
              </p>
            </div>
            <Badge variant="secondary">{reports.data.length} báo cáo</Badge>
          </div>

          <div className="grid gap-4">
            {reports.data.map((report) => {
              const statusConfig = REPORT_STATUS_CONFIG[report.status] ?? {
                label: report.status,
                variant: "outline" as const,
              };
              const TypeIcon =
                REPORT_TYPE_ICONS[report.type] ?? ShieldWarningIcon;
              const typeLabel = REPORT_TYPE_LABELS[report.type] ?? report.type;
              const identifierTitle = getReportIdentifierTitle(report);

              return (
                <Card
                  className="transition hover:border-border/80"
                  key={report.id}
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="grid gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
                            <TypeIcon aria-hidden="true" className="size-3.5" />
                            {typeLabel}
                          </span>
                          {report.claimedLoss ? (
                            <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-semibold text-destructive text-xs">
                              Thiệt hại: {formatCurrency(report.claimedLoss)}
                            </span>
                          ) : null}
                        </div>
                        <CardTitle className="font-semibold text-lg tracking-tight">
                          {identifierTitle}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Cập nhật: {formatReportDate(report.updatedAt)}
                        </CardDescription>
                      </div>

                      <Badge
                        className={statusConfig.badgeClass}
                        variant={statusConfig.variant}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-0 text-sm">
                    {report.reviewReason ? (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-foreground">
                        <div className="flex items-center gap-1.5 font-medium text-amber-400 text-xs">
                          <WarningCircleIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                          Ghi chú từ kiểm duyệt viên:
                        </div>
                        <p className="mt-1 text-muted-foreground text-sm">
                          {report.reviewReason}
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground leading-relaxed">
                        {REPORT_STATUS_DESCRIPTIONS[report.status] ??
                          "Thông tin báo cáo đang được xử lý theo quy trình kiểm duyệt."}
                      </p>
                    )}

                    {report.withdrawalStatus === "REQUESTED" ? (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-amber-300 text-xs">
                        <ClockIcon
                          aria-hidden="true"
                          className="size-4 shrink-0 text-amber-400"
                        />
                        <span>
                          Yêu cầu rút lại báo cáo đang chờ kiểm duyệt viên phê
                          duyệt.
                        </span>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {report.status === "DRAFT" ? (
                        <>
                          <Link
                            className={buttonVariants({ size: "sm" })}
                            search={{ reportId: report.id }}
                            to="/avin-check/report"
                          >
                            <PencilSimpleIcon
                              aria-hidden="true"
                              className="size-4"
                            />
                            Tiếp tục bản nháp
                          </Link>
                          <Button
                            disabled={deleteDraft.isPending}
                            onClick={() =>
                              void deleteDraft.mutateAsync({
                                reportId: report.id,
                              })
                            }
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            <TrashIcon aria-hidden="true" className="size-4" />
                            Xoá bản nháp
                          </Button>
                        </>
                      ) : null}

                      {report.status === "CHANGES_REQUESTED" ? (
                        <Link
                          className={buttonVariants({ size: "sm" })}
                          search={{ reportId: report.id }}
                          to="/avin-check/report"
                        >
                          <PencilSimpleIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                          Bổ sung thông tin
                        </Link>
                      ) : null}

                      {report.status !== "DRAFT" &&
                      report.withdrawalStatus === "NONE" ? (
                        <Button
                          onClick={() => handleWithdrawalStart(report.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <ArrowUUpLeftIcon
                            aria-hidden="true"
                            className="size-4"
                          />
                          Yêu cầu rút lại
                        </Button>
                      ) : null}
                    </div>

                    {withdrawalReportId === report.id ? (
                      <form
                        className="grid gap-3 rounded-xl border border-border/80 bg-muted/20 p-4"
                        id="risk-report-withdrawal-form"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          await withdrawalForm.handleSubmit();
                        }}
                      >
                        <FieldGroup>
                          <withdrawalForm.Field name="reason">
                            {(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;
                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={field.name}>
                                    Lý do rút lại báo cáo
                                  </FieldLabel>
                                  <p className="font-normal text-muted-foreground text-xs">
                                    Vui lòng nêu rõ lý do để kiểm duyệt viên xem
                                    xét (ví dụ: đã giải quyết hòa giải, nhầm lẫn
                                    thông tin - tối thiểu 10 ký tự).
                                  </p>
                                  <Textarea
                                    aria-invalid={isInvalid}
                                    className="mt-1"
                                    id={field.name}
                                    minLength={10}
                                    name={field.name}
                                    onBlur={field.handleBlur}
                                    onChange={(event) =>
                                      field.handleChange(event.target.value)
                                    }
                                    placeholder="Nhập lý do rút lại báo cáo..."
                                    rows={3}
                                    value={field.state.value}
                                  />
                                  {isInvalid ? (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  ) : null}
                                </Field>
                              );
                            }}
                          </withdrawalForm.Field>
                        </FieldGroup>
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={handleWithdrawalCancel}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            Huỷ
                          </Button>
                          <withdrawalForm.Subscribe
                            selector={(state) => ({
                              canSubmit: state.canSubmit,
                              isSubmitting: state.isSubmitting,
                            })}
                          >
                            {({ canSubmit, isSubmitting }) => (
                              <Button
                                disabled={
                                  !canSubmit ||
                                  isSubmitting ||
                                  requestWithdrawal.isPending
                                }
                                size="sm"
                                type="submit"
                              >
                                {isSubmitting || requestWithdrawal.isPending
                                  ? "Đang gửi..."
                                  : "Gửi yêu cầu"}
                              </Button>
                            )}
                          </withdrawalForm.Subscribe>
                        </div>
                      </form>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {corrections.data && corrections.data.length > 0 ? (
        <section
          aria-labelledby="risk-correction-list-heading"
          className="grid gap-5"
        >
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                className="font-bold text-2xl tracking-tight"
                id="risk-correction-list-heading"
              >
                Yêu cầu đính chính
              </h2>
              <p className="mt-1 text-muted-foreground text-sm">
                Theo dõi các yêu cầu đính chính hoặc điều chỉnh thông tin cảnh
                báo bạn đã gửi.
              </p>
            </div>
            <Badge variant="secondary">{corrections.data.length} yêu cầu</Badge>
          </div>

          <div className="grid gap-4">
            {corrections.data.map((request) => {
              const correctionConfig = CORRECTION_STATUS_CONFIG[
                request.status
              ] ?? {
                label: request.status,
                variant: "outline" as const,
              };

              return (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle className="font-semibold text-base">
                          Mã báo cáo: {request.reportId}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Cập nhật: {formatReportDate(request.updatedAt)}
                        </CardDescription>
                      </div>
                      <Badge
                        className={correctionConfig.badgeClass}
                        variant={correctionConfig.variant}
                      >
                        {correctionConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-sm">
                    <p className="leading-relaxed">
                      {request.reviewReason ?? request.reason}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}
    </Shell>
  );
};
