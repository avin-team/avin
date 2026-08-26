import {
  RISK_REPORT_EVIDENCE_MAX_BYTES,
  RISK_REPORT_DERIVATIVE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { AUTH_SURFACE, AUTH_SURFACE_HEADER } from "@avin/auth/auth-surfaces";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import { useUploadFile } from "@better-upload/client";
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { client } from "@/lib/orpc";
import { serverURL } from "@/lib/server-url";

import {
  useAdminRiskReport,
  useDecideAdminRiskReport,
  useRegisterRiskReportDerivative,
} from "../api/risk-reports-api";
import type { RiskReportDetail } from "../api/risk-reports-api";
import { ProviderRiskIncidentPanel } from "../components/provider-risk-incident-panel";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const ACCEPTED_CONTENT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

const STATUS_LABELS: Record<string, string> = {
  CHANGES_REQUESTED: "Cần bổ sung",
  CORRECTED: "Đã cập nhật",
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã công khai",
  REJECTED: "Từ chối",
  REMOVED: "Đã gỡ",
  SUBMITTED: "Đã gửi",
  UNDER_REVIEW: "Đang xem xét",
  UNDER_VERIFICATION: "Đang xác minh",
};

const TYPE_LABELS = {
  BANK_WALLET_PHONE: "Chuyển tiền / STK / Ví",
  MALICIOUS_WEBSITE: "Website / App giả mạo",
  SOCIAL_GAME_ACCOUNT: "Tài khoản Game / MXH bị back",
} as const;

const WEBSITE_VIOLATION_LABELS: Record<string, string> = {
  FAKE_STORE: "Cửa hàng giả",
  IMPERSONATION: "Mạo danh thương hiệu",
  MALWARE: "Phát tán mã độc",
  OTHER: "Khác",
  PAYMENT_SCAM: "Lừa đảo thanh toán",
  PHISHING: "Lừa lấy thông tin",
};

const URGENCY_LABELS: Record<string, string> = {
  NORMAL: "Thông thường",
  URGENT: "Khẩn cấp",
};

const IDENTIFIER_TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "Tài khoản ngân hàng",
  PHONE: "Số điện thoại / Zalo",
  PLATFORM_ACCOUNT: "Tài khoản nền tảng",
  SOCIAL_ACCOUNT: "Mạng xã hội / Kênh chat",
  WALLET_ACCOUNT: "Ví điện tử",
  WEBSITE: "Website / App giả mạo",
};

const getIdentifierTypeLabel = (type: string): string =>
  IDENTIFIER_TYPE_LABELS[type] ?? type;

const getReporterInvolvementLabel = (
  involvement: string | null | undefined
): string => {
  if (involvement === "BUYER") {
    return "Người mua";
  }
  if (involvement === "SELLER") {
    return "Người bán";
  }
  if (involvement === "INTERMEDIARY") {
    return "Trung gian";
  }
  if (involvement === "AUTHORIZED_REPRESENTATIVE") {
    return "Đại diện uỷ quyền";
  }
  if (involvement === "DIRECT_OBSERVER") {
    return "Người quan sát / phát hiện";
  }
  return involvement ?? "Chưa cung cấp";
};

type InitialRiskReportDecision = "REJECTED" | "PUBLISHED";

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1">
    <p className="font-medium text-muted-foreground text-xs">{label}</p>
    <p className="font-medium text-foreground text-sm break-words">{value}</p>
  </div>
);

