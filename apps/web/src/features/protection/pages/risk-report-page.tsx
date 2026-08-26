import {
  RISK_REPORT_ATTESTATION_VERSION,
  getRiskIdentifierPlatform,
  isSupportedRiskIdentifierPlatformUrl,
} from "@avin/api/protection/risk-report";
import type { RiskReportIdentifierInput } from "@avin/api/protection/risk-report";
import { RISK_REPORT_EVIDENCE_UPLOAD_ROUTE } from "@avin/api/storage";
import { Button } from "@avin/ui/components/button";
import { useUploadFiles } from "@better-upload/client";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  GlobeIcon,
  MoneyIcon,
  UserSwitchIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";
import { serverURL } from "@/utils/server-url";

import { AccountReportForm } from "../components/risk-report/account-report-form";
import type { AccountReportData } from "../components/risk-report/account-report-form";
import type { SelectedFileItem } from "../components/risk-report/evidence-uploader";
import type { OptionalDetailsState } from "../components/risk-report/optional-details-section";
import { TransactionReportForm } from "../components/risk-report/transaction-report-form";
import type { TransactionReportData } from "../components/risk-report/transaction-report-form";
import { WebsiteReportForm } from "../components/risk-report/website-report-form";
import type { WebsiteReportData } from "../components/risk-report/website-report-form";
import {
  getRiskLookupHandoff,
  takeRememberedRiskLookupHandoff,
} from "../risk-lookup-handoff";

type ActiveTab =
  | "BANK_WALLET_PHONE"
  | "MALICIOUS_WEBSITE"
  | "SOCIAL_GAME_ACCOUNT";

const tabs: {
  icon: typeof MoneyIcon;
  id: ActiveTab;
  label: string;
}[] = [
  { icon: MoneyIcon, id: "BANK_WALLET_PHONE", label: "Chuyển tiền" },
  { icon: GlobeIcon, id: "MALICIOUS_WEBSITE", label: "Website giả" },
  { icon: UserSwitchIcon, id: "SOCIAL_GAME_ACCOUNT", label: "Acc bị back" },
];

const getInitialStateFromHandoff = (
  handoff: ReturnType<typeof getRiskLookupHandoff>
): { activeTab: ActiveTab; prefilledIdentifier: string } => {
  const remembered = handoff ?? takeRememberedRiskLookupHandoff();
  if (!remembered) {
    return { activeTab: "BANK_WALLET_PHONE", prefilledIdentifier: "" };
  }
  const val = remembered.value.trim();
  if (
    remembered.kind === "FACEBOOK" ||
    remembered.kind === "TIKTOK" ||
    remembered.kind === "TELEGRAM" ||
    (remembered.kind === "AUTO" &&
      (val.startsWith("@") ||
        Boolean(getRiskIdentifierPlatform(val)) ||
        isSupportedRiskIdentifierPlatformUrl(val)))
  ) {
    return { activeTab: "SOCIAL_GAME_ACCOUNT", prefilledIdentifier: val };
  }
  if (
    remembered.kind === "WEBSITE" ||
    (remembered.kind === "AUTO" &&
      !isSupportedRiskIdentifierPlatformUrl(val) &&
      /^(?:https?:\/\/)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/|$)/iu.test(val))
  ) {
    return { activeTab: "MALICIOUS_WEBSITE", prefilledIdentifier: val };
  }
  return { activeTab: "BANK_WALLET_PHONE", prefilledIdentifier: val };
};

const buildOptionalIdentifiers = (
  optional: OptionalDetailsState
): RiskReportIdentifierInput[] => {
  const identifiers: RiskReportIdentifierInput[] = [];
  if (optional.facebookUrl.trim()) {
    identifiers.push({
      role: "CONTACT_CHANNEL",
      type: "SOCIAL_ACCOUNT",
      value: optional.facebookUrl.trim(),
    });
  }
  if (optional.tiktokUrl.trim()) {
    identifiers.push({
      role: "CONTACT_CHANNEL",
      type: "SOCIAL_ACCOUNT",
      value: optional.tiktokUrl.trim(),
    });
  }
  if (optional.telegramUrl.trim()) {
    identifiers.push({
      role: "CONTACT_CHANNEL",
      type: "SOCIAL_ACCOUNT",
      value: optional.telegramUrl.trim(),
    });
  }
  if (optional.phoneNumber.trim()) {
    identifiers.push({
      role: "CONTACT_CHANNEL",
      type: "PHONE",
      value: optional.phoneNumber.trim(),
    });
  }
  return identifiers;
};

