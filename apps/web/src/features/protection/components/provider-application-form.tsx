import type {
  ProviderApplicationDraft,
  ProviderApplicationSubmission,
} from "@avin/api/protection/provider-application";
import { CURRENT_PROVIDER_POLICY_VERSION } from "@avin/api/protection/provider-application";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@avin/ui/components/avatar";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { Calendar } from "@avin/ui/components/calendar";
import { Checkbox } from "@avin/ui/components/checkbox";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@avin/ui/components/popover";
import { Progress } from "@avin/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Textarea } from "@avin/ui/components/textarea";
import { cn } from "@avin/ui/lib/utils";
import {
  Bank,
  CalendarBlankIcon,
  CheckCircle,
  Eye,
  LockKey,
  PaperPlaneTilt,
  SealCheck,
  ShieldCheck,
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
  "Ví MoMo (MoMo)",
  "Ví ZaloPay",
  "Viettel Money",
] as const;

const BANK_SELECT_ITEMS = VIETNAMESE_BANKS.map((b) => ({
  label: b,
  value: b,
}));

const ACCOUNT_TYPE_ITEMS = [
  { label: "Tài khoản Ngân hàng", value: "BANK" },
  { label: "Ví điện tử", value: "WALLET" },
];

const DEFAULT_SERVICES_DRAFT = `• Dịch Vụ Mạng Xã Hội : 
• Giao dịch trung gian (GDTG) : 
• Hotline / Zalo phụ (nếu có) : 

Chủ TK "[HỌ VÀ TÊN]"
• Vietcombank (VCB) : 
• ACB : 
• MB Bank : 
• Ví MoMo : `;

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

const parseDateString = (str: string): Date | undefined => {
  if (!str) {
    return undefined;
  }
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) {
    return undefined;
  }
  return new Date(y, m - 1, d);
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
  services: DEFAULT_SERVICES_DRAFT,
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
    services: readText(application.services) || DEFAULT_SERVICES_DRAFT,
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
    Boolean(state.officialChannels.zalo?.trim()) ||
    Boolean(state.officialChannels.telegramCommunityUrl?.trim());

  return hasBasic && hasOfficialChannel && state.policyAccepted;
};

