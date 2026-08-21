import type { BondAdjustmentKind } from "@avin/api/protection/bond";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminProviderBonds,
  useApproveAdminProviderBondAdjustment,
  usePublishAdminProviderBondLimit,
  useRecordAdminProviderBondAdjustment,
} from "../api/provider-bond-api";
import type { ProviderBond } from "../api/provider-bond-api";

const ADJUSTMENT_KIND_ITEMS: { label: string; value: BondAdjustmentKind }[] = [
  { label: "Deposit đã đối soát", value: "DEPOSIT" },
  { label: "Withdrawal", value: "WITHDRAWAL" },
  { label: "Support Allocation", value: "SUPPORT_ALLOCATION" },
  { label: "Correction", value: "CORRECTION" },
];

const ADJUSTMENT_STATUS_LABELS = {
  APPLIED: "Đã áp dụng",
  PENDING_APPROVAL: "Chờ Protection Manager duyệt",
  REJECTED: "Đã từ chối",
} as const;

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  currency: "VND",
  maximumFractionDigits: 0,
  style: "currency",
});

const optionalValue = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const getAdjustmentDelta = (
  kind: BondAdjustmentKind,
  amount: string
): number => {
  const parsedAmount = Number(amount);
  if (kind === "CORRECTION") {
    return parsedAmount;
  }
  const absoluteAmount = Math.abs(parsedAmount);
  return kind === "DEPOSIT" ? absoluteAmount : -absoluteAmount;
};

