import type {
  ProviderApplicationDraft,
  ProviderApplicationSubmission,
} from "@avin/api/protection/provider-application";
import { CURRENT_PROVIDER_POLICY_VERSION } from "@avin/api/protection/provider-application";
import { Button } from "@avin/ui/components/button";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Textarea } from "@avin/ui/components/textarea";
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

interface ProviderApplicationFormState {
  ageEvidenceReference: string;
  fullName: string;
  identityEvidenceReference: string;
  officialChannelEvidenceReference: string;
  officialChannels: {
    facebookUrl: string;
    websiteUrl: string;
    zalo: string;
  };
  operatingHistoryEvidenceReference: string;
  operatingSince: string;
  paymentAccount: {
    accountName: string;
    accountNumber: string;
    accountType: "BANK" | "WALLET";
    institution: string;
  };
  paymentDisclosureConsent: boolean;
  paymentEvidenceReference: string;
  policyAccepted: boolean;
  services: string;
}

const emptyFormState = (): ProviderApplicationFormState => ({
  ageEvidenceReference: "",
  fullName: "",
  identityEvidenceReference: "",
  officialChannelEvidenceReference: "",
  officialChannels: {
    facebookUrl: "",
    websiteUrl: "",
    zalo: "",
  },
  operatingHistoryEvidenceReference: "",
  operatingSince: "",
  paymentAccount: {
    accountName: "",
    accountNumber: "",
    accountType: "BANK",
    institution: "",
  },
  paymentDisclosureConsent: false,
  paymentEvidenceReference: "",
  policyAccepted: false,
  services: "",
});

const readText = (value: string | null | undefined): string => value ?? "";

const getFormState = (
  application: ProviderApplication | ProviderProfileRevision | null
): ProviderApplicationFormState => {
  if (!application) {
    return emptyFormState();
  }

  const officialChannels = application.officialChannels ?? {};
  const paymentAccount = application.paymentAccount as Partial<
    ProviderApplicationFormState["paymentAccount"]
  > | null;

  return {
    ageEvidenceReference: readText(application.ageEvidenceReference),
    fullName: readText(application.fullName),
    identityEvidenceReference: readText(application.identityEvidenceReference),
    officialChannelEvidenceReference: readText(
      application.officialChannelEvidenceReference
    ),
    officialChannels: {
      facebookUrl: readText(officialChannels.facebookUrl),
      websiteUrl: readText(officialChannels.websiteUrl),
      zalo: readText(officialChannels.zalo),
    },
    operatingHistoryEvidenceReference: readText(
      application.operatingHistoryEvidenceReference
    ),
    operatingSince: readText(application.operatingSince),
    paymentAccount: {
      accountName: readText(paymentAccount?.accountName),
      accountNumber: readText(paymentAccount?.accountNumber),
      accountType: paymentAccount?.accountType ?? "BANK",
      institution: readText(paymentAccount?.institution),
    },
    paymentDisclosureConsent: application.paymentDisclosureConsent ?? false,
    paymentEvidenceReference: readText(application.paymentEvidenceReference),
    policyAccepted: Boolean(application.policyAcceptedAt),
    services: readText(application.services),
  };
};

const optionalText = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

const toDraft = (
  state: ProviderApplicationFormState
): ProviderApplicationDraft => ({
  ageEvidenceReference: optionalText(state.ageEvidenceReference),
  fullName: optionalText(state.fullName),
  identityEvidenceReference: optionalText(state.identityEvidenceReference),
  officialChannelEvidenceReference: optionalText(
    state.officialChannelEvidenceReference
  ),
  officialChannels: {
    facebookUrl: optionalText(state.officialChannels.facebookUrl),
    websiteUrl: optionalText(state.officialChannels.websiteUrl),
    zalo: optionalText(state.officialChannels.zalo),
  },
  operatingHistoryEvidenceReference: optionalText(
    state.operatingHistoryEvidenceReference
  ),
  operatingSince: optionalText(state.operatingSince),
  paymentAccount: {
    accountName: optionalText(state.paymentAccount.accountName),
    accountNumber: optionalText(state.paymentAccount.accountNumber),
    accountType: state.paymentAccount.accountType,
    institution: optionalText(state.paymentAccount.institution),
  },
  paymentDisclosureConsent: state.paymentDisclosureConsent,
  paymentEvidenceReference: optionalText(state.paymentEvidenceReference),
  policyAccepted: state.policyAccepted,
  policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
  services: optionalText(state.services),
});

