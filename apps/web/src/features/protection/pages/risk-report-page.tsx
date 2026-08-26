import {
  RISK_REPORT_ATTESTATION_VERSION,
  riskReportIssueTypesByReportType,
  getRiskIdentifierPlatform,
  isSupportedRiskIdentifierPlatformUrl,
} from "@avin/api/protection/risk-report";
import type {
  RiskReportIdentifierRole,
  RiskReportIdentifierType,
  RiskReportIssueType,
  RiskReportWebsiteViolationType,
} from "@avin/api/protection/risk-report";
import {
  getNativeRiskReportEvidenceMaxBytes,
  isNativeRiskReportEvidenceContentType,
  RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES,
  RISK_REPORT_EVIDENCE_MAX_COUNT,
  RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT,
  RISK_REPORT_EVIDENCE_UPLOAD_ROUTE,
} from "@avin/api/storage";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
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
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  LockKeyIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Link,
  useLocation,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

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
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
};

const reportTypeOptions = [
  {
    description: "STK, ví, số điện thoại và giao dịch MMO",
    label: "Giao dịch / chuyển tiền",
    value: "BANK_WALLET_PHONE",
  },
  {
    description: "Website, app, fanpage hoặc profile giả mạo/độc hại",
    label: "Website / app / profile giả",
    value: "MALICIOUS_WEBSITE",
  },
  {
    description: "Tài khoản game/social bị back hoặc mất quyền truy cập",
    label: "Tài khoản bị back",
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
  MALICIOUS_WEBSITE: [{ label: "URL website/app/profile", value: "WEBSITE" }],
  SOCIAL_GAME_ACCOUNT: [
    { label: "UID / tài khoản social", value: "SOCIAL_ACCOUNT" },
    { label: "ID tài khoản trên nền tảng", value: "PLATFORM_ACCOUNT" },
  ],
} as const satisfies Record<
  ReportType,
  readonly { label: string; value: string }[]
>;

type IdentifierType =
  (typeof identifierTypeOptions)[ReportType][number]["value"];

const impersonatedIdentifierTypeOptions = [
  { label: "Website / profile thật", value: "SOCIAL_ACCOUNT" },
  { label: "Website / định danh nền tảng thật", value: "PLATFORM_ACCOUNT" },
  { label: "URL tham chiếu chính thức", value: "WEBSITE" },
] as const satisfies readonly {
  label: string;
  value: RiskReportIdentifierType;
}[];

const evidenceTypeOptions = {
  BANK_WALLET_PHONE: [
    { label: "Chứng từ thanh toán", value: "PAYMENT_PROOF" },
    { label: "Trao đổi / bài đăng / thỏa thuận", value: "CONVERSATION" },
    { label: "Bằng chứng giao hàng", value: "DELIVERY_PROOF" },
    { label: "Thông báo hoàn/chargeback", value: "REVERSAL_NOTICE" },
  ],
  MALICIOUS_WEBSITE: [
    { label: "Ảnh chụp màn hình", value: "SCREENSHOT" },
    { label: "Video quay màn hình", value: "VIDEO" },
    { label: "Bằng chứng mạo danh thật/giả", value: "GENUINE_REFERENCE" },
    { label: "Chứng từ thanh toán (nếu có mất tiền)", value: "PAYMENT_PROOF" },
  ],
  SOCIAL_GAME_ACCOUNT: [
    { label: "Bằng chứng bàn giao/mua bán", value: "HANDOVER_PROOF" },
    { label: "Bằng chứng sở hữu trước đây", value: "OWNERSHIP_PROOF" },
    {
      label: "Bằng chứng mất quyền truy cập/khôi phục",
      value: "ACCESS_LOSS_PROOF",
    },
    { label: "Chứng từ thanh toán", value: "PAYMENT_PROOF" },
  ],
} as const satisfies Record<
  ReportType,
  readonly { label: string; value: string }[]
>;

type EvidenceKind = (typeof evidenceTypeOptions)[ReportType][number]["value"];

const issueLabels: Record<string, string> = {
  ACCOUNT_ACCESS_LOST: "Mất quyền truy cập",
  ACCOUNT_RECLAIMED: "Tài khoản bị back/thu hồi",
  FAKE_INTERMEDIARY: "Giả danh trung gian",
  FAKE_PAYMENT: "Giả chứng từ/thanh toán",
  FAKE_STORE: "Shop/cửa hàng giả",
  IMPERSONATION: "Mạo danh",
  MALWARE: "Phát tán mã độc",
  NON_DELIVERY: "Không giao hàng/không làm dịch vụ",
  OTHER: "Khác",
  PAID_THEN_BLOCKED: "Nhận tiền rồi chặn liên hệ",
  PARTIAL_OR_MISMATCHED_DELIVERY: "Giao thiếu/sai sản phẩm hoặc dịch vụ",
  PAYMENT_SCAM: "Lừa đảo thanh toán",
  PHISHING: "Lừa lấy thông tin",
  POST_DELIVERY_CHARGEBACK: "Đã giao nhưng bị hoàn/chargeback",
  PUBLISHER_LOCKED_OR_BANNED: "Tài khoản bị khóa bởi nền tảng",
  RECOVERY_NOT_TRANSFERRED: "Không bàn giao được phương thức khôi phục",
  SERVICE_DAMAGED_ACCOUNT: "Dịch vụ làm hỏng tài khoản",
  SERVICE_INCOMPLETE: "Dịch vụ chưa hoàn tất",
  WARRANTY_REFUSED: "Từ chối bảo hành",
};

const reporterInvolvementOptions = [
  { label: "Tôi là người mua / người chuyển tiền", value: "BUYER" },
  { label: "Tôi là người bán / người cung cấp", value: "SELLER" },
  { label: "Tôi là bên trung gian", value: "INTERMEDIARY" },
  { label: "Tôi được ủy quyền gửi thay", value: "AUTHORIZED_REPRESENTATIVE" },
  { label: "Tôi trực tiếp quan sát bề mặt giả", value: "DIRECT_OBSERVER" },
] as const;

const lossOptions = [
  { label: "Có mất tiền/tài sản", value: "YES" },
  { label: "Chưa mất tiền/tài sản", value: "NO" },
  { label: "Chưa xác định", value: "UNKNOWN" },
] as const;

type Step = "type" | "incident" | "evidence" | "review" | "submitted";
type LossOccurrence = (typeof lossOptions)[number]["value"];
type ReporterInvolvement = (typeof reporterInvolvementOptions)[number]["value"];

const stepItems: { id: Exclude<Step, "submitted">; label: string }[] = [
  { id: "type", label: "Loại & vai trò" },
  { id: "incident", label: "Định danh & giao dịch" },
  { id: "evidence", label: "Tường trình & file" },
  { id: "review", label: "Xem lại & gửi" },
];

const getStepClassName = (active: boolean, completed: boolean): string => {
  if (active) {
    return "border-primary bg-primary/5 text-primary";
  }
  if (completed) {
    return "border-emerald-500/30 bg-emerald-500/5";
  }
  return "bg-muted/20 text-muted-foreground";
};

const getStepStatusLabel = (active: boolean, completed: boolean): string => {
  if (active) {
    return "Đang điền";
  }
  return completed ? "Đã lưu" : "Chưa mở";
};

interface SelectedRiskEvidence {
  explanation: string;
  file: File;
  kind: EvidenceKind;
}

interface PublicPreview {
  evidence: { contentType: string; fileName: string; kind: string }[];
  identifiers: {
    institutionName: string | null;
    maskedValue: string;
    publicValue: string | null;
    role: string;
    type: string;
  }[];
  previewedAt: string | null;
  publicNarrative: string | null;
  publicTitle: string;
}

const todayInput = (): string => new Date().toISOString().slice(0, 10);

const getRiskLookupPlatform = (handoff: RiskLookupHandoff): string => {
  const platform =
    handoff.kind === "FACEBOOK" ||
    handoff.kind === "TIKTOK" ||
    handoff.kind === "TELEGRAM"
      ? handoff.kind
      : getRiskIdentifierPlatform(handoff.value);
  return platform ?? "";
};

const getRiskLookupPrefill = (
  handoff: RiskLookupHandoff
): Pick<
  RiskReportFormState,
  "identifierType" | "identifierValue" | "platform" | "reportType"
> => {
  const social =
    handoff.kind === "FACEBOOK" ||
    handoff.kind === "TIKTOK" ||
    handoff.kind === "TELEGRAM" ||
    (handoff.kind === "AUTO" &&
      (handoff.value.trim().startsWith("@") ||
        Boolean(getRiskIdentifierPlatform(handoff.value)) ||
        isSupportedRiskIdentifierPlatformUrl(handoff.value)));
  if (social) {
    return {
      identifierType: "SOCIAL_ACCOUNT",
      identifierValue: handoff.value,
      platform: getRiskLookupPlatform(handoff),
      reportType: "SOCIAL_GAME_ACCOUNT",
    };
  }
  const website =
    handoff.kind === "WEBSITE" ||
    (handoff.kind === "AUTO" &&
      !isSupportedRiskIdentifierPlatformUrl(handoff.value) &&
      /^(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|$)/iu.test(
        handoff.value.trim()
      ));
  if (website) {
    return {
      identifierType: "WEBSITE",
      identifierValue: handoff.value,
      platform: "",
      reportType: "MALICIOUS_WEBSITE",
    };
  }
  return {
    identifierType: handoff.kind === "PHONE" ? "PHONE" : "BANK_ACCOUNT",
    identifierValue: handoff.value,
    platform: "",
    reportType: "BANK_WALLET_PHONE",
  };
};

const relatedIdentifierRoleOptions = {
  BANK_WALLET_PHONE: [
    { label: "Đối tượng/bên nhận", value: "ACCUSED_COUNTERPARTY" },
    { label: "Trung gian", value: "INTERMEDIARY" },
    { label: "Kênh liên hệ", value: "CONTACT_CHANNEL" },
    { label: "Shop/listing", value: "LISTING_STORE" },
  ],
  MALICIOUS_WEBSITE: [
    { label: "Đối tượng/đơn vị liên quan", value: "ACCUSED_COUNTERPARTY" },
    { label: "Kênh liên hệ", value: "CONTACT_CHANNEL" },
    { label: "Trung gian", value: "INTERMEDIARY" },
  ],
  SOCIAL_GAME_ACCOUNT: [
    { label: "Người bán/bên giao tài khoản", value: "ACCUSED_COUNTERPARTY" },
    { label: "Kênh liên hệ", value: "CONTACT_CHANNEL" },
    { label: "Đích thanh toán", value: "PAYMENT_DESTINATION" },
  ],
} as const satisfies Record<
  ReportType,
  readonly { label: string; value: RiskReportIdentifierRole }[]
>;

const relatedIdentifierTypeOptions = {
  BANK_WALLET_PHONE: identifierTypeOptions.BANK_WALLET_PHONE,
  MALICIOUS_WEBSITE: [
    ...identifierTypeOptions.MALICIOUS_WEBSITE,
    ...impersonatedIdentifierTypeOptions.filter(
      (item) => item.value !== "WEBSITE"
    ),
  ],
  SOCIAL_GAME_ACCOUNT: identifierTypeOptions.SOCIAL_GAME_ACCOUNT,
} as const satisfies Record<
  ReportType,
  readonly { label: string; value: RiskReportIdentifierType }[]
>;

interface RelatedIdentifierDraft {
  holderName: string;
  id: string;
  institutionName: string;
  role: RiskReportIdentifierRole;
  type: RiskReportIdentifierType;
  value: string;
}

interface AdditionalTransactionDraft {
  amount: string;
  currencyOrAsset: string;
  destinationIdentifierIndex: number;
  id: string;
  occurredAt: string;
  paymentMethod: string;
  reference: string;
  timeKnown: boolean;
}

interface RiskReportFormState {
  identifierType: IdentifierType;
  identifierValue: string;
  platform: string;
  reportType: ReportType;
}

const initialRiskReportFormState: RiskReportFormState = {
  identifierType: "BANK_ACCOUNT",
  identifierValue: "",
  platform: "",
  reportType: "BANK_WALLET_PHONE",
};

const getInitialRiskReportFormState = (
  handoff: RiskLookupHandoff | null
): RiskReportFormState =>
  handoff
    ? { ...initialRiskReportFormState, ...getRiskLookupPrefill(handoff) }
    : initialRiskReportFormState;

const getDefaultIssue = (reportType: ReportType): RiskReportIssueType =>
  riskReportIssueTypesByReportType[reportType][0] ?? "OTHER";

const getDefaultEvidenceKind = (reportType: ReportType): EvidenceKind =>
  evidenceTypeOptions[reportType][0]?.value as EvidenceKind;

const getIdentifierRole = (
  reportType: ReportType
): RiskReportIdentifierRole => {
  if (reportType === "MALICIOUS_WEBSITE") {
    return "LISTING_STORE";
  }
  if (reportType === "SOCIAL_GAME_ACCOUNT") {
    return "REPORTED_ASSET";
  }
  return "PAYMENT_DESTINATION";
};

const websiteViolationTypeByIssue: Partial<
  Record<RiskReportIssueType, RiskReportWebsiteViolationType>
> = {
  FAKE_PAYMENT: "PAYMENT_SCAM",
  FAKE_STORE: "FAKE_STORE",
  IMPERSONATION: "IMPERSONATION",
  MALWARE: "MALWARE",
  OTHER: "OTHER",
  PHISHING: "PHISHING",
};

const getWebsiteViolationType = (
  selectedIssues: readonly RiskReportIssueType[]
): RiskReportWebsiteViolationType => {
  for (const issue of selectedIssues) {
    const violationType = websiteViolationTypeByIssue[issue];
    if (violationType) {
      return violationType;
    }
  }
  return "OTHER";
};

const getSubmitError = (reportType: ReportType): string => {
  if (reportType === "BANK_WALLET_PHONE") {
    return "Báo cáo giao dịch chưa đủ dữ liệu. Cần định danh nhận tiền, ngày xảy ra, tổn thất, giao dịch và đủ bằng chứng thanh toán + trao đổi.";
  }
  if (reportType === "MALICIOUS_WEBSITE") {
    return "Báo cáo bề mặt giả chưa đủ dữ liệu. Cần locator chính xác, loại vấn đề, tường trình và ảnh/video.";
  }
  return "Báo cáo tài khoản chưa đủ dữ liệu. Cần UID/ID tài sản, nền tảng, các mốc mua/bàn giao/mất quyền truy cập và bộ bằng chứng tương ứng.";
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
};

// oxlint-disable-next-line complexity, react-doctor/prefer-useReducer
export const RiskReportPage = () => {
  const lookupHandoff = useLocation({
    select: (location) => getRiskLookupHandoff(location.state),
  });
  const navigate = useNavigate();
  const { reportId: initialReportId } = useSearch({
    from: "/(public)/avin-check/report",
  });
  const [formState, setFormState] = useState<RiskReportFormState>(() =>
    getInitialRiskReportFormState(lookupHandoff)
  );
  const [step, setStep] = useState<Step>("type");
  // oxlint-disable-next-line react-doctor/rerender-state-only-in-handlers
  const [reportId, setReportId] = useState<string | undefined>(initialReportId);
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterZalo, setReporterZalo] = useState("");
  const [reporterInvolvement, setReporterInvolvement] =
    useState<ReporterInvolvement>("BUYER");
  const [incidentDate, setIncidentDate] = useState(todayInput);
  const [accountPurchaseDate, setAccountPurchaseDate] = useState("");
  const [accountHandoverDate, setAccountHandoverDate] = useState("");
  const [accountAccessLostDate, setAccountAccessLostDate] = useState("");
  const [incidentDateApproximate, setIncidentDateApproximate] = useState(false);
  const [ongoing, setOngoing] = useState(false);
  const [issues, setIssues] = useState<RiskReportIssueType[]>([
    getDefaultIssue(initialRiskReportFormState.reportType),
  ]);
  const [otherIssueDescription, setOtherIssueDescription] = useState("");
  const [lossOccurred, setLossOccurred] = useState<LossOccurrence>("YES");
  const [claimedLoss, setClaimedLoss] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [transactionReference, setTransactionReference] = useState("");
  const [additionalTransactions, setAdditionalTransactions] = useState<
    AdditionalTransactionDraft[]
  >([]);
  const [narrative, setNarrative] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [holderName, setHolderName] = useState("");
  const [relatedIdentifiers, setRelatedIdentifiers] = useState<
    RelatedIdentifierDraft[]
  >([]);
  const [impersonatedIdentifierType, setImpersonatedIdentifierType] =
    useState<RiskReportIdentifierType>("SOCIAL_ACCOUNT");
  const [impersonatedIdentifierValue, setImpersonatedIdentifierValue] =
    useState("");
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>(() =>
    getDefaultEvidenceKind(initialRiskReportFormState.reportType)
  );
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<
    SelectedRiskEvidence[]
  >([]);
  const existingEvidenceKinds = useRef<EvidenceKind[]>([]);
  const [existingEvidenceCount, setExistingEvidenceCount] = useState(0);
  const existingVideoEvidenceCount = useRef(0);
  const [publicPreview, setPublicPreview] = useState<PublicPreview>();
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const hydratedReportId = useRef<string | null>(null);

  const draftQuery = useQuery({
    ...orpc.protection.riskReport.getMine.queryOptions({
      input: initialReportId ? { reportId: initialReportId } : {},
    }),
    enabled: Boolean(initialReportId),
  });

  // oxlint-disable complexity, react-compiler
  useEffect(() => {
    const draft = draftQuery.data?.[0];
    if (
      !draft ||
      !initialReportId ||
      hydratedReportId.current === initialReportId
    ) {
      return;
    }
    const primaryIdentifier =
      draft.identifiers.find((identifier) => identifier.isPrimary) ??
      draft.identifiers[0];
    const impersonatedIdentifier = draft.identifiers.find(
      (identifier) => identifier.role === "IMPERSONATED_IDENTITY"
    );
    const [firstTransaction] = draft.transactions;
    const getTransactionDestinationIndex = (
      destinationIdentifierId: string | null
    ): number => {
      if (!destinationIdentifierId) {
        return 0;
      }
      const destinationIndex = draft.identifiers.findIndex(
        (identifier) => identifier.id === destinationIdentifierId
      );
      if (destinationIndex === -1) {
        return 0;
      }
      return destinationIndex;
    };
    const draftDate =
      draft.accessLostAt?.slice(0, 10) ??
      draft.incidentAt?.slice(0, 10) ??
      todayInput();
    const draftType = draft.type as ReportType;
    const draftIdentifierType =
      (primaryIdentifier?.type as IdentifierType | undefined) ??
      identifierTypeOptions[draftType][0]?.value;
    const allowedIssues = new Set<string>(
      riskReportIssueTypesByReportType[draftType]
    );
    const draftIssues = draft.issues.filter(
      (issue): issue is RiskReportIssueType => allowedIssues.has(issue)
    );

    setReportId(draft.id);
    setFormState({
      identifierType: draftIdentifierType,
      identifierValue: primaryIdentifier?.value ?? "",
      platform: draft.platform ?? "",
      reportType: draftType,
    });
    setReporterPhone(draft.reporterPhone ?? "");
    setReporterZalo(draft.reporterZalo ?? "");
    setReporterInvolvement(
      (draft.reporterInvolvement as ReporterInvolvement) ?? "BUYER"
    );
    setIncidentDate(draftDate);
    setAccountPurchaseDate(draft.purchaseAt?.slice(0, 10) ?? "");
    setAccountHandoverDate(draft.handoverAt?.slice(0, 10) ?? "");
    setAccountAccessLostDate(draft.accessLostAt?.slice(0, 10) ?? draftDate);
    setIncidentDateApproximate(draft.incidentDateApproximate);
    setOngoing(draft.ongoing);
    setIssues(
      draftIssues.length > 0 ? draftIssues : [getDefaultIssue(draftType)]
    );
    setOtherIssueDescription(draft.otherIssueDescription ?? "");
    setLossOccurred((draft.lossOccurred as LossOccurrence) ?? "YES");
    setClaimedLoss(
      draft.claimedLoss === null || draft.claimedLoss === undefined
        ? ""
        : String(draft.claimedLoss)
    );
    setPaymentMethod(firstTransaction?.paymentMethod ?? "BANK_TRANSFER");
    setTransactionReference(firstTransaction?.reference ?? "");
    setAdditionalTransactions(
      draft.transactions.slice(1).map((transaction, index) => ({
        amount: transaction.amount,
        currencyOrAsset: transaction.currencyOrAsset,
        destinationIdentifierIndex: getTransactionDestinationIndex(
          transaction.destinationIdentifierId
        ),
        id: `draft-transaction-${index}-${transaction.occurredAt}`,
        occurredAt: transaction.occurredAt.slice(0, 10),
        paymentMethod: transaction.paymentMethod,
        reference: transaction.reference ?? "",
        timeKnown: transaction.timeKnown,
      }))
    );
    setNarrative(draft.narrative ?? "");
    setPrivateNote(draft.privateNote ?? "");
    setInstitutionName(primaryIdentifier?.institutionName ?? "");
    setHolderName(primaryIdentifier?.holderName ?? "");
    const relatedDrafts: RelatedIdentifierDraft[] = [];
    for (const [index, identifier] of draft.identifiers.entries()) {
      if (
        identifier === primaryIdentifier ||
        identifier.role === "IMPERSONATED_IDENTITY"
      ) {
        continue;
      }
      relatedDrafts.push({
        holderName: identifier.holderName ?? "",
        id: `draft-${index}-${identifier.id}`,
        institutionName: identifier.institutionName ?? "",
        role: identifier.role as RiskReportIdentifierRole,
        type: identifier.type as RiskReportIdentifierType,
        value: identifier.value,
      });
    }
    setRelatedIdentifiers(relatedDrafts);
    setImpersonatedIdentifierType(
      (impersonatedIdentifier?.type as RiskReportIdentifierType) ??
        "SOCIAL_ACCOUNT"
    );
    setImpersonatedIdentifierValue(impersonatedIdentifier?.value ?? "");
    existingEvidenceKinds.current = draft.evidence.map(
      (evidence) => evidence.kind as EvidenceKind
    );
    setExistingEvidenceCount(draft.evidence.length);
    existingVideoEvidenceCount.current = draft.evidence.filter(
      (evidence) =>
        evidence.contentType === "video/mp4" ||
        evidence.contentType === "video/webm"
    ).length;
    if (draft.evidence.length > 0 && draft.narrative) {
      setStep("evidence");
    }
    hydratedReportId.current = initialReportId;
  }, [draftQuery.data, initialReportId]);
  // oxlint-enable complexity, react-compiler

  useEffect(() => {
    const remembered = takeRememberedRiskLookupHandoff();
    if (lookupHandoff || !remembered) {
      return;
    }
    // oxlint-disable-next-line react-compiler
    setFormState((current) => ({
      ...current,
      ...getRiskLookupPrefill(remembered),
    }));
  }, [lookupHandoff]);

  const { identifierType, identifierValue, platform, reportType } = formState;
  const availableIssues = useMemo(
    () => riskReportIssueTypesByReportType[reportType],
    [reportType]
  );
  const availableEvidenceKinds = evidenceTypeOptions[reportType];
  const transactionIdentifierOptions = [
    {
      label: `${identifierType} · ${identifierValue || "định danh chính"}`,
      value: "0",
    },
    ...relatedIdentifiers.flatMap((identifier, index) =>
      identifier.value.trim()
        ? [
            {
              label: `${identifier.role} · ${identifier.value}`,
              value: String(index + 1),
            },
          ]
        : []
    ),
  ];

  const saveDraft = useMutation(
    orpc.protection.riskReport.saveDraft.mutationOptions()
  );
  const addEvidence = useMutation(
    orpc.protection.riskReport.addEvidence.mutationOptions()
  );
  const preview = useMutation(
    orpc.protection.riskReport.preview.mutationOptions()
  );
  const submitReport = useMutation(
    orpc.protection.riskReport.submit.mutationOptions()
  );
  const upload = useUploadFiles({
    api: `${serverURL}/api/risk-report-evidence-upload`,
    credentials: "include",
    onError: () => setErrorMessage("Không thể tải bằng chứng lên."),
    route: RISK_REPORT_EVIDENCE_UPLOAD_ROUTE,
    uploadBatchSize: 1,
  });

  const isBusy =
    saveDraft.isPending ||
    addEvidence.isPending ||
    preview.isPending ||
    submitReport.isPending ||
    upload.isPending;

  const setReportType = (nextType: ReportType): void => {
    const nextIdentifierType = identifierTypeOptions[nextType][0]
      ?.value as IdentifierType;
    setFormState({
      identifierType: nextIdentifierType,
      identifierValue: "",
      platform: nextType === "SOCIAL_GAME_ACCOUNT" ? platform : "",
      reportType: nextType,
    });
    setIssues([getDefaultIssue(nextType)]);
    setEvidenceKind(getDefaultEvidenceKind(nextType));
    setRelatedIdentifiers([]);
    setAdditionalTransactions([]);
    setImpersonatedIdentifierValue("");
    setAccountPurchaseDate("");
    setAccountHandoverDate("");
    setAccountAccessLostDate(
      nextType === "SOCIAL_GAME_ACCOUNT" ? incidentDate : ""
    );
    setPublicPreview(undefined);
  };

  const addRelatedIdentifier = (): void => {
    if (relatedIdentifiers.length >= 9) {
      setErrorMessage("Mỗi báo cáo tối đa 10 định danh liên quan.");
      return;
    }
    const role = relatedIdentifierRoleOptions[reportType][0]?.value;
    const type = relatedIdentifierTypeOptions[reportType][0]?.value;
    if (!role || !type) {
      return;
    }
    setRelatedIdentifiers((current) => [
      ...current,
      {
        holderName: "",
        id: crypto.randomUUID(),
        institutionName: "",
        role,
        type,
        value: "",
      },
    ]);
  };

  // oxlint-disable-next-line complexity
  const buildDraftInput = () => ({
    accessLostAt:
      reportType === "SOCIAL_GAME_ACCOUNT" && accountAccessLostDate
        ? new Date(`${accountAccessLostDate}T12:00:00.000Z`)
        : undefined,
    claimedLoss:
      lossOccurred === "YES" && claimedLoss.trim()
        ? Number(claimedLoss.replaceAll(",", ""))
        : undefined,
    handoverAt:
      reportType === "SOCIAL_GAME_ACCOUNT" && accountHandoverDate
        ? new Date(`${accountHandoverDate}T12:00:00.000Z`)
        : undefined,
    identifiers: [
      ...(identifierValue.trim()
        ? [
            {
              holderName:
                identifierType === "BANK_ACCOUNT"
                  ? holderName.trim() || undefined
                  : undefined,
              institutionName:
                identifierType === "BANK_ACCOUNT"
                  ? institutionName.trim() || undefined
                  : undefined,
              role: getIdentifierRole(reportType),
              type: identifierType,
              value: identifierValue.trim(),
            },
          ]
        : []),
      ...relatedIdentifiers.flatMap((identifier) =>
        identifier.value.trim()
          ? [
              {
                holderName:
                  identifier.type === "BANK_ACCOUNT"
                    ? identifier.holderName.trim() || undefined
                    : undefined,
                institutionName:
                  identifier.type === "BANK_ACCOUNT"
                    ? identifier.institutionName.trim() || undefined
                    : undefined,
                role: identifier.role,
                type: identifier.type,
                value: identifier.value.trim(),
              },
            ]
          : []
      ),
      ...(reportType === "MALICIOUS_WEBSITE" &&
      issues.includes("IMPERSONATION") &&
      impersonatedIdentifierValue.trim()
        ? [
            {
              role: "IMPERSONATED_IDENTITY" as const,
              type: impersonatedIdentifierType,
              value: impersonatedIdentifierValue.trim(),
            },
          ]
        : []),
    ],
    incidentAt: incidentDate
      ? new Date(`${incidentDate}T12:00:00.000Z`)
      : undefined,
    incidentDateApproximate,
    issues,
    lossOccurred,
    narrative: narrative.trim() || undefined,
    ongoing,
    otherIssueDescription: otherIssueDescription.trim() || undefined,
    platform:
      reportType === "SOCIAL_GAME_ACCOUNT" ? platform.trim() : undefined,
    privateNote: privateNote.trim() || undefined,
    purchaseAt:
      reportType === "SOCIAL_GAME_ACCOUNT" && accountPurchaseDate
        ? new Date(`${accountPurchaseDate}T12:00:00.000Z`)
        : undefined,
    reportId,
    reporterInvolvement,
    reporterPhone: reporterPhone.trim() || undefined,
    reporterZalo: reporterZalo.trim() || undefined,
    transactions:
      lossOccurred === "YES" && claimedLoss.trim()
        ? [
            {
              amount: claimedLoss.replaceAll(",", "").trim(),
              currencyOrAsset: "VND",
              destinationIdentifierIndex: 0,
              occurredAt: new Date(`${incidentDate}T12:00:00.000Z`),
              paymentMethod: paymentMethod.trim() || "BANK_TRANSFER",
              reference: transactionReference.trim() || undefined,
              timeKnown: false,
            },
            ...additionalTransactions.flatMap((transaction) =>
              transaction.amount.trim()
                ? [
                    {
                      amount: transaction.amount.replaceAll(",", "").trim(),
                      currencyOrAsset:
                        transaction.currencyOrAsset.trim() || "VND",
                      destinationIdentifierIndex:
                        transaction.destinationIdentifierIndex,
                      occurredAt: new Date(
                        `${transaction.occurredAt || incidentDate}T12:00:00.000Z`
                      ),
                      paymentMethod:
                        transaction.paymentMethod.trim() || "BANK_TRANSFER",
                      reference: transaction.reference.trim() || undefined,
                      timeKnown: transaction.timeKnown,
                    },
                  ]
                : []
            ),
          ]
        : [],
    type: reportType,
    violationType:
      reportType === "MALICIOUS_WEBSITE"
        ? getWebsiteViolationType(issues)
        : undefined,
  });

  const saveCurrentDraft = async (): Promise<string> => {
    const draft = await saveDraft.mutateAsync(buildDraftInput());
    setReportId(draft.id);
    return draft.id;
  };

  const saveAndExit = async (): Promise<void> => {
    setErrorMessage(undefined);
    try {
      await saveCurrentDraft();
      await navigate({ to: "/avin-check/reports" });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể lưu bản nháp."
      );
    }
  };

  const validateTypeStep = (): string | null => {
    if (!identifierValue.trim()) {
      return "Hãy nhập định danh chính xác của đối tượng hoặc tài sản được báo cáo.";
    }
    if (reportType === "SOCIAL_GAME_ACCOUNT" && !platform.trim()) {
      return "Hãy nhập nền tảng của tài khoản bị back.";
    }
    if (identifierType === "BANK_ACCOUNT" && !institutionName.trim()) {
      return "Hãy nhập tên ngân hàng nhận tiền.";
    }
    if (identifierType === "BANK_ACCOUNT" && !holderName.trim()) {
      return "Hãy nhập tên chủ tài khoản theo chứng từ.";
    }
    if (
      relatedIdentifiers.some(
        (identifier) =>
          identifier.value.trim() &&
          identifier.type === "BANK_ACCOUNT" &&
          (!identifier.institutionName.trim() || !identifier.holderName.trim())
      )
    ) {
      return "Mỗi tài khoản ngân hàng liên quan cần có ngân hàng và tên chủ tài khoản theo chứng từ.";
    }
    if (!reporterInvolvement) {
      return "Hãy chọn vai trò của bạn trong sự việc.";
    }
    if (
      reporterInvolvement === "DIRECT_OBSERVER" &&
      reportType !== "MALICIOUS_WEBSITE"
    ) {
      return "Vai trò trực tiếp quan sát chỉ áp dụng cho website, app hoặc profile giả.";
    }
    return null;
  };

  const validateIncidentStep = (): string | null => {
    if (!incidentDate) {
      return "Hãy nhập ngày xảy ra hoặc ngày phát hiện sự việc.";
    }
    if (reportType === "SOCIAL_GAME_ACCOUNT") {
      if (!accountPurchaseDate) {
        return "Hãy nhập ngày mua tài khoản hoặc ngày bắt đầu giao dịch.";
      }
      if (!accountHandoverDate) {
        return "Hãy nhập ngày bàn giao tài khoản.";
      }
      if (!accountAccessLostDate) {
        return "Hãy nhập ngày mất quyền truy cập hoặc bị thu hồi.";
      }
    }
    if (issues.length === 0) {
      return "Hãy chọn ít nhất một vấn đề chính.";
    }
    if (
      reportType === "MALICIOUS_WEBSITE" &&
      issues.includes("IMPERSONATION") &&
      !impersonatedIdentifierValue.trim()
    ) {
      return "Hãy nhập định danh chính chủ bị mạo danh để đối chiếu.";
    }
    if (issues.includes("OTHER") && otherIssueDescription.trim().length < 20) {
      return "Mô tả mục Khác cần ít nhất 20 ký tự.";
    }
    if (lossOccurred === "YES") {
      const amount = Number(claimedLoss.replaceAll(",", ""));
      if (!Number.isInteger(amount) || amount <= 0) {
        return "Hãy nhập số tiền/tài sản bị mất lớn hơn 0.";
      }
      if (!paymentMethod.trim()) {
        return "Hãy nhập phương thức thanh toán.";
      }
      if (
        additionalTransactions.some((transaction) => {
          const additionalAmount = Number(
            transaction.amount.replaceAll(",", "")
          );
          return (
            !transaction.occurredAt ||
            !Number.isInteger(additionalAmount) ||
            additionalAmount <= 0 ||
            !transaction.paymentMethod.trim()
          );
        })
      ) {
        return "Mỗi giao dịch bổ sung cần ngày, số tiền hợp lệ và phương thức thanh toán.";
      }
    }
    return null;
  };

  const validateEvidenceStep = (): string | null => {
    if (narrative.trim().length < 50) {
      return "Tường trình công khai cần ít nhất 50 ký tự.";
    }
    if (existingEvidenceCount + selectedEvidenceFiles.length === 0) {
      return "File bằng chứng là bắt buộc. Hãy tải ít nhất một file.";
    }
    if (
      selectedEvidenceFiles.some((item) => item.explanation.trim().length < 10)
    ) {
      return "Mỗi file cần mô tả ngắn tối thiểu 10 ký tự để Moderator biết file chứng minh điều gì.";
    }
    const evidenceKinds = new Set<EvidenceKind>([
      ...existingEvidenceKinds.current,
      ...selectedEvidenceFiles.map((item) => item.kind),
    ]);
    if (reportType === "BANK_WALLET_PHONE") {
      const requiredKinds = issues.includes("POST_DELIVERY_CHARGEBACK")
        ? (["DELIVERY_PROOF", "REVERSAL_NOTICE"] as const)
        : (["PAYMENT_PROOF", "CONVERSATION"] as const);
      const missingKind = requiredKinds.find(
        (kind) => !evidenceKinds.has(kind)
      );
      if (missingKind) {
        return `Báo cáo giao dịch cần đủ file loại ${missingKind} trước khi tiếp tục.`;
      }
    }
    if (reportType === "MALICIOUS_WEBSITE") {
      if (
        !(["SCREENSHOT", "VIDEO"] as const).some((kind) =>
          evidenceKinds.has(kind)
        )
      ) {
        return "Báo cáo website/profile giả cần ít nhất ảnh chụp hoặc video quay màn hình.";
      }
      if (
        issues.includes("IMPERSONATION") &&
        !evidenceKinds.has("GENUINE_REFERENCE")
      ) {
        return "Báo cáo mạo danh cần file tham chiếu danh tính thật.";
      }
      if (lossOccurred === "YES" && !evidenceKinds.has("PAYMENT_PROOF")) {
        return "Nếu có mất tiền, cần thêm chứng từ thanh toán.";
      }
    }
    if (reportType === "SOCIAL_GAME_ACCOUNT") {
      if (!evidenceKinds.has("OWNERSHIP_PROOF")) {
        return "Cần bằng chứng sở hữu tài khoản trước đây.";
      }
      if (!evidenceKinds.has("ACCESS_LOSS_PROOF")) {
        return "Cần bằng chứng mất quyền truy cập hoặc yêu cầu khôi phục.";
      }
      if (
        !(["HANDOVER_PROOF", "PAYMENT_PROOF"] as const).some((kind) =>
          evidenceKinds.has(kind)
        )
      ) {
        return "Cần bằng chứng mua/bàn giao hoặc chứng từ thanh toán.";
      }
    }
    return null;
  };

  const handleFilesSelected = (files: File[]): void => {
    const availableSlots =
      RISK_REPORT_EVIDENCE_MAX_COUNT -
      existingEvidenceCount -
      selectedEvidenceFiles.length;
    if (availableSlots <= 0) {
      setErrorMessage(
        `Mỗi báo cáo tối đa ${RISK_REPORT_EVIDENCE_MAX_COUNT} tệp.`
      );
      return;
    }
    const unsupportedFile = files.find(
      (file) =>
        !isNativeRiskReportEvidenceContentType(file.type) ||
        file.size > getNativeRiskReportEvidenceMaxBytes(file.type)
    );
    if (unsupportedFile) {
      setErrorMessage(
        `File ${unsupportedFile.name} không đúng định dạng hoặc vượt giới hạn. Ảnh/PDF tối đa 20 MB, video tối đa 100 MB.`
      );
      return;
    }
    const selectedVideoCount = selectedEvidenceFiles.filter(
      (item) =>
        item.file.type === "video/mp4" || item.file.type === "video/webm"
    ).length;
    const requestedVideoCount = files.filter(
      (file) => file.type === "video/mp4" || file.type === "video/webm"
    ).length;
    if (
      existingVideoEvidenceCount.current +
        selectedVideoCount +
        requestedVideoCount >
      RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT
    ) {
      setErrorMessage(
        `Mỗi báo cáo tối đa ${RISK_REPORT_EVIDENCE_MAX_VIDEO_COUNT} video bằng chứng.`
      );
      return;
    }
    setErrorMessage(undefined);
    setSelectedEvidenceFiles((current) => [
      ...current,
      ...files.slice(0, availableSlots).map((file) => ({
        explanation: "",
        file,
        kind: evidenceKind,
      })),
    ]);
  };

  const handleNext = async (): Promise<void> => {
    setErrorMessage(undefined);
    try {
      if (step === "type") {
        const error = validateTypeStep();
        if (error) {
          setErrorMessage(error);
          return;
        }
        await saveCurrentDraft();
        setStep("incident");
        return;
      }
      if (step === "incident") {
        const error = validateIncidentStep();
        if (error) {
          setErrorMessage(error);
          return;
        }
        await saveCurrentDraft();
        setStep("evidence");
        return;
      }
      if (step === "evidence") {
        const error = validateEvidenceStep();
        if (error) {
          setErrorMessage(error);
          return;
        }
        const currentReportId = await saveCurrentDraft();
        for (const selected of selectedEvidenceFiles) {
          const result = await upload.uploadAsync([selected.file], {
            metadata: { kind: selected.kind, reportId: currentReportId },
          });
          const [uploadedFile] = result.files;
          if (!uploadedFile) {
            throw new Error("Một file bằng chứng chưa tải lên được.");
          }
          await addEvidence.mutateAsync({
            contentType: uploadedFile.raw.type,
            explanation: selected.explanation.trim(),
            fileName: uploadedFile.raw.name,
            kind: selected.kind,
            originalStorageKey: uploadedFile.objectInfo.key,
            reportId: currentReportId,
            sizeBytes: uploadedFile.raw.size,
          });
          if (result.failedFiles.length > 0) {
            throw new Error("Một file bằng chứng chưa tải lên được.");
          }
        }
        existingEvidenceKinds.current = [
          ...existingEvidenceKinds.current,
          ...selectedEvidenceFiles.map((item) => item.kind),
        ];
        setExistingEvidenceCount(
          (current) => current + selectedEvidenceFiles.length
        );
        existingVideoEvidenceCount.current += selectedEvidenceFiles.filter(
          (item) =>
            item.file.type === "video/mp4" || item.file.type === "video/webm"
        ).length;
        setSelectedEvidenceFiles([]);
        const previewResult = await preview.mutateAsync({
          reportId: currentReportId,
        });
        setPublicPreview(previewResult);
        setStep("review");
        return;
      }
      if (step === "review") {
        if (!reportId || !attestationAccepted) {
          setErrorMessage(
            "Hãy xem packet công khai và xác nhận attestation trước khi gửi."
          );
          return;
        }
        await submitReport.mutateAsync({
          attestationAccepted: true,
          attestationVersion: RISK_REPORT_ATTESTATION_VERSION,
          reportId,
        });
        setStep("submitted");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : getSubmitError(reportType)
      );
    }
  };

  const goBack = (): void => {
    if (step === "incident") {
      setStep("type");
    } else if (step === "evidence") {
      setStep("incident");
    } else if (step === "review") {
      setStep("evidence");
    }
  };

  const activeStepIndex = stepItems.findIndex((entry) => entry.id === step);
  const selectedIssueSet = new Set(issues);

  return (
    <Shell as="div" className="gap-8" variant="default">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
          to="/avin-check"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
        {step === "submitted" ? null : (
          <Button
            disabled={isBusy}
            onClick={() => void saveAndExit()}
            type="button"
            variant="outline"
          >
            Lưu nháp & thoát
          </Button>
        )}
      </div>

      <header className="flex w-full flex-wrap items-start justify-between gap-2 text-left">
        <div>
          <p className="font-medium text-primary text-sm">Avin Check</p>
          <h1
            className="font-bold text-3xl tracking-tight text-foreground"
            id="risk-report-heading"
          >
            Gửi tố cáo
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Chỉ tài khoản Buyer/Seller đã đăng nhập mới gửi được. File là bắt
            buộc; tường trình của bạn sẽ được tự động che dữ liệu riêng tư trước
            khi Moderator xem xét công khai.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-muted-foreground text-xs">
          <LockKeyIcon aria-hidden="true" className="size-4 text-primary" />
          Bản gốc chỉ Moderator được mở
        </div>
      </header>

      {step === "submitted" ? null : (
        <nav
          aria-label="Tiến trình gửi tố cáo"
          className="grid gap-2 sm:grid-cols-4"
        >
          {stepItems.map((item, index) => {
            const active = item.id === step;
            const completed = activeStepIndex > index;
            return (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${getStepClassName(active, completed)}`}
                key={item.id}
              >
                <p className="font-semibold">
                  {index + 1}. {item.label}
                </p>
                <p className="text-xs">
                  {getStepStatusLabel(active, completed)}
                </p>
              </div>
            );
          })}
        </nav>
      )}

      {errorMessage ? (
        <Alert className="border-destructive/30 bg-destructive/5" role="alert">
          <AlertTitle>Chưa thể tiếp tục</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {step === "type" ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Chọn loại tố cáo và vai trò của bạn</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3 md:grid-cols-3">
              {reportTypeOptions.map((option) => (
                <button
                  className={`rounded-2xl border p-4 text-left transition ${reportType === option.value ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/50"}`}
                  key={option.value}
                  onClick={() => setReportType(option.value)}
                  type="button"
                >
                  <p className="font-semibold">{option.label}</p>
                  <p className="mt-1 text-muted-foreground text-sm">
                    {option.description}
                  </p>
                </button>
              ))}
            </div>
            <label
              className="grid gap-1.5 text-sm font-medium"
              htmlFor="risk-reporter-involvement"
            >
              Vai trò của bạn trong sự việc
              <Select
                items={reporterInvolvementOptions}
                onValueChange={(value) =>
                  setReporterInvolvement(value as ReporterInvolvement)
                }
                value={reporterInvolvement}
              >
                <SelectTrigger id="risk-reporter-involvement">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {reporterInvolvementOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <p className="text-muted-foreground text-sm">
              Tên và email lấy từ account Avin. Số điện thoại/Zalo chỉ là kênh
              xác minh riêng tư nếu bạn muốn để lại.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  id="risk-reporter-zalo"
                  onChange={(event) => setReporterZalo(event.target.value)}
                  value={reporterZalo}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                disabled={isBusy}
                onClick={() => void handleNext()}
                type="button"
              >
                Lưu và tiếp tục
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "incident" ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Định danh, vấn đề và giao dịch</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-identifier-type"
              >
                Loại định danh
                <Select
                  items={identifierTypeOptions[reportType]}
                  onValueChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      identifierType: value as IdentifierType,
                    }))
                  }
                  value={identifierType}
                >
                  <SelectTrigger id="risk-identifier-type">
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
                Định danh chính xác liên quan *
                <Input
                  autoComplete="off"
                  id="risk-identifier-value"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      identifierValue: event.target.value,
                    }))
                  }
                  placeholder={
                    reportType === "MALICIOUS_WEBSITE"
                      ? "https://website-gia-mao.vn/..."
                      : "STK, UID, số điện thoại..."
                  }
                  value={identifierValue}
                />
              </label>
            </div>
            {reportType === "SOCIAL_GAME_ACCOUNT" ? (
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-platform"
              >
                Nền tảng *
                <Input
                  id="risk-platform"
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      platform: event.target.value,
                    }))
                  }
                  placeholder="Facebook, Telegram, Roblox, Free Fire..."
                  value={platform}
                />
              </label>
            ) : null}
            {identifierType === "BANK_ACCOUNT" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-bank"
                >
                  Ngân hàng nhận tiền *
                  <Input
                    id="risk-bank"
                    onChange={(event) => setInstitutionName(event.target.value)}
                    placeholder="VIB, MB, Vietcombank..."
                    value={institutionName}
                  />
                </label>
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-holder"
                >
                  Tên chủ tài khoản theo bill *
                  <Input
                    id="risk-holder"
                    onChange={(event) => setHolderName(event.target.value)}
                    value={holderName}
                  />
                </label>
              </div>
            ) : null}
            {reportType === "SOCIAL_GAME_ACCOUNT" ? (
              <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
                <p className="font-medium text-sm">
                  Mốc thời gian mua và mất tài khoản *
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor="risk-account-purchase-date"
                  >
                    Ngày mua/bắt đầu giao dịch *
                    <Input
                      id="risk-account-purchase-date"
                      onChange={(event) =>
                        setAccountPurchaseDate(event.target.value)
                      }
                      type="date"
                      value={accountPurchaseDate}
                    />
                  </label>
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor="risk-account-handover-date"
                  >
                    Ngày bàn giao *
                    <Input
                      id="risk-account-handover-date"
                      onChange={(event) =>
                        setAccountHandoverDate(event.target.value)
                      }
                      type="date"
                      value={accountHandoverDate}
                    />
                  </label>
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor="risk-account-access-lost-date"
                  >
                    Ngày mất quyền truy cập *
                    <Input
                      id="risk-account-access-lost-date"
                      onChange={(event) => {
                        setAccountAccessLostDate(event.target.value);
                        setIncidentDate(event.target.value);
                      }}
                      type="date"
                      value={accountAccessLostDate}
                    />
                  </label>
                </div>
                <div className="grid gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      checked={incidentDateApproximate}
                      onChange={(event) =>
                        setIncidentDateApproximate(event.target.checked)
                      }
                      type="checkbox"
                    />
                    Các mốc trên chỉ là ước tính
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={ongoing}
                      onChange={(event) => setOngoing(event.target.checked)}
                      type="checkbox"
                    />
                    Sự việc vẫn đang tiếp diễn
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-incident-date"
                >
                  Ngày xảy ra/phát hiện *
                  <Input
                    id="risk-incident-date"
                    onChange={(event) => setIncidentDate(event.target.value)}
                    type="date"
                    value={incidentDate}
                  />
                </label>
                <div className="grid gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      checked={incidentDateApproximate}
                      onChange={(event) =>
                        setIncidentDateApproximate(event.target.checked)
                      }
                      type="checkbox"
                    />
                    Ngày chỉ là ước tính
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      checked={ongoing}
                      onChange={(event) => setOngoing(event.target.checked)}
                      type="checkbox"
                    />
                    Sự việc vẫn đang tiếp diễn
                  </label>
                </div>
              </div>
            )}
            <fieldset className="grid gap-2">
              <legend className="font-medium text-sm">Vấn đề chính *</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableIssues.map((issue) => (
                  <label
                    className="flex items-center gap-2 text-sm"
                    key={issue}
                  >
                    <input
                      checked={selectedIssueSet.has(issue)}
                      onChange={(event) =>
                        setIssues((current) =>
                          event.target.checked
                            ? [...new Set([...current, issue])]
                            : current.filter((item) => item !== issue)
                        )
                      }
                      type="checkbox"
                    />
                    {issueLabels[issue] ?? issue}
                  </label>
                ))}
              </div>
            </fieldset>
            {issues.includes("OTHER") ? (
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-other-issue"
              >
                Mô tả vấn đề khác *
                <Textarea
                  id="risk-other-issue"
                  minLength={20}
                  onChange={(event) =>
                    setOtherIssueDescription(event.target.value)
                  }
                  value={otherIssueDescription}
                />
              </label>
            ) : null}
            {reportType === "MALICIOUS_WEBSITE" &&
            issues.includes("IMPERSONATION") ? (
              <div className="grid gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="font-medium text-sm">
                  Danh tính thật bị mạo danh *
                </p>
                <p className="text-muted-foreground text-xs">
                  Nhập profile/website chính chủ để Moderator đối chiếu với bề
                  mặt giả.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor="risk-impersonated-type"
                  >
                    Loại tham chiếu
                    <Select
                      items={impersonatedIdentifierTypeOptions}
                      onValueChange={(value) =>
                        setImpersonatedIdentifierType(
                          value as RiskReportIdentifierType
                        )
                      }
                      value={impersonatedIdentifierType}
                    >
                      <SelectTrigger id="risk-impersonated-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {impersonatedIdentifierTypeOptions.map((item) => (
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
                    htmlFor="risk-impersonated-value"
                  >
                    Định danh chính chủ *
                    <Input
                      id="risk-impersonated-value"
                      onChange={(event) =>
                        setImpersonatedIdentifierValue(event.target.value)
                      }
                      placeholder="https://facebook.com/trang-chinh-chu..."
                      value={impersonatedIdentifierValue}
                    />
                  </label>
                </div>
              </div>
            ) : null}
            <section
              aria-labelledby="risk-related-identifiers-heading"
              className="grid gap-4 rounded-xl border bg-muted/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3
                    className="font-medium text-sm"
                    id="risk-related-identifiers-heading"
                  >
                    Định danh liên quan (tuỳ chọn)
                  </h3>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Thêm người bán, trung gian, kênh liên hệ hoặc đích thanh
                    toán khác nếu bằng chứng của bạn có liên quan. Không cần
                    đoán danh tính pháp lý của chủ tài khoản.
                  </p>
                </div>
                <Button
                  disabled={relatedIdentifiers.length >= 9}
                  onClick={addRelatedIdentifier}
                  type="button"
                  variant="outline"
                >
                  Thêm định danh
                </Button>
              </div>
              {relatedIdentifiers.map((identifier, index) => (
                <div
                  className="grid gap-3 rounded-lg border bg-background p-3"
                  key={identifier.id}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label
                      className="grid gap-1.5 text-sm font-medium"
                      htmlFor={`risk-related-role-${identifier.id}`}
                    >
                      Vai trò
                      <Select
                        items={relatedIdentifierRoleOptions[reportType]}
                        onValueChange={(value) =>
                          setRelatedIdentifiers((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    role: value as RiskReportIdentifierRole,
                                  }
                                : item
                            )
                          )
                        }
                        value={identifier.role}
                      >
                        <SelectTrigger
                          id={`risk-related-role-${identifier.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {relatedIdentifierRoleOptions[reportType].map(
                              (option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              )
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </label>
                    <label
                      className="grid gap-1.5 text-sm font-medium"
                      htmlFor={`risk-related-type-${identifier.id}`}
                    >
                      Loại định danh
                      <Select
                        items={relatedIdentifierTypeOptions[reportType]}
                        onValueChange={(value) =>
                          setRelatedIdentifiers((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    type: value as RiskReportIdentifierType,
                                  }
                                : item
                            )
                          )
                        }
                        value={identifier.type}
                      >
                        <SelectTrigger
                          id={`risk-related-type-${identifier.id}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {relatedIdentifierTypeOptions[reportType].map(
                              (option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              )
                            )}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </label>
                  </div>
                  <label
                    className="grid gap-1.5 text-sm font-medium"
                    htmlFor={`risk-related-value-${identifier.id}`}
                  >
                    Giá trị định danh
                    <Input
                      autoComplete="off"
                      id={`risk-related-value-${identifier.id}`}
                      onChange={(event) =>
                        setRelatedIdentifiers((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, value: event.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="STK, UID, URL, số điện thoại..."
                      value={identifier.value}
                    />
                  </label>
                  {identifier.type === "BANK_ACCOUNT" ? (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-related-bank-${identifier.id}`}
                      >
                        Ngân hàng
                        <Input
                          id={`risk-related-bank-${identifier.id}`}
                          onChange={(event) =>
                            setRelatedIdentifiers((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      institutionName: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          value={identifier.institutionName}
                        />
                      </label>
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-related-holder-${identifier.id}`}
                      >
                        Tên chủ tài khoản theo bill
                        <Input
                          id={`risk-related-holder-${identifier.id}`}
                          onChange={(event) =>
                            setRelatedIdentifiers((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      holderName: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          value={identifier.holderName}
                        />
                      </label>
                    </div>
                  ) : null}
                  <Button
                    className="justify-self-start"
                    onClick={() =>
                      setRelatedIdentifiers((current) =>
                        current.filter((item) => item.id !== identifier.id)
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    Xoá định danh này
                  </Button>
                </div>
              ))}
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-loss"
              >
                Tổn thất tài chính/tài sản *
              </label>
              <Select
                items={lossOptions}
                onValueChange={(value) =>
                  setLossOccurred(value as LossOccurrence)
                }
                value={lossOccurred}
              >
                <SelectTrigger id="risk-loss">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {lossOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {lossOccurred === "YES" ? (
              <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-3">
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-claimed-loss"
                >
                  Số tiền khai báo (VND) *
                  <Input
                    id="risk-claimed-loss"
                    inputMode="numeric"
                    onChange={(event) => setClaimedLoss(event.target.value)}
                    placeholder="5000000"
                    value={claimedLoss}
                  />
                </label>
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-payment-method"
                >
                  Phương thức thanh toán *
                  <Input
                    id="risk-payment-method"
                    onChange={(event) => setPaymentMethod(event.target.value)}
                    value={paymentMethod}
                  />
                </label>
                <label
                  className="grid gap-1.5 text-sm font-medium"
                  htmlFor="risk-transaction-reference"
                >
                  Mã giao dịch/hash (tuỳ chọn)
                  <Input
                    id="risk-transaction-reference"
                    onChange={(event) =>
                      setTransactionReference(event.target.value)
                    }
                    value={transactionReference}
                  />
                </label>
              </div>
            ) : null}
            {lossOccurred === "YES" ? (
              <section
                aria-labelledby="risk-additional-transactions-heading"
                className="grid gap-4 rounded-xl border bg-muted/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3
                      className="font-medium text-sm"
                      id="risk-additional-transactions-heading"
                    >
                      Giao dịch bổ sung (tuỳ chọn)
                    </h3>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Dùng khi một sự việc có nhiều lần chuyển tiền. Số tiền
                      khai báo ở trên là tổng số tiền bạn muốn báo cáo.
                    </p>
                  </div>
                  <Button
                    onClick={() =>
                      setAdditionalTransactions((current) => [
                        ...current,
                        {
                          amount: "",
                          currencyOrAsset: "VND",
                          destinationIdentifierIndex: 0,
                          id: crypto.randomUUID(),
                          occurredAt: incidentDate,
                          paymentMethod: "BANK_TRANSFER",
                          reference: "",
                          timeKnown: false,
                        },
                      ])
                    }
                    type="button"
                    variant="outline"
                  >
                    Thêm giao dịch
                  </Button>
                </div>
                {additionalTransactions.map((transaction, index) => (
                  <div
                    className="grid gap-3 rounded-lg border bg-background p-3"
                    key={transaction.id}
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-transaction-amount-${transaction.id}`}
                      >
                        Số tiền *
                        <Input
                          id={`risk-transaction-amount-${transaction.id}`}
                          inputMode="numeric"
                          onChange={(event) =>
                            setAdditionalTransactions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, amount: event.target.value }
                                  : item
                              )
                            )
                          }
                          value={transaction.amount}
                        />
                      </label>
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-transaction-currency-${transaction.id}`}
                      >
                        Tiền tệ/tài sản *
                        <Input
                          id={`risk-transaction-currency-${transaction.id}`}
                          onChange={(event) =>
                            setAdditionalTransactions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      currencyOrAsset: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          value={transaction.currencyOrAsset}
                        />
                      </label>
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-transaction-date-${transaction.id}`}
                      >
                        Ngày giao dịch *
                        <Input
                          id={`risk-transaction-date-${transaction.id}`}
                          onChange={(event) =>
                            setAdditionalTransactions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      occurredAt: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          type="date"
                          value={transaction.occurredAt}
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-transaction-method-${transaction.id}`}
                      >
                        Phương thức thanh toán *
                        <Input
                          id={`risk-transaction-method-${transaction.id}`}
                          onChange={(event) =>
                            setAdditionalTransactions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      paymentMethod: event.target.value,
                                    }
                                  : item
                              )
                            )
                          }
                          value={transaction.paymentMethod}
                        />
                      </label>
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-transaction-destination-${transaction.id}`}
                      >
                        Đích nhận tiền *
                        <Select
                          items={transactionIdentifierOptions}
                          onValueChange={(value) =>
                            setAdditionalTransactions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      destinationIdentifierIndex: Number(value),
                                    }
                                  : item
                              )
                            )
                          }
                          value={String(transaction.destinationIdentifierIndex)}
                        >
                          <SelectTrigger
                            id={`risk-transaction-destination-${transaction.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {transactionIdentifierOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </label>
                      <label
                        className="grid gap-1.5 text-sm font-medium"
                        htmlFor={`risk-transaction-reference-${transaction.id}`}
                      >
                        Mã giao dịch/hash (tuỳ chọn)
                        <Input
                          id={`risk-transaction-reference-${transaction.id}`}
                          onChange={(event) =>
                            setAdditionalTransactions((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, reference: event.target.value }
                                  : item
                              )
                            )
                          }
                          value={transaction.reference}
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={transaction.timeKnown}
                        onChange={(event) =>
                          setAdditionalTransactions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    timeKnown: event.target.checked,
                                  }
                                : item
                            )
                          )
                        }
                        type="checkbox"
                      />
                      Tôi biết chính xác thời gian giao dịch
                    </label>
                    <Button
                      className="justify-self-start"
                      onClick={() =>
                        setAdditionalTransactions((current) =>
                          current.filter((item) => item.id !== transaction.id)
                        )
                      }
                      type="button"
                      variant="ghost"
                    >
                      Xoá giao dịch này
                    </Button>
                  </div>
                ))}
              </section>
            ) : null}
            <div className="flex justify-between">
              <Button
                disabled={isBusy}
                onClick={goBack}
                type="button"
                variant="outline"
              >
                Quay lại
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => void handleNext()}
                type="button"
              >
                Lưu và tiếp tục
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "evidence" ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Tường trình và file bằng chứng bắt buộc</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <label
              className="grid gap-1.5 text-sm font-medium"
              htmlFor="risk-narrative"
            >
              Tường trình công khai *
              <span className="font-normal text-muted-foreground">
                Viết những gì đã giao dịch/thỏa thuận, đã thanh toán, đã
                nhận/bàn giao gì, điều gì sai và bạn đã liên hệ ra sao.
              </span>
              <Textarea
                id="risk-narrative"
                maxLength={10_000}
                minLength={50}
                onChange={(event) => setNarrative(event.target.value)}
                rows={9}
                value={narrative}
              />
              <span className="font-normal text-muted-foreground text-xs">
                {narrative.length}/10.000 ký tự · Avin tự động che email, số
                điện thoại, token và dữ liệu riêng tư đã biết.
              </span>
            </label>
            <label
              className="grid gap-1.5 text-sm font-medium"
              htmlFor="risk-private-note"
            >
              Ghi chú riêng cho Moderator (tuỳ chọn)
              <Textarea
                id="risk-private-note"
                maxLength={5000}
                onChange={(event) => setPrivateNote(event.target.value)}
                rows={4}
                value={privateNote}
              />
            </label>
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
              <div>
                <p className="font-medium text-sm">
                  File bằng chứng là bắt buộc
                </p>
                <p className="text-muted-foreground text-xs">
                  JPEG, PNG, WebP, PDF, MP4/WebM · tối đa{" "}
                  {RISK_REPORT_EVIDENCE_MAX_COUNT} file · ảnh/PDF tối đa 20 MB,
                  video tối đa 100 MB. TXT/DOCX/ZIP không được nhận ở luồng
                  native.
                </p>
              </div>
              <label
                className="grid gap-1.5 text-sm font-medium"
                htmlFor="risk-evidence-kind"
              >
                Loại file đang thêm
                <Select
                  items={availableEvidenceKinds}
                  onValueChange={(value) =>
                    setEvidenceKind(value as EvidenceKind)
                  }
                  value={evidenceKind}
                >
                  <SelectTrigger id="risk-evidence-kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {availableEvidenceKinds.map((item) => (
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
                  isBusy ||
                  existingEvidenceCount + selectedEvidenceFiles.length >=
                    RISK_REPORT_EVIDENCE_MAX_COUNT
                }
                helperText="Bản gốc được giữ riêng; sau khi scan/redaction hệ thống mới tạo public copy."
                inputLabel="Chọn tệp bằng chứng"
                isUploading={upload.isPending || addEvidence.isPending}
                label="Thêm bằng chứng"
                maxFiles={Math.max(
                  1,
                  RISK_REPORT_EVIDENCE_MAX_COUNT -
                    existingEvidenceCount -
                    selectedEvidenceFiles.length
                )}
                maxSize={RISK_REPORT_EVIDENCE_MAX_VIDEO_BYTES}
                multiple
                onFilesSelected={handleFilesSelected}
                progress={upload.averageProgress}
                uploadingLabel="Đang tải bằng chứng…"
              />
              <p className="text-muted-foreground text-sm">
                Đã có {existingEvidenceCount} file đã lưu · đang chọn{" "}
                {selectedEvidenceFiles.length}/{RISK_REPORT_EVIDENCE_MAX_COUNT}{" "}
                file trong bước này.
              </p>
              {existingEvidenceCount > 0 ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-900 text-sm dark:text-amber-100">
                  Các file đã lưu sẽ được dùng lại khi gửi. Nếu vừa thêm file,
                  packet công khai phải chờ hệ thống scan và tạo bản đã xử lý.
                </p>
              ) : null}
              {selectedEvidenceFiles.map((selected, index) => (
                <div
                  className="grid gap-2 rounded-lg border bg-background p-3"
                  key={`${selected.file.name}-${selected.file.lastModified}`}
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium">
                      {selected.file.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatBytes(selected.file.size)}
                    </span>
                  </div>
                  <label
                    className="grid gap-1.5 text-sm"
                    htmlFor={`risk-evidence-explanation-${index}`}
                  >
                    File này chứng minh điều gì? *
                    <Input
                      id={`risk-evidence-explanation-${index}`}
                      onChange={(event) =>
                        setSelectedEvidenceFiles((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, explanation: event.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Ví dụ: Bill chuyển khoản ngày..., chứng minh đã thanh toán"
                      value={selected.explanation}
                    />
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button
                disabled={isBusy}
                onClick={goBack}
                type="button"
                variant="outline"
              >
                Quay lại
              </Button>
              <Button
                disabled={isBusy}
                onClick={() => void handleNext()}
                type="button"
              >
                Tạo public packet để xem
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "review" ? (
        <Card>
          <CardHeader>
            <CardTitle>4. Xem đúng packet công khai trước khi gửi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold text-primary">
                <CheckCircleIcon aria-hidden="true" className="size-5" />
                Nội dung Moderator sẽ duyệt toàn bộ
              </div>
              <h3 className="mb-3 font-semibold text-lg">
                {publicPreview?.publicTitle ?? "Đang tạo tiêu đề…"}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {publicPreview?.publicNarrative ?? "Đang tạo bản xem trước…"}
              </p>
            </div>
            <div className="grid gap-3">
              <p className="font-semibold text-sm">Định danh công khai</p>
              {publicPreview?.identifiers.length ? (
                publicPreview.identifiers.map((identifier) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                    key={`${identifier.type}-${identifier.maskedValue}`}
                  >
                    <span>
                      {identifier.role} · {identifier.type}
                      {identifier.institutionName
                        ? ` · ${identifier.institutionName}`
                        : ""}
                    </span>
                    <span className="font-mono">
                      {identifier.publicValue ?? identifier.maskedValue}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  Chưa có định danh an toàn để hiển thị.
                </p>
              )}
            </div>
            <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm">
              <p className="font-semibold">Bằng chứng công khai</p>
              {publicPreview?.evidence.length ? (
                publicPreview.evidence.map((evidence) => (
                  <p key={`${evidence.kind}-${evidence.fileName}`}>
                    {evidence.kind} · {evidence.fileName}
                  </p>
                ))
              ) : (
                <p className="text-muted-foreground">
                  Public copy đang chờ scan/redaction. Chưa thể gửi cho tới khi
                  file hoàn tất xử lý.
                </p>
              )}
            </div>
            <label className="flex items-start gap-2 rounded-xl border p-4 text-sm">
              <input
                checked={attestationAccepted}
                onChange={(event) =>
                  setAttestationAccepted(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                Tôi xác nhận nội dung đúng theo hiểu biết của mình, tôi có quyền
                cung cấp các file này, và đồng ý để packet tự động che dữ liệu
                được công khai nếu Avin duyệt đăng.
              </span>
            </label>
            <div className="flex justify-between">
              <Button
                disabled={isBusy}
                onClick={goBack}
                type="button"
                variant="outline"
              >
                Quay lại sửa
              </Button>
              <Button
                disabled={
                  isBusy ||
                  !attestationAccepted ||
                  !publicPreview?.evidence.length
                }
                onClick={() => void handleNext()}
                type="button"
              >
                {submitReport.isPending ? "Đang gửi…" : "Gửi để Avin duyệt"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "submitted" ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Báo cáo đã được gửi để Avin duyệt</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <p>
              Avin đã lưu bản nộp và bằng chứng riêng tư. Moderator chỉ duyệt
              hoặc không duyệt toàn bộ packet. Nếu không được duyệt, bạn có thể
              xem lý do riêng tư trong workspace.
            </p>
            <dl className="grid gap-2 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs">Mã báo cáo</dt>
                <dd className="font-mono font-medium text-sm">
                  {reportId ?? "Chưa xác định"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Trạng thái</dt>
                <dd className="font-medium">SUBMITTED · Chờ Avin duyệt</dd>
              </div>
            </dl>
            <p className="text-muted-foreground">
              Mục tiêu phản hồi lượt duyệt đầu tiên là trong 48 giờ; đây không
              phải cam kết về thời gian hay kết quả công khai.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm"
                to="/avin-check/reports"
              >
                Mở Báo cáo của tôi
              </Link>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-md border border-input px-4 font-medium text-sm"
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
