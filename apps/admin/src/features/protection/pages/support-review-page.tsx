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
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

import {
  useAdminSupportReviews,
  useApproveAdminSupportReview,
  useEvaluateAdminSupportReview,
  useRecordAdminSupportReviewOutcome,
  useReconsiderAdminSupportReview,
} from "../api/support-reviews-api";
import type { SupportReview } from "../api/support-reviews-api";
import {
  createSupportReviewOutcomeFormSchema,
  supportReviewApprovalFormSchema,
  supportReviewEligibilityFormSchema,
  supportReviewReconsiderationFormSchema,
} from "../schemas/support-review-form-schema";

const STATUS_LABELS = {
  APPROVED: "Đã duyệt",
  DECLINED: "Đã từ chối",
  ELIGIBILITY_REVIEW: "Đang xét điều kiện",
  ELIGIBLE: "Đủ điều kiện, chờ ghi outcome",
  INELIGIBLE: "Không đủ điều kiện",
  PENDING_APPROVAL: "Chờ SUPER_ADMIN xử lý",
} as const;

const OUTCOME_LABELS = {
  HANDLED_BY_PROGRAM: "Đã được chương trình xử lý",
  HANDLED_BY_PROVIDER: "Đã được Provider xử lý",
  INELIGIBLE: "Không thuộc phạm vi hỗ trợ",
  UNDER_VERIFICATION: "Đang xác minh",
  VIOLATION_CONFIRMED: "Đã xác nhận vi phạm",
} as const;

const SUPPORT_OUTCOME_OPTIONS = [
  "HANDLED_BY_PROGRAM",
  "HANDLED_BY_PROVIDER",
  "UNDER_VERIFICATION",
  "VIOLATION_CONFIRMED",
] as const;

const TRANSACTION_SCOPE_LABELS = {
  AGENT_DEPOSIT: "Agent deposit",
  DIRECT: "Direct",
  GDV: "GDV",
  IMPERSONATOR: "Impersonator",
  INDIRECT: "Indirect",
  LENDING: "Lending",
  LOWER_PRIORITY_GROUP: "Lower-priority group",
  OUT_OF_SCOPE: "Out of scope",
  WEBSITE_OPERATED: "Website-operated",
} as const;

const SUPPORT_CHANNEL_ITEMS = [
  { label: "Facebook", value: "FACEBOOK" },
  { label: "Zalo", value: "ZALO" },
  { label: "Kênh khác", value: "OTHER" },
] as const;

const TRANSACTION_SCOPE_ITEMS = Object.entries(TRANSACTION_SCOPE_LABELS).map(
  ([value, label]) => ({ label, value })
);

const SUPPORT_OUTCOME_ITEMS = SUPPORT_OUTCOME_OPTIONS.map((value) => ({
  label: OUTCOME_LABELS[value],
  value,
}));

const RECONSIDERATION_BASIS_ITEMS = [
  { label: "Bằng chứng mới", value: "NEW_EVIDENCE" },
  { label: "Lỗi quy trình", value: "PROCEDURAL_ERROR" },
] as const;

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const toIsoDateTime = (value: string): string => {
  const date = new Date(value);
  return date.toISOString();
};

const toDateTimeLocal = (value: string | null): string =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

const formatOptionalSupportAmount = (value: number | null): string => {
  if (value === null) {
    return "";
  }
  return ` / ${vndFormatter.format(value)}`;
};

const ReviewSummary = ({ review }: { review: SupportReview }) => (
  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
    <div>
      <p className="font-medium">Provider</p>
      <p className="text-muted-foreground">
        {review.profile.displayName} · {review.profile.profileSlug}
      </p>
    </div>
    <div>
      <p className="font-medium">Risk Report</p>
      <p className="text-muted-foreground">
        {review.riskReport.type} · {review.riskReport.status}
      </p>
    </div>
    <div>
      <p className="font-medium">Historical limit</p>
      <p className="text-muted-foreground">
        {review.historicalRecommendedTransactionLimit === null
          ? "Chưa xác định"
          : vndFormatter.format(review.historicalRecommendedTransactionLimit)}
      </p>
    </div>
    <div>
      <p className="font-medium">Support cap / amount</p>
      <p className="text-muted-foreground">
        {review.recommendedSupportAmount === null
          ? "Chưa tính"
          : vndFormatter.format(review.recommendedSupportAmount)}
        {formatOptionalSupportAmount(review.supportAmount)}
      </p>
    </div>
  </div>
);

