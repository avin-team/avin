import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Textarea } from "@avin/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

const REPORT_STATUS_LABELS = {
  CHANGES_REQUESTED: "Cần bổ sung/chỉnh sửa",
  CORRECTED: "Đã đính chính",
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã công khai",
  REJECTED: "Đã từ chối",
  REMOVED: "Đã gỡ",
  SUBMITTED: "Đã gửi",
  UNDER_REVIEW: "Đang xem xét",
  UNDER_VERIFICATION: "Đang xác minh",
} as const;

export const RiskReportWorkspacePage = () => {
  const [withdrawalReportId, setWithdrawalReportId] = useState<string>();
  const [withdrawalReason, setWithdrawalReason] = useState("");
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
      onSuccess: async () => {
        setWithdrawalReportId(undefined);
        setWithdrawalReason("");
        await reports.refetch();
      },
    })
  );

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="risk-report-workspace-heading"
        className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10"
      >
        <Badge className="mb-4" variant="outline">
          Avin Check · Báo cáo của tôi
        </Badge>
        <h1
          className="font-black text-4xl tracking-tight sm:text-5xl"
          id="risk-report-workspace-heading"
        >
          Theo dõi các báo cáo rủi ro của bạn.
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Bản nháp, yêu cầu bổ sung và lịch sử an toàn của các báo cáo đều gắn
          với account Avin hiện tại.
        </p>
      </section>

      {reports.isPending ? (
        <output aria-live="polite">Đang tải báo cáo…</output>
      ) : null}

      {reports.isError ? (
        <p className="text-destructive" role="alert">
          Không thể tải báo cáo của bạn. Vui lòng thử lại.
        </p>
      ) : null}

      {reports.data?.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có báo cáo nào</CardTitle>
            <CardDescription>
              Bạn có thể bắt đầu một báo cáo mới và lưu bản nháp bất cứ lúc nào.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/85"
              to="/avin-check/report"
            >
              Gửi tố cáo
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {reports.data && reports.data.length > 0 ? (
        <section
          aria-labelledby="risk-report-list-heading"
          className="grid gap-4"
        >
          <h2 className="font-bold text-2xl" id="risk-report-list-heading">
            Lịch sử báo cáo
          </h2>
          {reports.data.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{report.type}</CardTitle>
                    <CardDescription>
                      Cập nhật{" "}
                      {new Date(report.updatedAt).toLocaleString("vi-VN")}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {REPORT_STATUS_LABELS[report.status] ?? report.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {report.reviewReason ? (
                  <p>{report.reviewReason}</p>
                ) : (
                  <p>
                    Thông tin moderation riêng tư chỉ hiển thị theo trạng thái.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {report.status === "DRAFT" ||
                  report.status === "CHANGES_REQUESTED" ? (
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 font-medium text-primary-foreground text-sm transition hover:bg-primary/85"
                      search={{ reportId: report.id }}
                      to="/avin-check/report"
                    >
                      {report.status === "DRAFT"
                        ? "Tiếp tục bản nháp"
                        : "Bổ sung báo cáo"}
                    </Link>
                  ) : null}
                  {report.status === "DRAFT" ? (
                    <Button
                      disabled={deleteDraft.isPending}
                      onClick={() =>
                        void deleteDraft.mutateAsync({ reportId: report.id })
                      }
                      type="button"
                      variant="outline"
                    >
                      Xoá bản nháp
                    </Button>
                  ) : null}
                  {report.status !== "DRAFT" &&
                  report.withdrawalStatus === "NONE" ? (
                    <Button
                      onClick={() => setWithdrawalReportId(report.id)}
                      type="button"
                      variant="outline"
                    >
                      Yêu cầu rút lại
                    </Button>
                  ) : null}
                  {report.withdrawalStatus === "REQUESTED" ? (
                    <Badge variant="secondary">
                      Đang chờ xử lý yêu cầu rút lại
                    </Badge>
                  ) : null}
                </div>
                {withdrawalReportId === report.id ? (
                  <div className="mt-4 grid gap-2 rounded-lg border p-3">
                    <label
                      className="grid gap-1.5 font-medium"
                      htmlFor={`withdrawal-reason-${report.id}`}
                    >
                      Lý do rút lại
                      <Textarea
                        id={`withdrawal-reason-${report.id}`}
                        minLength={10}
                        onChange={(event) =>
                          setWithdrawalReason(event.target.value)
                        }
                        placeholder="Vui lòng nêu lý do để Moderator xem xét."
                        value={withdrawalReason}
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        disabled={
                          requestWithdrawal.isPending ||
                          withdrawalReason.trim().length < 10
                        }
                        onClick={() =>
                          void requestWithdrawal.mutateAsync({
                            reason: withdrawalReason,
                            reportId: report.id,
                          })
                        }
                        type="button"
                      >
                        Gửi yêu cầu
                      </Button>
                      <Button
                        onClick={() => setWithdrawalReportId(undefined)}
                        type="button"
                        variant="ghost"
                      >
                        Huỷ
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {corrections.data && corrections.data.length > 0 ? (
        <section
          aria-labelledby="risk-correction-list-heading"
          className="grid gap-4"
        >
          <h2 className="font-bold text-2xl" id="risk-correction-list-heading">
            Yêu cầu đính chính của tôi
          </h2>
          {corrections.data.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Mã báo cáo: {request.reportId}</CardTitle>
                    <CardDescription>
                      Cập nhật{" "}
                      {new Date(request.updatedAt).toLocaleString("vi-VN")}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {request.reviewReason ?? request.reason}
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}
    </Shell>
  );
};
