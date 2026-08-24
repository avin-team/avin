import type {
  ProviderApplicationDraft,
  ProviderApplicationSubmission,
} from "@avin/api/protection/provider-application";
import { CURRENT_PROVIDER_POLICY_VERSION } from "@avin/api/protection/provider-application";
import {
  getProviderTier,
  providerTierLabel as providerTierLabels,
} from "@avin/api/protection/provider-tier";
import { Button } from "@avin/ui/components/button";
import { Checkbox } from "@avin/ui/components/checkbox";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { Bank, Copy, QrCode } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  useProviderApplicationActions,
  useProviderDepositIntent,
  useProviderProfileRevisionActions,
} from "../api/provider-api";
import type {
  ProviderApplication,
  ProviderProfileRevision,
} from "../api/provider-api";
import { ProviderAvatarUploader } from "./provider-avatar-uploader";

const DEFAULT_BOND_AMOUNT = 1_000_000;
const DEFAULT_SERVICES_DRAFT = "• Dịch vụ cung cấp của tôi";
const BANK_CODES = [
  "VCB",
  "TCB",
  "MB",
  "BIDV",
  "CTG",
  "ACB",
  "VPB",
  "TPB",
  "STB",
  "Other",
];

const BANK_ITEMS = [
  { label: "Chọn ngân hàng", value: null },
  ...BANK_CODES.map((bank) => ({ label: bank, value: bank })),
];
const BOND_PRESETS = [
  1_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000, 100_000_000,
];
const ACCOUNT_NUMBER_PATTERN = /^\d{4,30}$/u;
const CITIZEN_ID_PATTERN = /^\d{12}$/u;
const OPTIONAL_CHANNEL_LABELS = {
  facebookUrl: "Facebook",
  telegramCommunityUrl: "Telegram",
  tiktokUrl: "TikTok",
  websiteUrl: "Website",
  youtubeUrl: "YouTube",
} as const;
const vndFormatter = new Intl.NumberFormat("vi-VN");
const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
});
const providerTierLabel = Object.assign(
  (tier: keyof typeof providerTierLabels): string => providerTierLabels[tier],
  providerTierLabels
);

interface OfficialChannelsState {
  avatarUrl: string;
  facebookUrl: string;
  hotline: string;
  telegramCommunityUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  youtubeUrl: string;
  zalo: string;
}

interface BankAccountState {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  id: string;
  isPrimary: boolean;
}

export interface ProviderApplicationFormState {
  bondAmount: number;
  citizenIdNumber: string;
  fullName: string;
  location: string;
  officialChannels: OfficialChannelsState;
  policyAccepted: boolean;
  publicDataConsent: boolean;
  registeredBankAccounts: BankAccountState[];
  services: string;
}

const emptyBankAccount = (isPrimary = true): BankAccountState => ({
  accountName: "",
  accountNumber: "",
  bankCode: "",
  id: globalThis.crypto.randomUUID(),
  isPrimary,
});

const emptyFormState = (): ProviderApplicationFormState => ({
  bondAmount: DEFAULT_BOND_AMOUNT,
  citizenIdNumber: "",
  fullName: "",
  location: "",
  officialChannels: {
    avatarUrl: "",
    facebookUrl: "",
    hotline: "",
    telegramCommunityUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    youtubeUrl: "",
    zalo: "",
  },
  policyAccepted: false,
  publicDataConsent: false,
  registeredBankAccounts: [emptyBankAccount()],
  services: DEFAULT_SERVICES_DRAFT,
});