const EligibilityForm = ({ review }: { review: SupportReview }) => {
  const evaluate = useEvaluateAdminSupportReview();
  const profileVersionItems = review.profileVersions.map((version) => ({
    label: `v${version.versionNumber} · limit ${version.recommendedTransactionLimit}`,
    value: version.versionId,
  }));
  const eligibilityForm = useForm({
    defaultValues: {
      actualLoss: String(review.verifiedActualLoss ?? ""),
      approvedServiceConfirmed: false,
      channel: "FACEBOOK" as "FACEBOOK" | "ZALO" | "OTHER",
      evidenceSufficient: false,
      preTransactionVideoPresent: false,
      privateEvidenceReference: review.privateEvidenceReference ?? "",
      profileVersionId:
        review.transactionProfileVersionId ?? review.profileVersion.versionId,
      providerIdentityConfirmed: false,
      reason: "",
      registeredPaymentIdentityConfirmed: false,
      requiredProcessCompleted: false,
      scope: "DIRECT" as keyof typeof TRANSACTION_SCOPE_LABELS,
      transactionAt: toDateTimeLocal(review.transactionOccurredAt),
      transactionLawfulConfirmed: false,
    },
    onSubmit: async ({ value }) => {
      try {
        await evaluate.mutateAsync({
          approvedServiceConfirmed: value.approvedServiceConfirmed,
          evidenceSufficient: value.evidenceSufficient,
          preTransactionVideoPresent: value.preTransactionVideoPresent,
          privateEvidenceReference: value.privateEvidenceReference.trim(),
          providerIdentityConfirmed: value.providerIdentityConfirmed,
          reason: value.reason.trim(),
          registeredPaymentIdentityConfirmed:
            value.registeredPaymentIdentityConfirmed,
          requiredProcessCompleted: value.requiredProcessCompleted,
          reviewId: review.id,
          transactionChannel: value.channel,
          transactionLawfulConfirmed: value.transactionLawfulConfirmed,
          transactionOccurredAt: toIsoDateTime(value.transactionAt),
          transactionProfileVersionId: value.profileVersionId,
          transactionScope: value.scope,
          verifiedActualLoss: Number(value.actualLoss),
        });
        toast.success("Đã lưu kết quả xét điều kiện Support Review.");
        eligibilityForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể xét điều kiện."
        );
      }
    },
    validators: { onSubmit: supportReviewEligibilityFormSchema },
  });

  return (
    <form
      className="grid gap-4 rounded-xl border bg-muted/20 p-4"
      id={`support-eligibility-form-${review.id}`}
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await eligibilityForm.handleSubmit();
      }}
    >
      <FieldGroup className="gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <eligibilityForm.Field name="channel">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Kênh giao dịch</FieldLabel>
                <Select
                  items={SUPPORT_CHANNEL_ITEMS}
                  onValueChange={(value) =>
                    field.handleChange(value as "FACEBOOK" | "ZALO" | "OTHER")
                  }
                  value={field.state.value}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-md border border-input bg-background px-3"
                    id={field.name}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {SUPPORT_CHANNEL_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </eligibilityForm.Field>
          <eligibilityForm.Field name="scope">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Phạm vi giao dịch</FieldLabel>
                <Select
                  items={TRANSACTION_SCOPE_ITEMS}
                  onValueChange={(value) =>
                    field.handleChange(
                      value as keyof typeof TRANSACTION_SCOPE_LABELS
                    )
                  }
                  value={field.state.value}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-md border border-input bg-background px-3"
                    id={field.name}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TRANSACTION_SCOPE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </eligibilityForm.Field>
          <eligibilityForm.Field name="transactionAt">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Thời điểm giao dịch
                  </FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    type="datetime-local"
                    value={field.state.value}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              );
            }}
          </eligibilityForm.Field>
          <eligibilityForm.Field name="profileVersionId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>
                  Profile version tại thời điểm giao dịch
                </FieldLabel>
                <Select
                  items={profileVersionItems}
                  onValueChange={(value) => field.handleChange(value ?? "")}
                  value={field.state.value}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-md border border-input bg-background px-3"
                    id={field.name}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {profileVersionItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </eligibilityForm.Field>
          <eligibilityForm.Field name="actualLoss">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Verified actual loss (VND)
                  </FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    id={field.name}
                    inputMode="numeric"
                    min={0}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    type="number"
                    value={field.state.value}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              );
            }}
          </eligibilityForm.Field>
          <eligibilityForm.Field name="privateEvidenceReference">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Private evidence reference
                  </FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    value={field.state.value}
                  />
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              );
            }}
          </eligibilityForm.Field>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {(
            [
              ["providerIdentityConfirmed", "Đúng Provider"],
              ["approvedServiceConfirmed", "Đúng dịch vụ đã duyệt"],
              [
                "registeredPaymentIdentityConfirmed",
                "Đúng payment identity đăng ký",
              ],
              ["transactionLawfulConfirmed", "Giao dịch lawful và trực tiếp"],
              ["evidenceSufficient", "Evidence đủ để xác minh"],
              ["requiredProcessCompleted", "Đủ transaction process"],
              [
                "preTransactionVideoPresent",
                "Có video pre-transaction bắt buộc",
              ],
            ] as const
          ).map(([key, label]) => (
            <eligibilityForm.Field key={key} name={key}>
              {(field) => (
                <Field orientation="horizontal">
                  <FieldLabel htmlFor={field.name}>
                    <input
                      checked={field.state.value}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.checked)
                      }
                      type="checkbox"
                    />
                    {label}
                  </FieldLabel>
                </Field>
              )}
            </eligibilityForm.Field>
          ))}
        </div>
        <eligibilityForm.Field name="reason">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Ghi chú xét điều kiện
                </FieldLabel>
                <Textarea
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  rows={3}
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </eligibilityForm.Field>
      </FieldGroup>
      <eligibilityForm.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <Button
            className="w-fit"
            disabled={!canSubmit || isSubmitting || evaluate.isPending}
            form={`support-eligibility-form-${review.id}`}
            type="submit"
          >
            {isSubmitting || evaluate.isPending
              ? "Đang lưu..."
              : "Lưu kết quả xét điều kiện"}
          </Button>
        )}
      </eligibilityForm.Subscribe>
    </form>
  );
};

