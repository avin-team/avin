import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
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
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
import {
  providerRiskIncidentDecisionFormSchema,
  providerRiskIncidentLinkFormSchema,
} from "../schemas/provider-risk-incident-form-schema";

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
  const decisionRef = useRef<"UNDER_REVIEW" | "DISMISSED" | "CONFIRMED_FRAUD">(
    "UNDER_REVIEW"
  );
  const decisionForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      const submitter = decisionRef.current;
      if (submitter === "CONFIRMED_FRAUD") {
        try {
          await confirmFraud.mutateAsync({
            incidentId: incident.id,
            reason: value.reason.trim(),
          });
          toast.success("Đã gỡ profile Provider khỏi directory active.");
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Không thể áp dụng enforcement."
          );
        }
      } else {
        const status = submitter === "DISMISSED" ? "DISMISSED" : "UNDER_REVIEW";
        try {
          await review.mutateAsync({
            incidentId: incident.id,
            reason: value.reason.trim(),
            status,
          });
          toast.success("Đã cập nhật trạng thái incident.");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Không thể review."
          );
        }
      }
      decisionForm.reset();
    },
    validators: { onSubmit: providerRiskIncidentDecisionFormSchema },
  });

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
        <form
          className="grid gap-3"
          id={`incident-decision-form-${incident.id}`}
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const submitter = (event.nativeEvent as SubmitEvent)
              .submitter as HTMLButtonElement | null;
            if (submitter?.value === "DISMISSED") {
              decisionRef.current = "DISMISSED";
            } else if (submitter?.value === "CONFIRMED_FRAUD") {
              decisionRef.current = "CONFIRMED_FRAUD";
            } else {
              decisionRef.current = "UNDER_REVIEW";
            }
            await decisionForm.handleSubmit();
          }}
        >
          <FieldGroup>
            <decisionForm.Field name="reason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Lý do quyết định
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      className="min-h-24"
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
            </decisionForm.Field>
          </FieldGroup>
          <decisionForm.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <div className="flex flex-wrap gap-2">
                {canReview ? (
                  <>
                    <Button
                      disabled={!canSubmit || isSubmitting || review.isPending}
                      form={`incident-decision-form-${incident.id}`}
                      name="decision"
                      type="submit"
                      value="UNDER_REVIEW"
                      variant="outline"
                    >
                      Đưa vào xem xét
                    </Button>
                    <Button
                      disabled={!canSubmit || isSubmitting || review.isPending}
                      form={`incident-decision-form-${incident.id}`}
                      name="decision"
                      type="submit"
                      value="DISMISSED"
                      variant="outline"
                    >
                      Đóng incident
                    </Button>
                  </>
                ) : null}
                {canConfirm ? (
                  <Button
                    disabled={
                      !canSubmit || isSubmitting || confirmFraud.isPending
                    }
                    form={`incident-decision-form-${incident.id}`}
                    name="decision"
                    type="submit"
                    value="CONFIRMED_FRAUD"
                    variant="destructive"
                  >
                    Xác nhận gian lận có chủ ý
                  </Button>
                ) : null}
              </div>
            )}
          </decisionForm.Subscribe>
        </form>
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
  const incidents = useAdminProviderRiskIncidents(reportId);
  const candidates = useAdminProviderRiskIncidentCandidates(search);
  const link = useLinkAdminProviderRiskIncident();
  const profileCandidateItems = [
    { label: "Chọn Provider profile", value: null },
    ...(candidates.data ?? []).map((candidate) => ({
      label: `${candidate.displayName} · ${candidate.profileSlug} · v${candidate.versionNumber}`,
      value: candidate.id,
    })),
  ];
  const linkForm = useForm({
    defaultValues: { profileId: "" },
    onSubmit: async ({ value }) => {
      const selectedCandidate = candidates.data?.find(
        (candidate) => candidate.id === value.profileId
      );
      if (!selectedCandidate) {
        return;
      }
      try {
        await link.mutateAsync({
          profileId: selectedCandidate.id,
          profileVersionId: selectedCandidate.versionId,
          reportId,
        });
        toast.success("Đã tạo notice Provider và mở cửa sổ phản hồi 48 giờ.");
        linkForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể liên kết Provider."
        );
      }
    },
    validators: { onSubmit: providerRiskIncidentLinkFormSchema },
  });

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
        <form
          className="grid gap-3 rounded-xl border bg-muted/20 p-4"
          id={`provider-profile-link-form-${reportId}`}
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await linkForm.handleSubmit();
          }}
        >
          <label
            className="grid gap-2 text-sm"
            htmlFor="provider-profile-search"
          >
            Tìm Provider profile
            <Input
              id="provider-profile-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tên, slug, Provider ID hoặc dịch vụ"
              value={search}
            />
          </label>
          <FieldGroup>
            <linkForm.Field name="profileId">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Profile/version authoritative
                    </FieldLabel>
                    <Select
                      items={profileCandidateItems}
                      onValueChange={(value) => field.handleChange(value ?? "")}
                      value={field.state.value || null}
                    >
                      <SelectTrigger
                        className="w-full rounded-lg border bg-background p-2"
                        id={field.name}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {profileCandidateItems.map((item) => (
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
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </linkForm.Field>
          </FieldGroup>
          <linkForm.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <Button
                className="w-fit"
                disabled={!canSubmit || isSubmitting || link.isPending}
                form={`provider-profile-link-form-${reportId}`}
                type="submit"
              >
                {isSubmitting || link.isPending
                  ? "Đang tạo notice..."
                  : "Liên kết & gửi notice"}
              </Button>
            )}
          </linkForm.Subscribe>
        </form>
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
