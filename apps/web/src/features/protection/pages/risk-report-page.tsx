import {
  getRiskIdentifierPlatform,
  isSupportedRiskIdentifierPlatformUrl,
} from "@avin/api/protection/risk-report";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { useUploadFiles } from "@better-upload/client";
import { ArrowLeftIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useReducer, useState } from "react";
import type { FormEvent } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";
import { serverURL } from "@/utils/server-url";

import {
  getRiskLookupHandoff,
  takeRememberedRiskLookupHandoff,
} from "../risk-lookup-handoff";
import type { RiskLookupHandoff } from "../risk-lookup-handoff";

const ACCEPTED_CONTENT_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "text/plain": [".txt"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

const reportTypeOptions = [
  {
    label: "Tài khoản ngân hàng, ví hoặc số điện thoại",
    value: "BANK_WALLET_PHONE",
  },
  {
    label: "Website giả mạo hoặc độc hại",
    value: "MALICIOUS_WEBSITE",
  },
  {
    label: "Tài khoản social hoặc game",
    value: "SOCIAL_GAME_ACCOUNT",
  },
] as const;

type ReportType = (typeof reportTypeOptions)[number]["value"];

const identifierTypeOptions = {
  BANK_WALLET_PHONE: [
    { label: "Số tài khoản ngân hàng", value: "BANK_ACCOUNT" },
    { label: "Tài khoản ví điện tử", value: "WALLET_ACCOUNT" },
    { label: "Số điện thoại", value: "PHONE" },
  ],
  MALICIOUS_WEBSITE: [{ label: "URL website", value: "WEBSITE" }],
  SOCIAL_GAME_ACCOUNT: [
    { label: "Tài khoản social / game", value: "SOCIAL_ACCOUNT" },
    { label: "ID tài khoản trên nền tảng", value: "PLATFORM_ACCOUNT" },
  ],
} as const satisfies Record<
  ReportType,
  readonly { label: string; value: string }[]
>;

type IdentifierType =
  (typeof identifierTypeOptions)[ReportType][number]["value"];

const evidenceTypeOptions = {
  BANK_WALLET_PHONE: [
    { label: "Chứng từ thanh toán", value: "PAYMENT_PROOF" },
    { label: "Trao đổi / hội thoại", value: "CONVERSATION" },
  ],
  MALICIOUS_WEBSITE: [
    { label: "Ảnh chụp màn hình", value: "SCREENSHOT" },
    { label: "Video / quay màn hình", value: "VIDEO" },
  ],
  SOCIAL_GAME_ACCOUNT: [
    { label: "Bằng chứng sở hữu tài khoản", value: "OWNERSHIP_PROOF" },
    { label: "Chứng từ giao dịch", value: "PAYMENT_PROOF" },
    { label: "Trao đổi / hội thoại", value: "CONVERSATION" },
  ],
} as const satisfies Record<
  ReportType,
  readonly { label: string; value: string }[]
>;

type EvidenceKind = (typeof evidenceTypeOptions)[ReportType][number]["value"];

interface SelectedRiskEvidence {
  file: File;
  kind: EvidenceKind;
}

const reporterRelationshipOptions = [
  {
    label: "Tôi không có quan hệ Provider",
    value: "NO_PROVIDER_RELATIONSHIP",
  },
  { label: "Tôi đang báo cáo chính Provider của mình", value: "SELF_PROVIDER" },
  { label: "Tôi đang báo cáo một Provider khác", value: "OTHER_PROVIDER" },
] as const;

type ReporterRelationship =
  (typeof reporterRelationshipOptions)[number]["value"];

const websiteViolationOptions = [
  { label: "Lừa đảo lấy thông tin (phishing)", value: "PHISHING" },
  { label: "Phát tán mã độc", value: "MALWARE" },
  { label: "Mạo danh", value: "IMPERSONATION" },
  { label: "Cửa hàng giả", value: "FAKE_STORE" },
  { label: "Lừa đảo thanh toán", value: "PAYMENT_SCAM" },
  { label: "Khác", value: "OTHER" },
] as const;

type WebsiteViolationType = (typeof websiteViolationOptions)[number]["value"];

const urgencyOptions = [
  { label: "Thông thường", value: "NORMAL" },
  { label: "Khẩn cấp", value: "URGENT" },
] as const;

type Step = "details" | "submitted";

const riskLookupPlatformLabels = {
  FACEBOOK: "Facebook",
  TELEGRAM: "Telegram",
  TIKTOK: "TikTok",
} as const;

interface RiskReportFieldsState {
  claimedLoss: string;
  evidenceKind: EvidenceKind;
  identifierType: IdentifierType;
  identifierValue: string;
  platform: string;
  reportType: ReportType;
  violationType: WebsiteViolationType;
}

type RiskReportFieldsAction =
  | { reportType: ReportType; type: "reportTypeChanged" }
  | {
      identifierType: IdentifierType;
      identifierValue: string;
      platform: string;
      reportType: ReportType;
      type: "prefillLookup";
    }
  | { type: "setClaimedLoss"; value: string }
  | { type: "setEvidenceKind"; value: EvidenceKind }
  | { type: "setIdentifierType"; value: IdentifierType }
  | { type: "setIdentifierValue"; value: string }
  | { type: "setPlatform"; value: string }
  | { type: "setViolationType"; value: WebsiteViolationType };

const initialRiskReportFields: RiskReportFieldsState = {
  claimedLoss: "",
  evidenceKind: "PAYMENT_PROOF",
  identifierType: "BANK_ACCOUNT",
  identifierValue: "",
  platform: "",
  reportType: "BANK_WALLET_PHONE",
  violationType: "PHISHING",
};

const getRiskLookupPlatform = (handoff: RiskLookupHandoff): string => {
  const platform =
    handoff.kind === "FACEBOOK" ||
    handoff.kind === "TIKTOK" ||
    handoff.kind === "TELEGRAM"
      ? handoff.kind
      : getRiskIdentifierPlatform(handoff.value);
  return platform ? riskLookupPlatformLabels[platform] : "";
};

const getRiskLookupPrefill = (
  handoff: RiskLookupHandoff
): Pick<
  RiskReportFieldsState,
  "identifierType" | "identifierValue" | "platform" | "reportType"
> => {
  const isSocialLookup =
    handoff.kind === "FACEBOOK" ||
    handoff.kind === "TIKTOK" ||
    handoff.kind === "TELEGRAM" ||
    (handoff.kind === "AUTO" &&
      (handoff.value.trim().startsWith("@") ||
        Boolean(getRiskIdentifierPlatform(handoff.value)) ||
        isSupportedRiskIdentifierPlatformUrl(handoff.value)));
  if (isSocialLookup) {
    return {
      identifierType: "SOCIAL_ACCOUNT",
      identifierValue: handoff.value,
      platform: getRiskLookupPlatform(handoff),
      reportType: "SOCIAL_GAME_ACCOUNT",
    };
  }

  const isWebsiteLookup =
    handoff.kind === "WEBSITE" ||
    (handoff.kind === "AUTO" &&
      !isSupportedRiskIdentifierPlatformUrl(handoff.value) &&
      /^(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|$)/iu.test(
        handoff.value.trim()
      ));
  if (isWebsiteLookup) {
    return {
      identifierType: "WEBSITE",
      identifierValue: handoff.value,
      platform: "",
      reportType: "MALICIOUS_WEBSITE",
    };
  }

  if (handoff.kind === "PHONE") {
    return {
      identifierType: "PHONE",
      identifierValue: handoff.value,
      platform: "",
      reportType: "BANK_WALLET_PHONE",
    };
  }

  return {
    identifierType: "BANK_ACCOUNT",
    identifierValue: handoff.value,
    platform: "",
    reportType: "BANK_WALLET_PHONE",
  };
};

const riskReportFieldsReducer = (
  state: RiskReportFieldsState,
  action: RiskReportFieldsAction
): RiskReportFieldsState => {
  if (action.type === "prefillLookup") {
    return {
      ...state,
      claimedLoss:
        action.reportType === "BANK_WALLET_PHONE" ? state.claimedLoss : "",
      evidenceKind: evidenceTypeOptions[action.reportType][0]
        .value as EvidenceKind,
      identifierType: action.identifierType,
      identifierValue: action.identifierValue,
      platform: action.platform,
      reportType: action.reportType,
    };
  }
  if (action.type === "reportTypeChanged") {
    return {
      ...state,
      claimedLoss:
        action.reportType === "BANK_WALLET_PHONE" ? state.claimedLoss : "",
      evidenceKind: evidenceTypeOptions[action.reportType][0]
        .value as EvidenceKind,
      identifierType: identifierTypeOptions[action.reportType][0]
        .value as IdentifierType,
      identifierValue: "",
      platform:
        action.reportType === "SOCIAL_GAME_ACCOUNT" ? state.platform : "",
      reportType: action.reportType,
    };
  }
  if (action.type === "setClaimedLoss") {
    return { ...state, claimedLoss: action.value };
  }
  if (action.type === "setEvidenceKind") {
    return { ...state, evidenceKind: action.value };
  }
  if (action.type === "setIdentifierType") {
    return { ...state, identifierType: action.value };
  }
  if (action.type === "setIdentifierValue") {
    return { ...state, identifierValue: action.value };
  }
  if (action.type === "setPlatform") {
    return { ...state, platform: action.value };
  }
  return { ...state, violationType: action.value };
};

const getInitialRiskReportFields = (
  handoff: RiskLookupHandoff | null
): RiskReportFieldsState => {
  if (!handoff) {
    return initialRiskReportFields;
  }

  return riskReportFieldsReducer(initialRiskReportFields, {
    ...getRiskLookupPrefill(handoff),
    type: "prefillLookup",
  });
};

const getRiskSubmitErrorMessage = (reportType: ReportType): string => {
  if (reportType === "BANK_WALLET_PHONE") {
    return "Báo cáo chưa đủ điều kiện gửi. Cần số định danh, tổn thất, tường trình, bằng chứng thanh toán và hội thoại đã được kiểm tra.";
  }
  if (reportType === "MALICIOUS_WEBSITE") {
    return "Báo cáo website chưa đủ điều kiện gửi. Cần URL, loại vi phạm, tường trình và ảnh chụp hoặc video đã được kiểm tra.";
  }
  return "Báo cáo tài khoản chưa đủ điều kiện gửi. Cần nền tảng, account ID, tường trình, bằng chứng sở hữu hoặc giao dịch và hội thoại đã được kiểm tra.";
};

const getRiskDraftTypeFields = ({
  claimedLoss,
  platform,
  reportType,
  violationType,
}: {
  claimedLoss: string;
  platform: string;
  reportType: ReportType;
  violationType: WebsiteViolationType;
}) => ({
  claimedLoss:
    reportType === "BANK_WALLET_PHONE" && claimedLoss
      ? Number(claimedLoss)
      : undefined,
  platform:
    reportType === "SOCIAL_GAME_ACCOUNT"
      ? platform.trim() || undefined
      : undefined,
  violationType: reportType === "MALICIOUS_WEBSITE" ? violationType : undefined,
});

const RiskReportTypeFields = ({
  claimedLoss,
  identifierType,
  identifierValue,
  onClaimedLossChange,
  onIdentifierTypeChange,
  onIdentifierValueChange,
  onPlatformChange,
  onViolationTypeChange,
  platform,
  reportType,
  violationType,
}: {
  claimedLoss: string;
  identifierType: IdentifierType;
  identifierValue: string;
  onClaimedLossChange: (value: string) => void;
  onIdentifierTypeChange: (value: IdentifierType) => void;
  onIdentifierValueChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onViolationTypeChange: (value: WebsiteViolationType) => void;
  platform: string;
  reportType: ReportType;
  violationType: WebsiteViolationType;
}) => (
  <>
    {reportType === "MALICIOUS_WEBSITE" ? (
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="risk-website-violation"
      >
        Loại vi phạm website
        <Select
          items={websiteViolationOptions}
          onValueChange={(value) =>
            onViolationTypeChange(value as WebsiteViolationType)
          }
          value={violationType}
        >
          <SelectTrigger className="w-full" id="risk-website-violation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {websiteViolationOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
    ) : null}

    {reportType === "SOCIAL_GAME_ACCOUNT" ? (
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="risk-platform"
      >
        Nền tảng social / game
        <Input
          autoComplete="off"
          id="risk-platform"
          onChange={(event) => onPlatformChange(event.target.value)}
          placeholder="Ví dụ: Facebook, Telegram, Roblox..."
          required
          value={platform}
        />
      </label>
    ) : null}

    <div className="grid gap-4 sm:grid-cols-2">
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="risk-identifier-type"
      >
        Loại định danh
        <Select
          items={identifierTypeOptions[reportType]}
          onValueChange={(value) =>
            onIdentifierTypeChange(value as IdentifierType)
          }
          value={identifierType}
        >
          <SelectTrigger className="w-full" id="risk-identifier-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {identifierTypeOptions[reportType].map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="risk-identifier-value"
      >
        Định danh liên quan
        <Input
          autoComplete="off"
          id="risk-identifier-value"
          onChange={(event) => onIdentifierValueChange(event.target.value)}
          required
          value={identifierValue}
        />
      </label>
    </div>

    {reportType === "BANK_WALLET_PHONE" ? (
      <label
        className="grid gap-1.5 text-sm font-medium"
        htmlFor="risk-claimed-loss"
      >
        Số tiền tổn thất dự kiến (VND)
        <Input
          id="risk-claimed-loss"
          inputMode="numeric"
          min={1}
          onChange={(event) => onClaimedLossChange(event.target.value)}
          required
          type="number"
          value={claimedLoss}
        />
      </label>
    ) : null}
  </>
);

export const RiskReportPage = () => {
  const lookupHandoff = useLocation({
    select: (location) => getRiskLookupHandoff(location.state),
  });
  const [step, setStep] = useState<Step>("details");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterZalo, setReporterZalo] = useState("");
  const [reporterRelationship, setReporterRelationship] =
    useState<ReporterRelationship>("NO_PROVIDER_RELATIONSHIP");
  const [riskFields, dispatchRiskFields] = useReducer(
    riskReportFieldsReducer,
    lookupHandoff,
    getInitialRiskReportFields
  );
  useEffect(() => {
    const rememberedLookupHandoff = takeRememberedRiskLookupHandoff();
    if (!lookupHandoff && rememberedLookupHandoff) {
      dispatchRiskFields({
        ...getRiskLookupPrefill(rememberedLookupHandoff),
        type: "prefillLookup",
      });
    }
  }, [lookupHandoff]);
  const {
    claimedLoss,
    evidenceKind,
    identifierType,
    identifierValue,
    platform,
    reportType,
    violationType,
  } = riskFields;
  const [urgency, setUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [affectedVictimCount, setAffectedVictimCount] = useState("1");
  const [narrative, setNarrative] = useState("");
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<
    SelectedRiskEvidence[]
  >([]);
  const [errorMessage, setErrorMessage] = useState<string>();

  const setReportType = (value: ReportType): void => {
    dispatchRiskFields({ reportType: value, type: "reportTypeChanged" });
  };
  const setIdentifierType = (value: IdentifierType): void => {
    dispatchRiskFields({ type: "setIdentifierType", value });
  };
  const setIdentifierValue = (value: string): void => {
    dispatchRiskFields({ type: "setIdentifierValue", value });
  };
  const setPlatform = (value: string): void => {
    dispatchRiskFields({ type: "setPlatform", value });
  };
  const setViolationType = (value: WebsiteViolationType): void => {
    dispatchRiskFields({ type: "setViolationType", value });
  };
  const setClaimedLoss = (value: string): void => {
    dispatchRiskFields({ type: "setClaimedLoss", value });
  };
  const setEvidenceKind = (value: EvidenceKind): void => {
    dispatchRiskFields({ type: "setEvidenceKind", value });
  };

  const launchStatusQuery = useQuery(
    orpc.protection.launchStatus.queryOptions()
  );
  const prepareSubmission = useMutation(
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

  const handleReportTypeChange = (nextType: ReportType): void => {
    setReportType(nextType);
  };

  const handleFilesSelected = (files: File[]): void => {
    const availableSlots =
      RISK_REPORT_EVIDENCE_MAX_COUNT - selectedEvidenceFiles.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        `Mỗi báo cáo tối đa ${RISK_REPORT_EVIDENCE_MAX_COUNT} tệp bằng chứng.`
      );
      return;
    }
    setErrorMessage(undefined);
    setSelectedEvidenceFiles((currentFiles) => [
      ...currentFiles,
      ...files.slice(0, availableSlots).map((file) => ({
        file,
        kind: evidenceKind,
      })),
    ]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    try {
      const typeFields = getRiskDraftTypeFields({
        claimedLoss,
        platform,
        reportType,
        violationType,
      });
      const report = await prepareSubmission.mutateAsync({
        affectedVictimCount: Number(affectedVictimCount) || 1,
        ...typeFields,
        identifiers: identifierValue.trim()
          ? [{ type: identifierType, value: identifierValue.trim() }]
          : [],
        narrative: narrative.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        reporterRelationship,
        reporterZalo: reporterZalo.trim() || undefined,
        type: reportType,
        urgency,
      });
      if (selectedEvidenceFiles.length > 0) {
        const filesByKind = new Map<EvidenceKind, File[]>();
        for (const selectedEvidence of selectedEvidenceFiles) {
          const files = filesByKind.get(selectedEvidence.kind) ?? [];
          files.push(selectedEvidence.file);
          filesByKind.set(selectedEvidence.kind, files);
        }
        for (const [kind, files] of filesByKind) {
          const result = await upload.uploadAsync(files, {
            metadata: {
              kind,
              reportId: report.id,
            },
          });
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
              kind,
              originalStorageKey: uploadedFile.objectInfo.key,
              reportId: report.id,
              sizeBytes: uploadedFile.raw.size,
            });
          }
          if (result.failedFiles.length > 0) {
            throw new Error("Một số tệp chưa tải lên được. Hãy thử lại.");
          }
        }
      }
      await submitReport.mutateAsync({
        reportId: report.id,
      });
      setStep("submitted");
    } catch (error) {
      if (error instanceof Error && error.message.includes("tải lên")) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage(getRiskSubmitErrorMessage(reportType));
    }
  };

  const publicationEnabled =
    launchStatusQuery.data?.riskReportPublication.enabled ?? false;
  const isSubmitting =
    prepareSubmission.isPending ||
    upload.isPending ||
    addEvidence.isPending ||
    submitReport.isPending;

  return (
    <Shell as="div" className="gap-8" variant="default">
      <section
        aria-labelledby="risk-report-heading"
        className="flex w-full flex-wrap items-start justify-between gap-2 text-left"
      >
        <div className="grid gap-2">
          <Link
            className="inline-flex w-fit items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
            to="/avin-check"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Quay lại Avin Check
          </Link>
          <Badge className="w-fit gap-1.5" variant="outline">
            <ShieldCheckIcon aria-hidden="true" />
            Avin Check
          </Badge>
          <h1
            className="font-bold text-3xl tracking-tight text-foreground"
            id="risk-report-heading"
          >
            Gửi tố cáo
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Thông tin và bằng chứng chỉ được dùng để Risk Moderator xem xét. Dữ
            liệu nhạy cảm không xuất hiện trong cảnh báo công khai.
          </p>
        </div>
      </section>

      {errorMessage ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Chưa thể tiếp tục</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {step === "details" ? (
        <form onSubmit={handleSubmit}>
          <section className="grid gap-6 rounded-3xl border bg-card p-6 sm:p-8">
            <div>
              <h2 className="font-bold text-lg">Thông tin tố cáo</h2>
              <p className="text-muted-foreground text-sm">
                Điền thông tin sự việc, đính kèm bằng chứng và gửi xét duyệt
                trong một lần.
              </p>
            </div>
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle>Thông tin liên hệ riêng tư</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <p className="text-muted-foreground text-sm sm:col-span-2">
                  Tên và email được lấy từ account Avin đang đăng nhập và lưu
                  riêng cho việc xử lý báo cáo.
                </p>
                <label
                  className="grid gap-1.5 text-sm font-medium sm:col-span-2"
                  htmlFor="risk-reporter-relationship"
                >
                  Quan hệ với Provider (nếu có)
                  <Select
                    items={reporterRelationshipOptions}
                    onValueChange={(value) =>
                      setReporterRelationship(value as ReporterRelationship)
                    }
                    value={reporterRelationship}
                  >
                    <SelectTrigger
                      className="w-full"
                      id="risk-reporter-relationship"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {reporterRelationshipOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <span className="font-normal text-muted-foreground text-xs">
                    Chỉ Risk Moderator nhìn thấy tín hiệu xung đột này; cảnh báo
                    công khai không tiết lộ người gửi hay quan hệ Provider.
                  </span>
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

            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle>Thông tin sự việc</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-report-type"
                >
                  Loại cảnh báo
                  <Select
                    items={reportTypeOptions}
                    onValueChange={(value) =>
                      handleReportTypeChange(value as ReportType)
                    }
                    value={reportType}
                  >
                    <SelectTrigger
                      className="w-full"
                      disabled={isSubmitting}
                      id="risk-report-type"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {reportTypeOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>

                <RiskReportTypeFields
                  claimedLoss={claimedLoss}
                  identifierType={identifierType}
                  identifierValue={identifierValue}
                  onClaimedLossChange={setClaimedLoss}
                  onIdentifierTypeChange={setIdentifierType}
                  onIdentifierValueChange={setIdentifierValue}
                  onPlatformChange={setPlatform}
                  onViolationTypeChange={setViolationType}
                  platform={platform}
                  reportType={reportType}
                  violationType={violationType}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor="risk-urgency"
                  >
                    Mức độ khẩn cấp
                    <Select
                      items={urgencyOptions}
                      onValueChange={(value) =>
                        setUrgency(value as "NORMAL" | "URGENT")
                      }
                      value={urgency}
                    >
                      <SelectTrigger className="w-full" id="risk-urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {urgencyOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </label>
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor="risk-affected-victim-count"
                  >
                    Số nạn nhân bị ảnh hưởng
                    <Input
                      id="risk-affected-victim-count"
                      inputMode="numeric"
                      min={1}
                      onChange={(event) =>
                        setAffectedVictimCount(event.target.value)
                      }
                      required
                      type="number"
                      value={affectedVictimCount}
                    />
                  </label>
                </div>
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
              </CardContent>
            </Card>

            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle>Bằng chứng riêng tư</CardTitle>
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
                  <Select
                    items={evidenceTypeOptions[reportType]}
                    onValueChange={(value) =>
                      setEvidenceKind(value as EvidenceKind)
                    }
                    value={evidenceKind}
                  >
                    <SelectTrigger className="w-full" id="risk-evidence-kind">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {evidenceTypeOptions[reportType].map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </label>
                <FileDropzone
                  accept={ACCEPTED_CONTENT_TYPES}
                  disabled={
                    isSubmitting ||
                    selectedEvidenceFiles.length >=
                      RISK_REPORT_EVIDENCE_MAX_COUNT
                  }
                  helperText="PDF, TXT, JPEG, PNG, WebP, MP4 hoặc WebM · tối đa 20 MB mỗi tệp"
                  inputLabel="Chọn tệp bằng chứng"
                  isUploading={upload.isPending || addEvidence.isPending}
                  label="Thêm bằng chứng"
                  maxFiles={Math.max(
                    1,
                    RISK_REPORT_EVIDENCE_MAX_COUNT -
                      selectedEvidenceFiles.length
                  )}
                  maxSize={RISK_REPORT_EVIDENCE_MAX_BYTES}
                  multiple
                  onFilesSelected={handleFilesSelected}
                  progress={upload.averageProgress}
                  uploadingLabel="Đang tải bằng chứng…"
                />
                <p aria-live="polite" className="text-muted-foreground text-sm">
                  Đã chọn {selectedEvidenceFiles.length}/
                  {RISK_REPORT_EVIDENCE_MAX_COUNT} tệp.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 border-t border-primary/20 bg-transparent shadow-none">
              <CardContent className="grid gap-4 pt-6">
                <p className="text-muted-foreground text-sm">
                  {publicationEnabled
                    ? "Launch gates cho publication đang mở; Moderator vẫn phải duyệt evidence và derivative."
                    : "Publication hiện đang bị khóa bởi launch gates pháp lý/data governance. Báo cáo vẫn có thể gửi để xếp hàng review."}
                </p>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Đang gửi…" : "Gửi tố cáo"}
                </Button>
              </CardContent>
            </Card>
          </section>
        </form>
      ) : null}

      {step === "submitted" ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Báo cáo đã được gửi để xem xét</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              Avin Check đã lưu bằng chứng ở vùng riêng tư. Bạn sẽ nhận email và
              thông báo trong Avin khi trạng thái thay đổi; việc công khai chỉ
              xảy ra sau moderation, redaction, watermark và launch gate.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 w-fit items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm transition hover:bg-primary/85"
                to="/avin-check/reports"
              >
                Mở Báo cáo của tôi
              </Link>
              <Link
                className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-input px-4 font-medium text-sm transition hover:bg-accent hover:text-accent-foreground"
                to="/avin-check"
              >
                Quay lại Avin Check
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </Shell>
  );
};