const RiskDerivativeUploader = ({
  evidence,
  reportId,
}: {
  evidence: RiskReportDetail["evidence"][number];
  reportId: string;
}) => {
  const [metadataRemoved, setMetadataRemoved] = useState(false);
  const [unrelatedPiiRedacted, setUnrelatedPiiRedacted] = useState(false);
  const [watermarkApplied, setWatermarkApplied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const upload = useUploadFile({
    api: `${serverURL}/api/risk-report-derivative-upload`,
    credentials: "include",
    headers: { [AUTH_SURFACE_HEADER]: AUTH_SURFACE.ADMIN },
    onError: () => setErrorMessage("Không thể tải derivative lên."),
    route: RISK_REPORT_DERIVATIVE_UPLOAD_ROUTE,
  });
  const register = useRegisterRiskReportDerivative();

  const handleFilesSelected = async (files: File[]) => {
    const [file] = files;
    if (!file) {
      return;
    }
    if (!metadataRemoved || !unrelatedPiiRedacted || !watermarkApplied) {
      setErrorMessage(
        "Phải xác nhận đủ ba bước kiểm tra derivative trước khi tải."
      );
      return;
    }
    setErrorMessage(undefined);
    try {
      const result = await upload.uploadAsync(file, {
        metadata: { evidenceId: evidence.id, reportId },
      });
      await register.mutateAsync({
        contentType: file.type,
        evidenceId: evidence.id,
        metadataRemoved,
        reportId,
        sizeBytes: file.size,
        storageKey: result.file.objectInfo.key,
        unrelatedPiiRedacted,
        watermarkApplied,
      });
      toast.success("Đã lưu derivative công khai riêng biệt.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể lưu derivative."
      );
    }
  };

  if (evidence.derivative) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-medium">Derivative đã đăng ký</p>
        <p className="mt-1 text-muted-foreground break-all">
          {evidence.derivative.contentType} · {evidence.derivative.sizeBytes}{" "}
          bytes
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Metadata removed · unrelated PII redacted · Avin watermark applied
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <p className="font-medium text-sm">Tải lên bản derivative đã che PII</p>
      <p className="text-muted-foreground text-xs">
        Dùng khi cần tải bản ảnh/tài liệu đã được biên tập và che riêng biệt.
      </p>
      <label className="flex items-start gap-2 text-xs">
        <input
          checked={metadataRemoved}
          onChange={(event) => setMetadataRemoved(event.target.checked)}
          type="checkbox"
        />
        <span>Đã xoá metadata nhạy cảm khỏi bản derivative.</span>
      </label>
      <label className="flex items-start gap-2 text-xs">
        <input
          checked={unrelatedPiiRedacted}
          onChange={(event) => setUnrelatedPiiRedacted(event.target.checked)}
          type="checkbox"
        />
        <span>
          Đã che PII không liên quan và nội dung ngoài phạm vi warning.
        </span>
      </label>
      <label className="flex items-start gap-2 text-xs">
        <input
          checked={watermarkApplied}
          onChange={(event) => setWatermarkApplied(event.target.checked)}
          type="checkbox"
        />
        <span>Đã đóng watermark Avin Check lên derivative.</span>
      </label>
      <FileDropzone
        accept={ACCEPTED_CONTENT_TYPES}
        disabled={upload.isPending || register.isPending}
        helperText={`File đã redaction · tối đa ${RISK_REPORT_EVIDENCE_MAX_BYTES / 1024 / 1024} MB`}
        inputLabel="Chọn derivative"
        isUploading={upload.isPending || register.isPending}
        label="Upload derivative"
        maxFiles={1}
        maxSize={RISK_REPORT_EVIDENCE_MAX_BYTES}
        multiple={false}
        onFilesSelected={(files) => void handleFilesSelected(files)}
        progress={upload.progress}
        uploadingLabel="Đang upload derivative…"
      />
      {errorMessage ? (
        <p className="text-destructive text-xs" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
};

const EvidenceCard = ({
  evidence,
  reportId,
}: {
  evidence: RiskReportDetail["evidence"][number];
  reportId: string;
}) => {
  const [showDerivativeUploader, setShowDerivativeUploader] = useState(false);
  const [urlError, setUrlError] = useState<string>();
  const [loadingUrl, setLoadingUrl] = useState(false);

  const isImage =
    evidence.contentType.startsWith("image/") ||
    /\.(?:png|jpe?g|webp|gif)$/iu.test(evidence.fileName);
  const isVideo =
    evidence.contentType.startsWith("video/") ||
    /\.(?:mp4|webm)$/iu.test(evidence.fileName);

  const handleOpenOriginal = async () => {
    setLoadingUrl(true);
    setUrlError(undefined);
    try {
      const result =
        await client.protection.adminRiskReports.getOriginalEvidenceUrl({
          evidenceId: evidence.id,
          id: reportId,
        });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setUrlError(
        error instanceof Error ? error.message : "Không thể mở bản gốc"
      );
    } finally {
      setLoadingUrl(false);
    }
  };

  const previewSource = evidence.publicUrl;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="font-semibold text-base">
              {evidence.fileName}
            </CardTitle>
            <CardDescription className="text-xs">
              {evidence.kind} · {evidence.contentType} ·{" "}
              {(evidence.sizeBytes / 1024).toFixed(1)} KB · Quét an toàn:{" "}
              <span
                className={
                  evidence.scanStatus === "CLEAN"
                    ? "font-medium text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600"
                }
              >
                {evidence.scanStatus}
              </span>
            </CardDescription>
          </div>
          <Button
            disabled={loadingUrl}
            onClick={() => void handleOpenOriginal()}
            size="sm"
            type="button"
            variant="outline"
          >
            <DownloadSimpleIcon />
            {loadingUrl ? "Đang tạo link..." : "Mở file gốc"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {evidence.explanation ? (
          <p className="rounded-lg border bg-muted/20 p-3 text-sm">
            <span className="font-medium">Reporter giải thích: </span>
            {evidence.explanation}
          </p>
        ) : null}

        {isImage && previewSource ? (
          <div className="flex max-h-96 items-center justify-center overflow-hidden rounded-xl border bg-muted/10 p-2">
            <img
              alt={evidence.fileName}
              className="max-h-80 w-auto rounded-lg object-contain"
              src={previewSource}
            />
          </div>
        ) : null}

        {isVideo && previewSource ? (
          <div className="rounded-xl border bg-muted/10 p-2">
            <video
              className="max-h-80 w-full rounded-lg"
              controls
              src={previewSource}
            >
              <track kind="captions" />
            </video>
          </div>
        ) : null}

        {urlError ? (
          <p className="text-destructive text-xs">{urlError}</p>
        ) : null}

        <div className="border-t pt-3">
          <Button
            className="h-auto p-0 text-muted-foreground text-xs hover:text-foreground"
            onClick={() => setShowDerivativeUploader(!showDerivativeUploader)}
            type="button"
            variant="link"
          >
            {showDerivativeUploader
              ? "Ẩn công cụ tạo derivative che PII"
              : "Tuỳ chọn: Đăng ký bản derivative che PII thủ công..."}
          </Button>
          {showDerivativeUploader ? (
            <div className="mt-3">
              <RiskDerivativeUploader evidence={evidence} reportId={reportId} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

const riskDecisionRequiresReason = (
  decision: InitialRiskReportDecision
): boolean => decision === "REJECTED";

const RiskReportDecisionActions = ({
  onChoose,
  report,
}: {
  onChoose: (decision: InitialRiskReportDecision) => void;
  report: RiskReportDetail;
}) => {
  const canReview =
    report.status === "SUBMITTED" || report.status === "UNDER_REVIEW";

  return (
    <>
      {canReview ? (
        <Button onClick={() => onChoose("REJECTED")} variant="destructive">
          Từ chối report
        </Button>
      ) : null}
      {canReview ? (
        <Button onClick={() => onChoose("PUBLISHED")}>
          <ShieldCheckIcon />
          Duyệt & công khai warning
        </Button>
      ) : null}
    </>
  );
};

const RiskReportDecisionConfirmation = ({
  decision,
  isPending,
  onCancel,
  onConfirm,
  onReasonChange,
  reason,
}: {
  decision?: InitialRiskReportDecision;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onReasonChange: (value: string) => void;
  reason: string;
}) => {
  if (!decision) {
    return null;
  }

  const requiresReason = riskDecisionRequiresReason(decision);
  const isValid = !requiresReason || Boolean(reason.trim());

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <p className="font-medium text-sm">Xác nhận: {STATUS_LABELS[decision]}</p>
      {requiresReason ? (
        <div className="grid gap-2">
          <Label htmlFor="risk-review-reason">Lý do (bắt buộc)</Label>
          <Textarea
            id="risk-review-reason"
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            value={reason}
          />
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline">
          Huỷ
        </Button>
        <Button disabled={isPending || !isValid} onClick={onConfirm}>
          {isPending ? "Đang ghi…" : "Xác nhận"}
        </Button>
      </div>
    </div>
  );
};

const DecisionPanel = ({ report }: { report: RiskReportDetail }) => {
  const [decision, setDecision] = useState<InitialRiskReportDecision>();
  const [reason, setReason] = useState("");
  const decide = useDecideAdminRiskReport();

  const confirm = async () => {
    if (!decision || (riskDecisionRequiresReason(decision) && !reason.trim())) {
      return;
    }
    try {
      await decide.mutateAsync({
        decision,
        id: report.id,
        reason: reason.trim() || undefined,
      });
      toast.success("Đã duyệt và công khai cảnh báo thành công!");
      setDecision(undefined);
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể ghi quyết định."
      );
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle>Quyết định moderation</CardTitle>
        <CardDescription>
          Phê duyệt để công khai cảnh báo lên hệ thống Avin Check hoặc từ chối
          đơn vi phạm.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <RiskReportDecisionActions onChoose={setDecision} report={report} />
        <RiskReportDecisionConfirmation
          decision={decision}
          isPending={decide.isPending}
          onCancel={() => setDecision(undefined)}
          onConfirm={() => void confirm()}
          onReasonChange={setReason}
          reason={reason}
        />
      </CardContent>
    </Card>
  );
};

export const RiskReportDetailPage = () => {
  const { reportId } = useParams({
    from: "/_authenticated/avin-check/risk-reports/$reportId",
  });
  const { data: report, isPending, isError } = useAdminRiskReport(reportId);

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <Button
          className="w-fit"
          render={<Link to="/avin-check/risk-reports" />}
          variant="ghost"
        >
          <ArrowLeftIcon />
          Quay lại hàng đợi
        </Button>
        {isPending ? <p>Đang tải report…</p> : null}
        {isError || !report ? (
          <Alert role="alert">
            <AlertTitle>Không thể tải risk report</AlertTitle>
            <AlertDescription>
              Kiểm tra capability hoặc thử lại sau.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <p className="font-medium text-primary text-sm">
                AVIN CHECK · RISK REPORT
              </p>
              <h1 className="mt-1 font-semibold text-3xl tracking-tight">
                {report.id}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                {TYPE_LABELS[report.type]} · Trạng thái:{" "}
                <span className="font-semibold text-foreground">
                  {STATUS_LABELS[report.status] ?? report.status}
                </span>
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="grid gap-6">
                {/* 1. Thông tin đối tượng bị tố cáo */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-semibold text-base">
                      Thông tin đối tượng bị tố cáo
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Các tài khoản ngân hàng, kênh MXH, số điện thoại của đối
                      tượng
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {report.identifiers.map((identifier) => {
                      const isBank = identifier.type === "BANK_ACCOUNT";
                      return (
                        <div
                          className="space-y-1.5 rounded-xl border bg-muted/20 p-3.5 text-sm"
                          key={identifier.id}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[11px] text-primary uppercase tracking-wider">
                              {getIdentifierTypeLabel(identifier.type)}
                            </span>
                            {identifier.isPrimary ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-[10px] text-primary">
                                Chính (Primary)
                              </span>
                            ) : null}
                          </div>
                          {isBank && identifier.institutionName ? (
                            <p className="font-medium text-foreground">
                              Ngân hàng:{" "}
                              <span className="font-bold">
                                {identifier.institutionName}
                              </span>
                            </p>
                          ) : null}
                          {isBank && identifier.holderName ? (
                            <p className="text-muted-foreground text-xs">
                              Chủ TK:{" "}
                              <span className="font-semibold text-foreground uppercase">
                                {identifier.holderName}
                              </span>
                            </p>
                          ) : null}
                          <p className="font-mono font-semibold text-primary text-sm break-all">
                            {identifier.value}
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* 2. Chi tiết sự việc & Thiệt hại */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-semibold text-base">
                      Chi tiết sự việc & Thiệt hại
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <DetailField
                      label="Số tiền thiệt hại"
                      value={
                        report.claimedLoss
                          ? `${numberFormatter.format(report.claimedLoss)} VNĐ`
                          : "Không có thiệt hại tiền mặt"
                      }
                    />
                    <DetailField
                      label="Ngày xảy ra sự việc"
                      value={
                        report.incidentAt
                          ? new Date(report.incidentAt).toLocaleDateString(
                              "vi-VN"
                            )
                          : "Không rõ ngày"
                      }
                    />
                    <DetailField
                      label="Trạng thái lừa đảo"
                      value={report.ongoing ? "Đang tiếp diễn" : "Đã kết thúc"}
                    />
                    {report.platform ? (
                      <DetailField
                        label="Nền tảng tài khoản"
                        value={report.platform}
                      />
                    ) : null}
                    {report.violationType ? (
                      <DetailField
                        label="Hình thức vi phạm"
                        value={
                          WEBSITE_VIOLATION_LABELS[report.violationType] ??
                          report.violationType
                        }
                      />
                    ) : null}
                    <DetailField
                      label="Mức độ khẩn cấp"
                      value={URGENCY_LABELS[report.urgency] ?? report.urgency}
                    />
                  </CardContent>
                </Card>

                {/* 3. Nội dung tố cáo */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-semibold text-base">
                      Nội dung tố cáo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm leading-relaxed">
                    <div className="space-y-1.5 rounded-xl border bg-muted/20 p-4">
                      <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                        Nội dung gốc (Do nạn nhân gửi)
                      </p>
                      <p className="whitespace-pre-line text-foreground">
                        {report.narrative}
                      </p>
                    </div>
                    {report.publicNarrative ? (
                      <div className="space-y-1.5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <p className="font-semibold text-primary text-xs uppercase tracking-wider">
                          Bản công khai (Đã tự động ẩn thông tin nhạy cảm PII)
                        </p>
                        <p className="whitespace-pre-line text-foreground">
                          {report.publicNarrative}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* 4. Thông tin người tố cáo */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="font-semibold text-base">
                      Thông tin người tố cáo
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Chỉ hiển thị cho Quản trị viên (được kiểm toán bảo mật)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <DetailField
                      label="Họ và tên"
                      value={report.reporterName ?? "Ẩn danh"}
                    />
                    <DetailField label="Email" value={report.reporterEmail} />
                    {report.reporterPhone ? (
                      <DetailField
                        label="Số điện thoại"
                        value={report.reporterPhone}
                      />
                    ) : null}
                    {report.reporterZalo ? (
                      <DetailField label="Zalo" value={report.reporterZalo} />
                    ) : null}
                    <DetailField
                      label="Vai trò người tố cáo"
                      value={getReporterInvolvementLabel(
                        report.reporterInvolvement
                      )}
                    />
                  </CardContent>
                </Card>

                {/* 5. Bằng chứng đính kèm */}
                <section
                  aria-labelledby="risk-evidence-heading"
                  className="grid gap-4"
                >
                  <h2
                    className="font-semibold text-xl"
                    id="risk-evidence-heading"
                  >
                    Bằng chứng đính kèm ({report.evidence.length})
                  </h2>
                  {report.evidence.map((evidence) => (
                    <EvidenceCard
                      evidence={evidence}
                      key={evidence.id}
                      reportId={report.id}
                    />
                  ))}
                  {report.evidence.length === 0 ? (
                    <p className="rounded-xl border p-4 text-muted-foreground text-sm">
                      Chưa có bằng chứng nào được tải lên.
                    </p>
                  ) : null}
                </section>

                <ProviderRiskIncidentPanel reportId={report.id} />
              </div>

              {/* Right column: Quyết định & Lịch sử */}
              <div className="grid content-start gap-6">
                <DecisionPanel report={report} />
                <Card>
                  <CardHeader>
                    <CardTitle>Lịch sử trạng thái</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {report.history.map((item) => (
                      <div
                        className="border-b pb-3 text-sm last:border-0"
                        key={item.id}
                      >
                        <p className="font-medium">
                          {STATUS_LABELS[item.status] ?? item.status}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(item.createdAt).toLocaleString("vi-VN")}
                        </p>
                        {item.reason ? (
                          <p className="mt-1 text-muted-foreground text-xs">
                            Lý do: {item.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    {report.history.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Chưa có lịch sử trạng thái.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </Main>
    </>
  );
};
