import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminProviderBondWithdrawals,
  useApproveAdminProviderBondWithdrawal,
  useRecordAdminProviderBondWithdrawal,
} from "../api/provider-bond-api";
import type { ProviderBondWithdrawal } from "../api/provider-bond-api";

const STATUS_LABELS = {
  COMPLETED: "Đã hoàn tất",
  COOLING: "Đang cooling 30 ngày",
  PENDING_APPROVAL: "Chờ Admin xử lý",
  REJECTED: "Đã từ chối",
} as const;

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleString("vi-VN") : "—";

const Blockers = ({ withdrawal }: { withdrawal: ProviderBondWithdrawal }) => {
  const total =
    withdrawal.blockers.riskIncidents.length +
    withdrawal.blockers.supportReviews.length +
    withdrawal.blockers.bondAdjustments.length;

  if (total === 0) {
    return (
      <p className="text-emerald-700 text-sm">
        Không còn Risk Report, Support Review hoặc Bond Adjustment unresolved.
      </p>
    );
  }

  return (
    <div className="grid gap-1 text-destructive text-sm">
      <p className="font-medium">Đang freeze vì nghĩa vụ chưa xử lý:</p>
      {withdrawal.blockers.riskIncidents.length > 0 ? (
        <p>
          Risk Reports / incidents: {withdrawal.blockers.riskIncidents.length}
        </p>
      ) : null}
      {withdrawal.blockers.supportReviews.length > 0 ? (
        <p>Support Reviews: {withdrawal.blockers.supportReviews.length}</p>
      ) : null}
      {withdrawal.blockers.bondAdjustments.length > 0 ? (
        <p>Bond Adjustments: {withdrawal.blockers.bondAdjustments.length}</p>
      ) : null}
    </div>
  );
};

const RecordPanel = ({
  withdrawal,
}: {
  withdrawal: ProviderBondWithdrawal;
}) => {
  const record = useRecordAdminProviderBondWithdrawal();
  const [externalActionReference, setExternalActionReference] = useState("");
  const [privateEvidenceReference, setPrivateEvidenceReference] = useState("");
  const [reason, setReason] = useState("");

  const submit = async () => {
    if (
      !externalActionReference.trim() ||
      !privateEvidenceReference.trim() ||
      !reason.trim()
    ) {
      toast.error("Cần nhập external reference, evidence private và lý do.");
      return;
    }
    try {
      await record.mutateAsync({
        externalActionReference: externalActionReference.trim(),
        privateEvidenceReference: privateEvidenceReference.trim(),
        reason: reason.trim(),
        withdrawalId: withdrawal.id,
      });
      toast.success("Đã ghi nhận hành động hoàn Bond off-platform.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể ghi nhận withdrawal."
      );
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="font-medium">Ghi nhận hoàn trả off-platform</p>
        <p className="text-muted-foreground text-xs">
          Chỉ ghi nhận giao dịch đã thực hiện bên ngoài Avin. Avin không giữ
          tiền hoặc tự chuyển tiền.
        </p>
      </div>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`withdrawal-reference-${withdrawal.id}`}
      >
        <span className="font-medium">External action reference</span>
        <Input
          id={`withdrawal-reference-${withdrawal.id}`}
          onChange={(event) => setExternalActionReference(event.target.value)}
          value={externalActionReference}
        />
      </label>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`withdrawal-evidence-${withdrawal.id}`}
      >
        <span className="font-medium">Private evidence reference</span>
        <Input
          id={`withdrawal-evidence-${withdrawal.id}`}
          onChange={(event) => setPrivateEvidenceReference(event.target.value)}
          value={privateEvidenceReference}
        />
      </label>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`withdrawal-record-reason-${withdrawal.id}`}
      >
        <span className="font-medium">Lý do / reconciliation note</span>
        <Textarea
          id={`withdrawal-record-reason-${withdrawal.id}`}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </label>
      <Button
        className="w-fit"
        disabled={record.isPending}
        onClick={() => void submit()}
        type="button"
      >
        Ghi nhận & hoàn tất (SUPER_ADMIN)
      </Button>
    </div>
  );
};

const ApprovalPanel = ({
  withdrawal,
}: {
  withdrawal: ProviderBondWithdrawal;
}) => {
  const approve = useApproveAdminProviderBondWithdrawal();
  const [reason, setReason] = useState("");

  const decide = async (decision: "APPROVED" | "REJECTED") => {
    if (decision === "REJECTED" && !reason.trim()) {
      toast.error("Cần nhập lý do khi từ chối.");
      return;
    }
    try {
      await approve.mutateAsync({
        decision,
        reason: reason.trim() || undefined,
        withdrawalId: withdrawal.id,
      });
      toast.success(
        decision === "APPROVED"
          ? "Đã duyệt withdrawal; profile đã chuyển sang Withdrawn."
          : "Đã từ chối withdrawal; profile được mở lại."
      );
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xử lý withdrawal."
      );
    }
  };

  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4">
      <div>
        <p className="font-medium">Admin xử lý hoàn trả</p>
        <p className="text-muted-foreground text-xs">
          Không yêu cầu dual approval. Admin kiểm tra toàn bộ unresolved matters
          trước khi hoàn tất.
        </p>
      </div>
      <label
        className="grid gap-2 text-sm"
        htmlFor={`withdrawal-approval-reason-${withdrawal.id}`}
      >
        <span className="font-medium">Approval / rejection reason</span>
        <Textarea
          id={`withdrawal-approval-reason-${withdrawal.id}`}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={approve.isPending}
          onClick={() => void decide("APPROVED")}
          type="button"
        >
          Duyệt hoàn tất
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

