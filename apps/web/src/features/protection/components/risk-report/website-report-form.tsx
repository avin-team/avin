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

interface WebsiteReportFormProps {
  initialData?: Partial<WebsiteReportData>;
  isSubmitting?: boolean;
  onSubmit: (data: WebsiteReportData) => Promise<void>;
}

export const WebsiteReportForm = ({
  initialData,
  isSubmitting = false,
  onSubmit,
}: WebsiteReportFormProps) => {
  const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl ?? "");
  const [violationType, setViolationType] =
    useState<RiskReportWebsiteViolationType>(
      initialData?.violationType ?? "IMPERSONATION"
    );
  const [impersonatedUrl, setImpersonatedUrl] = useState(
    initialData?.impersonatedUrl ?? ""
  );
  const [evidenceFiles, setEvidenceFiles] = useState<SelectedFileItem[]>(
    initialData?.evidenceFiles ?? []
  );
  const [narrative, setNarrative] = useState(initialData?.narrative ?? "");
  const [optionalDetails, setOptionalDetails] = useState<OptionalDetailsState>(
    initialData?.optionalDetails ?? {
      facebookUrl: "",
      incidentDate: todayInput(),
      ongoing: false,
      phoneNumber: "",
      telegramUrl: "",
      tiktokUrl: "",
    }
  );
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(undefined);

    if (!websiteUrl.trim()) {
      setErrorMessage("Vui lòng nhập link website, app hoặc profile lừa đảo.");
      return;
    }
    if (violationType === "IMPERSONATION" && !impersonatedUrl.trim()) {
      setErrorMessage(
        "Vui lòng nhập link profile/website chính chủ bị mạo danh để đối chiếu."
      );
      return;
    }
    if (evidenceFiles.length === 0) {
      setErrorMessage(
        "Vui lòng tải lên ít nhất một bằng chứng (ảnh chụp màn hình, video...)."
      );
      return;
    }
    if (narrative.trim().length < 50) {
      setErrorMessage(
        "Nội dung mô tả cần tối thiểu 50 ký tự để nêu rõ hành vi lừa đảo."
      );
      return;
    }
    if (!attestationAccepted) {
      setErrorMessage("Vui lòng xác nhận cam kết thông tin trước khi gửi.");
      return;
    }

    try {
      await onSubmit({
        evidenceFiles,
        impersonatedUrl:
          violationType === "IMPERSONATION"
            ? impersonatedUrl.trim()
            : undefined,
        narrative: narrative.trim(),
        optionalDetails,
        violationType,
        websiteUrl: websiteUrl.trim(),
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
        <div className="space-y-1">
          <h3 className="font-bold text-lg" id="web-heading">
            Thông tin Website / App / Profile độc hại
          </h3>
          <p className="text-muted-foreground text-xs">
            Cung cấp đường link và thông tin dấu hiệu giả mạo để hệ thống ghi
            nhận cảnh báo.
          </p>
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
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://website-lua-dao.com/..."
              value={websiteUrl}
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
                setViolationType(val as RiskReportWebsiteViolationType)
              }
              value={violationType}
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

        {violationType === "IMPERSONATION" ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
            <label
              className="grid gap-1.5 font-medium text-sm"
              htmlFor="web-impersonated"
            >
              Link chính chủ / thương hiệu thật bị mạo danh *
              <Input
                autoComplete="off"
                id="web-impersonated"
                onChange={(e) => setImpersonatedUrl(e.target.value)}
                placeholder="https://facebook.com/trang-chinh-chu-that..."
                value={impersonatedUrl}
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
            setOptionalDetails((prev) => ({ ...prev, ...updates }))
          }
          values={optionalDetails}
        />

        <div className="grid gap-2">
          <span className="font-medium text-sm">Bằng chứng lừa đảo *</span>
          <EvidenceUploader
            disabled={isSubmitting}
            onFilesChange={setEvidenceFiles}
            selectedFiles={evidenceFiles}
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
            onChange={(e) => setNarrative(e.target.value)}
            placeholder="Cung cấp chi tiết bằng chứng: phương thức dụ dỗ, link tải app giả, dấu hiệu bất thường..."
            rows={5}
            value={narrative}
          />
          <span className="text-muted-foreground text-xs">
            {narrative.length}/10.000 ký tự (tối thiểu 50 ký tự)
          </span>
        </label>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              checked={attestationAccepted}
              className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary"
              onChange={(e) => setAttestationAccepted(e.target.checked)}
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