const calculateTrustScore = (state: ProviderApplicationFormState): number => {
  let score = 0;
  if (state.fullName.trim()) {
    score += 15;
  }
  if (state.officialChannels.avatarUrl.trim()) {
    score += 15;
  }
  if (state.officialChannels.zalo.trim()) {
    score += 20;
  }
  if (state.officialChannels.facebookUrl.trim()) {
    score += 10;
  }
  if (state.officialChannels.telegramCommunityUrl.trim()) {
    score += 10;
  }
  if (state.services.trim()) {
    score += 15;
  }
  if (
    state.paymentAccount.accountName.trim() &&
    state.paymentAccount.accountNumber.trim() &&
    state.paymentAccount.institution.trim()
  ) {
    score += 10;
  }
  if (state.policyAccepted) {
    score += 5;
  }
  return Math.min(100, score);
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

/* --- TAB 1: THÔNG TIN & KÊNH LIÊN HỆ --- */
interface IdentityAndChannelsTabProps {
  disabled: boolean;
  form: ProviderApplicationFormState;
  onNextTab: () => void;
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
  updateChannel,
  updateField,
}: IdentityAndChannelsTabProps) => {
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      updateField("operatingSince", "");
      return;
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    updateField("operatingSince", `${year}-${month}-${day}`);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-border/70 bg-card p-6 shadow-xs">
      <div className="border-border/50 border-b pb-4">
        <h3 className="font-bold text-lg">
          1. Thông tin đại diện & Kênh liên hệ chính thức
        </h3>
        <p className="text-muted-foreground text-xs">
          Thông tin này sẽ được hiển thị công khai trên thẻ xác minh uy tín Avin
          Check.
        </p>
      </div>

      {/* Avatar Uploader Section */}
      <ProviderAvatarUploader
        avatarUrl={form.officialChannels.avatarUrl}
        disabled={disabled}
        onAvatarChange={(val) => updateChannel("avatarUrl", val.url)}
      />

      {/* Name & Operating Since */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="app-full-name">
            Họ và tên (chính chủ) <span className="text-destructive">*</span>
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
            Ngày bắt đầu hoạt động <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  className={cn(
                    "w-full justify-start text-left font-normal bg-input/50 border-transparent hover:bg-input/70 h-9 rounded-3xl px-3",
                    !form.operatingSince && "text-muted-foreground"
                  )}
                  disabled={disabled}
                  id="app-operating-since"
                  type="button"
                  variant="outline"
                >
                  <CalendarBlankIcon className="mr-2 size-4 text-muted-foreground" />
                  {form.operatingSince
                    ? formatDateVi(form.operatingSince)
                    : "Chọn ngày bắt đầu"}
                </Button>
              }
            />
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                captionLayout="dropdown"
                disabled={(date) => date > new Date()}
                mode="single"
                onSelect={handleDateSelect}
                selected={parseDateString(form.operatingSince)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Official Channels Grid */}
      <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 space-y-4">
        <h4 className="font-semibold text-xs text-foreground uppercase tracking-wide">
          Kênh liên hệ & Mạng xã hội chính thức
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="app-zalo">
              Hotline / Zalo chính chủ{" "}
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
            <Label htmlFor="app-telegram">Nhóm Telegram</Label>
            <Input
              disabled={disabled}
              id="app-telegram"
              onChange={(e) =>
                updateChannel("telegramCommunityUrl", e.target.value)
              }
              placeholder="VD: https://t.me/nhomtelegram"
              type="url"
              value={form.officialChannels.telegramCommunityUrl}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-fb-url">Link Facebook chính chủ (URL)</Label>
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
            <Label htmlFor="app-bio">Link Bio (nếu có)</Label>
            <Input
              disabled={disabled}
              id="app-bio"
              onChange={(e) => updateChannel("bioShop", e.target.value)}
              placeholder="VD: 12553 hoặc https://bio.link/duong"
              value={form.officialChannels.bioShop}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="app-website">Website cá nhân / Shop (nếu có)</Label>
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

      {/* Services & Bank Details Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="app-services">
            Dịch vụ cung cấp & Danh sách tài khoản ngân hàng{" "}
            <span className="text-destructive">*</span>
          </Label>
          <span className="text-[11px] text-muted-foreground">
            Hỗ trợ xuống dòng, danh sách dịch vụ và STK ngân hàng công khai
          </span>
        </div>
        <Textarea
          className="font-mono text-xs leading-relaxed"
          disabled={disabled}
          id="app-services"
          maxLength={4000}
          onChange={(e) => updateField("services", e.target.value)}
          placeholder={`VD:\n• Dịch Vụ Mạng Xã Hội : mở khoá tài khoản MXH\n• Giao dịch trung gian (GDTG) : fb, tiktok, game\n• Hotline / Zalo phụ : 0832635555\n\nChủ TK "NGUYỄN HOÀNG DƯƠNG"\n• Vietcombank: 1031000002351\n• ACB: 162198888\n• MoMo: 0934567643`}
          rows={8}
          value={form.services}
        />
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onNextTab} size="sm" type="button">
          Tiếp tục
        </Button>
      </div>
    </div>
  );
};

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
        Cung cấp tài khoản ngân hàng dùng để đối soát / hoàn tiền ký quỹ và cam
        kết tuân thủ quy chế đối tác.
      </p>
    </div>

    {/* Payout Bank Info */}
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-5">
      <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wide">
        <Bank className="size-4 text-primary" />
        Tài khoản nhận hoàn tiền bảo lãnh (Bảo mật nội bộ)
      </div>
      <p className="text-muted-foreground text-xs">
        Thông tin này chỉ dùng nội bộ để Admin Avin Check đối soát và chuyển
        hoàn tiền ký quỹ, không công khai ra bên ngoài.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="app-payment-type">Loại tài khoản</Label>
          <Select
            disabled={disabled}
            items={ACCOUNT_TYPE_ITEMS}
            onValueChange={(val) => {
              if (val) {
                updatePayment("accountType", val as "BANK" | "WALLET");
              }
            }}
            value={form.paymentAccount.accountType}
          >
            <SelectTrigger className="w-full" id="app-payment-type">
              <SelectValue placeholder="Chọn loại tài khoản" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BANK">Tài khoản Ngân hàng</SelectItem>
              <SelectItem value="WALLET">Ví điện tử</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-institution">
            Ngân hàng
            <span className="text-destructive">*</span>
          </Label>
          <Select
            disabled={disabled}
            items={BANK_SELECT_ITEMS}
            onValueChange={(val) => {
              if (val) {
                updatePayment("institution", val);
              }
            }}
            value={form.paymentAccount.institution}
          >
            <SelectTrigger className="w-full" id="app-institution">
              <SelectValue placeholder="Chọn ngân hàng hoặc ví điện tử" />
            </SelectTrigger>
            <SelectContent>
              {VIETNAMESE_BANKS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="app-acc-name">
            Tên chủ tài khoản (in hoa không dấu){" "}
            <span className="text-destructive">*</span>
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
            Số tài khoản<span className="text-destructive">*</span>
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
    <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 font-bold text-foreground text-sm">
        <ShieldCheck className="size-5 text-primary" weight="fill" />
        Quy chế Hoạt động & Cam kết Pháp lý ({currentPolicyVersion})
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <p className="font-semibold text-foreground">
            Hạn mức ký quỹ bảo hiểm (Bond)
          </p>
          <p className="mt-0.5 font-bold text-primary text-sm">1.000.000 ₫</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
          <p className="font-semibold text-foreground">
            Phí thẩm định & duy trì
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-muted-foreground line-through text-xs">
              3.000.000 ₫
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              0 ₫ (Miễn phí)
            </span>
          </div>
        </div>
      </div>

      <ul className="list-inside list-disc space-y-1.5 text-muted-foreground text-xs leading-relaxed">
        <li>
          <strong className="text-foreground">Độ tuổi & Chính chủ:</strong> Đối
          tác cam kết từ đủ 18 tuổi trở lên, thông tin định danh CCCD và tài
          khoản ngân hàng khai báo là hoàn toàn chính chủ.
        </li>
        <li>
          <strong className="text-foreground">Kênh giao dịch an toàn:</strong>{" "}
          Đối tác cam kết chỉ thực hiện giao dịch qua các kênh liên hệ và số tài
          khoản ngân hàng đã đăng ký xác minh trên hệ thống.
        </li>
        <li>
          <strong className="text-foreground">Trách nhiệm pháp lý:</strong> Đối
          tác hoàn toàn chịu trách nhiệm trước pháp luật về tính hợp pháp, nguồn
          gốc và chất lượng của các giao dịch thực hiện.
        </li>
        <li>
          <strong className="text-foreground">Bảo lãnh Quỹ Ký quỹ:</strong> Tiền
          ký quỹ bảo lãnh được lưu giữ an toàn trong Quỹ bảo hiểm và được giải
          ngân hoàn trả theo quy định khi ngừng làm đối tác.
        </li>
      </ul>

      <details className="rounded-xl border border-border/60 bg-background/40 p-3 text-xs">
        <summary className="cursor-pointer font-semibold text-primary select-none">
          Xem chi tiết quy chế đối tác & chính sách bồi thường
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground leading-relaxed">
          Đối tác tham gia chương trình Avin Check phải đáp ứng đầy đủ các tiêu
          chuẩn xét duyệt uy tín, duy trì thông tin xác minh chính xác, chấp
          nhận các phiên bản quy chế hiện hành và tuân thủ quy trình xử lý khiếu
          nại (Risk Report) cũng như bảo đảm hạn mức bảo hiểm ký quỹ. Mọi hành
          vi gian lận hoặc mạo danh sẽ bị xử lý nghiêm theo quy chế nền tảng và
          quy định pháp luật hiện hành.
        </p>
      </details>
    </div>

    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/50">
      <Checkbox
        checked={form.policyAccepted}
        disabled={disabled}
        id="app-policy-accepted"
        onCheckedChange={(checked) =>
          updateField("policyAccepted", Boolean(checked))
        }
      />
      <Label
        className="cursor-pointer font-medium text-foreground text-xs leading-relaxed"
        htmlFor="app-policy-accepted"
      >
        Tôi cam kết từ đủ 18 tuổi trở lên, toàn bộ thông tin đăng ký là chính
        chủ, chịu hoàn toàn trách nhiệm trước pháp luật và đồng ý tuân thủ toàn
        bộ{" "}
        <a
          className="text-primary underline underline-offset-2 hover:opacity-80"
          href="/avin-check"
          rel="noopener noreferrer"
          target="_blank"
        >
          Quy chế Hoạt động Đối tác Avin Check ({currentPolicyVersion})
        </a>
        .
      </Label>
    </div>

    <div className="flex justify-between pt-2">
      <Button onClick={onPrevTab} size="sm" type="button" variant="outline">
        Quay lại
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
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <span className="font-bold text-xs">
              Xem trước giao diện công khai
            </span>
          </div>
          <Badge
            className={
              trustScore >= 80
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }
            variant="outline"
          >
            Độ hoàn thiện: {trustScore}%
          </Badge>
        </div>
        <Progress className="mt-3" value={trustScore} />
      </div>

      {/* Main Checkscam-Style Verified Card */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-lg">
        {/* Top Header */}
        <div className="border-border/50 border-b bg-muted/10 p-5 text-center space-y-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Mã hồ sơ: #XAC-MINH</span>
            <span className="font-bold text-primary">Avin Check Certified</span>
          </div>

          <div className="flex flex-col items-center">
            <Avatar className="size-20 border-2 border-primary/40 bg-primary/10 shadow-sm">
              {form.officialChannels.avatarUrl ? (
                <AvatarImage
                  alt="Ảnh đối tác"
                  src={form.officialChannels.avatarUrl}
                />
              ) : null}
              <AvatarFallback className="font-black text-primary text-xl">
                {getInitials(form.fullName || "AV")}
              </AvatarFallback>
            </Avatar>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              <h4 className="font-extrabold text-foreground text-xl tracking-tight">
                {form.fullName.trim() || "Tên Đối Tác"}
              </h4>
              <SealCheck className="size-5 text-primary" weight="fill" />
            </div>
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
              Nhóm Telegram
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
                  {form.officialChannels.facebookUrl || "Chưa cập nhật"}
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
                  theo hạn mức bảo hiểm
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
                "Chưa nhập thông tin dịch vụ & STK ngân hàng"}
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

  const isSubmitting = submit.isPending;
  const isSavingDraft = saveDraft.isPending;
  const disabled = isSubmitting || isSavingDraft;

  const updateField = <K extends keyof ProviderApplicationFormState>(
    field: K,
    value: ProviderApplicationFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateChannel = (
    field: keyof ProviderApplicationFormState["officialChannels"],
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      officialChannels: {
        ...prev.officialChannels,
        [field]: value,
      },
    }));
  };

  const updatePayment = (
    field: keyof ProviderApplicationFormState["paymentAccount"],
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      paymentAccount: {
        ...prev.paymentAccount,
        [field]: value,
      },
    }));
  };

  const handleSaveDraft = async () => {
    try {
      const payload = toDraft(form, currentPolicyVersion);
      await saveDraft.mutateAsync(payload as never);
      toast.success("Đã lưu bản nháp thành công!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể lưu bản nháp."
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.fullName.trim()) {
      setActiveTab("identity_and_channels");
      toast.error("Vui lòng nhập Họ và tên (chính chủ).");
      return;
    }

    if (!form.operatingSince.trim()) {
      setActiveTab("identity_and_channels");
      toast.error("Vui lòng chọn ngày bắt đầu hoạt động.");
      return;
    }

    if (!form.officialChannels.zalo.trim()) {
      setActiveTab("identity_and_channels");
      toast.error("Vui lòng nhập số Hotline / Zalo chính chủ.");
      return;
    }

    if (!form.services.trim()) {
      setActiveTab("identity_and_channels");
      toast.error(
        "Vui lòng mô tả dịch vụ cung cấp và danh sách STK ngân hàng."
      );
      return;
    }

    if (
      !form.paymentAccount.institution.trim() ||
      !form.paymentAccount.accountName.trim() ||
      !form.paymentAccount.accountNumber.trim()
    ) {
      setActiveTab("payout_and_policy");
      toast.error(
        "Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng đối soát."
      );
      return;
    }

    if (!form.policyAccepted) {
      setActiveTab("payout_and_policy");
      toast.error("Vui lòng đọc và tích chọn đồng ý với Quy chế Đối tác.");
      return;
    }

    try {
      const payload = toSubmission(form, currentPolicyVersion);
      await submit.mutateAsync(payload as never);
      toast.success(
        mode === "revision"
          ? "Đã gửi yêu cầu cập nhật hồ sơ Đối tác thành công!"
          : "Đã gửi đơn đăng ký Đối tác Avin Check thành công!"
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gửi đơn không thành công."
      );
    }
  };

  const canSubmit = hasSubmissionMinimum(form);
  const trustScore = calculateTrustScore(form);

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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
              1. Thông tin cá nhân & Kênh liên hệ
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
              2. Tài khoản đối soát & Cam kết
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === "identity_and_channels" && (
            <IdentityAndChannelsTabPanel
              disabled={disabled}
              form={form}
              onNextTab={() => setActiveTab("payout_and_policy")}
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

          {/* Action Submission Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <Button
              disabled={disabled}
              onClick={handleSaveDraft}
              type="button"
              variant="outline"
            >
              Lưu bản nháp
            </Button>

            <Button
              className="gap-2"
              disabled={!canSubmit || disabled}
              type="submit"
            >
              {isSubmitting ? "Đang gửi hồ sơ..." : "Gửi hồ sơ đăng ký"}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE CARD PREVIEW (5 COLS) */}
        <div className="lg:col-span-5">
          <LivePreviewCard form={form} trustScore={trustScore} />
        </div>
      </div>
    </form>
  );
};