const createDevelopmentFormState = (): ProviderApplicationFormState => ({
  bondAmount: DEFAULT_BOND_AMOUNT,
  citizenIdNumber: "079123456789",
  fullName: "Nguyễn Văn Dev",
  location: "Quận 1, Thành phố Hồ Chí Minh",
  officialChannels: {
    avatarUrl: "",
    facebookUrl: "https://www.facebook.com/vuduyhoanavin05",
    hotline: "0900000000",
    telegramCommunityUrl: "https://t.me/avin_check_dev",
    tiktokUrl: "https://www.tiktok.com/@todun2710",
    websiteUrl: "https://avin.dev",
    youtubeUrl: "https://www.youtube.com/@vuduyhoan_avin05",
    zalo: "0900000000",
  },
  policyAccepted: true,
  publicDataConsent: true,
  registeredBankAccounts: [
    {
      accountName: "NGUYEN VAN DEV",
      accountNumber: "970412345678",
      bankCode: "VCB",
      id: globalThis.crypto.randomUUID(),
      isPrimary: true,
    },
  ],
  services:
    "Cung cấp dịch vụ tư vấn, thiết kế và hỗ trợ kỹ thuật cho mục đích kiểm thử Provider.",
});

const readText = (value: unknown): string =>
  typeof value === "string" ? value : "";

const getFormState = (
  application: ProviderApplication | ProviderProfileRevision | null,
  policyVersion: string
): ProviderApplicationFormState => {
  if (!application) {
    return emptyFormState();
  }
  const channels = application.officialChannels ?? {};
  const applicationBondAmount =
    "bondAmount" in application ? application.bondAmount : null;
  const accounts = (application.registeredBankAccounts ?? []).map(
    (account) => ({
      accountName: readText(account.accountName),
      accountNumber: readText(account.accountNumber),
      bankCode: readText(account.bankCode),
      id: globalThis.crypto.randomUUID(),
      isPrimary: Boolean(account.isPrimary),
    })
  );
  return {
    bondAmount:
      typeof applicationBondAmount === "number" &&
      applicationBondAmount >= DEFAULT_BOND_AMOUNT
        ? applicationBondAmount
        : DEFAULT_BOND_AMOUNT,
    citizenIdNumber: "",
    fullName: readText(application.fullName),
    location: readText(application.location),
    officialChannels: {
      avatarUrl: readText(channels.avatarUrl),
      facebookUrl: readText(channels.facebookUrl),
      hotline: readText(channels.hotline),
      telegramCommunityUrl: readText(channels.telegramCommunityUrl),
      tiktokUrl: readText(channels.tiktokUrl),
      websiteUrl: readText(channels.websiteUrl),
      youtubeUrl: readText(channels.youtubeUrl),
      zalo: readText(channels.zalo),
    },
    policyAccepted:
      Boolean(application.policyAcceptedAt) &&
      application.policyVersion === policyVersion,
    publicDataConsent: Boolean(application.publicDataConsent),
    registeredBankAccounts:
      accounts.length > 0 ? accounts : [emptyBankAccount()],
    services: readText(application.services) || DEFAULT_SERVICES_DRAFT,
  };
};

const optionalText = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

const toBankAccountPayload = (accounts: BankAccountState[]) =>
  accounts.map(({ id: _id, ...account }) => account);

const toDraft = (
  form: ProviderApplicationFormState,
  policyVersion: string
): ProviderApplicationDraft => ({
  bondAmount: form.bondAmount,
  citizenIdNumber: optionalText(form.citizenIdNumber),
  fullName: optionalText(form.fullName),
  location: optionalText(form.location),
  officialChannels: Object.fromEntries(
    Object.entries(form.officialChannels).map(([key, value]) => [
      key,
      optionalText(value),
    ])
  ),
  policyAccepted: form.policyAccepted,
  policyVersion,
  publicDataConsent: form.publicDataConsent,
  registeredBankAccounts: toBankAccountPayload(form.registeredBankAccounts),
  services: optionalText(form.services),
});

const toSubmission = (
  form: ProviderApplicationFormState,
  policyVersion: string
): ProviderApplicationSubmission => ({
  bondAmount: form.bondAmount,
  citizenIdNumber: form.citizenIdNumber.trim(),
  fullName: form.fullName.trim(),
  location: form.location.trim(),
  officialChannels: Object.fromEntries(
    Object.entries(form.officialChannels).map(([key, value]) => [
      key,
      optionalText(value),
    ])
  ),
  policyAccepted: form.policyAccepted,
  policyVersion,
  publicDataConsent: true,
  registeredBankAccounts: toBankAccountPayload(form.registeredBankAccounts),
  services: form.services.trim(),
});

