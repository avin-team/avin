import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
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

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminSupportReviews,
  useApproveAdminSupportReview,
  useEvaluateAdminSupportReview,
  useRecordAdminSupportReviewOutcome,
  useReconsiderAdminSupportReview,
} from "../api/support-reviews-api";
import type { SupportReview } from "../api/support-reviews-api";

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
  const [channel, setChannel] = useState<"FACEBOOK" | "ZALO" | "OTHER">(
    "FACEBOOK"
  );
  const [scope, setScope] =
    useState<keyof typeof TRANSACTION_SCOPE_LABELS>("DIRECT");
  const [transactionAt, setTransactionAt] = useState(() =>
    toDateTimeLocal(review.transactionOccurredAt)
  );
  const [profileVersionId, setProfileVersionId] = useState(
    review.transactionProfileVersionId ?? review.profileVersion.versionId
  );
  const [actualLoss, setActualLoss] = useState(
    String(review.verifiedActualLoss ?? "")
  );
  const [privateEvidenceReference, setPrivateEvidenceReference] = useState(
    review.privateEvidenceReference ?? ""
  );
  const [reason, setReason] = useState("");
  const [checks, setChecks] = useState({
    approvedServiceConfirmed: false,
    evidenceSufficient: false,
    preTransactionVideoPresent: false,
    providerIdentityConfirmed: false,
    registeredPaymentIdentityConfirmed: false,
    requiredProcessCompleted: false,
    transactionLawfulConfirmed: false,
  });
  const profileVersionItems = review.profileVersions.map((version) => ({
    label: `v${version.versionNumber} · limit ${version.recommendedTransactionLimit}`,
    value: version.versionId,
  }));

  const updateCheck = (key: keyof typeof checks, value: boolean): void => {
    setChecks((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (!transactionAt || !privateEvidenceReference.trim() || !reason.trim()) {
      toast.error("Cần nhập thời điểm, evidence private và lý do.");
      return;
    }
    try {
      await evaluate.mutateAsync({
        ...checks,
        privateEvidenceReference: privateEvidenceReference.trim(),
        reason: reason.trim(),
        reviewId: review.id,
        transactionChannel: channel,
        transactionOccurredAt: toIsoDateTime(transactionAt),
        transactionProfileVersionId: profileVersionId,
        transactionScope: scope,
        verifiedActualLoss: Number(actualLoss),
      });
      toast.success("Đã lưu kết quả xét điều kiện Support Review.");
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xét điều kiện."
      );
    }
  };

  return (
    <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-channel-${review.id}`}
        >
          Kênh giao dịch
          <Select
            items={SUPPORT_CHANNEL_ITEMS}
            onValueChange={(value) =>
              setChannel(value as "FACEBOOK" | "ZALO" | "OTHER")
            }
            value={channel}
          >
            <SelectTrigger
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              id={`support-channel-${review.id}`}
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
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-scope-${review.id}`}
        >
          Phạm vi giao dịch
          <Select
            items={TRANSACTION_SCOPE_ITEMS}
            onValueChange={(value) =>
              setScope(value as keyof typeof TRANSACTION_SCOPE_LABELS)
            }
            value={scope}
          >
            <SelectTrigger
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              id={`support-scope-${review.id}`}
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
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-time-${review.id}`}
        >
          Thời điểm giao dịch
          <Input
            id={`support-time-${review.id}`}
            onChange={(event) => setTransactionAt(event.target.value)}
            type="datetime-local"
            value={transactionAt}
          />
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-version-${review.id}`}
        >
          Profile version tại thời điểm giao dịch
          <Select
            items={profileVersionItems}
            onValueChange={(value) => setProfileVersionId(value ?? "")}
            value={profileVersionId}
          >
            <SelectTrigger
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              id={`support-version-${review.id}`}
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
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-loss-${review.id}`}
        >
          Verified actual loss (VND)
          <Input
            id={`support-loss-${review.id}`}
            inputMode="numeric"
            min={0}
            onChange={(event) => setActualLoss(event.target.value)}
            type="number"
            value={actualLoss}
          />
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-evidence-${review.id}`}
        >
          Private evidence reference
          <Input
            id={`support-evidence-${review.id}`}
            onChange={(event) =>
              setPrivateEvidenceReference(event.target.value)
            }
            value={privateEvidenceReference}
          />
        </label>
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
            ["preTransactionVideoPresent", "Có video pre-transaction bắt buộc"],
          ] as const
        ).map(([key, label]) => (
          <label
            className="flex items-start gap-2"
            htmlFor={`support-check-${review.id}-${key}`}
            key={key}
          >
            <input
              checked={checks[key]}
              id={`support-check-${review.id}-${key}`}
              onChange={(event) => updateCheck(key, event.target.checked)}
              type="checkbox"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`support-reason-${review.id}`}
      >
        Ghi chú xét điều kiện
        <Textarea
          id={`support-reason-${review.id}`}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          value={reason}
        />
      </label>
      <Button
        className="w-fit"
        disabled={evaluate.isPending}
        onClick={() => void submit()}
        type="button"
      >
        {evaluate.isPending ? "Đang lưu..." : "Lưu kết quả xét điều kiện"}
      </Button>
    </div>
  );
};