export const RiskReportPage = () => {
  const lookupHandoff = useLocation({
    select: (location) => getRiskLookupHandoff(location.state),
  });
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    () => getInitialStateFromHandoff(lookupHandoff).activeTab
  );
  const [submittedReportId, setSubmittedReportId] = useState<string>();
  const [prefilledIdentifier, setPrefilledIdentifier] = useState(
    () => getInitialStateFromHandoff(lookupHandoff).prefilledIdentifier
  );

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
    route: RISK_REPORT_EVIDENCE_UPLOAD_ROUTE,
    uploadBatchSize: 1,
  });

  const isBusy =
    saveDraft.isPending ||
    addEvidence.isPending ||
    preview.isPending ||
    submitReport.isPending ||
    upload.isPending;

  const uploadAndRegisterFiles = async (
    reportId: string,
    files: SelectedFileItem[],
    defaultKind: "PAYMENT_PROOF" | "SCREENSHOT" | "OWNERSHIP_PROOF"
  ) => {
    for (const item of files) {
      const uploadResult = await upload.uploadAsync([item.file], {
        metadata: {
          kind: defaultKind,
          reportId,
          uploadId: item.id,
        },
      });
      const [uploaded] = uploadResult.files;
      if (!uploaded) {
        throw new Error("Không thể tải tệp bằng chứng lên.");
      }
      await addEvidence.mutateAsync({
        contentType: uploaded.raw.type,
        explanation: "Bằng chứng sự việc",
        fileName: uploaded.raw.name,
        kind: defaultKind,
        originalStorageKey: uploaded.objectInfo.key,
        reportId,
        sizeBytes: uploaded.raw.size,
      });
    }
  };

  const handleTransactionSubmit = async (data: TransactionReportData) => {
    const incidentDate = data.optionalDetails.incidentDate
      ? new Date(`${data.optionalDetails.incidentDate}T12:00:00.000Z`)
      : new Date();

    const identifiers: RiskReportIdentifierInput[] = [
      {
        holderName: data.holderName,
        institutionName: data.bankName,
        role: "PAYMENT_DESTINATION",
        type: "BANK_ACCOUNT",
        value: data.accountNumber,
      },
      ...buildOptionalIdentifiers(data.optionalDetails),
    ];

    const draft = await saveDraft.mutateAsync({
      claimedLoss: Number(data.amount),
      identifiers,
      incidentAt: incidentDate,
      issues: ["NON_DELIVERY", "OTHER"],
      lossOccurred: "YES",
      narrative: data.narrative,
      ongoing: data.optionalDetails.ongoing,
      reporterInvolvement: "BUYER",
      transactions: [
        {
          amount: data.amount,
          currencyOrAsset: "VND",
          destinationIdentifierIndex: 0,
          occurredAt: incidentDate,
          paymentMethod: "BANK_TRANSFER",
          timeKnown: false,
        },
      ],
      type: "BANK_WALLET_PHONE",
    });

    await uploadAndRegisterFiles(draft.id, data.evidenceFiles, "PAYMENT_PROOF");
    await preview.mutateAsync({ reportId: draft.id });
    await submitReport.mutateAsync({
      attestationAccepted: true,
      attestationVersion: RISK_REPORT_ATTESTATION_VERSION,
      reportId: draft.id,
    });
    setSubmittedReportId(draft.id);
  };

  const handleWebsiteSubmit = async (data: WebsiteReportData) => {
    const incidentDate = data.optionalDetails.incidentDate
      ? new Date(`${data.optionalDetails.incidentDate}T12:00:00.000Z`)
      : new Date();

    const isSocialLink =
      data.websiteUrl.includes("facebook.com") ||
      data.websiteUrl.includes("tiktok.com") ||
      data.websiteUrl.includes("t.me");

    const identifiers: RiskReportIdentifierInput[] = [
      {
        role: "LISTING_STORE",
        type: isSocialLink ? "SOCIAL_ACCOUNT" : "WEBSITE",
        value: data.websiteUrl,
      },
      ...buildOptionalIdentifiers(data.optionalDetails),
    ];

    if (data.impersonatedUrl?.trim()) {
      identifiers.push({
        role: "IMPERSONATED_IDENTITY",
        type: data.impersonatedUrl.startsWith("http")
          ? "WEBSITE"
          : "SOCIAL_ACCOUNT",
        value: data.impersonatedUrl.trim(),
      });
    }

    const issueType =
      data.violationType === "PAYMENT_SCAM"
        ? "FAKE_PAYMENT"
        : data.violationType;

    const draft = await saveDraft.mutateAsync({
      identifiers,
      incidentAt: incidentDate,
      issues: [issueType],
      lossOccurred: "NO",
      narrative: data.narrative,
      ongoing: data.optionalDetails.ongoing,
      reporterInvolvement: "DIRECT_OBSERVER",
      type: "MALICIOUS_WEBSITE",
      violationType: data.violationType,
    });

    await uploadAndRegisterFiles(draft.id, data.evidenceFiles, "SCREENSHOT");
    await preview.mutateAsync({ reportId: draft.id });
    await submitReport.mutateAsync({
      attestationAccepted: true,
      attestationVersion: RISK_REPORT_ATTESTATION_VERSION,
      reportId: draft.id,
    });
    setSubmittedReportId(draft.id);
  };

  const handleAccountSubmit = async (data: AccountReportData) => {
    const incidentDate = data.optionalDetails.incidentDate
      ? new Date(`${data.optionalDetails.incidentDate}T12:00:00.000Z`)
      : new Date();

    const identifiers: RiskReportIdentifierInput[] = [
      {
        role: "REPORTED_ASSET",
        type: "PLATFORM_ACCOUNT",
        value: data.accountId,
      },
      ...buildOptionalIdentifiers(data.optionalDetails),
    ];

    const draft = await saveDraft.mutateAsync({
      accessLostAt: incidentDate,
      handoverAt: incidentDate,
      identifiers,
      incidentAt: incidentDate,
      issues: ["ACCOUNT_RECLAIMED"],
      lossOccurred: "NO",
      narrative: data.narrative,
      ongoing: data.optionalDetails.ongoing,
      platform: data.platform,
      purchaseAt: incidentDate,
      reporterInvolvement: "BUYER",
      type: "SOCIAL_GAME_ACCOUNT",
    });

    await uploadAndRegisterFiles(
      draft.id,
      data.evidenceFiles,
      "OWNERSHIP_PROOF"
    );
    await preview.mutateAsync({ reportId: draft.id });
    await submitReport.mutateAsync({
      attestationAccepted: true,
      attestationVersion: RISK_REPORT_ATTESTATION_VERSION,
      reportId: draft.id,
    });
    setSubmittedReportId(draft.id);
  };

  if (submittedReportId) {
    return (
      <Shell
        aria-label="Tố cáo thành công"
        as="section"
        className="flex w-full flex-col items-start gap-6"
      >
        <div className="mx-auto w-full max-w-2xl py-8">
          <div className="rounded-3xl border bg-card p-8 sm:p-12 text-center shadow-xs">
            <div className="grid gap-6">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircleIcon aria-hidden="true" className="size-10" />
              </div>

              <div>
                <h2 className="font-bold text-2xl text-foreground">
                  Gửi Tố Cáo Thành Công!
                </h2>
                <p className="mt-2 text-muted-foreground text-sm">
                  Đơn tố cáo của bạn đã được tiếp nhận và chuyển đến đội ngũ
                  Moderator của Avin Check để kiểm duyệt trước khi hiển thị công
                  khai.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center pt-2">
                <Button
                  onClick={() => void navigate({ to: "/avin-check/reports" })}
                  type="button"
                >
                  Xem danh sách báo cáo của tôi
                </Button>
                <Button
                  onClick={() => {
                    setSubmittedReportId(undefined);
                    setPrefilledIdentifier("");
                  }}
                  type="button"
                  variant="outline"
                >
                  Gửi đơn tố cáo khác
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      aria-label="Tố cáo lừa đảo Avin Check"
      as="section"
      className="flex w-full flex-col items-start gap-6"
    >
      <Link
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        to="/avin-check"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        Quay lại
      </Link>

      <header className="flex w-full flex-wrap items-start justify-between gap-2 text-left">
        <div>
          <p className="font-medium text-primary text-sm">Avin Check</p>
          <h1
            className="font-bold text-3xl tracking-tight text-foreground"
            id="risk-report-title"
          >
            Tố cáo lừa đảo & rủi ro
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Chung tay cùng cộng đồng tố cáo và ngăn chặn các hành vi lừa đảo
            trực tuyến
          </p>
        </div>
      </header>

      {/* 3 Tabs matching ProviderApplicationForm layout */}
      <div
        className="grid w-full grid-cols-3 gap-2 rounded-2xl border bg-muted/30 p-1.5"
        role="tablist"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              aria-selected={isActive}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 font-semibold text-xs transition ${
                isActive
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-full">
        {activeTab === "BANK_WALLET_PHONE" ? (
          <TransactionReportForm
            initialData={{
              accountNumber: prefilledIdentifier,
            }}
            isSubmitting={isBusy}
            onSubmit={handleTransactionSubmit}
          />
        ) : null}

        {activeTab === "MALICIOUS_WEBSITE" ? (
          <WebsiteReportForm
            initialData={{
              websiteUrl: prefilledIdentifier,
            }}
            isSubmitting={isBusy}
            onSubmit={handleWebsiteSubmit}
          />
        ) : null}

        {activeTab === "SOCIAL_GAME_ACCOUNT" ? (
          <AccountReportForm
            initialData={{
              accountId: prefilledIdentifier,
            }}
            isSubmitting={isBusy}
            onSubmit={handleAccountSubmit}
          />
        ) : null}
      </div>
    </Shell>
  );
};
