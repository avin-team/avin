import type {
  ProviderApplicationDraft,
  ProviderApplicationSubmission,
} from "@avin/api/protection/provider-application";
import { CURRENT_PROVIDER_POLICY_VERSION } from "@avin/api/protection/provider-application";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
import {
  Bank,
  CheckCircle,
  Eye,
  LockKey,
  PaperPlaneTilt,
  SealCheck,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import {
  useProviderApplicationActions,
  useProviderProfileRevisionActions,
} from "../api/provider-api";
import type {
  ProviderApplication,
  ProviderProfileRevision,
} from "../api/provider-api";
import { ProviderAvatarUploader } from "./provider-avatar-uploader";

const VIETNAMESE_BANKS = [
  "Vietcombank (VCB)",
  "Techcombank (TCB)",
  "MB Bank (MB)",
  "VietinBank (CTG)",
  "BIDV",
  "ACB",
  "VPBank",
  "TPBank",
  "Sacombank",
  "MoMo Wallet",
  "ZaloPay Wallet",
  "Viettel Money",
] as const;

const SERVICE_TAG_OPTIONS = [
  "Tài khoản Game",
  "Nạp Game & Thẻ cào",
  "Thiết kế & Đồ họa",
  "Phần mềm & Tool",
  "Tài khoản MXH",
  "Dịch Vụ Mạng Xã Hội",
  "Trung gian giao dịch (GDTG)",
  "Dịch vụ Tiếp thị & SEO",
  "Tư vấn & Hỗ trợ kỹ thuật",
] as const;

const formatDateVi = (dateStr: string): string => {
  if (!dateStr) {
    return "Đang cập nhật";
  }
  const [year, month, day] = dateStr.split("-");
  if (!year || !month || !day) {
    return dateStr;
  }
  return `${day}/${month}/${year}`;
};

export interface ProviderApplicationFormState {
  fullName: string;
  officialChannels: {
    avatarUrl: string;
    bioShop: string;
    facebookId: string;
    facebookUrl: string;
    note: string;
    telegramCommunityUrl: string;
    websiteUrl: string;
    zalo: string;
  };
  operatingSince: string;
  paymentAccount: {
    accountName: string;
    accountNumber: string;
    accountType: "BANK" | "WALLET";
    institution: string;
  };
  paymentDisclosureConsent: boolean;
  policyAccepted: boolean;
  selectedServiceTags: string[];
  services: string;
}

const emptyFormState = (): ProviderApplicationFormState => ({
  fullName: "",
  officialChannels: {
    avatarUrl: "",
    bioShop: "",
    facebookId: "",
    facebookUrl: "",
    note: "",
    telegramCommunityUrl: "",
    websiteUrl: "",
    zalo: "",
  },
  operatingSince: "",
  paymentAccount: {
    accountName: "",
    accountNumber: "",
    accountType: "BANK",
    institution: "",
  },
  paymentDisclosureConsent: true,
  policyAccepted: false,
  selectedServiceTags: [],
  services: "",
});

const readText = (value: string | null | undefined): string => value ?? "";

const getFormState = (
  application: ProviderApplication | ProviderProfileRevision | null,
  currentPolicyVersion: string
): ProviderApplicationFormState => {
  if (!application) {
    return emptyFormState();
  }

  const officialChannels = application.officialChannels ?? {};
  const paymentAccount = application.paymentAccount as Partial<
    ProviderApplicationFormState["paymentAccount"]
  > | null;

  return {
    fullName: readText(application.fullName),
    officialChannels: {
      avatarUrl: readText(officialChannels.avatarUrl),
      bioShop: readText(officialChannels.bioShop),
      facebookId: readText(officialChannels.facebookId),
      facebookUrl: readText(officialChannels.facebookUrl),
      note: readText(officialChannels.note),
      telegramCommunityUrl: readText(officialChannels.telegramCommunityUrl),
      websiteUrl: readText(officialChannels.websiteUrl),
      zalo: readText(officialChannels.zalo),
    },
    operatingSince: readText(application.operatingSince),
    paymentAccount: {
      accountName: readText(paymentAccount?.accountName),
      accountNumber: readText(paymentAccount?.accountNumber),
      accountType: paymentAccount?.accountType ?? "BANK",
      institution: readText(paymentAccount?.institution),
    },
    paymentDisclosureConsent: application.paymentDisclosureConsent ?? true,
    policyAccepted:
      Boolean(application.policyAcceptedAt) &&
      application.policyVersion === currentPolicyVersion,
    selectedServiceTags: [],
    services: readText(application.services),
  };
};

const optionalText = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

const toDraft = (
  state: ProviderApplicationFormState,
  policyVersion: string
): ProviderApplicationDraft => ({
  fullName: optionalText(state.fullName),
  officialChannels: {
    avatarUrl: optionalText(state.officialChannels.avatarUrl),
    bioShop: optionalText(state.officialChannels.bioShop),
    facebookId: optionalText(state.officialChannels.facebookId),
    facebookUrl: optionalText(state.officialChannels.facebookUrl),
    note: optionalText(state.officialChannels.note),
    telegramCommunityUrl: optionalText(
      state.officialChannels.telegramCommunityUrl
    ),
    websiteUrl: optionalText(state.officialChannels.websiteUrl),
    zalo: optionalText(state.officialChannels.zalo),
  },
  operatingSince: optionalText(state.operatingSince),
  paymentAccount: {
    accountName: optionalText(state.paymentAccount.accountName),
    accountNumber: optionalText(state.paymentAccount.accountNumber),
    accountType: state.paymentAccount.accountType,
    institution: optionalText(state.paymentAccount.institution),
  },
  paymentDisclosureConsent: state.paymentDisclosureConsent,
  policyAccepted: state.policyAccepted,
  policyVersion,
  services: optionalText(state.services),
});

const toSubmission = (
  state: ProviderApplicationFormState,
  policyVersion: string
): ProviderApplicationSubmission => ({
  fullName: state.fullName.trim(),
  officialChannels: {
    avatarUrl: optionalText(state.officialChannels.avatarUrl),
    bioShop: optionalText(state.officialChannels.bioShop),
    facebookId: optionalText(state.officialChannels.facebookId),
    facebookUrl: optionalText(state.officialChannels.facebookUrl),
    note: optionalText(state.officialChannels.note),
    telegramCommunityUrl: optionalText(
      state.officialChannels.telegramCommunityUrl
    ),
    websiteUrl: optionalText(state.officialChannels.websiteUrl),
    zalo: optionalText(state.officialChannels.zalo),
  },
  operatingSince: state.operatingSince,
  paymentAccount: {
    accountName: state.paymentAccount.accountName.trim(),
    accountNumber: state.paymentAccount.accountNumber.trim(),
    accountType: state.paymentAccount.accountType,
    institution: state.paymentAccount.institution.trim(),
  },
  paymentDisclosureConsent: state.paymentDisclosureConsent,
  policyAccepted: state.policyAccepted,
  policyVersion,
  services: state.services.trim(),
});

const hasSubmissionMinimum = (state: ProviderApplicationFormState): boolean => {
  const hasBasic =
    Boolean(state.fullName.trim()) &&
    Boolean(state.operatingSince.trim()) &&
    Boolean(state.services.trim()) &&
    Boolean(state.paymentAccount.accountName.trim()) &&
    Boolean(state.paymentAccount.accountNumber.trim()) &&
    Boolean(state.paymentAccount.institution.trim());

  const hasOfficialChannel =
    Boolean(state.officialChannels.facebookUrl?.trim()) ||
    Boolean(state.officialChannels.facebookId?.trim()) ||
    Boolean(state.officialChannels.zalo?.trim()) ||
    Boolean(state.officialChannels.telegramCommunityUrl?.trim());

  return hasBasic && hasOfficialChannel && state.policyAccepted;
};

const calculateTrustScore = (state: ProviderApplicationFormState): number => {
  let score = 0;
  if (state.officialChannels.avatarUrl.trim()) {
    score += 15;
  }
  if (state.fullName.trim()) {
    score += 20;
  }
  if (state.officialChannels.facebookId || state.officialChannels.facebookUrl) {
    score += 15;
  }
  if (state.officialChannels.zalo.trim()) {
    score += 15;
  }
  if (state.services.trim()) {
    score += 15;
  }
  if (
    state.paymentAccount.accountNumber.trim() &&
    state.paymentAccount.institution.trim()
  ) {
    score += 10;
  }
  if (state.policyAccepted) {
    score += 10;
  }
  return Math.min(score, 100);
};

const getInitials = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) {
    return "AV";
  }
  const parts = trimmed.split(/\s+/u);
  const first = parts[0]?.[0] ?? "A";
  const last = parts.at(-1)?.[0] ?? "V";
  return `${first}${last}`.toUpperCase();
};

