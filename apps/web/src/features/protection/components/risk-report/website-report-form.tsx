import type { RiskReportWebsiteViolationType } from "@avin/api/protection/risk-report";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Button } from "@avin/ui/components/button";
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
import { useState } from "react";
import { toast } from "sonner";

import { EvidenceUploader } from "./evidence-uploader";
import type { SelectedFileItem } from "./evidence-uploader";
import { OptionalDetailsSection } from "./optional-details-section";
import type { OptionalDetailsState } from "./optional-details-section";

const todayInput = (): string => new Date().toISOString().slice(0, 10);

const violationTypeOptions = [
  { label: "Mạo danh thương hiệu / cá nhân", value: "IMPERSONATION" },
  { label: "Lừa lấy thông tin (Phishing)", value: "PHISHING" },
  { label: "Phát tán mã độc / virus (Malware)", value: "MALWARE" },
  { label: "Shop / cửa hàng giả mạo", value: "FAKE_STORE" },
  { label: "Lừa đảo thanh toán / cổng nạp fake", value: "PAYMENT_SCAM" },
  { label: "Khác", value: "OTHER" },
] as const satisfies readonly {
  label: string;
  value: RiskReportWebsiteViolationType;
}[];

export interface WebsiteReportData {
  evidenceFiles: SelectedFileItem[];
  impersonatedUrl?: string;
  narrative: string;
  optionalDetails: OptionalDetailsState;
  violationType: RiskReportWebsiteViolationType;
  websiteUrl: string;
}

interface FormState {
  attestationAccepted: boolean;
  evidenceFiles: SelectedFileItem[];
  impersonatedUrl: string;
  narrative: string;
  optionalDetails: OptionalDetailsState;
  violationType: RiskReportWebsiteViolationType;
  websiteUrl: string;
}

interface WebsiteReportFormProps {
  initialData?: Partial<WebsiteReportData>;
  isSubmitting?: boolean;
  onSubmit: (data: WebsiteReportData) => Promise<void>;
}

const getInitialFormState = (
  initialData?: Partial<WebsiteReportData>
): FormState => ({
  attestationAccepted: false,
  evidenceFiles: initialData?.evidenceFiles ?? [],
  impersonatedUrl: initialData?.impersonatedUrl ?? "",
  narrative: initialData?.narrative ?? "",
  optionalDetails: initialData?.optionalDetails ?? {
    facebookUrl: "",
    incidentDate: todayInput(),
    ongoing: false,
    phoneNumber: "",
    telegramUrl: "",
    tiktokUrl: "",
  },
  violationType: initialData?.violationType ?? "IMPERSONATION",
  websiteUrl: initialData?.websiteUrl ?? "",
});

