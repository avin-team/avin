import {
  RISK_REPORT_EVIDENCE_CONTENT_TYPES,
  RISK_REPORT_EVIDENCE_MAX_BYTES,
  RISK_REPORT_EVIDENCE_MAX_COUNT,
  RISK_REPORT_EVIDENCE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { FileDropzone } from "@avin/ui/components/file-dropzone";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useUploadFiles } from "@better-upload/client";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";
import { serverURL } from "@/utils/server-url";

const ACCEPTED_CONTENT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

const identifierTypes = [
  { label: "Số tài khoản ngân hàng", value: "BANK_ACCOUNT" },
  { label: "Tài khoản ví điện tử", value: "WALLET_ACCOUNT" },
  { label: "Số điện thoại", value: "PHONE" },
] as const;

type Step = "code" | "details" | "email" | "submitted";

const getRiskDraftSaveLabel = (
  isPending: boolean,
  reportId: string | undefined
): string => {
  if (isPending) {
    return "Đang lưu…";
  }
  if (reportId) {
    return "Cập nhật bản nháp";
  }
  return "Lưu bản nháp riêng tư";
};

export const RiskReportPage = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const reporterToken = useRef("");
  const [reportId, setReportId] = useState<string>();
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterZalo, setReporterZalo] = useState("");
  const [identifierType, setIdentifierType] =
    useState<(typeof identifierTypes)[number]["value"]>("BANK_ACCOUNT");
  const [identifierValue, setIdentifierValue] = useState("");
  const [claimedLoss, setClaimedLoss] = useState("");
  const [narrative, setNarrative] = useState("");
  const [evidenceKind, setEvidenceKind] = useState<
    "PAYMENT_PROOF" | "CONVERSATION"
  >("PAYMENT_PROOF");
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>();

  const launchStatusQuery = useQuery(
    orpc.protection.launchStatus.queryOptions()
  );
  const requestCode = useMutation(
    orpc.protection.riskReport.requestEmailCode.mutationOptions()
  );
  const verifyCode = useMutation(
    orpc.protection.riskReport.verifyEmailCode.mutationOptions()
  );
  const saveDraft = useMutation(
    orpc.protection.riskReport.saveDraft.mutationOptions()
  );
  const addEvidence = useMutation(
    orpc.protection.riskReport.addEvidence.mutationOptions()
  );
  const submitReport = useMutation(
    orpc.protection.riskReport.submit.mutationOptions()
  );
  const upload = useUploadFiles({
    api: `${serverURL}/api/risk-report-evidence-upload`,
    credentials: "include",
    onError: () => setErrorMessage("Không thể tải bằng chứng lên."),
    route: RISK_REPORT_EVIDENCE_UPLOAD_ROUTE,
    uploadBatchSize: RISK_REPORT_EVIDENCE_MAX_COUNT,
  });

  const handleRequestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    try {
      await requestCode.mutateAsync({ email: email.trim() });
      setStep("code");
    } catch {
      setErrorMessage(
        "Không thể gửi mã lúc này. Vui lòng thử lại sau một phút."
      );
    }
  };

  const handleVerifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    try {
      const result = await verifyCode.mutateAsync({
        code: code.trim(),
        email: email.trim(),
      });
      reporterToken.current = result.reporterToken;
      setStep("details");
    } catch {
      setErrorMessage(
        "Mã không đúng hoặc đã hết hạn. Vui lòng yêu cầu mã mới."
      );
    }
  };

  const handleSaveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reporterToken.current) {
      return;
    }
    setErrorMessage(undefined);
    try {
      const draft = await saveDraft.mutateAsync({
        claimedLoss: claimedLoss ? Number(claimedLoss) : undefined,
        identifiers: identifierValue.trim()
          ? [{ type: identifierType, value: identifierValue.trim() }]
          : [],
        narrative: narrative.trim() || undefined,
        ...(reportId ? { reportId } : {}),
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        reporterToken: reporterToken.current,
        reporterZalo: reporterZalo.trim() || undefined,
        type: "BANK_WALLET_PHONE" as const,
      });
      setReportId(draft.id);
      setEvidenceCount(draft.evidence.length);
    } catch {
      setErrorMessage(
        "Không thể lưu bản nháp. Kiểm tra lại thông tin và thử lại."
      );
    }
  };

  const handleFilesSelected = async (files: File[]): Promise<void> => {
    if (!reportId || !reporterToken.current) {
      setErrorMessage("Hãy lưu bản nháp trước khi tải bằng chứng.");
      return;
    }
    const availableSlots = RISK_REPORT_EVIDENCE_MAX_COUNT - evidenceCount;
    if (availableSlots <= 0) {
      setErrorMessage(
        `Mỗi báo cáo tối đa ${RISK_REPORT_EVIDENCE_MAX_COUNT} tệp bằng chứng.`
      );
      return;
    }

    setErrorMessage(undefined);
    try {
      const result = await upload.uploadAsync(files.slice(0, availableSlots), {
        metadata: {
          kind: evidenceKind,
          reportId,
          reporterToken: reporterToken.current,
        },
      });
      let registeredCount = 0;
      for (const uploadedFile of result.files) {
        if (
          !RISK_REPORT_EVIDENCE_CONTENT_TYPES.includes(
            uploadedFile.raw
              .type as (typeof RISK_REPORT_EVIDENCE_CONTENT_TYPES)[number]
          )
        ) {
          continue;
        }
        await addEvidence.mutateAsync({
          contentType: uploadedFile.raw.type,
          fileName: uploadedFile.raw.name,
          kind: evidenceKind,
          originalStorageKey: uploadedFile.objectInfo.key,
          reportId,
          reporterToken: reporterToken.current,
          sizeBytes: uploadedFile.raw.size,
        });
        registeredCount += 1;
      }
      setEvidenceCount((count) => count + registeredCount);
      if (result.failedFiles.length > 0) {
        setErrorMessage("Một số tệp chưa tải lên được. Hãy thử lại.");
      }
    } catch {
      setErrorMessage("Không thể đăng ký bằng chứng. Vui lòng thử lại.");
    }
  };

  const handleSubmit = async () => {
    if (!reportId || !reporterToken.current) {
      return;
    }
    setErrorMessage(undefined);
    try {
      await submitReport.mutateAsync({
        reportId,
        reporterToken: reporterToken.current,
      });
      setStep("submitted");
    } catch {
      setErrorMessage(
        "Báo cáo chưa đủ điều kiện gửi. Cần số định danh, tổn thất, tường trình, bằng chứng thanh toán và hội thoại đã được kiểm tra."
      );
    }
  };

  const publicationEnabled =
    launchStatusQuery.data?.riskReportPublication.enabled ?? false;
  const saveDraftLabel = getRiskDraftSaveLabel(saveDraft.isPending, reportId);

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="risk-report-heading"
        className="rounded-[2rem] border border-primary/20 bg-linear-to-br from-primary/10 via-card to-card px-6 py-10 shadow-sm sm:px-10"
      >
        <Badge className="mb-4 gap-1.5" variant="outline">
          <ShieldCheckIcon aria-hidden="true" />
          Avin Check · Risk report
        </Badge>
        <h1
          className="font-black text-4xl tracking-tight sm:text-5xl"
          id="risk-report-heading"
        >
          Gửi cảnh báo rủi ro không cần tạo tài khoản.
        </h1>
        <p className="mt-4 max-w-3xl text-muted-foreground leading-7">
          Xác minh email một lần, lưu bằng chứng riêng tư và gửi cho Risk
          Moderator. Chỉ bản tóm tắt và derivative đã che dữ liệu mới có thể
          xuất hiện công khai.
        </p>
      </section>

      {errorMessage ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Chưa thể tiếp tục</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {step === "email" ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Xác minh email</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid max-w-xl gap-4" onSubmit={handleRequestCode}>
              <p className="text-muted-foreground text-sm">
                Email chỉ dùng để liên hệ riêng tư về báo cáo; không hiển thị
                trong warning công khai.
              </p>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-report-email"
              >
                Email liên hệ
                <Input
                  autoComplete="email"
                  id="risk-report-email"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <Button disabled={requestCode.isPending} type="submit">
                {requestCode.isPending ? "Đang gửi mã…" : "Gửi mã OTP"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === "code" ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Nhập mã OTP</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid max-w-xl gap-4" onSubmit={handleVerifyCode}>
              <p className="text-muted-foreground text-sm">
                Mã sáu số đã được gửi tới{" "}
                <span className="font-medium">{email}</span>.
              </p>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-report-code"
              >
                Mã xác minh
                <Input
                  autoComplete="one-time-code"
                  id="risk-report-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setCode(event.target.value)}
                  pattern="[0-9]{6}"
                  required
                  value={code}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <Button disabled={verifyCode.isPending} type="submit">
                  {verifyCode.isPending ? "Đang kiểm tra…" : "Xác minh email"}
                </Button>
                <Button
                  onClick={() => setStep("email")}
                  type="button"
                  variant="ghost"
                >
                  Đổi email
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === "details" ? (
        <form className="grid gap-6" onSubmit={handleSaveDraft}>
          <Card>
            <CardHeader>
              <CardTitle>3. Thông tin riêng tư của người báo cáo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-reporter-name"
              >
                Tên liên hệ (tuỳ chọn)
                <Input
                  autoComplete="name"
                  id="risk-reporter-name"
                  onChange={(event) => setReporterName(event.target.value)}
                  value={reporterName}
                />
              </label>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-reporter-phone"
              >
                Số điện thoại riêng tư (tuỳ chọn)
                <Input
                  autoComplete="tel"
                  id="risk-reporter-phone"
                  onChange={(event) => setReporterPhone(event.target.value)}
                  value={reporterPhone}
                />
              </label>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-reporter-zalo"
              >
                Zalo riêng tư (tuỳ chọn)
                <Input
                  autoComplete="off"
                  id="risk-reporter-zalo"
                  onChange={(event) => setReporterZalo(event.target.value)}
                  value={reporterZalo}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin sự việc</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-identifier-type"
                >
                  Loại định danh
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    id="risk-identifier-type"
                    onChange={(event) =>
                      setIdentifierType(
                        event.target
                          .value as (typeof identifierTypes)[number]["value"]
                      )
                    }
                    value={identifierType}
                  >
                    {identifierTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-identifier-value"
                >
                  Định danh liên quan
                  <Input
                    autoComplete="off"
                    id="risk-identifier-value"
                    onChange={(event) => setIdentifierValue(event.target.value)}
                    required
                    value={identifierValue}
                  />
                </label>
              </div>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-claimed-loss"
              >
                Số tiền tổn thất dự kiến (VND)
                <Input
                  id="risk-claimed-loss"
                  inputMode="numeric"
                  min={1}
                  onChange={(event) => setClaimedLoss(event.target.value)}
                  required
                  type="number"
                  value={claimedLoss}
                />
              </label>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-narrative"
              >
                Tường trình sự việc
                <Textarea
                  id="risk-narrative"
                  maxLength={10_000}
                  minLength={20}
                  onChange={(event) => setNarrative(event.target.value)}
                  required
                  rows={7}
                  value={narrative}
                />
              </label>
              <Button disabled={saveDraft.isPending} type="submit">
                {saveDraftLabel}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Bằng chứng riêng tư</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Tối đa {RISK_REPORT_EVIDENCE_MAX_COUNT} tệp, mỗi tệp tối đa 20
                MB. Bản gốc chỉ Risk Moderator có thể mở bằng signed URL.
              </p>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-evidence-kind"
              >
                Loại bằng chứng đang tải
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  id="risk-evidence-kind"
                  onChange={(event) =>
                    setEvidenceKind(
                      event.target.value as "PAYMENT_PROOF" | "CONVERSATION"
                    )
                  }
                  value={evidenceKind}
                >
                  <option value="PAYMENT_PROOF">Chứng từ thanh toán</option>
                  <option value="CONVERSATION">Trao đổi / hội thoại</option>
                </select>
              </label>
              <FileDropzone
                accept={ACCEPTED_CONTENT_TYPES}
                disabled={
                  !reportId ||
                  upload.isPending ||
                  evidenceCount >= RISK_REPORT_EVIDENCE_MAX_COUNT
                }
                helperText="PDF, TXT, JPEG, PNG, WebP, MP4 hoặc WebM · tối đa 20 MB mỗi tệp"
                inputLabel="Chọn tệp bằng chứng"
                isUploading={upload.isPending || addEvidence.isPending}
                label="Thêm bằng chứng"
                maxFiles={Math.max(
                  1,
                  RISK_REPORT_EVIDENCE_MAX_COUNT - evidenceCount
                )}
                maxSize={RISK_REPORT_EVIDENCE_MAX_BYTES}
                multiple
                onFilesSelected={(files) => void handleFilesSelected(files)}
                progress={upload.averageProgress}
                uploadingLabel="Đang tải bằng chứng…"
              />
              <p aria-live="polite" className="text-muted-foreground text-sm">
                Đã đăng ký {evidenceCount}/{RISK_REPORT_EVIDENCE_MAX_COUNT} tệp.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="grid gap-4 pt-6">
              <p className="text-muted-foreground text-sm">
                {publicationEnabled
                  ? "Launch gates cho publication đang mở; Moderator vẫn phải duyệt evidence và derivative."
                  : "Publication hiện đang bị khóa bởi launch gates pháp lý/data governance. Báo cáo vẫn có thể gửi để xếp hàng review."}
              </p>
              <Button
                disabled={
                  !reportId ||
                  submitReport.isPending ||
                  saveDraft.isPending ||
                  upload.isPending
                }
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitReport.isPending ? "Đang gửi…" : "Gửi Risk Moderator"}
              </Button>
            </CardContent>
          </Card>
        </form>
      ) : null}

      {step === "submitted" ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Báo cáo đã được gửi để xem xét</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              Avin Check đã lưu bằng chứng ở vùng riêng tư. Bạn sẽ nhận email
              khi trạng thái thay đổi; việc công khai chỉ xảy ra sau moderation,
              redaction, watermark và launch gate.
            </p>
            <Link
              className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-input px-4 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
              to="/avin-check"
            >
              Quay lại Avin Check
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </Shell>
  );
};
