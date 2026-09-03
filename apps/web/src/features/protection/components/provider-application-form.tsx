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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
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
import { Bank, Copy, Plus, QrCode, Trash } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { providerApplicationFormSchema } from "../schemas/provider-application-form-schema";
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
const OPTIONAL_CHANNEL_LABELS = {
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
  hotline: string;
  telegramCommunityUrl: string;
  tiktokUrl: string;
  websiteUrl: string;
  youtubeUrl: string;
}

interface ZaloAccountState {
  id: string;
  phone: string;
}

interface FacebookAccountState {
  id: string;
  url: string;
}

interface BankAccountState {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  id: string;
  isPrimary: boolean;
}

export interface ProviderApplicationFormState {
  bio: string;
  bondAmount: number;
  citizenIdNumber: string;
  facebooks: FacebookAccountState[];
  fullName: string;
  location: string;
  officialChannels: OfficialChannelsState;
  policyAccepted: boolean;
  publicDataConsent: boolean;
  registeredBankAccounts: BankAccountState[];
  services: string;
  zalos: ZaloAccountState[];
}

const emptyBankAccount = (isPrimary = true): BankAccountState => ({
  accountName: "",
  accountNumber: "",
  bankCode: "",
  id: globalThis.crypto.randomUUID(),
  isPrimary,
});

const emptyZaloAccount = (): ZaloAccountState => ({
  id: globalThis.crypto.randomUUID(),
  phone: "",
});

const emptyFacebookAccount = (): FacebookAccountState => ({
  id: globalThis.crypto.randomUUID(),
  url: "",
});

const emptyFormState = (): ProviderApplicationFormState => ({
  bio: "",
  bondAmount: DEFAULT_BOND_AMOUNT,
  citizenIdNumber: "",
  facebooks: [emptyFacebookAccount()],
  fullName: "",
  location: "",
  officialChannels: {
    avatarUrl: "",
    hotline: "",
    telegramCommunityUrl: "",
    tiktokUrl: "",
    websiteUrl: "",
    youtubeUrl: "",
  },
  policyAccepted: false,
  publicDataConsent: false,
  registeredBankAccounts: [emptyBankAccount()],
  services: DEFAULT_SERVICES_DRAFT,
  zalos: [emptyZaloAccount()],
});

