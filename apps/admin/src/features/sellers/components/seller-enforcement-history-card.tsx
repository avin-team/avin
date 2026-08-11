import { Badge } from "@avin/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { LockKeyIcon, ShieldIcon } from "@phosphor-icons/react";

import { useAdminSellerEnforcementHistory } from "../api/seller-enforcement-api";
import type { EnforcementRecord } from "../types";
import { getActionTypeLabel, getReasonCodeLabel } from "../workflow";

interface Props {
  readonly fallbackHistory?: readonly EnforcementRecord[];
  readonly sellerId: string;
}

const EMPTY_FALLBACK_HISTORY: readonly EnforcementRecord[] = [];

export const SellerEnforcementHistoryCard = ({
  fallbackHistory = EMPTY_FALLBACK_HISTORY,
  sellerId,
}: Props) => {
  const { data: remoteActions, isPending } =
    useAdminSellerEnforcementHistory(sellerId);

  const actions = remoteActions ?? fallbackHistory;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldIcon className="size-5 text-primary" />
          Nhật ký xử lý vi phạm & chế tài (Enforcement Audit)
        </CardTitle>
        <CardDescription className="text-xs">
          Lịch sử các quyết định Suspend, Ban, Lift, Overturn và Reason
          Correction.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-3 text-xs">
        {actions.map((record) => {
          const prev =
            "previousState" in record
              ? record.previousState
              : record.previousStatus;
          const next =
            "newState" in record ? record.newState : record.newStatus;
          const reasonText =
            "sellerReason" in record ? record.sellerReason : record.reason;

          return (
            <div
              className="rounded-xl border border-border/80 p-3.5 space-y-2 bg-background/50"
              key={record.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium">
                  <Badge variant="outline">
                    {getActionTypeLabel(record.actionType)}
                  </Badge>
                  <span>
                    {prev} $\rightarrow${" "}
                    <strong className="text-foreground">{next}</strong>
                  </span>
                </div>
                <span className="text-muted-foreground text-[11px]">
                  {new Date(
                    record.effectiveAt || record.createdAt
                  ).toLocaleString("vi-VN")}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
                  <span>
                    Mã vi phạm:{" "}
                    <strong className="text-foreground">
                      {getReasonCodeLabel(record.reasonCode)}
                    </strong>
                  </span>
                  {record.expiresAt ? (
                    <span className="text-amber-500 font-medium">
                      Hạn tạm dừng:{" "}
                      {new Date(record.expiresAt).toLocaleString("vi-VN")}
                    </span>
                  ) : null}
                </div>
                <p className="leading-relaxed text-foreground whitespace-pre-wrap">
                  Lý do gửi Seller: &ldquo;{reasonText}&rdquo;
                </p>
              </div>

              {record.adminNote ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-muted-foreground flex items-start gap-1.5">
                  <LockKeyIcon className="size-3.5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="font-medium text-amber-500">
                      Ghi chú bảo mật Admin:
                    </span>{" "}
                    {record.adminNote}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {!isPending && actions.length === 0 ? (
          <p className="py-2 text-xs text-muted-foreground">
            Chưa có lịch sử xử lý vi phạm nào đối với Seller này.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};