const formatVnd = (amount: number): string =>
  `${vndFormatter.format(amount)} ₫`;

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
};

interface ProviderDepositIntentView {
  amount: number;
  expiresAt: string;
  kind: string;
  paymentCode: string;
  qrUrl: string | null;
  status: string;
}

const ProviderDepositPanel = ({
  intent,
}: {
  intent: ProviderDepositIntentView | null | undefined;
}) => {
  if (
    !intent ||
    intent.kind !== "APPLICATION" ||
    intent.status === "MATCHED" ||
    intent.status === "EXPIRED" ||
    intent.status === "REFUNDED" ||
    intent.status === "REFUND_PENDING"
  ) {
    return null;
  }
  if (intent.status !== "PENDING") {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-semibold">Đã nhận giao dịch, đang chờ đối soát</p>
        <p className="mt-1 text-muted-foreground">
          Admin sẽ kiểm tra giao dịch lệch nội dung hoặc số tiền và cập nhật
          trạng thái hồ sơ.
        </p>
      </div>
    );
  }
  const copyCode = async () => {
    if (!navigator.clipboard) {
      toast.error("Trình duyệt không hỗ trợ sao chép tự động.");
      return;
    }
    try {
      await navigator.clipboard.writeText(intent.paymentCode);
      toast.success("Đã sao chép nội dung chuyển khoản.");
    } catch {
      toast.error("Không thể sao chép nội dung chuyển khoản.");
    }
  };
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <QrCode aria-hidden="true" className="size-5 text-primary" />
        Chuyển khoản và chờ đối soát
      </div>
      <p className="mt-1 text-muted-foreground text-xs">
        Đã tạo lệnh quỹ đảm bảo. Chuyển đúng {formatVnd(intent.amount)} trong 24
        giờ; hồ sơ sẽ chuyển sang chờ duyệt sau khi hệ thống đối soát đúng số
        tiền.
      </p>
      {intent.qrUrl ? (
        <img
          alt="Mã QR chuyển khoản vào quỹ đảm bảo của Đối tác"
          className="mx-auto my-4 size-52 rounded-xl border bg-white p-2"
          src={intent.qrUrl}
        />
      ) : null}
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl bg-background p-3">
          <p className="text-muted-foreground">Nội dung chuyển khoản</p>
          <button
            className="mt-1 inline-flex items-center gap-1 font-mono font-semibold text-primary"
            onClick={copyCode}
            type="button"
          >
            {intent.paymentCode}{" "}
            <Copy aria-hidden="true" className="size-3.5" />
          </button>
        </div>
        <div className="rounded-xl bg-background p-3">
          <p className="text-muted-foreground">Hết hạn</p>
          <p className="mt-1 font-semibold">{formatDate(intent.expiresAt)}</p>
        </div>
      </div>
    </div>
  );
};

interface ProviderApplicationFormProps {
  application: ProviderApplication | ProviderProfileRevision | null;
  currentPolicyVersion?: string;
  mode?: "application" | "revision";
}