const OutcomeForm = ({ review }: { review: SupportReview }) => {
  const record = useRecordAdminSupportReviewOutcome();
  const outcomeForm = useForm({
    defaultValues: {
      evidenceReference: review.privateEvidenceReference ?? "",
      externalReference: "",
      outcome: "HANDLED_BY_PROGRAM" as (typeof SUPPORT_OUTCOME_OPTIONS)[number],
      reason: "",
      supportAmount: String(review.recommendedSupportAmount ?? 0),
    },
    onSubmit: async ({ value }) => {
      try {
        await record.mutateAsync({
          externalActionReference: value.externalReference.trim(),
          privateEvidenceReference: value.evidenceReference.trim(),
          publicOutcome: value.outcome,
          reason: value.reason.trim(),
          reviewId: review.id,
          supportAmount: Number(value.supportAmount),
        });
        toast.success("Đã ghi outcome và hoàn tất bằng quyền SUPER_ADMIN.");
        outcomeForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể ghi outcome."
        );
      }
    },
    validators: {
      onSubmit: createSupportReviewOutcomeFormSchema(
        review.recommendedSupportAmount
      ),
    },
  });

  return (
    <form
      className="grid gap-3 rounded-xl border bg-muted/20 p-4"
      id={`support-outcome-form-${review.id}`}
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await outcomeForm.handleSubmit();
      }}
    >
      <p className="font-medium text-sm">
        Ghi kết quả off-platform và Bond Allocation
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <outcomeForm.Field name="outcome">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Public outcome label</FieldLabel>
              <Select
                items={SUPPORT_OUTCOME_ITEMS}
                onValueChange={(value) =>
                  field.handleChange(
                    value as (typeof SUPPORT_OUTCOME_OPTIONS)[number]
                  )
                }
                value={field.state.value}
              >
                <SelectTrigger
                  className="h-9 w-full rounded-md border border-input bg-background px-3"
                  id={field.name}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SUPPORT_OUTCOME_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </outcomeForm.Field>
        <outcomeForm.Field name="supportAmount">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Support amount (≤ cap)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  inputMode="numeric"
                  max={review.recommendedSupportAmount ?? 0}
                  min={0}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  type="number"
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </outcomeForm.Field>
        <outcomeForm.Field name="externalReference">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  External action reference
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </outcomeForm.Field>
        <outcomeForm.Field name="evidenceReference">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Private evidence reference
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </outcomeForm.Field>
      </div>
      <outcomeForm.Field name="reason">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Ghi chú outcome</FieldLabel>
              <Textarea
                aria-invalid={isInvalid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={3}
                value={field.state.value}
              />
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          );
        }}
      </outcomeForm.Field>
      <outcomeForm.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <Button
            className="w-fit"
            disabled={!canSubmit || isSubmitting || record.isPending}
            form={`support-outcome-form-${review.id}`}
            type="submit"
          >
            {isSubmitting || record.isPending
              ? "Đang ghi..."
              : "Ghi outcome & hoàn tất"}
          </Button>
        )}
      </outcomeForm.Subscribe>
    </form>
  );
};