const createDevelopmentFormState = (): ProviderApplicationFormState => ({
  bio: "Giao dịch trung gian uy tín 24/7",
  bondAmount: DEFAULT_BOND_AMOUNT,
  citizenIdNumber: "079123456789",
  facebooks: [
    {
      id: globalThis.crypto.randomUUID(),
      url: "https://www.facebook.com/vuduyhoanavin05",
    },
  ],
  fullName: "Nguyễn Văn Dev",
  location: "Quận 1, Thành phố Hồ Chí Minh",
  officialChannels: {
    avatarUrl: "",
    hotline: "0900000000",
    telegramCommunityUrl: "https://t.me/avin_check_dev",
    tiktokUrl: "https://www.tiktok.com/@todun2710",
    websiteUrl: "https://avin.dev",
    youtubeUrl: "https://www.youtube.com/@vuduyhoan_avin05",
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
  zalos: [
    {
      id: globalThis.crypto.randomUUID(),
      phone: "0900000000",
    },
  ],
});

const readText = (value: unknown): string =>
  typeof value === "string" ? value : "";

const getZaloAccountsFromApplication = (
  channels: Record<string, unknown> | null | undefined
): ZaloAccountState[] => {
  if (!channels) {
    return [emptyZaloAccount()];
  }
  const zalosArray = Array.isArray(channels.zalos) ? channels.zalos : [];
  if (zalosArray.length > 0) {
    return zalosArray.map((item: unknown) => {
      const z = item as Record<string, unknown>;
      return {
        id: globalThis.crypto.randomUUID(),
        phone: readText(z?.phone),
      };
    });
  }
  const result: ZaloAccountState[] = [];
  if (typeof channels.zalo === "string" && channels.zalo.trim()) {
    result.push({
      id: globalThis.crypto.randomUUID(),
      phone: channels.zalo.trim(),
    });
  }
  if (
    typeof channels.zaloSecondary === "string" &&
    channels.zaloSecondary.trim()
  ) {
    result.push({
      id: globalThis.crypto.randomUUID(),
      phone: channels.zaloSecondary.trim(),
    });
  }
  if (Array.isArray(channels.additionalZalos)) {
    for (const item of channels.additionalZalos) {
      if (typeof item === "string" && item.trim()) {
        result.push({
          id: globalThis.crypto.randomUUID(),
          phone: item.trim(),
        });
      }
    }
  }
  if (result.length === 0) {
    return [emptyZaloAccount()];
  }
  return result;
};

const getFacebookAccountsFromApplication = (
  channels: Record<string, unknown> | null | undefined
): FacebookAccountState[] => {
  if (!channels) {
    return [emptyFacebookAccount()];
  }
  const facebooksArray = Array.isArray(channels.facebooks)
    ? channels.facebooks
    : [];
  if (facebooksArray.length > 0) {
    return facebooksArray.map((item: unknown) => {
      const fb = item as Record<string, unknown>;
      return {
        id: globalThis.crypto.randomUUID(),
        url: readText(fb?.url),
      };
    });
  }
  const result: FacebookAccountState[] = [];
  if (typeof channels.facebookUrl === "string" && channels.facebookUrl.trim()) {
    result.push({
      id: globalThis.crypto.randomUUID(),
      url: channels.facebookUrl.trim(),
    });
  }
  if (
    typeof channels.facebookSecondaryUrl === "string" &&
    channels.facebookSecondaryUrl.trim()
  ) {
    result.push({
      id: globalThis.crypto.randomUUID(),
      url: channels.facebookSecondaryUrl.trim(),
    });
  }
  if (result.length === 0) {
    return [emptyFacebookAccount()];
  }
  return result;
};

const getFormState = (
  application: ProviderApplication | ProviderProfileRevision | null,
  policyVersion: string
): ProviderApplicationFormState => {
  if (!application) {
    return emptyFormState();
  }
  const channels = (application.officialChannels ?? {}) as Record<
    string,
    unknown
  >;
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
    bio: readText(application.bio),
    bondAmount:
      typeof applicationBondAmount === "number" &&
      applicationBondAmount >= DEFAULT_BOND_AMOUNT
        ? applicationBondAmount
        : DEFAULT_BOND_AMOUNT,
    citizenIdNumber: "",
    facebooks: getFacebookAccountsFromApplication(channels),
    fullName: readText(application.fullName),
    location: readText(application.location),
    officialChannels: {
      avatarUrl: readText(channels.avatarUrl),
      hotline: readText(channels.hotline),
      telegramCommunityUrl: readText(channels.telegramCommunityUrl),
      tiktokUrl: readText(channels.tiktokUrl),
      websiteUrl: readText(channels.websiteUrl),
      youtubeUrl: readText(channels.youtubeUrl),
    },
    policyAccepted:
      Boolean(application.policyAcceptedAt) &&
      application.policyVersion === policyVersion,
    publicDataConsent: Boolean(application.publicDataConsent),
    registeredBankAccounts:
      accounts.length > 0 ? accounts : [emptyBankAccount()],
    services: readText(application.services) || DEFAULT_SERVICES_DRAFT,
    zalos: getZaloAccountsFromApplication(channels),
  };
};

const optionalText = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

const toBankAccountPayload = (accounts: BankAccountState[]) =>
  accounts.map(({ id: _id, ...account }) => account);

const buildOfficialChannelsPayload = (
  channels: OfficialChannelsState,
  zalos: ZaloAccountState[],
  facebooks: FacebookAccountState[]
) => {
  const baseChannels = Object.fromEntries(
    Object.entries(channels).map(([key, value]) => [key, optionalText(value)])
  );

  const normalizedZalos = [];
  for (const [index, item] of zalos.entries()) {
    const phone = item.phone.trim();
    if (phone.length > 0) {
      normalizedZalos.push({
        isPrimary: index === 0,
        phone,
      });
    }
  }

  const normalizedFacebooks = [];
  for (const [index, item] of facebooks.entries()) {
    const url = item.url.trim();
    if (url.length > 0) {
      normalizedFacebooks.push({
        isPrimary: index === 0,
        url,
      });
    }
  }

  const primaryZalo = normalizedZalos[0]?.phone;
  const primaryFacebook = normalizedFacebooks[0]?.url;

  return {
    ...baseChannels,
    facebookUrl: primaryFacebook,
    ...(normalizedFacebooks.length > 0
      ? { facebooks: normalizedFacebooks }
      : {}),
    zalo: primaryZalo,
    ...(normalizedZalos.length > 0 ? { zalos: normalizedZalos } : {}),
  };
};

