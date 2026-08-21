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
import { ThemeSwitch } from "@/components/theme-switch";
import { client } from "@/lib/orpc";
import { serverURL } from "@/lib/server-url";

import {
  useAdminRiskReport,
  useDecideAdminRiskReport,
  useRegisterRiskReportDerivative,
} from "../api/risk-reports-api";
import type {
  RiskReportDetail,
  RiskReportDecision,
} from "../api/risk-reports-api";
import { ProviderRiskIncidentPanel } from "../components/provider-risk-incident-panel";

const ACCEPTED_CONTENT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
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
  BANK_WALLET_PHONE: "Bank / ví / phone",
  MALICIOUS_WEBSITE: "Website",
  SOCIAL_GAME_ACCOUNT: "Social / game",
} as const;

const WEBSITE_VIOLATION_LABELS = {
  FAKE_STORE: "Cửa hàng giả",
  IMPERSONATION: "Mạo danh",
  MALWARE: "Mã độc",
  OTHER: "Khác",
  PAYMENT_SCAM: "Lừa đảo thanh toán",
  PHISHING: "Lừa đảo lấy thông tin",
} as const;

const URGENCY_LABELS = {
  NORMAL: "Thông thường",
  URGENT: "Khẩn cấp",
} as const;

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1.5">
    <p className="font-medium text-sm">{label}</p>
    <p className="text-muted-foreground text-sm break-words">{value}</p>
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
        <p className="mt-1 text-muted-foreground">
          Metadata removed · unrelated PII redacted · Avin watermark applied
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <p className="font-medium text-sm">Tạo derivative publishable</p>
      <p className="text-muted-foreground text-xs">
        Upload phải là file đã xử lý độc lập; bản gốc không được dùng làm public
        artifact.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={metadataRemoved}
          onChange={(event) => setMetadataRemoved(event.target.checked)}
          type="checkbox"
        />
        <span>Đã xoá metadata nhạy cảm khỏi bản derivative.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          checked={unrelatedPiiRedacted}
          onChange={(event) => setUnrelatedPiiRedacted(event.target.checked)}
          type="checkbox"
        />
        <span>
          Đã che PII không liên quan và nội dung ngoài phạm vi warning.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
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
        <p className="text-destructive text-sm" role="alert">
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
  const [urlError, setUrlError] = useState<string>();
  const [loadingUrl, setLoadingUrl] = useState(false);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{evidence.fileName}</CardTitle>
        <CardDescription>
          {evidence.kind} · {evidence.contentType} · {evidence.sizeBytes} bytes
          · scan {evidence.scanStatus}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs">
          <p className="text-muted-foreground break-all">
            Original private key: {evidence.originalStorageKey}
          </p>
          <Button
            className="w-fit"
            disabled={loadingUrl}
            onClick={() => void handleOpenOriginal()}
            size="sm"
            type="button"
            variant="outline"
          >
            <DownloadSimpleIcon />
            {loadingUrl ? "Đang tạo link…" : "Mở bản gốc signed URL"}
          </Button>
          {urlError ? <p className="text-destructive">{urlError}</p> : null}
        </div>
        <RiskDerivativeUploader evidence={evidence} reportId={reportId} />
      </CardContent>
    </Card>
  );
};

const riskDecisionRequiresReason = (decision: RiskReportDecision): boolean =>
  decision === "CHANGES_REQUESTED" ||
  decision === "REJECTED" ||
  decision === "REMOVED" ||
  decision === "UNDER_VERIFICATION";

const riskDecisionRequiresPublicSummary = (
  decision: RiskReportDecision
): boolean =>
  decision === "PUBLISHED" ||
  decision === "CORRECTED" ||
  decision === "UNDER_VERIFICATION";