const OutcomeForm = ({ review }: { review: SupportReview }) => {
  const record = useRecordAdminSupportReviewOutcome();
  const [outcome, setOutcome] = useState<
    | "HANDLED_BY_PROVIDER"
    | "HANDLED_BY_PROGRAM"
    | "UNDER_VERIFICATION"
    | "VIOLATION_CONFIRMED"
  >("HANDLED_BY_PROGRAM");
  const [supportAmount, setSupportAmount] = useState(
    String(review.recommendedSupportAmount ?? 0)
  );
  const [externalReference, setExternalReference] = useState("");
  const [evidenceReference, setEvidenceReference] = useState(
    review.privateEvidenceReference ?? ""
  );
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (
      !externalReference.trim() ||
      !evidenceReference.trim() ||
      !reason.trim()
    ) {
      toast.error("Cần nhập external action reference, evidence và lý do.");
      return;
    }
    try {
      await record.mutateAsync({
        externalActionReference: externalReference.trim(),
        privateEvidenceReference: evidenceReference.trim(),
        publicOutcome: outcome,
        reason: reason.trim(),
        reviewId: review.id,
        supportAmount: Number(supportAmount),
      });
      toast.success("Đã ghi outcome và hoàn tất bằng quyền SUPER_ADMIN.");
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể ghi outcome."
      );
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <p className="font-medium text-sm">
        Ghi kết quả off-platform và Bond Allocation
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-outcome-${review.id}`}
        >
          Public outcome label
          <Select
            items={SUPPORT_OUTCOME_ITEMS}
            onValueChange={(value) => setOutcome(value as typeof outcome)}
            value={outcome}
          >
            <SelectTrigger
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              id={`support-outcome-${review.id}`}
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
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-amount-${review.id}`}
        >
          Support amount (≤ cap)
          <Input
            id={`support-amount-${review.id}`}
            inputMode="numeric"
            max={review.recommendedSupportAmount ?? 0}
            min={0}
            onChange={(event) => setSupportAmount(event.target.value)}
            type="number"
            value={supportAmount}
          />
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-external-${review.id}`}
        >
          External action reference
          <Input
            id={`support-external-${review.id}`}
            onChange={(event) => setExternalReference(event.target.value)}
            value={externalReference}
          />
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-outcome-evidence-${review.id}`}
        >
          Private evidence reference
          <Input
            id={`support-outcome-evidence-${review.id}`}
            onChange={(event) => setEvidenceReference(event.target.value)}
            value={evidenceReference}
          />
        </label>
      </div>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`support-outcome-reason-${review.id}`}
      >
        Ghi chú outcome
        <Textarea
          id={`support-outcome-reason-${review.id}`}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          value={reason}
        />
      </label>
      <Button
        className="w-fit"
        disabled={record.isPending}
        onClick={() => void submit()}
        type="button"
      >
        {record.isPending ? "Đang ghi..." : "Ghi outcome & hoàn tất"}
      </Button>
    </div>
  );
};