const toSubmission = (
  state: ProviderApplicationFormState
): ProviderApplicationSubmission => ({
  ageEvidenceReference: state.ageEvidenceReference.trim(),
  fullName: state.fullName.trim(),
  identityEvidenceReference: state.identityEvidenceReference.trim(),
  officialChannelEvidenceReference:
    state.officialChannelEvidenceReference.trim(),
  officialChannels: {
    facebookUrl: optionalText(state.officialChannels.facebookUrl),
    websiteUrl: optionalText(state.officialChannels.websiteUrl),
    zalo: optionalText(state.officialChannels.zalo),
  },
  operatingHistoryEvidenceReference:
    state.operatingHistoryEvidenceReference.trim(),
  operatingSince: state.operatingSince,
  paymentAccount: {
    accountName: state.paymentAccount.accountName.trim(),
    accountNumber: state.paymentAccount.accountNumber.trim(),
    accountType: state.paymentAccount.accountType,
    institution: state.paymentAccount.institution.trim(),
  },
  paymentDisclosureConsent: state.paymentDisclosureConsent,
  paymentEvidenceReference: state.paymentEvidenceReference.trim(),
  policyAccepted: state.policyAccepted,
  policyVersion: CURRENT_PROVIDER_POLICY_VERSION,
  services: state.services.trim(),
});

const hasSubmissionMinimum = (state: ProviderApplicationFormState): boolean => {
  const requiredText = [
    state.ageEvidenceReference,
    state.fullName,
    state.identityEvidenceReference,
    state.officialChannelEvidenceReference,
    state.operatingHistoryEvidenceReference,
    state.operatingSince,
    state.paymentAccount.accountName,
    state.paymentAccount.accountNumber,
    state.paymentAccount.institution,
    state.paymentEvidenceReference,
    state.services,
  ];
  const hasOfficialChannel = Object.values(state.officialChannels).some(
    (value) => value.trim().length > 0
  );

  return (
    requiredText.every((value) => value.trim().length > 0) &&
    hasOfficialChannel &&
    state.policyAccepted
  );
};

const fieldClassName = "w-full";

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

const getSubmitLabel = (mode: "application" | "revision"): string =>
  mode === "revision"
    ? "Gửi yêu cầu cập nhật để xét duyệt"
    : "Gửi hồ sơ để xét duyệt";