// oxlint-disable-next-line complexity
const ProviderApplicationFormContent = ({
  application,
  currentPolicyVersion = CURRENT_PROVIDER_POLICY_VERSION,
  mode = "application",
}: ProviderApplicationFormProps) => {
  const [form, setForm] = useState(() =>
    getFormState(application, currentPolicyVersion)
  );
  const [activeTab, setActiveTab] = useState<
    "identity_and_channels" | "payout_and_policy"
  >("identity_and_channels");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [createdDepositIntent, setCreatedDepositIntent] =
    useState<ProviderDepositIntentView | null>(null);
  const applicationActions = useProviderApplicationActions();
  const revisionActions = useProviderProfileRevisionActions();
  const depositIntentQuery = useProviderDepositIntent();
  const paymentIntent = depositIntentQuery.data ?? createdDepositIntent;
  const isPendingApplicationDeposit = Boolean(
    mode === "application" &&
    paymentIntent?.kind === "APPLICATION" &&
    paymentIntent.status === "PENDING"
  );

  const { saveDraft, submit } =
    mode === "revision" ? revisionActions : applicationActions;
  const isBusy =
    saveDraft.isPending ||
    submit.isPending ||
    isUploadingAvatar ||
    ("createDepositIntent" in applicationActions &&
      applicationActions.createDepositIntent.isPending);

  const updateField = <K extends keyof ProviderApplicationFormState>(
    field: K,
    value: ProviderApplicationFormState[K]
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };
  const updateChannel = (field: keyof OfficialChannelsState, value: string) => {
    setForm((previous) => ({
      ...previous,
      officialChannels: { ...previous.officialChannels, [field]: value },
    }));
  };
  const updateBank = (
    index: number,
    field: keyof BankAccountState,
    value: string | boolean
  ) => {
    setForm((previous) => {
      const registeredBankAccounts = previous.registeredBankAccounts.map(
        (account, accountIndex) => {
          if (accountIndex === index) {
            return { ...account, [field]: value };
          }
          if (field === "isPrimary" && value === true) {
            return { ...account, isPrimary: false };
          }
          return account;
        }
      );
      return { ...previous, registeredBankAccounts };
    });
  };
  const addBank = () => {
    setForm((previous) => ({
      ...previous,
      registeredBankAccounts: [
        ...previous.registeredBankAccounts,
        emptyBankAccount(false),
      ],
    }));
  };
  const removeBank = (index: number) => {
    setForm((previous) => {
      const next = previous.registeredBankAccounts.filter(
        (_, accountIndex) => accountIndex !== index
      );
      if (!next.some((account) => account.isPrimary) && next[0]) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return {
        ...previous,
        registeredBankAccounts: next.length > 0 ? next : [emptyBankAccount()],
      };
    });
  };
  const fillDevelopmentForm = () => {
    if (!import.meta.env.DEV) {
      return;
    }
    setForm(createDevelopmentFormState());
    setActiveTab("identity_and_channels");
    toast.success("Đã điền dữ liệu mẫu cho môi trường dev.");
  };

  const tier = useMemo(
    () => getProviderTier(form.bondAmount),
    [form.bondAmount]
  );
  const validBankAccounts = form.registeredBankAccounts.every(
    (account) =>
      account.accountName.trim() &&
      ACCOUNT_NUMBER_PATTERN.test(account.accountNumber.trim()) &&
      account.bankCode.trim()
  );
  const hasOnePrimaryBankAccount =
    form.registeredBankAccounts.filter((account) => account.isPrimary)
      .length === 1;
  const canSubmit = Boolean(
    form.bondAmount >= DEFAULT_BOND_AMOUNT &&
    form.fullName.trim() &&
    form.location.trim() &&
    CITIZEN_ID_PATTERN.test(form.citizenIdNumber.trim()) &&
    form.officialChannels.zalo.trim() &&
    form.services.trim() &&
    form.policyAccepted &&
    form.publicDataConsent &&
    form.registeredBankAccounts.length > 0 &&
    validBankAccounts &&
    hasOnePrimaryBankAccount
  );

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync(toDraft(form, currentPolicyVersion) as never);
      toast.success("Đã lưu bản nháp.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu bản nháp."
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      toast.error(
        "Vui lòng hoàn thiện CCCD, địa điểm, kênh liên hệ, tài khoản ngân hàng và các xác nhận."
      );
      return;
    }
    try {
      if (mode === "application") {
        await applicationActions.saveDraft.mutateAsync(
          toDraft(form, currentPolicyVersion) as never
        );
        const existingIntent = depositIntentQuery.data;
        if (existingIntent?.status !== "MATCHED") {
          const createdIntent =
            await applicationActions.createDepositIntent.mutateAsync({
              amount: form.bondAmount,
            });
          setCreatedDepositIntent(createdIntent);
          toast.success(
            "Đã tạo lệnh chuyển khoản. Vui lòng chuyển khoản và chờ hệ thống đối soát."
          );
          return;
        }
      }
      await submit.mutateAsync(
        toSubmission(form, currentPolicyVersion) as never
      );
      toast.success(
        mode === "revision"
          ? "Đã gửi yêu cầu cập nhật hồ sơ."
          : "Đã gửi hồ sơ đăng ký đối tác."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gửi hồ sơ."
      );
    }
  };

  if (isPendingApplicationDeposit) {
    return <ProviderDepositPanel intent={paymentIntent} />;
  }

  let submitLabel = "Lưu và chuyển sang thanh toán";
  if (mode === "revision") {
    submitLabel = "Gửi yêu cầu cập nhật";
  } else if (depositIntentQuery.data?.status === "PENDING") {
    submitLabel = "Đã tạo lệnh · chờ đối soát";
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <header className="flex w-full max-w-3xl flex-wrap items-start justify-between gap-2 text-left">
        <div>
          <p className="font-medium text-primary text-sm">Avin Check</p>
          <h1
            className="font-bold text-3xl tracking-tight text-foreground"
            id="provider-application-title"
          >
            Đăng ký đối tác
          </h1>
          <p className="text-muted-foreground">
            Phí tham gia hiện tại: 0 ₫ · Quỹ đảm bảo tối thiểu: 1.000.000 ₫
          </p>
        </div>
        {import.meta.env.DEV ? (
          <Button
            disabled={isBusy}
            onClick={fillDevelopmentForm}
            size="sm"
            type="button"
            variant="outline"
          >
            Điền dữ liệu mẫu
          </Button>
        ) : null}
      </header>

      <div
        className="grid grid-cols-2 gap-2 rounded-2xl border bg-muted/30 p-1.5"
        role="tablist"
      >
        <button
          aria-selected={activeTab === "identity_and_channels"}
          className={`rounded-xl py-2.5 font-semibold text-xs ${activeTab === "identity_and_channels" ? "bg-card text-primary shadow-xs" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("identity_and_channels")}
          role="tab"
          type="button"
        >
          1. Thông tin & liên hệ
        </button>
        <button
          aria-selected={activeTab === "payout_and_policy"}
          className={`rounded-xl py-2.5 font-semibold text-xs ${activeTab === "payout_and_policy" ? "bg-card text-primary shadow-xs" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("payout_and_policy")}
          role="tab"
          type="button"
        >
          2. Quỹ đảm bảo & cam kết
        </button>
      </div>

      {activeTab === "identity_and_channels" ? (
        <section
          className="space-y-5 rounded-3xl border bg-card p-6"
          aria-labelledby="provider-identity-heading"
        >
          <div>
            <h3 className="font-bold text-lg" id="provider-identity-heading">
              Thông tin định danh và địa điểm
            </h3>
            <p className="text-muted-foreground text-xs">
              CCCD chỉ dùng để xác minh, không hiển thị công khai và không nhận
              ảnh CCCD.
            </p>
          </div>

          <ProviderAvatarUploader
            avatarUrl={form.officialChannels.avatarUrl}
            disabled={isBusy}
            onAvatarChange={(value) => updateChannel("avatarUrl", value.url)}
            onUploadingChange={setIsUploadingAvatar}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="app-full-name">
                Họ và tên <span className="text-destructive">*</span>
              </Label>
              <Input
                disabled={isBusy}
                id="app-full-name"
                onChange={(event) =>
                  updateField("fullName", event.target.value)
                }
                value={form.fullName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app-citizen-id">
                Căn cước công dân (12 số){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                disabled={isBusy}
                id="app-citizen-id"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) =>
                  updateField(
                    "citizenIdNumber",
                    event.target.value.replaceAll(/\D/gu, "")
                  )
                }
                value={form.citizenIdNumber}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="app-location">
                Địa điểm (Tỉnh/Thành Phố){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                disabled={isBusy}
                id="app-location"
                placeholder="Quận/huyện, tỉnh/thành phố"
                onChange={(event) =>
                  updateField("location", event.target.value)
                }
                value={form.location}
              />
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-4">
            <h4 className="mb-3 font-semibold text-sm">Kênh liên hệ</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app-zalo">
                  Zalo <span className="text-destructive">*</span>
                </Label>
                <Input
                  disabled={isBusy}
                  id="app-zalo"
                  onChange={(event) =>
                    updateChannel("zalo", event.target.value)
                  }
                  value={form.officialChannels.zalo}
                />
              </div>
              {(
                [
                  "facebookUrl",
                  "telegramCommunityUrl",
                  "tiktokUrl",
                  "youtubeUrl",
                  "websiteUrl",
                ] as const
              ).map((field) => (
                <div className="space-y-2" key={field}>
                  <Label htmlFor={`app-${field}`}>
                    {OPTIONAL_CHANNEL_LABELS[field]}
                  </Label>
                  <Input
                    disabled={isBusy}
                    id={`app-${field}`}
                    onChange={(event) =>
                      updateChannel(field, event.target.value)
                    }
                    type="url"
                    value={form.officialChannels[field]}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="app-hotline">Số điện thoại</Label>
                <Input
                  disabled={isBusy}
                  id="app-hotline"
                  inputMode="tel"
                  onChange={(event) =>
                    updateChannel("hotline", event.target.value)
                  }
                  type="tel"
                  value={form.officialChannels.hotline}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-services">
              Dịch vụ cung cấp <span className="text-destructive">*</span>
            </Label>
            <Textarea
              disabled={isBusy}
              id="app-services"
              maxLength={4000}
              onChange={(event) => updateField("services", event.target.value)}
              rows={7}
              value={form.services}
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setActiveTab("payout_and_policy")}
              type="button"
            >
              Tiếp tục
            </Button>
          </div>
        </section>
      ) : (
        <section
          className="space-y-5 rounded-3xl border bg-card p-6"
          aria-labelledby="provider-bond-heading"
        >
          <div>
            <h3 className="font-bold text-lg" id="provider-bond-heading">
              Quỹ đảm bảo và tài khoản ngân hàng
            </h3>
            <p className="text-muted-foreground text-xs">
              Có thể khai nhiều tài khoản; đúng một tài khoản là tài khoản
              chính. Các số tài khoản sẽ được công khai sau khi duyệt.
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <Label htmlFor="app-bond">
              Số tiền quỹ đảm bảo (VND){" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              disabled={isBusy}
              id="app-bond"
              inputMode="numeric"
              min={DEFAULT_BOND_AMOUNT}
              onChange={(event) =>
                updateField(
                  "bondAmount",
                  Number(event.target.value.replaceAll(/\D/gu, "")) || 0
                )
              }
              type="number"
              value={form.bondAmount || ""}
            />
            <div className="flex flex-wrap gap-2">
              {BOND_PRESETS.map((amount) => (
                <Button
                  className="h-8 rounded-full text-xs"
                  key={amount}
                  onClick={() => updateField("bondAmount", amount)}
                  size="sm"
                  type="button"
                  variant={form.bondAmount === amount ? "default" : "outline"}
                >
                  {formatVnd(amount)}
                </Button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Hạng hiện tại theo số tiền trong quỹ đảm bảo:{" "}
              <strong className="text-foreground">
                {providerTierLabel(tier)}
              </strong>
              . Hạn mức giao dịch đề xuất tối đa bằng 80% số tiền trong quỹ đảm
              bảo.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">
                <Bank aria-hidden="true" className="mr-1 inline size-4" />
                Tài khoản ngân hàng
              </h4>
              <Button
                disabled={isBusy || form.registeredBankAccounts.length >= 10}
                onClick={addBank}
                size="sm"
                type="button"
                variant="outline"
              >
                Thêm tài khoản
              </Button>
            </div>
            {form.registeredBankAccounts.map((account, index) => (
              <div
                className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-4"
                key={account.id}
              >
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor={`bank-name-${index}`}>
                    Tên chủ tài khoản
                  </Label>
                  <Input
                    disabled={isBusy}
                    id={`bank-name-${index}`}
                    onChange={(event) =>
                      updateBank(index, "accountName", event.target.value)
                    }
                    value={account.accountName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`bank-number-${index}`}>Số tài khoản</Label>
                  <Input
                    disabled={isBusy}
                    id={`bank-number-${index}`}
                    inputMode="numeric"
                    onChange={(event) =>
                      updateBank(
                        index,
                        "accountNumber",
                        event.target.value.replaceAll(/\D/gu, "")
                      )
                    }
                    value={account.accountNumber}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`bank-code-${index}`}>Ngân hàng</Label>
                  <Select
                    items={BANK_ITEMS}
                    onValueChange={(value) =>
                      updateBank(index, "bankCode", value ?? "")
                    }
                    value={account.bankCode || null}
                  >
                    <SelectTrigger
                      className="h-9 w-full rounded-xl border bg-background px-3 text-sm"
                      disabled={isBusy}
                      id={`bank-code-${index}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {BANK_ITEMS.map((item) => (
                          <SelectItem
                            key={item.value ?? "empty"}
                            value={item.value}
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 sm:col-span-4">
                  <Checkbox
                    checked={account.isPrimary}
                    disabled={isBusy}
                    id={`bank-primary-${index}`}
                    onCheckedChange={(checked) =>
                      updateBank(index, "isPrimary", Boolean(checked))
                    }
                  />
                  <Label htmlFor={`bank-primary-${index}`}>
                    Tài khoản chính
                  </Label>
                  {form.registeredBankAccounts.length > 1 ? (
                    <Button
                      className="ml-auto"
                      onClick={() => removeBank(index)}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      Xóa
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={form.publicDataConsent}
                disabled={isBusy}
                id="app-public-consent"
                onCheckedChange={(checked) =>
                  updateField("publicDataConsent", Boolean(checked))
                }
              />
              <Label className="text-xs leading-5" htmlFor="app-public-consent">
                Tôi đồng ý công khai chính xác số tiền trong quỹ đảm bảo, hạng,
                hạn mức giao dịch đề xuất, địa điểm, kênh liên hệ và toàn bộ số
                tài khoản ngân hàng sau khi được duyệt.
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                checked={form.policyAccepted}
                disabled={isBusy}
                id="app-policy-accepted"
                onCheckedChange={(checked) =>
                  updateField("policyAccepted", Boolean(checked))
                }
              />
              <Label
                className="text-xs leading-5"
                htmlFor="app-policy-accepted"
              >
                Tôi đồng ý{" "}
                <Link
                  className="text-primary underline"
                  rel="noopener noreferrer"
                  target="_blank"
                  to="/avin-check/partner-policy"
                >
                  Quy chế Hoạt động Đối tác Avin Check ({currentPolicyVersion})
                </Link>
                .
              </Label>
            </div>
          </div>
          <ProviderDepositPanel intent={paymentIntent} />
          <div className="flex justify-between">
            <Button
              onClick={() => setActiveTab("identity_and_channels")}
              type="button"
              variant="outline"
            >
              Quay lại
            </Button>
            <Button disabled={isBusy || !canSubmit} type="submit">
              {submitLabel}
            </Button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap justify-between gap-3">
        <Button
          disabled={isBusy}
          onClick={handleSaveDraft}
          type="button"
          variant="outline"
        >
          Lưu bản nháp
        </Button>
        <p className="text-muted-foreground text-xs">
          Thông tin CCCD chỉ dùng cho xác minh nội bộ; ảnh CCCD không được nhận.
        </p>
      </div>
    </form>
  );
};

export const ProviderApplicationForm = (
  props: ProviderApplicationFormProps
) => {
  const formKey = `${props.mode ?? "application"}:${props.application?.id ?? "empty"}`;
  return <ProviderApplicationFormContent key={formKey} {...props} />;
};