const ApprovalPanel = ({ review }: { review: SupportReview }) => {
  const approve = useApproveAdminSupportReview();
  const approvalForm = useForm({
    defaultValues: {
      decision: "APPROVED" as "APPROVED" | "REJECTED",
      reason: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await approve.mutateAsync({
          decision: value.decision,
          reason: value.reason.trim() || undefined,
          reviewId: review.id,
        });
        toast.success(
          value.decision === "APPROVED"
            ? "Đã duyệt Support Review và Bond Adjustment."
            : "Đã từ chối Support Review."
        );
        approvalForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể quyết định review."
        );
      }
    },
    validators: { onSubmit: supportReviewApprovalFormSchema },
  });

  return (
    <form
      className="grid gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
      id={`support-approval-form-${review.id}`}
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const submitter = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        const decision =
          submitter?.value === "REJECTED" ? "REJECTED" : "APPROVED";
        approvalForm.setFieldValue("decision", decision);
        await approvalForm.handleSubmit();
      }}
    >
      <p className="font-medium text-sm">SUPER_ADMIN review</p>
      <p className="text-muted-foreground text-sm">
        Recorder: {review.outcomeRecordedByUserId ?? "—"}. SUPER_ADMIN kiểm tra
        và quyết định; Avin chỉ ghi sổ, không chuyển tiền.
      </p>
      <approvalForm.Field name="reason">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>
                Lý do duyệt / từ chối
              </FieldLabel>
              <Textarea
                aria-invalid={isInvalid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={2}
                value={field.state.value}
              />
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          );
        }}
      </approvalForm.Field>
      <div className="flex flex-wrap gap-2">
        <Button
          form={`support-approval-form-${review.id}`}
          name="decision"
          value="APPROVED"
          disabled={approve.isPending}
          type="submit"
        >
          Duyệt
        </Button>
        <Button
          form={`support-approval-form-${review.id}`}
          name="decision"
          value="REJECTED"
          disabled={approve.isPending}
          type="submit"
          variant="outline"
        >
          Từ chối
        </Button>
      </div>
    </form>
  );
};

const ReconsiderationForm = ({ review }: { review: SupportReview }) => {
  const reconsider = useReconsiderAdminSupportReview();
  const reconsiderationForm = useForm({
    defaultValues: {
      basis: "NEW_EVIDENCE" as "NEW_EVIDENCE" | "PROCEDURAL_ERROR",
      evidenceReference: "",
      reason: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await reconsider.mutateAsync({
          basis: value.basis,
          privateEvidenceReference: value.evidenceReference.trim() || undefined,
          reason: value.reason.trim(),
          reviewId: review.id,
        });
        toast.success("Đã mở một lần reconsideration cho Support Review.");
        reconsiderationForm.reset();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không thể reconsider."
        );
      }
    },
    validators: { onSubmit: supportReviewReconsiderationFormSchema },
  });

  return (
    <form
      className="grid gap-3 rounded-xl border bg-muted/20 p-4"
      id={`support-reconsideration-form-${review.id}`}
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await reconsiderationForm.handleSubmit();
      }}
    >
      <p className="font-medium text-sm">Một lần reconsideration</p>
      <div className="grid gap-3 md:grid-cols-2">
        <reconsiderationForm.Field name="basis">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Căn cứ</FieldLabel>
              <Select
                items={RECONSIDERATION_BASIS_ITEMS}
                onValueChange={(value) =>
                  field.handleChange(
                    value as "NEW_EVIDENCE" | "PROCEDURAL_ERROR"
                  )
                }
                value={field.state.value}
              >
                <SelectTrigger
                  className="h-9 w-full rounded-md border border-input bg-background px-3"
                  id={field.name}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {RECONSIDERATION_BASIS_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
        </reconsiderationForm.Field>
        <reconsiderationForm.Field name="evidenceReference">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Evidence mới (nếu có)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </reconsiderationForm.Field>
      </div>
      <reconsiderationForm.Field name="reason">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && !field.state.meta.isValid;
          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>
                Lý do reconsideration
              </FieldLabel>
              <Textarea
                aria-invalid={isInvalid}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                rows={2}
                value={field.state.value}
              />
              {isInvalid ? (
                <FieldError errors={field.state.meta.errors} />
              ) : null}
            </Field>
          );
        }}
      </reconsiderationForm.Field>
      <reconsiderationForm.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <Button
            className="w-fit"
            disabled={!canSubmit || isSubmitting || reconsider.isPending}
            form={`support-reconsideration-form-${review.id}`}
            type="submit"
            variant="outline"
          >
            {isSubmitting || reconsider.isPending
              ? "Đang mở..."
              : "Mở reconsideration"}
          </Button>
        )}
      </reconsiderationForm.Subscribe>
    </form>
  );
};