const AdjustmentHistory = ({ bond }: { bond: ProviderBond }) => {
  const approve = useApproveAdminProviderBondAdjustment();

  const decide = async (
    adjustmentId: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    try {
      await approve.mutateAsync({ adjustmentId, decision });
      toast.success(
        decision === "APPROVED"
          ? "Đã áp dụng Bond Adjustment."
          : "Đã từ chối Bond Adjustment."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xử lý adjustment."
      );
    }
  };

  return (
    <div className="grid gap-3">
      <h3 className="font-medium text-sm">Lịch sử Bond Adjustment</h3>
      {bond.adjustments.length > 0 ? (
        bond.adjustments.map((adjustment) => (
          <div
            className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm lg:grid-cols-[1fr_auto]"
            key={adjustment.id}
          >
            <div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="font-medium">{adjustment.kind}</span>
                <span
                  className={
                    adjustment.deltaAmount >= 0
                      ? "text-emerald-700"
                      : "text-destructive"
                  }
                >
                  {adjustment.deltaAmount >= 0 ? "+" : ""}
                  {vndFormatter.format(adjustment.deltaAmount)}
                </span>
                <span className="text-muted-foreground">
                  {ADJUSTMENT_STATUS_LABELS[adjustment.status]}
                </span>
              </div>
              <p className="mt-1 text-muted-foreground">{adjustment.reason}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                Trước: {adjustment.balanceBefore ?? "—"} · Sau:{" "}
                {adjustment.balanceAfter ?? "—"}
              </p>
            </div>
            {adjustment.status === "PENDING_APPROVAL" ? (
              <div className="flex flex-wrap items-center gap-2 lg:self-center">
                <Button
                  disabled={approve.isPending}
                  onClick={() => void decide(adjustment.id, "APPROVED")}
                  size="sm"
                  type="button"
                >
                  Duyệt & áp dụng
                </Button>
                <Button
                  disabled={approve.isPending}
                  onClick={() => void decide(adjustment.id, "REJECTED")}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Từ chối
                </Button>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <p className="text-muted-foreground text-sm">Chưa có adjustment.</p>
      )}
    </div>
  );
};

const ProviderBondCard = ({ bond }: { bond: ProviderBond }) => {
  const [limit, setLimit] = useState(String(bond.recommendedTransactionLimit));
  const publishLimit = usePublishAdminProviderBondLimit();

  const saveLimit = async () => {
    try {
      await publishLimit.mutateAsync({
        profileId: bond.profile.id,
        recommendedTransactionLimit: Number(limit),
      });
      toast.success("Đã phát hành Recommended Transaction Limit version mới.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể phát hành limit."
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{bond.profile.displayName}</CardTitle>
        <CardDescription>
          {bond.profile.profileSlug} · {bond.profile.status} ·{" "}
          {bond.profile.providerUserId}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="font-medium text-sm">Recognized Provider Bond</p>
            <p className="mt-1 font-semibold text-2xl">
              {vndFormatter.format(bond.recognizedAmount)}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="font-medium text-sm">Recommended Transaction Limit</p>
            <div className="mt-2 flex gap-2">
              <Input
                aria-label={`Recommended Transaction Limit của ${
                  bond.profile.displayName
                }`}
                inputMode="numeric"
                min={0}
                onChange={(event) => setLimit(event.target.value)}
                type="number"
                value={limit}
              />
              <Button
                disabled={publishLimit.isPending}
                onClick={() => void saveLimit()}
                type="button"
              >
                Phát hành
              </Button>
            </div>
            <p className="mt-2 text-muted-foreground text-xs">
              Không được vượt quá Recognized Bond.
            </p>
          </div>
        </div>
        <AdjustmentHistory bond={bond} />
      </CardContent>
    </Card>
  );
};

export const ProviderBondPage = () => {
  const { data: bonds = [], isPending } = useAdminProviderBonds();
  const record = useRecordAdminProviderBondAdjustment();
  const [profileId, setProfileId] = useState("");
  const [kind, setKind] = useState<BondAdjustmentKind>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [externalBankReference, setExternalBankReference] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [reason, setReason] = useState("");

  const selectedProfileId = profileId || bonds[0]?.profile.id || "";

  const recordAdjustment = async () => {
    const deltaAmount = getAdjustmentDelta(kind, amount);
    try {
      await record.mutateAsync({
        deltaAmount,
        evidenceReference: optionalValue(evidenceReference),
        externalBankReference: optionalValue(externalBankReference),
        idempotencyKey: `bond-${crypto.randomUUID()}`,
        kind,
        profileId: selectedProfileId,
        reason,
      });
      toast.success("Đã ghi Bond Adjustment.");
      setAmount("");
      setExternalBankReference("");
      setEvidenceReference("");
      setReason("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể ghi adjustment."
      );
    }
  };

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
            Đối soát và phê duyệt Provider Bond
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Đây là sổ ghi nhận đối soát ngoài hệ thống. Avin không khởi tạo,
            nhận, hoàn, bù trừ hoặc chuyển tiền; mọi Bond increase trong pilot
            không tiền đều bị launch gate từ chối.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ghi adjustment</CardTitle>
            <CardDescription>
              Deposit cần external bank reference và evidence. Withdrawal,
              support allocation, correction sẽ chờ Protection Manager khác
              người ghi duyệt.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label
              className="grid gap-2 text-sm"
              htmlFor="provider-bond-profile"
            >
              <span className="font-medium">Provider</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                id="provider-bond-profile"
                onChange={(event) => setProfileId(event.target.value)}
                value={selectedProfileId}
              >
                <option value="">Chọn Provider</option>
                {bonds.map((bond) => (
                  <option key={bond.profile.id} value={bond.profile.id}>
                    {bond.profile.displayName} · {bond.profile.profileSlug}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm" htmlFor="provider-bond-kind">
              <span className="font-medium">Loại adjustment</span>
              <select
                className="h-9 rounded-md border border-input bg-background px-3"
                id="provider-bond-kind"
                onChange={(event) =>
                  setKind(event.target.value as BondAdjustmentKind)
                }
                value={kind}
              >
                {ADJUSTMENT_KIND_ITEMS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="grid gap-2 text-sm"
              htmlFor="provider-bond-amount"
            >
              <span className="font-medium">
                {kind === "CORRECTION" ? "Delta VND (+/-)" : "Số tiền VND"}
              </span>
              <Input
                id="provider-bond-amount"
                inputMode="numeric"
                onChange={(event) => setAmount(event.target.value)}
                placeholder={kind === "CORRECTION" ? "-1000000" : "30000000"}
                type="number"
                value={amount}
              />
            </label>
            <label
              className="grid gap-2 text-sm"
              htmlFor="provider-bond-bank-reference"
            >
              <span className="font-medium">External bank reference</span>
              <Input
                id="provider-bond-bank-reference"
                onChange={(event) =>
                  setExternalBankReference(event.target.value)
                }
                placeholder="Bắt buộc với Deposit"
                value={externalBankReference}
              />
            </label>
            <label
              className="grid gap-2 text-sm"
              htmlFor="provider-bond-evidence-reference"
            >
              <span className="font-medium">Evidence reference</span>
              <Input
                id="provider-bond-evidence-reference"
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="Private evidence reference"
                value={evidenceReference}
              />
            </label>
            <label
              className="grid gap-2 text-sm md:col-span-2"
              htmlFor="provider-bond-reason"
            >
              <span className="font-medium">Lý do</span>
              <Input
                id="provider-bond-reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Mô tả kết quả đối soát hoặc nghĩa vụ liên quan"
                value={reason}
              />
            </label>
            <div className="md:col-span-2">
              <Button
                disabled={record.isPending || !selectedProfileId}
                onClick={() => void recordAdjustment()}
                type="button"
              >
                Ghi Bond Adjustment
              </Button>
            </div>
          </CardContent>
        </Card>

        {isPending ? (
          <output aria-live="polite">Đang tải Bond...</output>
        ) : null}
        {!isPending && bonds.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-muted-foreground text-sm">
              Chưa có Provider profile để đối soát.
            </CardContent>
          </Card>
        ) : null}
        {bonds.map((bond) => (
          <ProviderBondCard bond={bond} key={bond.profile.id} />
        ))}
      </Main>
    </>
  );
};