const ApprovalPanel = ({ review }: { review: SupportReview }) => {
  const approve = useApproveAdminSupportReview();
  const [reason, setReason] = useState("");

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    if (decision === "REJECTED" && !reason.trim()) {
      toast.error("Cần nhập lý do từ chối.");
      return;
    }
    try {
      await approve.mutateAsync({
        decision,
        reason: reason.trim() || undefined,
        reviewId: review.id,
      });
      toast.success(
        decision === "APPROVED"
          ? "Đã duyệt Support Review và Bond Adjustment."
          : "Đã từ chối Support Review."
      );
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể quyết định review."
      );
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="font-medium text-sm">SUPER_ADMIN review</p>
      <p className="text-muted-foreground text-sm">
        Recorder: {review.outcomeRecordedByUserId ?? "—"}. SUPER_ADMIN kiểm tra
        và quyết định; Avin chỉ ghi sổ, không chuyển tiền.
      </p>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`support-approval-reason-${review.id}`}
      >
        Lý do duyệt / từ chối
        <Textarea
          id={`support-approval-reason-${review.id}`}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          value={reason}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={approve.isPending}
          onClick={() => void decide("APPROVED")}
          type="button"
        >
          Duyệt
        </Button>
        <Button
          disabled={approve.isPending}
          onClick={() => void decide("REJECTED")}
          type="button"
          variant="outline"
        >
          Từ chối
        </Button>
      </div>
    </div>
  );
};

const ReconsiderationForm = ({ review }: { review: SupportReview }) => {
  const reconsider = useReconsiderAdminSupportReview();
  const [basis, setBasis] = useState<"NEW_EVIDENCE" | "PROCEDURAL_ERROR">(
    "NEW_EVIDENCE"
  );
  const [evidenceReference, setEvidenceReference] = useState("");
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (
      !reason.trim() ||
      (basis === "NEW_EVIDENCE" && !evidenceReference.trim())
    ) {
      toast.error("Cần nhập lý do và evidence nếu là bằng chứng mới.");
      return;
    }
    try {
      await reconsider.mutateAsync({
        basis,
        privateEvidenceReference: evidenceReference.trim() || undefined,
        reason: reason.trim(),
        reviewId: review.id,
      });
      toast.success("Đã mở một lần reconsideration cho Support Review.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể reconsider."
      );
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <p className="font-medium text-sm">Một lần reconsideration</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-reconsider-basis-${review.id}`}
        >
          Căn cứ
          <Select
            items={RECONSIDERATION_BASIS_ITEMS}
            onValueChange={(value) =>
              setBasis(value as "NEW_EVIDENCE" | "PROCEDURAL_ERROR")
            }
            value={basis}
          >
            <SelectTrigger
              className="h-9 w-full rounded-md border border-input bg-background px-3"
              id={`support-reconsider-basis-${review.id}`}
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
        </label>
        <label
          className="grid gap-2 text-sm"
          htmlFor={`support-reconsider-evidence-${review.id}`}
        >
          Evidence mới (nếu có)
          <Input
            id={`support-reconsider-evidence-${review.id}`}
            onChange={(event) => setEvidenceReference(event.target.value)}
            value={evidenceReference}
          />
        </label>
      </div>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`support-reconsider-reason-${review.id}`}
      >
        Lý do reconsideration
        <Textarea
          id={`support-reconsider-reason-${review.id}`}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          value={reason}
        />
      </label>
      <Button
        className="w-fit"
        disabled={reconsider.isPending}
        onClick={() => void submit()}
        type="button"
        variant="outline"
      >
        Mở reconsideration
      </Button>
    </div>
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
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
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