export const ProviderApplicationForm = ({
  application,
  mode = "application",
}: {
  application: ProviderApplication | ProviderProfileRevision | null;
  mode?: "application" | "revision";
}) => {
  const [form, setForm] = useState(() => getFormState(application));
  const applicationActions = useProviderApplicationActions();
  const revisionActions = useProviderProfileRevisionActions();
  const { saveDraft, submit } =
    mode === "revision" ? revisionActions : applicationActions;

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

  const handleSaveDraft = async () => {
    try {
      await saveDraft.mutateAsync(toDraft(form));
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
        "Vui lòng hoàn tất bằng chứng, kênh chính thức, thông tin thanh toán và chấp nhận chính sách hiện hành."
      );
      return;
    }

    try {
      await submit.mutateAsync(toSubmission(form));
      toast.success(
        mode === "revision"
          ? "Đã gửi yêu cầu cập nhật profile để Reviewer xem xét."
          : "Đã gửi hồ sơ Provider để Reviewer xem xét."
      );
    } catch (error) {
      toast.error(getSubmitErrorMessage(error, mode));
    }
  };

  const disabled = saveDraft.isPending || submit.isPending;

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="provider-full-name">Tên hiển thị pháp lý</Label>
          <Input
            className={fieldClassName}
            disabled={disabled}
            id="provider-full-name"
            onChange={(event) => updateField("fullName", event.target.value)}
            value={form.fullName}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="provider-operating-since">Bắt đầu hoạt động từ</Label>
          <Input
            className={fieldClassName}
            disabled={disabled}
            id="provider-operating-since"
            onChange={(event) =>
              updateField("operatingSince", event.target.value)
            }
            type="date"
            value={form.operatingSince}
          />
        </div>
      </div>

      <section
        className="grid gap-4 rounded-2xl border p-5"
        aria-labelledby="provider-evidence-title"
      >
        <div>
          <h3 className="font-semibold" id="provider-evidence-title">
            Bằng chứng định danh và lịch sử
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Nhập mã tham chiếu tới tệp/bản ghi đã lưu trong kho bằng chứng của
            quy trình xét duyệt.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="provider-identity-evidence">
              Bằng chứng định danh
            </Label>
            <Input
              disabled={disabled}
              id="provider-identity-evidence"
              onChange={(event) =>
                updateField("identityEvidenceReference", event.target.value)
              }
              value={form.identityEvidenceReference}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-age-evidence">Bằng chứng đủ tuổi</Label>
            <Input
              disabled={disabled}
              id="provider-age-evidence"
              onChange={(event) =>
                updateField("ageEvidenceReference", event.target.value)
              }
              value={form.ageEvidenceReference}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-history-evidence">
              Bằng chứng hoạt động tối thiểu một năm
            </Label>
            <Input
              disabled={disabled}
              id="provider-history-evidence"
              onChange={(event) =>
                updateField(
                  "operatingHistoryEvidenceReference",
                  event.target.value
                )
              }
              value={form.operatingHistoryEvidenceReference}
            />
          </div>
        </div>
      </section>

      <section
        className="grid gap-4 rounded-2xl border p-5"
        aria-labelledby="provider-channels-title"
      >
        <div>
          <h3 className="font-semibold" id="provider-channels-title">
            Kênh chính thức
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Cần ít nhất một kênh có thể đối chiếu công khai.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="provider-facebook">Facebook URL</Label>
            <Input
              disabled={disabled}
              id="provider-facebook"
              onChange={(event) =>
                updateChannel("facebookUrl", event.target.value)
              }
              type="url"
              value={form.officialChannels.facebookUrl}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-website">Website URL</Label>
            <Input
              disabled={disabled}
              id="provider-website"
              onChange={(event) =>
                updateChannel("websiteUrl", event.target.value)
              }
              type="url"
              value={form.officialChannels.websiteUrl}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-zalo">Zalo / số liên hệ chính thức</Label>
            <Input
              disabled={disabled}
              id="provider-zalo"
              onChange={(event) => updateChannel("zalo", event.target.value)}
              value={form.officialChannels.zalo}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-channel-evidence">
              Bằng chứng kênh chính thức
            </Label>
            <Input
              disabled={disabled}
              id="provider-channel-evidence"
              onChange={(event) =>
                updateField(
                  "officialChannelEvidenceReference",
                  event.target.value
                )
              }
              value={form.officialChannelEvidenceReference}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-2">
        <Label htmlFor="provider-services">Mô tả dịch vụ cung cấp</Label>
        <Textarea
          disabled={disabled}
          id="provider-services"
          maxLength={2000}
          onChange={(event) => updateField("services", event.target.value)}
          rows={5}
          value={form.services}
        />
      </div>

      <section
        className="grid gap-4 rounded-2xl border p-5"
        aria-labelledby="provider-payment-title"
      >
        <div>
          <h3 className="font-semibold" id="provider-payment-title">
            Tài khoản thanh toán đã đăng ký
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Thông tin này chỉ dùng trong review; không được đưa vào profile công
            khai tối thiểu.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="provider-payment-type">Loại tài khoản</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              disabled={disabled}
              id="provider-payment-type"
              onChange={(event) =>
                updatePayment(
                  "accountType",
                  event.target.value as "BANK" | "WALLET"
                )
              }
              value={form.paymentAccount.accountType}
            >
              <option value="BANK">Ngân hàng</option>
              <option value="WALLET">Ví điện tử</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-payment-institution">Tổ chức</Label>
            <Input
              disabled={disabled}
              id="provider-payment-institution"
              onChange={(event) =>
                updatePayment("institution", event.target.value)
              }
              value={form.paymentAccount.institution}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-payment-name">Tên chủ tài khoản</Label>
            <Input
              disabled={disabled}
              id="provider-payment-name"
              onChange={(event) =>
                updatePayment("accountName", event.target.value)
              }
              value={form.paymentAccount.accountName}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="provider-payment-number">Số tài khoản</Label>
            <Input
              disabled={disabled}
              id="provider-payment-number"
              onChange={(event) =>
                updatePayment("accountNumber", event.target.value)
              }
              value={form.paymentAccount.accountNumber}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="provider-payment-evidence">
              Bằng chứng tài khoản thanh toán
            </Label>
            <Input
              disabled={disabled}
              id="provider-payment-evidence"
              onChange={(event) =>
                updateField("paymentEvidenceReference", event.target.value)
              }
              value={form.paymentEvidenceReference}
            />
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            checked={form.paymentDisclosureConsent}
            disabled={disabled}
            onChange={(event) =>
              updateField("paymentDisclosureConsent", event.target.checked)
            }
            type="checkbox"
          />
          <span>
            Tôi đồng ý để Avin dùng thông tin tài khoản đã đăng ký cho việc kiểm
            tra và cảnh báo theo chính sách hiện hành.
          </span>
        </label>
      </section>

      <section className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <p className="font-medium">
          Chính sách hiện hành: {CURRENT_PROVIDER_POLICY_VERSION}
        </p>
        <label className="flex items-start gap-3 text-sm">
          <input
            checked={form.policyAccepted}
            disabled={disabled}
            onChange={(event) =>
              updateField("policyAccepted", event.target.checked)
            }
            type="checkbox"
          />
          <span>
            Tôi đã đọc và đồng ý với chính sách Provider hiện hành. Reviewer sẽ
            kiểm tra lại toàn bộ bằng chứng trước khi phát hành profile.
          </span>
        </label>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={disabled}
          onClick={handleSaveDraft}
          type="button"
          variant="outline"
        >
          {saveDraft.isPending ? "Đang lưu..." : "Lưu bản nháp"}
        </Button>
        <Button disabled={disabled} type="submit">
          {submit.isPending ? "Đang gửi..." : getSubmitLabel(mode)}
        </Button>
      </div>
    </form>
  );
};
