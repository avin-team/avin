import {
  PROVIDER_RISK_INCIDENT_EVIDENCE_UPLOAD_ROUTE,
  RISK_REPORT_EVIDENCE_CONTENT_TYPES,
} from "@avin/api/storage";
import { Button } from "@avin/ui/components/button";
import { useUploadFiles } from "@better-upload/client";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { toast } from "sonner";

import { serverURL } from "@/utils/server-url";

import { useProviderRiskIncidentActions } from "../api/provider-api";
import type { ProviderRiskIncident } from "../api/provider-api";

const INCIDENT_STATUS_LABELS: Record<ProviderRiskIncident["status"], string> = {
  AWAITING_PROVIDER_RESPONSE: "Đang chờ phản hồi Provider",
  CONFIRMED_FRAUD: "Đã xác nhận gian lận có chủ ý",
  DISMISSED: "Đã đóng sau xem xét",
  PROVIDER_RESPONDED: "Đã gửi phản hồi, chờ xem xét",
  RESPONSE_EXPIRED: "Đã hết hạn phản hồi",
  UNDER_REVIEW: "Đang được xem xét",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const isResponseWindowOpen = (incident: ProviderRiskIncident): boolean =>
  incident.status === "AWAITING_PROVIDER_RESPONSE" &&
  Date.now() < Date.parse(incident.responseDeadlineAt);

const formatDate = (value: string): string =>
  dateFormatter.format(new Date(value));

const ProviderRiskIncidentCard = ({
  incident,
}: {
  incident: ProviderRiskIncident;
}) => {
  const [response, setResponse] = useState(incident.providerResponse ?? "");
  const { registerEvidence, respond } = useProviderRiskIncidentActions();
  const upload = useUploadFiles({
    api: `${serverURL}/api/provider-risk-incident-evidence-upload`,
    credentials: "include",
    onError: () => toast.error("Không thể tải bằng chứng lên."),
    route: PROVIDER_RISK_INCIDENT_EVIDENCE_UPLOAD_ROUTE,
    uploadBatchSize: 5,
  });
  const responseOpen = isResponseWindowOpen(incident);

  const handleResponse = async (): Promise<void> => {
    try {
      await respond.mutateAsync({
        incidentId: incident.id,
        response: response.trim(),
      });
      toast.success("Đã gửi phản hồi riêng tư cho Reviewer.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể gửi phản hồi."
      );
    }
  };

  const handleEvidence = async (
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (files.length === 0 || !responseOpen) {
      return;
    }
    try {
      const result = await upload.uploadAsync(files, {
        metadata: { incidentId: incident.id, kind: "OTHER" },
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
        await registerEvidence.mutateAsync({
          contentType: uploadedFile.raw.type,
          fileName: uploadedFile.raw.name,
          incidentId: incident.id,
          kind: "OTHER",
          originalStorageKey: uploadedFile.objectInfo.key,
          sizeBytes: uploadedFile.raw.size,
        });
      }
      toast.success("Đã thêm bằng chứng riêng tư.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đăng ký bằng chứng."
      );
    }
  };

  return (
    <article className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">
            Thông báo liên quan đến Risk Report
          </h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Trạng thái: {INCIDENT_STATUS_LABELS[incident.status]}
          </p>
        </div>
        {incident.publicWarning ? (
          <a
            className="font-medium text-primary text-sm underline underline-offset-4"
            href={incident.publicWarning.publicPath}
          >
            Mở cảnh báo công khai
          </a>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Version được đối chiếu</dt>
          <dd className="font-medium">
            {incident.profileVersion.versionNumber} ·{" "}
            {incident.profileVersion.displayName}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Hạn phản hồi</dt>
          <dd className="font-medium">
            {formatDate(incident.responseDeadlineAt)}
          </dd>
        </div>
      </dl>

      {responseOpen ? (
        <div className="mt-5 grid gap-3">
          <label
            className="grid gap-2 text-sm"
            htmlFor={`response-${incident.id}`}
          >
            Phản hồi riêng tư cho Reviewer
            <textarea
              className="min-h-32 rounded-xl border bg-background p-3"
              id={`response-${incident.id}`}
              onChange={(event) => setResponse(event.target.value)}
              placeholder="Mô tả phản hồi, bối cảnh và cách bạn xử lý sự việc..."
              value={response}
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={respond.isPending || response.trim().length < 20}
              onClick={handleResponse}
              type="button"
            >
              {respond.isPending ? "Đang gửi..." : "Gửi phản hồi riêng tư"}
            </Button>
            <label className="cursor-pointer rounded-xl border px-4 py-2 font-medium text-sm">
              Thêm bằng chứng
              <input
                accept={RISK_REPORT_EVIDENCE_CONTENT_TYPES.join(",")}
                className="sr-only"
                multiple
                onChange={handleEvidence}
                type="file"
              />
            </label>
            {upload.isPending || registerEvidence.isPending ? (
              <span className="text-muted-foreground text-sm">
                Đang tải bằng chứng...
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {incident.evidence.length > 0 ? (
        <p className="mt-4 text-muted-foreground text-sm">
          Đã đăng ký {incident.evidence.length} tệp bằng chứng riêng tư.
        </p>
      ) : null}
      {incident.status === "RESPONSE_EXPIRED" ? (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-background/60 p-3 text-sm">
          Profile đã tạm ngưng để xem xét vì quá hạn phản hồi. Đây không phải là
          kết luận gian lận tự động.
        </p>
      ) : null}
    </article>
  );
};

export const ProviderRiskIncidentPanel = ({
  incidents,
}: {
  incidents: ProviderRiskIncident[];
}) => {
  if (incidents.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="provider-risk-incidents-title"
      className="grid gap-4"
    >
      <div>
        <h2
          className="font-semibold text-xl"
          id="provider-risk-incidents-title"
        >
          Thông báo Risk Report cần phản hồi
        </h2>
        <p className="mt-2 text-muted-foreground text-sm">
          Nội dung bạn gửi ở đây chỉ dành cho quy trình xem xét riêng tư của
          Avin Check.
        </p>
      </div>
      {incidents.map((incident) => (
        <ProviderRiskIncidentCard incident={incident} key={incident.id} />
      ))}
    </section>
  );
};