const RiskReportDecisionActions = ({
  onChoose,
  onChooseUnderVerification,
  report,
}: {
  onChoose: (decision: RiskReportDecision) => void;
  onChooseUnderVerification: () => void;
  report: RiskReportDetail;
}) => {
  const canReview = report.status === "UNDER_REVIEW";
  const canTakeReview = report.status === "SUBMITTED";
  const canPublish =
    report.status === "UNDER_REVIEW" || report.status === "UNDER_VERIFICATION";
  const canCorrect =
    report.status === "PUBLISHED" || report.status === "UNDER_VERIFICATION";
  const canRemove =
    report.status === "PUBLISHED" ||
    report.status === "CORRECTED" ||
    report.status === "UNDER_VERIFICATION";
  const canUnderVerify =
    canReview &&
    (report.urgency === "URGENT" || report.affectedVictimCount >= 2);

  return (
    <>
      {canTakeReview ? (
        <Button onClick={() => onChoose("UNDER_REVIEW")} variant="outline">
          Nhận vào review
        </Button>
      ) : null}
      {canReview ? (
        <>
          {canUnderVerify ? (
            <Button onClick={onChooseUnderVerification} variant="outline">
              Công khai under-verification
            </Button>
          ) : null}
          <Button
            onClick={() => onChoose("CHANGES_REQUESTED")}
            variant="outline"
          >
            Yêu cầu bổ sung
          </Button>
          <Button onClick={() => onChoose("REJECTED")} variant="destructive">
            Từ chối report
          </Button>
        </>
      ) : null}
      {canPublish ? (
        <Button onClick={() => onChoose("PUBLISHED")}>
          <ShieldCheckIcon />
          Duyệt & công khai warning
        </Button>
      ) : null}
      {canCorrect ? (
        <Button onClick={() => onChoose("CORRECTED")}>
          <ShieldCheckIcon />
          Ghi nhận bản cập nhật công khai
        </Button>
      ) : null}
      {canRemove ? (
        <Button onClick={() => onChoose("REMOVED")} variant="destructive">
          Gỡ warning công khai
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
  onPublicSummaryChange,
  onReasonChange,
  onUnderVerificationApprovedChange,
  publicSummary,
  reason,
  underVerificationApproved,
}: {
  decision?: RiskReportDecision;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onPublicSummaryChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onUnderVerificationApprovedChange: (value: boolean) => void;
  publicSummary: string;
  reason: string;
  underVerificationApproved: boolean;
}) => {
  if (!decision) {
    return null;
  }

  const requiresReason = riskDecisionRequiresReason(decision);
  const requiresPublicSummary = riskDecisionRequiresPublicSummary(decision);
  const isValid =
    (!requiresReason || Boolean(reason.trim())) &&
    (!requiresPublicSummary || publicSummary.trim().length >= 20) &&
    (decision !== "UNDER_VERIFICATION" || underVerificationApproved);

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <p className="font-medium text-sm">Xác nhận: {STATUS_LABELS[decision]}</p>
      {requiresPublicSummary ? (
        <div className="grid gap-2">
          <Label htmlFor="risk-public-summary">
            Tóm tắt public đã redaction
          </Label>
          <Textarea
            id="risk-public-summary"
            minLength={20}
            onChange={(event) => onPublicSummaryChange(event.target.value)}
            placeholder="Chỉ nêu nội dung đã kiểm chứng và an toàn để công khai..."
            rows={5}
            value={publicSummary}
          />
        </div>
      ) : null}
      {decision === "UNDER_VERIFICATION" ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            checked={underVerificationApproved}
            onChange={(event) =>
              onUnderVerificationApprovedChange(event.target.checked)
            }
            type="checkbox"
          />
          <span>
            Tôi xác nhận report đủ điều kiện policy: khẩn cấp hoặc có từ hai nạn
            nhân trở lên, và chấp thuận công khai ở trạng thái
            under-verification.
          </span>
        </label>
      ) : null}
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
  const [decision, setDecision] = useState<RiskReportDecision>();
  const [reason, setReason] = useState("");
  const [underVerificationApproved, setUnderVerificationApproved] =
    useState(false);
  const [publicSummary, setPublicSummary] = useState(
    report.publicSummary ?? ""
  );
  const decide = useDecideAdminRiskReport();

  const confirm = async () => {
    if (!decision || (riskDecisionRequiresReason(decision) && !reason.trim())) {
      return;
    }
    try {
      await decide.mutateAsync({
        decision,
        id: report.id,
        publicSummary: publicSummary.trim() || undefined,
        reason: reason.trim() || undefined,
        underVerificationApproved:
          decision === "UNDER_VERIFICATION"
            ? underVerificationApproved
            : undefined,
      });
      toast.success("Đã ghi quyết định Risk Moderator.");
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
          Publication chỉ thành công khi launch gates, evidence requirements và
          toàn bộ derivative gates đều đạt.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <RiskReportDecisionActions
          onChoose={setDecision}
          onChooseUnderVerification={() => {
            setUnderVerificationApproved(false);
            setDecision("UNDER_VERIFICATION");
          }}
          report={report}
        />
        <RiskReportDecisionConfirmation
          decision={decision}
          isPending={decide.isPending}
          onCancel={() => setDecision(undefined)}
          onConfirm={() => void confirm()}
          onPublicSummaryChange={setPublicSummary}
          onReasonChange={setReason}
          onUnderVerificationApprovedChange={setUnderVerificationApproved}
          publicSummary={publicSummary}
          reason={reason}
          underVerificationApproved={underVerificationApproved}
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
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <Button
          render={<Link to="/avin-check/risk-reports" />}
          className="w-fit"
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
              <p className="mt-2 text-muted-foreground">
                {TYPE_LABELS[report.type]} · {STATUS_LABELS[report.status]}
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reporter private</CardTitle>
                    <CardDescription>
                      Chỉ hiển thị trong surface Admin đã xác thực và được
                      audit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-5 sm:grid-cols-2">
                    <DetailField label="Email" value={report.reporterEmail} />
                    <DetailField
                      label="Tên"
                      value={report.reporterName ?? "Ẩn danh"}
                    />
                    <DetailField
                      label="Điện thoại"
                      value={report.reporterPhone ?? "Không cung cấp"}
                    />
                    <DetailField
                      label="Zalo"
                      value={report.reporterZalo ?? "Không cung cấp"}
                    />
                    <DetailField
                      label="Tổn thất khai báo"
                      value={`${report.claimedLoss ?? 0} VND`}
                    />
                    <DetailField
                      label="Nền tảng"
                      value={report.platform ?? "Không áp dụng"}
                    />
                    <DetailField
                      label="Loại vi phạm website"
                      value={
                        report.violationType
                          ? WEBSITE_VIOLATION_LABELS[report.violationType]
                          : "Không áp dụng"
                      }
                    />
                    <DetailField
                      label="Mức độ khẩn cấp"
                      value={URGENCY_LABELS[report.urgency]}
                    />
                    <DetailField
                      label="Số nạn nhân bị ảnh hưởng"
                      value={String(report.affectedVictimCount)}
                    />
                    <DetailField
                      label="Narrative"
                      value={report.narrative ?? "Chưa cung cấp"}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Risk identifiers private</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {report.identifiers.map((identifier) => (
                      <DetailField
                        key={identifier.id}
                        label={`${identifier.type}${identifier.isPrimary ? " · primary" : ""}`}
                        value={identifier.value}
                      />
                    ))}
                  </CardContent>
                </Card>
                <section
                  aria-labelledby="risk-evidence-heading"
                  className="grid gap-4"
                >
                  <h2
                    className="font-semibold text-xl"
                    id="risk-evidence-heading"
                  >
                    Evidence & public derivatives
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
                      Chưa có evidence.
                    </p>
                  ) : null}
                </section>
                <ProviderRiskIncidentPanel reportId={report.id} />
              </div>
              <div className="grid content-start gap-6">
                <DecisionPanel report={report} />
                <Card>
                  <CardHeader>
                    <CardTitle>History append-only</CardTitle>
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
                          <p className="mt-1 text-muted-foreground">
                            {item.reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
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