const getSubmitErrorMessage = (
  error: unknown,
  mode: "application" | "revision"
) => {
  if (error instanceof Error) {
    return error.message;
  }
  return mode === "revision"
    ? "Không thể gửi yêu cầu cập nhật profile."
    : "Không thể gửi hồ sơ Provider.";
};

/* --- TAB 1: THÔNG TIN & KÊNH LIÊN HỆ --- */
interface IdentityAndChannelsTabProps {
  disabled: boolean;
  form: ProviderApplicationFormState;
  onNextTab: () => void;
  toggleServiceTag: (tag: string) => void;
  updateChannel: (
    field: keyof ProviderApplicationFormState["officialChannels"],
    value: string
  ) => void;
  updateField: <K extends keyof ProviderApplicationFormState>(
    field: K,
    value: ProviderApplicationFormState[K]
  ) => void;
}

const IdentityAndChannelsTabPanel = ({
  disabled,
  form,
  onNextTab,
  toggleServiceTag,
  updateChannel,
  updateField,
}: IdentityAndChannelsTabProps) => (
  <div className="space-y-5 rounded-3xl border border-border/70 bg-card p-6 shadow-xs">
    <div className="border-border/50 border-b pb-4">
      <h3 className="font-bold text-lg">
        1. Thông tin Đại diện & Kênh liên hệ
      </h3>
      <p className="text-muted-foreground text-xs">
        Khai báo thông tin hiển thị trên thẻ hồ sơ xác minh uy tín công khai.
      </p>
    </div>

    {/* Avatar Upload */}
    <ProviderAvatarUploader
      avatarUrl={form.officialChannels.avatarUrl}
      disabled={disabled}
      onAvatarChange={(val) => updateChannel("avatarUrl", val.url)}
    />

    {/* Basic Info */}
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="app-full-name">
          Họ và tên pháp lý <span className="text-destructive">*</span>
        </Label>
        <Input
          disabled={disabled}
          id="app-full-name"
          onChange={(e) => updateField("fullName", e.target.value)}
          placeholder="VD: NGUYỄN HOÀNG DƯƠNG"
          value={form.fullName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="app-operating-since">
          Bắt đầu hoạt động từ <span className="text-destructive">*</span>
        </Label>
        <Input
          disabled={disabled}
          id="app-operating-since"
          onChange={(e) => updateField("operatingSince", e.target.value)}
          type="date"
          value={form.operatingSince}
        />
      </div>
    </div>

    {/* Subtitle / Note */}
    <div className="space-y-2">
      <Label htmlFor="app-note">
        Lời nhắn / Ghi chú giao dịch (Hiển thị dưới tên)
      </Label>
      <Input
        disabled={disabled}
        id="app-note"
        maxLength={300}
        onChange={(e) => updateChannel("note", e.target.value)}
        placeholder="VD: (Giao dịch qua Zalo nhé mọi người)"
        value={form.officialChannels.note}
      />
    </div>

    {/* Official Channels Grid */}
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
      <h4 className="font-semibold text-xs text-foreground uppercase tracking-wide">
        Kênh giao dịch & Liên hệ chính thức
      </h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="app-zalo">
            Số Hotline / Zalo chính thức{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            disabled={disabled}
            id="app-zalo"
            onChange={(e) => updateChannel("zalo", e.target.value)}
            placeholder="VD: 0934567643"
            value={form.officialChannels.zalo}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-telegram">
            Kênh / Nhóm Telegram (Cộng đồng check)
          </Label>
          <Input
            disabled={disabled}
            id="app-telegram"
            onChange={(e) =>
              updateChannel("telegramCommunityUrl", e.target.value)
            }
            placeholder="VD: https://t.me/congdongcheck"
            type="url"
            value={form.officialChannels.telegramCommunityUrl}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-fb-url">Facebook Profile URL</Label>
          <Input
            disabled={disabled}
            id="app-fb-url"
            onChange={(e) => updateChannel("facebookUrl", e.target.value)}
            placeholder="https://facebook.com/duongnguyen"
            type="url"
            value={form.officialChannels.facebookUrl}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-fb-id">Facebook Numeric ID (UID)</Label>
          <Input
            disabled={disabled}
            id="app-fb-id"
            onChange={(e) => updateChannel("facebookId", e.target.value)}
            placeholder="VD: 100005959991439"
            value={form.officialChannels.facebookId}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-bio">Mã Bio Shop / Bio Link</Label>
          <Input
            disabled={disabled}
            id="app-bio"
            onChange={(e) => updateChannel("bioShop", e.target.value)}
            placeholder="VD: 12553 hoặc https://bio.link/duong"
            value={form.officialChannels.bioShop}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-website">Website riêng</Label>
          <Input
            disabled={disabled}
            id="app-website"
            onChange={(e) => updateChannel("websiteUrl", e.target.value)}
            placeholder="https://likesub.vip"
            type="url"
            value={form.officialChannels.websiteUrl}
          />
        </div>
      </div>
    </div>

    {/* Service Tag Buttons */}
    <div className="space-y-2">
      <Label>Lĩnh vực chuyên môn (Nhấp để thêm nhanh)</Label>
      <div className="flex flex-wrap gap-2">
        {SERVICE_TAG_OPTIONS.map((tag) => {
          const isSelected = form.selectedServiceTags.includes(tag);
          return (
            <button
              aria-pressed={isSelected}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-muted/40 text-foreground hover:bg-muted"
              }`}
              key={tag}
              onClick={() => toggleServiceTag(tag)}
              type="button"
            >
              {isSelected ? "✓ " : "+ "}
              {tag}
            </button>
          );
        })}
      </div>
    </div>

    {/* Services & Bank Details Textarea */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="app-services">
          Dịch vụ cung cấp & Danh sách tài khoản ngân hàng{" "}
          <span className="text-destructive">*</span>
        </Label>
        <span className="text-[11px] text-muted-foreground">
          Hỗ trợ xuống dòng, bullet points và danh sách STK
        </span>
      </div>
      <Textarea
        className="font-mono text-xs leading-relaxed"
        disabled={disabled}
        id="app-services"
        maxLength={4000}
        onChange={(e) => updateField("services", e.target.value)}
        placeholder={`VD:\n• Dịch Vụ Mạng Xã Hội : mở khoá các tài khoản mạng xã hội bị khóa\n  https://LikeSub.Vip\n• (GDTG) Giao dịch trung gian mua bán tài khoản fb, tiktok, ytb, liên quân\n• Zalo phụ: 0832635555 Dương GDTG\n\nChủ TK "NGUYỄN HOÀNG DƯƠNG"\n• Vcb: 1031000002351\n• Acb: 162198888\n• Momo: 0934567643`}
        rows={7}
        value={form.services}
      />
    </div>

    <div className="flex justify-end pt-2">
      <Button onClick={onNextTab} size="sm" type="button">
        Tiếp tục: Đối soát & Điều khoản →
      </Button>
    </div>
  </div>
);

/* --- TAB 2: ĐỐI SOÁT & ĐIỀU KHOẢN CAM KẾT --- */
interface PayoutAndPolicyTabProps {
  currentPolicyVersion: string;
  disabled: boolean;
  form: ProviderApplicationFormState;
  onPrevTab: () => void;
  updateField: <K extends keyof ProviderApplicationFormState>(
    field: K,
    value: ProviderApplicationFormState[K]
  ) => void;
  updatePayment: (
    field: keyof ProviderApplicationFormState["paymentAccount"],
    value: string
  ) => void;
}

const PayoutAndPolicyTabPanel = ({
  currentPolicyVersion,
  disabled,
  form,
  onPrevTab,
  updateField,
  updatePayment,
}: PayoutAndPolicyTabProps) => (
  <div className="space-y-6 rounded-3xl border border-border/70 bg-card p-6 shadow-xs">
    <div className="border-border/50 border-b pb-4">
      <h3 className="font-bold text-lg">
        2. Tài khoản Đối soát & Điều khoản Cam kết
      </h3>
      <p className="text-muted-foreground text-xs">
        Tài khoản dùng để hoàn quỹ ký quỹ và cam kết tuân thủ tiêu chuẩn Avin
        Check.
      </p>
    </div>

    {/* Payout Bank Info */}
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-5 space-y-4">
      <div className="flex items-center gap-2 font-semibold text-xs text-foreground uppercase tracking-wide">
        <Bank className="size-4 text-primary" />
        Tài khoản nhận hoàn tiền ký quỹ (Đối soát nội bộ)
      </div>
      <p className="text-muted-foreground text-xs">
        Thông tin này được dùng nội bộ bởi Admin Avin Check để nộp/hoàn tiền bảo
        lãnh và đối soát bồi thường, không công khai ra bên ngoài.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="app-payment-type">Loại tài khoản</Label>
          <select
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            disabled={disabled}
            id="app-payment-type"
            onChange={(e) =>
              updatePayment("accountType", e.target.value as "BANK" | "WALLET")
            }
            value={form.paymentAccount.accountType}
          >
            <option value="BANK">Tài khoản Ngân hàng</option>
            <option value="WALLET">Ví điện tử</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-institution">
            Ngân hàng / Tổ chức phát hành{" "}
            <span className="text-destructive">*</span>
          </Label>
          <select
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            disabled={disabled}
            id="app-institution"
            onChange={(e) => updatePayment("institution", e.target.value)}
            value={form.paymentAccount.institution}
          >
            <option value="">-- Chọn tổ chức ngân hàng --</option>
            {VIETNAMESE_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-acc-name">
            Tên chủ tài khoản <span className="text-destructive">*</span>
          </Label>
          <Input
            disabled={disabled}
            id="app-acc-name"
            onChange={(e) =>
              updatePayment("accountName", e.target.value.toUpperCase())
            }
            placeholder="VD: NGUYEN HOANG DUONG"
            value={form.paymentAccount.accountName}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-acc-number">
            Số tài khoản / Số ví <span className="text-destructive">*</span>
          </Label>
          <Input
            disabled={disabled}
            id="app-acc-number"
            onChange={(e) => updatePayment("accountNumber", e.target.value)}
            placeholder="VD: 1031000002351"
            value={form.paymentAccount.accountNumber}
          />
        </div>
      </div>
    </div>

    {/* Policy & Legal Commitments */}
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2 font-bold text-foreground text-sm">
        <ShieldCheck className="size-5 text-primary" weight="fill" />
        Quy chế Hoạt động & Cam kết Pháp lý ({currentPolicyVersion})
      </div>
      <ul className="space-y-2 text-muted-foreground text-xs leading-relaxed list-disc list-inside">
        <li>
          <strong className="text-foreground">Độ tuổi & Chính chủ:</strong> Đối
          tác cam kết đã đủ 18 tuổi, thông tin định danh CCCD và tài khoản ngân
          hàng khai báo là chính chủ.
        </li>
        <li>
          <strong className="text-foreground">Kênh giao dịch an toàn:</strong>{" "}
          Đối tác cam kết chỉ giao dịch qua các kênh liên hệ và số tài khoản đã
          đăng ký trên hệ thống.
        </li>
        <li>
          <strong className="text-foreground">Trách nhiệm pháp lý:</strong> Đối
          tác hoàn toàn chịu trách nhiệm trước pháp luật về tính hợp pháp của
          các giao dịch thực hiện.
        </li>
        <li>
          <strong className="text-foreground">Bảo lãnh Quỹ Escrow:</strong> Tiền
          ký quỹ bảo lãnh được bảo lưu trong Quỹ Escrow và được giải ngân hoàn
          trả theo quy định khi ngừng làm đối tác.
        </li>
      </ul>
    </div>

    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 text-xs transition-colors hover:border-primary/50">
      <input
        checked={form.policyAccepted}
        className="mt-0.5 size-4.5 rounded text-primary accent-primary"
        disabled={disabled}
        onChange={(e) => updateField("policyAccepted", e.target.checked)}
        type="checkbox"
      />
      <span className="font-medium leading-relaxed text-foreground">
        Tôi cam kết đã đủ 18 tuổi, toàn bộ thông tin đăng ký là chính chủ, chịu
        hoàn toàn trách nhiệm trước pháp luật và đồng ý tuân thủ toàn bộ{" "}
        <a
          className="text-primary underline underline-offset-2 hover:opacity-80"
          href="/avin-check"
          rel="noopener noreferrer"
          target="_blank"
        >
          Quy chế Hoạt động Đối tác Avin Check ({currentPolicyVersion})
        </a>
        .
      </span>
    </label>

    <div className="flex justify-between pt-2">
      <Button onClick={onPrevTab} size="sm" type="button" variant="outline">
        ← Quay lại: Thông tin & Kênh
      </Button>
    </div>
  </div>
);

/* --- LIVE PREVIEW CARD (MATCHING CHECKSAM 3-BLOCK LAYOUT) --- */
const LivePreviewCard = ({
  form,
  trustScore,
}: {
  form: ProviderApplicationFormState;
  trustScore: number;
}) => {
  const zaloNumber = form.officialChannels.zalo.trim();
  const zaloUrl = zaloNumber
    ? `https://zalo.me/${zaloNumber.replaceAll(/\s+/gu, "")}`
    : "#";
  const telegramUrl =
    form.officialChannels.telegramCommunityUrl.trim() ||
    "https://t.me/avin_check_community";

  return (
    <div className="sticky top-6 space-y-4">
      {/* Live Trust Readiness Meter */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs">Mức độ hoàn thiện hồ sơ:</span>
          <span className="font-extrabold text-primary text-sm">
            {trustScore}%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${trustScore}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {trustScore >= 80
            ? "✓ Hồ sơ đầy đủ, sẵn sàng duyệt nhanh trong 24h!"
            : "Điền đầy đủ thông tin đại diện và kênh liên hệ để đạt 100%."}
        </p>
      </div>

      {/* LIVE PARTNER CARD (3-BLOCK CHECKSAM STYLE) */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg">
        {/* Top Header Section */}
        <div className="border-border/50 border-b bg-card p-6 text-center space-y-4">
          <div className="flex items-center justify-between">
            <Badge
              className="border-primary/40 bg-primary/10 text-primary text-[10px]"
              variant="outline"
            >
              <Eye className="mr-1 size-3" /> Xem trước công khai
            </Badge>
            <span className="font-bold text-[11px] text-primary">
              Avin Check Certified
            </span>
          </div>

          {/* Avatar & Display Name */}
          <div className="flex flex-col items-center">
            <div className="relative size-20 overflow-hidden rounded-full border-2 border-primary/30 bg-primary/10 shadow-md">
              {form.officialChannels.avatarUrl ? (
                <img
                  alt="Ảnh đối tác"
                  className="size-full object-cover"
                  src={form.officialChannels.avatarUrl}
                />
              ) : (
                <div className="flex size-full items-center justify-center font-black text-primary text-xl">
                  {getInitials(form.fullName)}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              <h4 className="font-extrabold text-foreground text-xl tracking-tight">
                {form.fullName.trim() || "Nguyễn Hoàng Dương"}
              </h4>
              <SealCheck className="size-5 text-primary" weight="fill" />
            </div>

            {form.officialChannels.note && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {form.officialChannels.note}
              </p>
            )}
          </div>

          {/* 2 Quick CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <a
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0068FF] px-4 py-2 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
              href={zaloUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <CheckCircle className="size-4" weight="bold" />
              Check Zalo Real
            </a>
            <a
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] px-4 py-2 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
              href={telegramUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <PaperPlaneTilt className="size-4" weight="fill" />
              Cộng đồng check
            </a>
          </div>
        </div>

        {/* 2 Mid Boxes Grid */}
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {/* Left Box: Thông tin Xác Minh */}
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-2.5">
            <h5 className="font-bold text-xs text-foreground">
              Thông tin Xác Minh:
            </h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-1.5">
                <span className="font-semibold text-foreground shrink-0">
                  Fb (C):
                </span>
                <span className="font-mono text-primary font-medium truncate">
                  {form.officialChannels.facebookId ||
                    (form.officialChannels.facebookUrl
                      ? "Đã liên kết"
                      : "Chưa cập nhật")}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-semibold text-foreground shrink-0">
                  Inbox Zalo:
                </span>
                <span className="font-mono text-primary font-bold">
                  {form.officialChannels.zalo || "Chưa cấu hình"}
                </span>
              </div>
              {form.officialChannels.bioShop ? (
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-foreground shrink-0">
                    Bio Shop:
                  </span>
                  <span className="font-mono text-foreground">
                    {form.officialChannels.bioShop}
                  </span>
                </div>
              ) : null}
              {form.officialChannels.websiteUrl ? (
                <div className="flex items-start gap-1.5">
                  <span className="font-semibold text-foreground shrink-0">
                    Website:
                  </span>
                  <span className="text-primary truncate">
                    {form.officialChannels.websiteUrl}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Box: Hồ Sơ Hạng Bạc / Royal */}
          <div className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-1.5">
            <h5 className="font-bold text-xs text-foreground">
              Hồ Sơ Hạng Bạc:
            </h5>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Hỗ trợ: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Xuất sắc
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Điểm tín nhiệm: </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  100/100
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ngày tham gia: </span>
                <span className="font-medium text-foreground">
                  {formatDateVi(form.operatingSince)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  Khuyến nghị giao dịch:{" "}
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  theo hạn mức ký quỹ
                </span>
              </div>
            </div>
            {/* Lock Icon Badge */}
            <div className="absolute right-3 top-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shadow-xs">
                <LockKey className="size-6" weight="fill" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Box: Dịch vụ cung cấp */}
        <div className="px-4 pb-4">
          <div className="relative rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 min-h-35">
            <h5 className="font-bold text-xs text-foreground mb-2">
              Dịch vụ cung cấp:
            </h5>
            <div className="whitespace-pre-wrap font-sans text-xs text-foreground leading-relaxed">
              {form.services.trim() ||
                "Chưa nhập mô tả dịch vụ & STK ngân hàng"}
            </div>

            {/* Verification Watermark Stamp */}
            <div className="mt-4 flex justify-end">
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1 text-[10px] font-extrabold uppercase text-destructive/80 rotate-[-2deg]">
                <LockKey className="size-3" weight="fill" />
                HỒ SƠ XÁC MINH UY TÍN AVIN CHECK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProviderApplicationForm = ({
  application,
  currentPolicyVersion = CURRENT_PROVIDER_POLICY_VERSION,
  mode = "application",
}: {
  application: ProviderApplication | ProviderProfileRevision | null;
  currentPolicyVersion?: string;
  mode?: "application" | "revision";
}) => {
  const [form, setForm] = useState(() =>
    getFormState(application, currentPolicyVersion)
  );
  const [activeTab, setActiveTab] = useState<
    "identity_and_channels" | "payout_and_policy"
  >("identity_and_channels");

  const applicationActions = useProviderApplicationActions();
  const revisionActions = useProviderProfileRevisionActions();
  const { saveDraft, submit } =
    mode === "revision" ? revisionActions : applicationActions;

  const trustScore = calculateTrustScore(form);
  const disabled = saveDraft.isPending || submit.isPending;

  const updateField = <K extends keyof ProviderApplicationFormState>(
    field: K,
    value: ProviderApplicationFormState[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateChannel = (
    field: keyof ProviderApplicationFormState["officialChannels"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      officialChannels: { ...current.officialChannels, [field]: value },
    }));
  };

  const updatePayment = (
    field: keyof ProviderApplicationFormState["paymentAccount"],
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      paymentAccount: { ...current.paymentAccount, [field]: value },
    }));
  };

  const toggleServiceTag = (tag: string) => {
    setForm((prev) => {
      const exists = prev.selectedServiceTags.includes(tag);
      const nextTags = exists
        ? prev.selectedServiceTags.filter((t) => t !== tag)
        : [...prev.selectedServiceTags, tag];
      const bulletItems = nextTags.map((t) => `• ${t}`).join("\n");
      let nextServices = bulletItems;
      if (prev.services) {
        nextServices = prev.services.includes(tag)
          ? prev.services
          : `${bulletItems}\n\n${prev.services}`;
      }
      return {
        ...prev,
        selectedServiceTags: nextTags,
        services: nextServices,
      };
    });
  };

  const handleFillDemo = () => {
    setForm({
      fullName: "NGUYỄN HOÀNG DƯƠNG",
      officialChannels: {
        avatarUrl:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        bioShop: "12553",
        facebookId: "100005959991439",
        facebookUrl: "https://facebook.com/duongnguyen.official",
        note: "(Giao dịch qua Zalo nhé mọi người)",
        telegramCommunityUrl: "https://t.me/congdongcheck_vn",
        websiteUrl: "https://likesub.vip",
        zalo: "0934567643",
      },
      operatingSince: "2021-04-09",
      paymentAccount: {
        accountName: "NGUYEN HOANG DUONG",
        accountNumber: "1031000002351",
        accountType: "BANK",
        institution: "Vietcombank (VCB)",
      },
      paymentDisclosureConsent: true,
      policyAccepted: true,
      selectedServiceTags: [
        "Trung gian giao dịch (GDTG)",
        "Dịch Vụ Mạng Xã Hội",
      ],
      services: `• Dịch Vụ Mạng Xã Hội : mở khoá các tài khoản mạng xã hội bị khóa\n  https://LikeSub.Vip\n• (GDTG) Giao dịch trung gian mua bán tài khoản fb, tiktok, ytb, liên quân, free fire, roblox, đổi tiền\n• Zalo phụ: 0832635555 Dương GDTG\n\nChủ TK "Nguyễn Hoàng Dương"\n• Vcb: 1031000002351\n• Acb: 162198888\n• Vtb: 104871818172\n• Tec: 19030740859029\n• Bidv: 45010004914945\n• Momo: 0934567643`,
    });
    toast.success("Đã nạp toàn bộ dữ liệu mẫu chuẩn đối tác!");
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync(toDraft(form, currentPolicyVersion));
      toast.success(
        mode === "revision"
          ? "Đã lưu bản nháp yêu cầu cập nhật profile."
          : "Đã lưu bản nháp hồ sơ Provider."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu bản nháp."
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasSubmissionMinimum(form)) {
      toast.error(
        "Vui lòng điền đầy đủ họ tên, kênh liên hệ chính thức, thông tin đối soát và đồng ý quy chế cam kết."
      );
      return;
    }

    try {
      await submit.mutateAsync(toSubmission(form, currentPolicyVersion));
      toast.success(
        mode === "revision"
          ? "Đã gửi yêu cầu cập nhật profile để Reviewer xem xét."
          : "Đã gửi hồ sơ Provider để Reviewer xem xét."
      );
    } catch (error) {
      toast.error(getSubmitErrorMessage(error, mode));
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Top Action Helper Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <Badge
            className="border-primary/30 bg-primary/10 text-primary"
            variant="outline"
          >
            Split Live-Preview
          </Badge>
          <span className="text-muted-foreground text-xs">
            Bản xem trước cập nhật theo chuẩn thẻ hồ sơ đối tác
          </span>
        </div>
        <Button
          className="gap-1.5 text-xs"
          disabled={disabled}
          onClick={handleFillDemo}
          size="sm"
          type="button"
          variant="outline"
        >
          <Sparkle className="size-3.5 text-amber-500" />
          Tự động điền dữ liệu mẫu
        </Button>
      </div>

      {/* Main Dual-Pane Grid */}
      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: 2-STEP CONTROLS (7 COLS) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Tab Navigation Pill Bar */}
          <div
            aria-label="Các bước đăng ký"
            className="grid grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-muted/30 p-1.5"
            role="tablist"
          >
            <button
              aria-selected={activeTab === "identity_and_channels"}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                activeTab === "identity_and_channels"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("identity_and_channels")}
              role="tab"
              type="button"
            >
              1. Thông tin & Kênh liên hệ
            </button>
            <button
              aria-selected={activeTab === "payout_and_policy"}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                activeTab === "payout_and_policy"
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("payout_and_policy")}
              role="tab"
              type="button"
            >
              2. Đối soát & Cam kết điều khoản
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === "identity_and_channels" && (
            <IdentityAndChannelsTabPanel
              disabled={disabled}
              form={form}
              onNextTab={() => setActiveTab("payout_and_policy")}
              toggleServiceTag={toggleServiceTag}
              updateChannel={updateChannel}
              updateField={updateField}
            />
          )}

          {activeTab === "payout_and_policy" && (
            <PayoutAndPolicyTabPanel
              currentPolicyVersion={currentPolicyVersion}
              disabled={disabled}
              form={form}
              onPrevTab={() => setActiveTab("identity_and_channels")}
              updateField={updateField}
              updatePayment={updatePayment}
            />
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
            <Button
              disabled={disabled}
              onClick={handleSaveDraft}
              size="sm"
              type="button"
              variant="outline"
            >
              Lưu bản nháp
            </Button>
            <Button
              className="gap-2 font-bold"
              disabled={disabled || !hasSubmissionMinimum(form)}
              size="sm"
              type="submit"
            >
              <SealCheck className="size-4" weight="bold" />
              {mode === "revision"
                ? "Gửi yêu cầu cập nhật profile"
                : "Gửi hồ sơ xét duyệt Đối tác"}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW CARD (5 COLS) */}
        <div className="lg:col-span-5">
          <LivePreviewCard form={form} trustScore={trustScore} />
        </div>
      </div>
    </form>
  );
};