const toDraft = (
  form: ProviderApplicationFormState,
  policyVersion: string
): ProviderApplicationDraft => ({
  bio: optionalText(form.bio),
  bondAmount: form.bondAmount,
  citizenIdNumber: optionalText(form.citizenIdNumber),
  fullName: optionalText(form.fullName),
  location: optionalText(form.location),
  officialChannels: buildOfficialChannelsPayload(
    form.officialChannels,
    form.zalos,
    form.facebooks
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
  bio: optionalText(form.bio),
  bondAmount: form.bondAmount,
  citizenIdNumber: form.citizenIdNumber.trim(),
  fullName: form.fullName.trim(),
  location: form.location.trim(),
  officialChannels: buildOfficialChannelsPayload(
    form.officialChannels,
    form.zalos,
    form.facebooks
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
  onEditForm,
}: {
  intent: ProviderDepositIntentView | null | undefined;
  onEditForm?: () => void;
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
    <div
      className="mx-auto w-full max-w-3xl rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-sm"
      data-testid="provider-deposit-panel"
    >
      <div className="flex items-center gap-2 font-bold text-base text-foreground">
        <QrCode aria-hidden="true" className="size-5 text-primary" />
        Chuyển khoản và chờ đối soát
      </div>
      <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
        Đã tạo lệnh quỹ đảm bảo. Chuyển đúng{" "}
        <strong>{formatVnd(intent.amount)}</strong> trong 24 giờ; hồ sơ sẽ tự
        động chuyển sang trạng thái chờ duyệt sau khi hệ thống đối soát đúng số
        tiền.
      </p>
      {intent.qrUrl ? (
        <div className="my-5 flex flex-col items-center justify-center">
          <img
            alt="Mã QR chuyển khoản vào quỹ đảm bảo của Đối tác"
            className="size-56 rounded-2xl border bg-white p-3 shadow-xs"
            src={intent.qrUrl}
          />
          <span className="mt-2 text-muted-foreground text-xs">
            Quét mã VietQR bằng ứng dụng ngân hàng bất kỳ
          </span>
        </div>
      ) : null}
      <div className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-2xl border bg-background p-4 shadow-2xs">
          <p className="text-muted-foreground">
            Nội dung chuyển khoản (bắt buộc đúng)
          </p>
          <button
            className="mt-1.5 inline-flex items-center gap-1.5 font-mono font-bold text-primary text-sm hover:underline"
            data-testid="provider-payment-code"
            onClick={copyCode}
            type="button"
          >
            {intent.paymentCode} <Copy aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="rounded-2xl border bg-background p-4 shadow-2xs">
          <p className="text-muted-foreground">Thời gian hết hạn</p>
          <p className="mt-1.5 font-semibold text-foreground text-sm">
            {formatDate(intent.expiresAt)}
          </p>
        </div>
      </div>
      {onEditForm ? (
        <div className="mt-5 border-border/60 border-t pt-4">
          <Button
            className="text-xs"
            data-testid="provider-edit-form"
            onClick={onEditForm}
            size="sm"
            type="button"
            variant="ghost"
          >
            ← Chỉnh sửa thông tin hồ sơ
          </Button>
        </div>
      ) : null}
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
  const [activeTab, setActiveTab] = useState<
    "identity_and_channels" | "payout_and_policy"
  >("identity_and_channels");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [createdDepositIntent, setCreatedDepositIntent] =
    useState<ProviderDepositIntentView | null>(null);
  const applicationActions = useProviderApplicationActions();
  const revisionActions = useProviderProfileRevisionActions();
  const depositIntentQuery = useProviderDepositIntent();
  const paymentIntent = depositIntentQuery.data ?? createdDepositIntent;
  const isPendingApplicationDeposit = Boolean(
    mode === "application" &&
    !isEditingForm &&
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

  const defaultValues = useMemo(
    () => getFormState(application, currentPolicyVersion),
    [application, currentPolicyVersion]
  );
  const applicationForm = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        if (mode === "application") {
          await applicationActions.saveDraft.mutateAsync(
            toDraft(value, currentPolicyVersion)
          );
          const existingIntent = depositIntentQuery.data;
          if (existingIntent?.status !== "MATCHED") {
            const createdIntent =
              await applicationActions.createDepositIntent.mutateAsync({
                amount: value.bondAmount,
              });
            setCreatedDepositIntent(createdIntent);
            setIsEditingForm(false);
            toast.success(
              "Đã tạo lệnh chuyển khoản. Vui lòng chuyển khoản và chờ hệ thống đối soát."
            );
            return;
          }
        }
        await (
          mode === "revision"
            ? revisionActions.submit
            : applicationActions.submit
        ).mutateAsync(toSubmission(value, currentPolicyVersion));
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
    },
    validators: { onSubmit: providerApplicationFormSchema },
  });
  const fillDevelopmentForm = () => {
    if (!import.meta.env.DEV) {
      return;
    }
    const nextForm = createDevelopmentFormState();
    // Keep the hook's original defaults in sync with its render options. The
    // form hook re-applies `defaultValues` after a state update, so replacing
    // defaults imperatively here would immediately overwrite the sample data
    // on the next render.
    applicationForm.reset(nextForm, { keepDefaultValues: true });
    setActiveTab("identity_and_channels");
    toast.success("Đã điền dữ liệu mẫu cho môi trường dev.");
  };

  const handleSaveDraft = async () => {
    try {
      const draft = toDraft(applicationForm.state.values, currentPolicyVersion);
      await (
        mode === "revision"
          ? revisionActions.saveDraft
          : applicationActions.saveDraft
      ).mutateAsync(draft);
      toast.success("Đã lưu bản nháp.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu bản nháp."
      );
    }
  };

  if (isPendingApplicationDeposit) {
    return (
      <ProviderDepositPanel
        intent={paymentIntent}
        onEditForm={() => {
          setIsEditingForm(true);
          setActiveTab("identity_and_channels");
        }}
      />
    );
  }

  let submitLabel = "Lưu và chuyển sang thanh toán";
  if (mode === "revision") {
    submitLabel = "Gửi yêu cầu cập nhật";
  } else if (depositIntentQuery.data?.status === "PENDING") {
    submitLabel = "Đã tạo lệnh · chờ đối soát";
  }

  return (
    <form
      className="space-y-6"
      data-testid="provider-application-form"
      id="provider-application-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await applicationForm.handleSubmit();
      }}
    >
      <header className="flex w-full flex-wrap items-start justify-between gap-2 text-left">
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

      <FieldGroup className="space-y-6">
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
                CCCD chỉ dùng để xác minh, không hiển thị công khai và không
                nhận ảnh CCCD.
              </p>
            </div>

            <applicationForm.Field name="officialChannels.avatarUrl">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <ProviderAvatarUploader
                      avatarUrl={field.state.value}
                      disabled={isBusy}
                      onAvatarChange={(value) => field.handleChange(value.url)}
                      onUploadingChange={setIsUploadingAvatar}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </applicationForm.Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <applicationForm.Field name="fullName">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Họ và tên <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        disabled={isBusy}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </applicationForm.Field>
              <applicationForm.Field name="bio">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Dòng giới thiệu ngắn
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        disabled={isBusy}
                        id={field.name}
                        maxLength={150}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="VD: Giao dịch qua Zalo nhé mọi người"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </applicationForm.Field>
              <applicationForm.Field name="citizenIdNumber">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Căn cước công dân (12 số){" "}
                        <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        disabled={isBusy}
                        id={field.name}
                        inputMode="numeric"
                        maxLength={12}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(
                            event.target.value.replaceAll(/\D/gu, "")
                          )
                        }
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </applicationForm.Field>
              <applicationForm.Field name="location">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Địa điểm <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        disabled={isBusy}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Tỉnh/Thành Phố"
                        value={field.state.value}
                      />
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </applicationForm.Field>
            </div>
            <div className="space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5">
              <div>
                <h4 className="font-semibold text-sm">Kênh liên hệ</h4>
                <p className="text-muted-foreground text-xs">
                  Khai báo các kênh liên hệ chính thức; tài khoản đầu tiên là
                  tài khoản chính.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Zalo column */}
                <applicationForm.Field name="zalos">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <div className="flex items-center justify-between">
                          <FieldLabel>
                            Số điện thoại Zalo{" "}
                            <span className="text-destructive">*</span>
                          </FieldLabel>
                          <Button
                            className="size-7 rounded-lg"
                            disabled={isBusy || field.state.value.length >= 10}
                            onClick={() =>
                              field.handleChange([
                                ...field.state.value,
                                emptyZaloAccount(),
                              ])
                            }
                            size="icon"
                            title="Thêm tài khoản Zalo"
                            type="button"
                            variant="outline"
                          >
                            <Plus className="size-3.5" />
                            <span className="sr-only">Thêm tài khoản Zalo</span>
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {field.state.value.map((zalo, index) => (
                            <div
                              className="flex items-center gap-1.5"
                              key={zalo.id}
                            >
                              <div className="flex-1">
                                <FieldLabel
                                  className="sr-only"
                                  htmlFor={`zalo-phone-${index}`}
                                >
                                  {index === 0
                                    ? "Số điện thoại Zalo chính"
                                    : `Số điện thoại Zalo phụ ${index}`}
                                </FieldLabel>
                                <Input
                                  aria-invalid={isInvalid}
                                  disabled={isBusy}
                                  id={`zalo-phone-${index}`}
                                  inputMode="tel"
                                  name={`zalos[${index}].phone`}
                                  onBlur={field.handleBlur}
                                  onChange={(event) =>
                                    field.handleChange(
                                      field.state.value.map(
                                        (account, accountIndex) =>
                                          accountIndex === index
                                            ? {
                                                ...account,
                                                phone: event.target.value,
                                              }
                                            : account
                                      )
                                    )
                                  }
                                  placeholder={
                                    index === 0
                                      ? "Số điện thoại Zalo chính (VD: 0901234567)"
                                      : `Zalo phụ #${index} (VD: 0901234567)`
                                  }
                                  value={zalo.phone}
                                />
                              </div>
                              {field.state.value.length > 1 && index > 0 ? (
                                <Button
                                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const next = field.state.value.filter(
                                      (_, accountIndex) =>
                                        accountIndex !== index
                                    );
                                    field.handleChange(
                                      next.length > 0
                                        ? next
                                        : [emptyZaloAccount()]
                                    );
                                  }}
                                  size="icon"
                                  title="Xóa"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Trash className="size-4" />
                                  <span className="sr-only">Xóa Zalo</span>
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>

                {/* Facebook column */}
                <applicationForm.Field name="facebooks">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <div className="flex items-center justify-between">
                          <FieldLabel>Link Facebook</FieldLabel>
                          <Button
                            className="size-7 rounded-lg"
                            disabled={isBusy || field.state.value.length >= 10}
                            onClick={() =>
                              field.handleChange([
                                ...field.state.value,
                                emptyFacebookAccount(),
                              ])
                            }
                            size="icon"
                            title="Thêm tài khoản Facebook"
                            type="button"
                            variant="outline"
                          >
                            <Plus className="size-3.5" />
                            <span className="sr-only">
                              Thêm tài khoản Facebook
                            </span>
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {field.state.value.map((facebook, index) => (
                            <div
                              className="flex items-center gap-1.5"
                              key={facebook.id}
                            >
                              <div className="flex-1">
                                <FieldLabel
                                  className="sr-only"
                                  htmlFor={`fb-url-${index}`}
                                >
                                  {index === 0
                                    ? "Link Facebook chính"
                                    : `Link Facebook phụ ${index}`}
                                </FieldLabel>
                                <Input
                                  aria-invalid={isInvalid}
                                  disabled={isBusy}
                                  id={`fb-url-${index}`}
                                  name={`facebooks[${index}].url`}
                                  onBlur={field.handleBlur}
                                  onChange={(event) =>
                                    field.handleChange(
                                      field.state.value.map(
                                        (account, accountIndex) =>
                                          accountIndex === index
                                            ? {
                                                ...account,
                                                url: event.target.value,
                                              }
                                            : account
                                      )
                                    )
                                  }
                                  placeholder={
                                    index === 0
                                      ? "Link Facebook chính (https://facebook.com/...)"
                                      : `Facebook phụ #${index} (https://facebook.com/...)`
                                  }
                                  type="url"
                                  value={facebook.url}
                                />
                              </div>
                              {field.state.value.length > 1 && index > 0 ? (
                                <Button
                                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    const next = field.state.value.filter(
                                      (_, accountIndex) =>
                                        accountIndex !== index
                                    );
                                    field.handleChange(
                                      next.length > 0
                                        ? next
                                        : [emptyFacebookAccount()]
                                    );
                                  }}
                                  size="icon"
                                  title="Xóa"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Trash className="size-4" />
                                  <span className="sr-only">Xóa Facebook</span>
                                </Button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>

                {/* Other channels */}
                <applicationForm.Field name="officialChannels.hotline">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Số điện thoại / Hotline
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          disabled={isBusy}
                          id={field.name}
                          inputMode="tel"
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          placeholder="VD: 0901234567"
                          type="tel"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>
                <applicationForm.Field name="officialChannels.telegramCommunityUrl">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          {OPTIONAL_CHANNEL_LABELS.telegramCommunityUrl}
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          disabled={isBusy}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          type="url"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>
                <applicationForm.Field name="officialChannels.tiktokUrl">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          {OPTIONAL_CHANNEL_LABELS.tiktokUrl}
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          disabled={isBusy}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          type="url"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>
                <applicationForm.Field name="officialChannels.youtubeUrl">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          {OPTIONAL_CHANNEL_LABELS.youtubeUrl}
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          disabled={isBusy}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          type="url"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>
                <applicationForm.Field name="officialChannels.websiteUrl">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          {OPTIONAL_CHANNEL_LABELS.websiteUrl}
                        </FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          disabled={isBusy}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          type="url"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    );
                  }}
                </applicationForm.Field>
              </div>
            </div>
            <applicationForm.Field name="services">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Dịch vụ cung cấp{" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={isBusy}
                      id={field.name}
                      maxLength={4000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      rows={7}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </applicationForm.Field>
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
            <applicationForm.Field name="bondAmount">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field
                    className="space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"
                    data-invalid={isInvalid}
                  >
                    <FieldLabel htmlFor={field.name}>
                      Số tiền quỹ đảm bảo (VND){" "}
                      <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      disabled={isBusy}
                      id={field.name}
                      inputMode="numeric"
                      min={DEFAULT_BOND_AMOUNT}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(
                          Number(event.target.value.replaceAll(/\D/gu, "")) || 0
                        )
                      }
                      type="number"
                      value={field.state.value || ""}
                    />
                    <div className="flex flex-wrap gap-2">
                      {BOND_PRESETS.map((amount) => (
                        <Button
                          className="h-8 rounded-full text-xs"
                          key={amount}
                          onClick={() => field.handleChange(amount)}
                          size="sm"
                          type="button"
                          variant={
                            field.state.value === amount ? "default" : "outline"
                          }
                        >
                          {formatVnd(amount)}
                        </Button>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Hạng hiện tại theo số tiền trong quỹ đảm bảo:{" "}
                      <strong className="text-foreground">
                        {providerTierLabel(getProviderTier(field.state.value))}
                      </strong>
                      . Hạn mức giao dịch đề xuất tối đa bằng 80% số tiền trong
                      quỹ đảm bảo.
                    </p>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </applicationForm.Field>
            <applicationForm.Field name="registeredBankAccounts">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                const updateAccount = (
                  index: number,
                  update: Partial<BankAccountState>
                ) => {
                  const nextAccounts = field.state.value.map(
                    (account, accountIndex) => {
                      if (accountIndex === index) {
                        return { ...account, ...update };
                      }
                      if (update.isPrimary === true) {
                        return { ...account, isPrimary: false };
                      }
                      return account;
                    }
                  );
                  field.handleChange(nextAccounts);
                };
                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel>
                        <Bank
                          aria-hidden="true"
                          className="mr-1 inline size-4"
                        />
                        Tài khoản ngân hàng
                      </FieldLabel>
                      <Button
                        disabled={isBusy || field.state.value.length >= 10}
                        onClick={() =>
                          field.handleChange([
                            ...field.state.value,
                            emptyBankAccount(false),
                          ])
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Thêm tài khoản
                      </Button>
                    </div>
                    {field.state.value.map((account, index) => (
                      <div
                        className="grid gap-3 rounded-2xl border p-4 sm:grid-cols-4"
                        key={account.id}
                      >
                        <div className="space-y-2 sm:col-span-2">
                          <FieldLabel htmlFor={`bank-name-${index}`}>
                            Tên chủ tài khoản
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            disabled={isBusy}
                            id={`bank-name-${index}`}
                            name={`registeredBankAccounts[${index}].accountName`}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              updateAccount(index, {
                                accountName: event.target.value,
                              })
                            }
                            value={account.accountName}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor={`bank-number-${index}`}>
                            Số tài khoản
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            disabled={isBusy}
                            id={`bank-number-${index}`}
                            inputMode="numeric"
                            name={`registeredBankAccounts[${index}].accountNumber`}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              updateAccount(index, {
                                accountNumber: event.target.value.replaceAll(
                                  /\D/gu,
                                  ""
                                ),
                              })
                            }
                            value={account.accountNumber}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel htmlFor={`bank-code-${index}`}>
                            Ngân hàng
                          </FieldLabel>
                          <Select
                            items={BANK_ITEMS}
                            onValueChange={(value) =>
                              updateAccount(index, { bankCode: value ?? "" })
                            }
                            value={account.bankCode || null}
                          >
                            <SelectTrigger
                              className="w-full"
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
                              updateAccount(index, {
                                isPrimary: Boolean(checked),
                              })
                            }
                          />
                          <FieldLabel htmlFor={`bank-primary-${index}`}>
                            Tài khoản chính
                          </FieldLabel>
                          {field.state.value.length > 1 ? (
                            <Button
                              className="ml-auto"
                              onClick={() => {
                                const next = field.state.value.filter(
                                  (_, accountIndex) => accountIndex !== index
                                );
                                if (
                                  !next.some((item) => item.isPrimary) &&
                                  next[0]
                                ) {
                                  next[0] = { ...next[0], isPrimary: true };
                                }
                                field.handleChange(
                                  next.length > 0 ? next : [emptyBankAccount()]
                                );
                              }}
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
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </applicationForm.Field>
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-4">
              <applicationForm.Field name="publicDataConsent">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} orientation="horizontal">
                      <Checkbox
                        aria-invalid={isInvalid}
                        checked={field.state.value}
                        disabled={isBusy}
                        id={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(Boolean(checked))
                        }
                      />
                      <FieldLabel
                        className="text-xs leading-5"
                        htmlFor={field.name}
                      >
                        Tôi đồng ý công khai chính xác số tiền trong quỹ đảm
                        bảo, hạng, hạn mức giao dịch đề xuất, địa điểm, kênh
                        liên hệ và toàn bộ số tài khoản ngân hàng sau khi được
                        duyệt.
                      </FieldLabel>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </applicationForm.Field>
              <applicationForm.Field name="policyAccepted">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} orientation="horizontal">
                      <Checkbox
                        aria-invalid={isInvalid}
                        checked={field.state.value}
                        disabled={isBusy}
                        id={field.name}
                        onCheckedChange={(checked) =>
                          field.handleChange(Boolean(checked))
                        }
                      />
                      <FieldLabel
                        className="text-xs leading-5"
                        htmlFor={field.name}
                      >
                        Tôi đồng ý{" "}
                        <Link
                          className="text-primary underline"
                          rel="noopener noreferrer"
                          target="_blank"
                          to="/avin-check/partner-policy"
                        >
                          Quy chế Hoạt động Đối tác Avin Check (
                          {currentPolicyVersion})
                        </Link>
                        .
                      </FieldLabel>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </applicationForm.Field>
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
              <applicationForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    data-testid="provider-submit-application"
                    disabled={isBusy || !canSubmit || isSubmitting}
                    type="submit"
                  >
                    {isSubmitting || isBusy ? "Đang xử lý…" : submitLabel}
                  </Button>
                )}
              </applicationForm.Subscribe>
            </div>
          </section>
        )}
      </FieldGroup>

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
) => (
  <ProviderApplicationFormContent
    key={props.mode ?? "application"}
    {...props}
  />
);

export { ProviderApplicationFormSkeleton } from "./provider-application-form-skeleton";