const WithdrawalCard = ({
  withdrawal,
}: {
  withdrawal: ProviderBondWithdrawal;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{withdrawal.profile.displayName}</CardTitle>
      <CardDescription>
        {withdrawal.profile.profileSlug} · {withdrawal.profile.status} ·{" "}
        {withdrawal.profile.providerUserId}
      </CardDescription>
    </CardHeader>
    <CardContent className="grid gap-6">
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-medium">Trạng thái withdrawal</p>
          <p className="text-muted-foreground">
            {STATUS_LABELS[withdrawal.status]}
          </p>
        </div>
        <div>
          <p className="font-medium">Recognized Bond lúc yêu cầu</p>
          <p className="text-muted-foreground">
            {vndFormatter.format(withdrawal.recognizedAmountAtRequest)}
          </p>
        </div>
        <div>
          <p className="font-medium">Cooling kết thúc</p>
          <p className="text-muted-foreground">
            {formatDate(withdrawal.coolingEndsAt)}
          </p>
        </div>
        <div>
          <p className="font-medium">Returned Bond</p>
          <p className="text-muted-foreground">
            {withdrawal.returnedAmount === null
              ? "Chưa ghi nhận"
              : vndFormatter.format(withdrawal.returnedAmount)}
          </p>
        </div>
      </div>

      <div className="grid gap-1 text-sm">
        <p>
          Requested: {formatDate(withdrawal.requestedAt)} · Recorded:{" "}
          {formatDate(withdrawal.recordedAt)} · Updated:{" "}
          {formatDate(withdrawal.updatedAt)}
        </p>
        <p className="text-muted-foreground">
          Lý do Provider: {withdrawal.requestedReason || "—"}
        </p>
        {withdrawal.externalActionReference ? (
          <p className="text-muted-foreground">
            External action: {withdrawal.externalActionReference}
          </p>
        ) : null}
        {withdrawal.privateEvidenceReference ? (
          <p className="text-muted-foreground">
            Private evidence: {withdrawal.privateEvidenceReference}
          </p>
        ) : null}
        {withdrawal.rejectionReason ? (
          <p className="text-destructive">
            Rejection: {withdrawal.rejectionReason}
          </p>
        ) : null}
      </div>

      <Blockers withdrawal={withdrawal} />

      {withdrawal.status === "COOLING" ? (
        <RecordPanel withdrawal={withdrawal} />
      ) : null}
      {withdrawal.status === "PENDING_APPROVAL" ? (
        <ApprovalPanel withdrawal={withdrawal} />
      ) : null}

      <div className="grid gap-2">
        <p className="font-medium text-sm">Audit history</p>
        {withdrawal.history.length > 0 ? (
          <div className="grid gap-2 text-sm">
            {withdrawal.history.map((entry) => (
              <div className="rounded-lg border p-3" key={entry.id}>
                <p>
                  {STATUS_LABELS[entry.status]} · {formatDate(entry.createdAt)}
                </p>
                <p className="text-muted-foreground">{entry.reason || "—"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Chưa có audit history.
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);

export const ProviderBondWithdrawalsPage = () => {
  const { data: withdrawals = [], isPending } =
    useAdminProviderBondWithdrawals();

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
            AVIN CHECK · PROVIDER BOND
          </p>
          <h1 className="mt-1 font-semibold text-3xl tracking-tight">
            Provider Bond Withdrawal
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Quy trình này chỉ ghi nhận hoàn trả Bond 100% off-platform sau
            cooling 30 ngày và khi mọi Risk Report, Support Review, external
            support action, Bond Adjustment liên quan đã được xử lý. Membership
            Fee là khoản duy nhất không hoàn lại.
          </p>
        </div>

        {isPending ? (
          <output aria-live="polite">Đang tải withdrawal...</output>
        ) : null}
        {!isPending && withdrawals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
              Chưa có yêu cầu Provider Bond Withdrawal.
            </CardContent>
          </Card>
        ) : null}
        {withdrawals.map((withdrawal) => (
          <WithdrawalCard key={withdrawal.id} withdrawal={withdrawal} />
        ))}
      </Main>
    </>
  );
};