export const WebsiteReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: WebsiteReportFormProps) => {
  const [form, setForm] = useState<FormState>(() =>
    getInitialFormState(initialData)
  );
  const [errorMessage, setErrorMessage] = useState<string>();

  const fillDevelopmentData = () => {
    if (!import.meta.env.DEV) {
      return;
    }
    const sampleFile = new File(
      ["evidence-content-preview"],
      "screenshot_website_fake.png",
      { type: "image/png" }
    );
    setForm({
      attestationAccepted: true,
      evidenceFiles: [
        {
          file: sampleFile,
          id: globalThis.crypto.randomUUID(),
          previewUrl: "https://placehold.co/600x400/png?text=Website+Fake",
        },
      ],
      impersonatedUrl: "https://facebook.com/avin.official",
      narrative:
        "Trang web này tạo giao diện nhái hệt cổng đăng nhập của Avin để đánh cắp tài khoản và mật khẩu của người dùng khi truy cập và nhập thông tin.",
      optionalDetails: {
        facebookUrl: "https://facebook.com/trang.web.lua.dao",
        incidentDate: todayInput(),
        ongoing: true,
        phoneNumber: "0912345678",
        telegramUrl: "https://t.me/fake_support_bot",
        tiktokUrl: "https://tiktok.com/@fake_shop_review",
      },
      violationType: "IMPERSONATION",
      websiteUrl: "https://fake-shop-avin-scam.xyz/login",
    });
    toast.success("Đã điền dữ liệu mẫu cho môi trường dev.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(undefined);

    if (!form.websiteUrl.trim()) {
      setErrorMessage("Vui lòng nhập link website, app hoặc profile lừa đảo.");
      return;
    }
    if (
      form.violationType === "IMPERSONATION" &&
      !form.impersonatedUrl.trim()
    ) {
      setErrorMessage(
        "Vui lòng nhập link profile/website chính chủ bị mạo danh để đối chiếu."
      );
      return;
    }
    if (form.evidenceFiles.length === 0) {
      setErrorMessage(
        "Vui lòng tải lên ít nhất một bằng chứng (ảnh chụp màn hình, video...)."
      );
      return;
    }
    if (form.narrative.trim().length < 50) {
      setErrorMessage(
        "Nội dung mô tả cần tối thiểu 50 ký tự để nêu rõ hành vi lừa đảo."
      );
      return;
    }
    if (!form.attestationAccepted) {
      setErrorMessage("Vui lòng xác nhận cam kết thông tin trước khi gửi.");
      return;
    }

    try {
      await onSubmit({
        evidenceFiles: form.evidenceFiles,
        impersonatedUrl:
          form.violationType === "IMPERSONATION"
            ? form.impersonatedUrl.trim()
            : undefined,
        narrative: form.narrative.trim(),
        optionalDetails: form.optionalDetails,
        violationType: form.violationType,
        websiteUrl: form.websiteUrl.trim(),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Đã xảy ra lỗi khi gửi tố cáo."
      );
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section
        aria-labelledby="web-heading"
        className="space-y-6 rounded-3xl border bg-card p-6 sm:p-8"
      >
        <div className="flex w-full flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="font-bold text-lg" id="web-heading">
              Thông tin Website / App / Profile độc hại
            </h3>
            <p className="text-muted-foreground text-xs">
              Cung cấp đường link và thông tin dấu hiệu giả mạo để hệ thống ghi
              nhận cảnh báo.
            </p>
          </div>
          {import.meta.env.DEV ? (
            <Button
              disabled={isSubmitting}
              onClick={fillDevelopmentData}
              size="sm"
              type="button"
              variant="outline"
            >
              Điền dữ liệu mẫu
            </Button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-semibold text-primary text-sm">
            BẠN BIẾT MỘT WEBSITE / APP / PROFILE LỪA ĐẢO?
          </p>
          <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
            Bạn gửi tố cáo các đường link website lừa đảo, giả mạo thương hiệu,
            đa cấp trá hình, phát tán virus, fake app. Hệ thống sẽ ngăn chặn và
            cảnh báo tới cộng đồng.
          </p>
        </div>

        {errorMessage ? (
          <Alert
            className="border-destructive/30 bg-destructive/5"
            role="alert"
          >
            <AlertTitle>Chưa thể gửi tố cáo</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 font-medium text-sm" htmlFor="web-url">
            Link Website / App / Profile giả mạo *
            <Input
              autoComplete="off"
              id="web-url"
              onChange={(e) =>
                setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))
              }
              placeholder="https://website-lua-dao.com/..."
              value={form.websiteUrl}
            />
          </label>

          <label
            className="grid gap-1.5 font-medium text-sm"
            htmlFor="web-violation"
          >
            Thể loại lừa đảo *
            <Select
              items={violationTypeOptions}
              onValueChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  violationType: val as RiskReportWebsiteViolationType,
                }))
              }
              value={form.violationType}
            >
              <SelectTrigger id="web-violation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {violationTypeOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        </div>

        {form.violationType === "IMPERSONATION" ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <label
              className="grid gap-1.5 font-medium text-sm"
              htmlFor="web-impersonated"
            >
              Link chính chủ / thương hiệu thật bị mạo danh *
              <Input
                autoComplete="off"
                id="web-impersonated"
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    impersonatedUrl: e.target.value,
                  }))
                }
                placeholder="https://facebook.com/trang-chinh-chu-that..."
                value={form.impersonatedUrl}
              />
            </label>
            <p className="mt-1.5 text-muted-foreground text-xs">
              Dùng để Moderator đối chiếu dấu hiệu giả mạo giữa trang thật và
              trang giả.
            </p>
          </div>
        ) : null}

        <OptionalDetailsSection
          dateLabel="Ngày phát hiện"
          onChange={(updates) =>
            setForm((prev) => ({
              ...prev,
              optionalDetails: { ...prev.optionalDetails, ...updates },
            }))
          }
          values={form.optionalDetails}
        />

        <div className="grid gap-2">
          <span className="font-medium text-sm">Bằng chứng lừa đảo *</span>
          <EvidenceUploader
            disabled={isSubmitting}
            onFilesChange={(files) =>
              setForm((prev) => ({ ...prev, evidenceFiles: files }))
            }
            selectedFiles={form.evidenceFiles}
          />
        </div>

        <label
          className="grid gap-1.5 font-medium text-sm"
          htmlFor="web-narrative"
        >
          Nội dung mô tả *
          <Textarea
            id="web-narrative"
            maxLength={10_000}
            minLength={50}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, narrative: e.target.value }))
            }
            placeholder="Cung cấp chi tiết bằng chứng: phương thức dụ dỗ, link tải app giả, dấu hiệu bất thường..."
            rows={5}
            value={form.narrative}
          />
          <span className="text-muted-foreground text-xs">
            {form.narrative.length}/10.000 ký tự (tối thiểu 50 ký tự)
          </span>
        </label>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              checked={form.attestationAccepted}
              className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary"
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  attestationAccepted: e.target.checked,
                }))
              }
              type="checkbox"
            />
            <span>
              Tôi cam kết thông tin và bằng chứng cung cấp trên là trung thực và
              chịu trách nhiệm về nội dung tố cáo này.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end border-t pt-5">
          <Button
            className="h-11 w-full sm:w-auto px-8 font-semibold text-sm"
            disabled={isSubmitting}
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Đang gửi đơn duyệt..." : "Gửi duyệt tố cáo"}
          </Button>
        </div>
      </section>
    </form>
  );
};
