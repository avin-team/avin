import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import {
  useAdminProviderRiskIncidentCandidates,
  useAdminProviderRiskIncidents,
  useConfirmAdminProviderRiskIncidentFraud,
  useLinkAdminProviderRiskIncident,
  useReviewAdminProviderRiskIncident,
} from "../api/risk-reports-api";
import type { ProviderRiskIncident } from "../api/risk-reports-api";
import {
  useAdminSupportReviews,
  useStartAdminSupportReview,
} from "../api/support-reviews-api";

const STATUS_LABELS: Record<ProviderRiskIncident["status"], string> = {
  AWAITING_PROVIDER_RESPONSE: "Chờ phản hồi Provider",
  CONFIRMED_FRAUD: "Đã xác nhận gian lận",
  DISMISSED: "Đã đóng",
  PROVIDER_RESPONDED: "Provider đã phản hồi",
  RESPONSE_EXPIRED: "Quá hạn phản hồi",
  UNDER_REVIEW: "Đang xem xét",
};

const ProviderIncidentCard = ({
  incident,
}: {
  incident: ProviderRiskIncident;
}) => {
  const [reason, setReason] = useState("");
  const confirmFraud = useConfirmAdminProviderRiskIncidentFraud();
  const review = useReviewAdminProviderRiskIncident();
  const supportReviews = useAdminSupportReviews({ incidentId: incident.id });
  const startSupportReview = useStartAdminSupportReview();
  const canReview =
    incident.status === "PROVIDER_RESPONDED" ||
    incident.status === "RESPONSE_EXPIRED";
  const canConfirm =
    incident.status === "PROVIDER_RESPONDED" ||
    incident.status === "RESPONSE_EXPIRED" ||
    incident.status === "UNDER_REVIEW";

  const handleReview = async (status: "DISMISSED" | "UNDER_REVIEW") => {
    if (!reason.trim()) {
      toast.error("Hãy nhập lý do review.");
      return;
    }
    try {
      await review.mutateAsync({
        incidentId: incident.id,
        reason: reason.trim(),
        status,
      });
      toast.success("Đã cập nhật trạng thái incident.");
      setReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể review.");
    }
  };

  const handleConfirmFraud = async () => {
    if (!reason.trim()) {
      toast.error("Hãy nhập lý do xác nhận gian lận.");
      return;
    }
    try {
      await confirmFraud.mutateAsync({
        incidentId: incident.id,
        reason: reason.trim(),
      });
      toast.success("Đã gỡ profile Provider khỏi directory active.");
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể áp dụng enforcement."
      );
    }
  };

  const handleStartSupportReview = async () => {
    try {
      await startSupportReview.mutateAsync({
        incidentId: incident.id,
        reason: "Incident đã được Moderator đưa vào xem xét Support Review.",
      });
      toast.success("Đã mở Support Review riêng tư.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể mở Support Review."
      );
    }
  };

  const supportReview = supportReviews.data?.[0];

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{STATUS_LABELS[incident.status]}</p>
          <p className="mt-1 text-muted-foreground text-xs">
            Provider profile: {incident.profile.profileSlug} · version{" "}
            {incident.profileVersion.versionNumber}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          Hạn: {new Date(incident.responseDeadlineAt).toLocaleString("vi-VN")}
        </p>
      </div>
      {incident.providerResponse ? (
        <div className="rounded-lg border bg-background p-3 text-sm">
          <p className="font-medium">Phản hồi riêng tư của Provider</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {incident.providerResponse}
          </p>
        </div>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Evidence Provider: {incident.evidence.length} tệp · lịch sử:{" "}
        {incident.history.length} sự kiện
      </p>
      {incident.status === "UNDER_REVIEW" ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Support Review riêng tư</p>
          <p className="mt-1 text-muted-foreground">
            Chỉ mở từ incident đã được Moderator xem xét; không có public claim
            form và không tự động tạo khoản chi trả.
          </p>
          {supportReview ? (
            <Link
              className="mt-3 inline-flex font-medium text-primary underline underline-offset-4"
              to="/avin-check/support-reviews"
            >
              Mở Support Review · {supportReview.status}
            </Link>
          ) : (
            <Button
              className="mt-3"
              disabled={startSupportReview.isPending}
              onClick={() => void handleStartSupportReview()}
              size="sm"
              type="button"
            >
              {startSupportReview.isPending
                ? "Đang mở..."
                : "Mở Support Review"}
            </Button>
          )}
        </div>
      ) : null}
      {canReview || canConfirm ? (
        <div className="grid gap-3">
          <label
            className="grid gap-2 text-sm"
            htmlFor={`incident-reason-${incident.id}`}
          >
            Lý do quyết định
            <textarea
              className="min-h-24 rounded-lg border bg-background p-3"
              id={`incident-reason-${incident.id}`}
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {canReview ? (
              <>
                <Button
                  disabled={review.isPending}
                  onClick={() => void handleReview("UNDER_REVIEW")}
                  variant="outline"
                >
                  Đưa vào xem xét
                </Button>
                <Button
                  disabled={review.isPending}
                  onClick={() => void handleReview("DISMISSED")}
                  variant="outline"
                >
                  Đóng incident
                </Button>
              </>
            ) : null}
            {canConfirm ? (
              <Button
                disabled={confirmFraud.isPending}
                onClick={() => void handleConfirmFraud()}
                variant="destructive"
              >
                Xác nhận gian lận có chủ ý
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const ProviderRiskIncidentPanel = ({
  reportId,
}: {
  reportId: string;
}) => {
  const [search, setSearch] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const incidents = useAdminProviderRiskIncidents(reportId);
  const candidates = useAdminProviderRiskIncidentCandidates(search);
  const link = useLinkAdminProviderRiskIncident();
  const selectedCandidate = candidates.data?.find(
    (candidate) => candidate.id === selectedProfileId
  );
  const profileCandidateItems = [
    { label: "Chọn Provider profile", value: null },
    ...(candidates.data ?? []).map((candidate) => ({
      label: `${candidate.displayName} · ${candidate.profileSlug} · v${candidate.versionNumber}`,
      value: candidate.id,
    })),
  ];

  const handleLink = async () => {
    if (!selectedCandidate) {
      toast.error("Chọn Provider profile trước.");
      return;
    }
    try {
      await link.mutateAsync({
        profileId: selectedCandidate.id,
        profileVersionId: selectedCandidate.versionId,
        reportId,
      });
      toast.success("Đã tạo notice Provider và mở cửa sổ phản hồi 48 giờ.");
      setSelectedProfileId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể liên kết Provider."
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider-linked incident</CardTitle>
        <CardDescription>
          Liên kết report đã moderation với đúng profile/version. Provider chỉ
          nhận notice và gửi phản hồi riêng tư; Moderator/Manager mới quyết định
          enforcement.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
          <label
            className="grid gap-2 text-sm"
            htmlFor="provider-profile-search"
          >
            Tìm Provider profile
            <input
              className="rounded-lg border bg-background p-2"
              id="provider-profile-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên, slug, Provider ID hoặc dịch vụ"
              value={search}
            />
          </label>
          <label
            className="grid gap-2 text-sm"
            htmlFor="provider-profile-candidate"
          >
            Profile/version authoritative
            <Select
              items={profileCandidateItems}
              onValueChange={(value) => setSelectedProfileId(value ?? "")}
              value={selectedProfileId || null}
            >
              <SelectTrigger
                className="w-full rounded-lg border bg-background p-2"
                id="provider-profile-candidate"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {profileCandidateItems.map((item) => (
                    <SelectItem key={item.value ?? "empty"} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <Button
            className="w-fit"
            disabled={link.isPending || !selectedCandidate}
            onClick={() => void handleLink()}
            type="button"
          >
            {link.isPending ? "Đang tạo notice..." : "Liên kết & gửi notice"}
          </Button>
        </div>
        {incidents.isPending ? (
          <p className="text-muted-foreground text-sm">Đang tải incident...</p>
        ) : null}
        {(incidents.data ?? []).map((incident) => (
          <ProviderIncidentCard incident={incident} key={incident.id} />
        ))}
        {!incidents.isPending && (incidents.data ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Chưa có Provider-linked incident cho report này.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