const SupportReviewCard = ({ review }: { review: SupportReview }) => (
  <Card>
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{review.profile.displayName}</CardTitle>
          <CardDescription>
            {review.profile.profileSlug} · {review.riskReport.type} · incident{" "}
            {review.incident.id}
          </CardDescription>
        </div>
        <span className="rounded-full border px-3 py-1 text-sm">
          {STATUS_LABELS[review.status]}
        </span>
      </div>
    </CardHeader>
    <CardContent className="grid gap-5">
      <ReviewSummary review={review} />
      {review.transactionScope ? (
        <p className="text-muted-foreground text-sm">
          Giao dịch: {review.transactionChannel} ·{" "}
          {TRANSACTION_SCOPE_LABELS[review.transactionScope]} · video{" "}
          {review.preTransactionVideoPresent ? "có" : "thiếu"}
        </p>
      ) : null}
      {review.publicOutcome ? (
        <p className="text-muted-foreground text-sm">
          Public outcome: {OUTCOME_LABELS[review.publicOutcome]}
        </p>
      ) : null}
      {review.ineligibilityReason ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          {review.ineligibilityReason}
        </p>
      ) : null}
      {review.status === "ELIGIBILITY_REVIEW" ? (
        <EligibilityForm review={review} />
      ) : null}
      {review.status === "ELIGIBLE" ? <OutcomeForm review={review} /> : null}
      {review.status === "PENDING_APPROVAL" ? (
        <ApprovalPanel review={review} />
      ) : null}
      {review.status === "INELIGIBLE" || review.status === "DECLINED" ? (
        <ReconsiderationForm review={review} />
      ) : null}
      {review.bondAdjustment ? (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
          <p className="font-medium">Bond Adjustment liên kết</p>
          <p className="mt-1 text-muted-foreground">
            {review.bondAdjustment.kind} ·{" "}
            {vndFormatter.format(review.bondAdjustment.deltaAmount)} ·{" "}
            {review.bondAdjustment.status}
          </p>
        </div>
      ) : null}
      <details className="rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-medium">Audit history</summary>
        <div className="mt-3 grid gap-2">
          {review.history.map((item) => (
            <p className="text-muted-foreground" key={item.id}>
              {item.status} · {item.actorUserId ?? "system"} ·{" "}
              {item.reason ?? "—"}
            </p>
          ))}
        </div>
      </details>
    </CardContent>
  </Card>
);

export const SupportReviewPage = () => {
  const reviews = useAdminSupportReviews();

  return (
    <>
      <Header fixed />
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="font-medium text-primary text-sm">
            AVIN CHECK · SUPPORT REVIEW
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Xét điều kiện và ghi nhận hỗ trợ off-platform
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Support Review chỉ bắt đầu từ Provider-linked Risk Report đã được
            Moderator xem xét. Avin không mở claim form công khai, không chuyển
            tiền và không hứa bồi thường tự động.
          </p>
        </div>
        {reviews.isPending ? (
          <output aria-live="polite">Đang tải Support Review...</output>
        ) : null}
        {reviews.isError ? (
          <p className="text-destructive" role="alert">
            Không thể tải Support Review. Vui lòng thử lại.
          </p>
        ) : null}
        {!reviews.isPending && (reviews.data ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
              Chưa có Support Review nào. Hãy mở từ incident đã ở trạng thái
              Under Review trong Risk Report detail.
            </CardContent>
          </Card>
        ) : null}
        {(reviews.data ?? []).map((review) => (
          <SupportReviewCard key={review.id} review={review} />
        ))}
      </Main>
    </>
  );
};
