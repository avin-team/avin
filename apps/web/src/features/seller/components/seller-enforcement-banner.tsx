import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  ChatCircleTextIcon,
  ClockIcon,
  ProhibitIcon,
  ShieldWarningIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import {
  useSellerAppeals,
  useSellerEnforcement,
} from "../api/seller-enforcement-api";
import { SellerAppealDialog } from "./seller-appeal-dialog";
import { SellerAppealStatusCard } from "./seller-appeal-status-card";

const REASON_CODE_LABELS: Record<string, string> = {
  FINANCIAL_RISK: "Rủi ro tài chính / Thanh toán",
  FRAUD_RISK: "Nghi ngờ gian lận",
  FULFILLMENT_RISK: "Rủi ro thực hiện đơn hàng",
  OTHER: "Lý do khác",
  POLICY_VIOLATION: "Vi phạm chính sách sàn",
};

interface ActionSummary {
  readonly effectiveAt: Date | string;
  readonly newState: string;
  readonly reasonCode: string;
  readonly sellerReason: string;
}

const EnforcementReasonDetails = ({
  action,
  expiresAt,
}: {
  readonly action: ActionSummary;
  readonly expiresAt?: Date | string | null;
}) => (
  <div className="rounded-lg bg-background/60 p-3 text-xs border border-border/40">
    <p className="font-medium text-foreground">
      Lý do xử lý: &ldquo;{action.sellerReason}&rdquo;
    </p>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span>
        Phân loại:{" "}
        <strong className="text-foreground">
          {REASON_CODE_LABELS[action.reasonCode] ?? action.reasonCode}
        </strong>
      </span>
      <span>
        Thời điểm hiệu lực:{" "}
        {new Date(action.effectiveAt).toLocaleString("vi-VN")}
      </span>
      {expiresAt ? (
        <span className="text-amber-500 dark:text-amber-400 font-medium">
          Tự động mở lại: {new Date(expiresAt).toLocaleString("vi-VN")}
        </span>
      ) : null}
    </div>
  </div>
);

const EnforcementScopeDescription = ({
  isSuspended,
}: {
  readonly isSuspended: boolean;
}) => (
  <div className="text-muted-foreground">
    {isSuspended ? (
      <p>
        <strong>Phạm vi hạn chế:</strong> Gian hàng và các sản phẩm đang bị ẩn
        khỏi kết quả tìm kiếm công khai. Bạn không thể đăng bán mới hoặc rút
        tiền. Bạn vẫn có quyền truy cập, bàn giao các đơn hàng đang xử lý và
        nhắn tin hỗ trợ khách hàng.
      </p>
    ) : (
      <p>
        <strong>Không gian làm việc tuân thủ:</strong> Toàn bộ hoạt động bán
        hàng đã bị dừng. Các đơn hàng chưa hoàn thành đã được hủy và hoàn tiền
        cho người mua, số dư rút tiền được đóng băng. Bạn có quyền xem lại lịch
        sử đơn hàng, tài chính và gửi khiếu nại (appeal) đối với quyết định này.
      </p>
    )}
  </div>
);

interface ActionButtonsProps {
  readonly canSubmitAppeal: boolean;
  readonly latestAppeal:
    | {
        readonly actionId: string;
        readonly id: string;
        readonly status: string;
      }
    | undefined;
  readonly onOpenAppealDialog: () => void;
  readonly onToggleViewAppeal: () => void;
  readonly viewAppealDetails: boolean;
}

const EnforcementActionButtons = ({
  canSubmitAppeal,
  latestAppeal,
  onOpenAppealDialog,
  onToggleViewAppeal,
  viewAppealDetails,
}: ActionButtonsProps) => {
  const hasActiveAppeal = Boolean(
    latestAppeal &&
    (latestAppeal.status === "SUBMITTED" ||
      latestAppeal.status === "UNDER_REVIEW")
  );
  const isSuperseded = latestAppeal?.status === "SUPERSEDED";

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {hasActiveAppeal ? (
        <Button onClick={onToggleViewAppeal} size="sm" variant="outline">
          <ClockIcon className="mr-1" />
          {viewAppealDetails
            ? "Ẩn chi tiết khiếu nại"
            : "Xem trạng thái khiếu nại đã gửi"}
        </Button>
      ) : null}

      {!hasActiveAppeal && canSubmitAppeal ? (
        <Button onClick={onOpenAppealDialog} size="sm" variant="outline">
          <ShieldWarningIcon className="mr-1" />
          Gửi khiếu nại quyết định (Appeal)
        </Button>
      ) : null}

      {latestAppeal && !hasActiveAppeal && !isSuperseded ? (
        <Button onClick={onToggleViewAppeal} size="sm" variant="ghost">
          <ChatCircleTextIcon className="mr-1" />
          {viewAppealDetails
            ? "Ẩn lịch sử khiếu nại"
            : "Xem kết quả khiếu nại trước đó"}
        </Button>
      ) : null}
    </div>
  );
};

export const SellerEnforcementBanner = () => {
  const { data: enforcement } = useSellerEnforcement();
  const { data: appeals = [] } = useSellerAppeals(1);
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [viewAppealDetails, setViewAppealDetails] = useState(false);

  if (!enforcement || enforcement.state === "CLEAR") {
    return null;
  }

  const isSuspended = enforcement.state === "SUSPENDED";
  const isBanned = enforcement.state === "BANNED";
  const { action } = enforcement;
  const [latestAppeal] = appeals;

  const canSubmitAppeal = Boolean(
    action &&
    (!latestAppeal ||
      latestAppeal.status === "UPHELD" ||
      latestAppeal.status === "SUPERSEDED" ||
      latestAppeal.actionId !== action.id)
  );

  return (
    <>
      <div className="space-y-4">
        <Alert
          className={
            isBanned
              ? "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/15"
              : "border-amber-500/40 bg-amber-500/10 text-amber-500 dark:bg-amber-950/30"
          }
        >
          <div className="flex items-start gap-3">
            {isBanned ? (
              <ProhibitIcon className="mt-0.5 size-5 shrink-0" />
            ) : (
              <WarningIcon className="mt-0.5 size-5 shrink-0" />
            )}

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AlertTitle className="text-base font-bold">
                  {isBanned
                    ? "Tài khoản Seller bị cấm hoạt động (Banned) · Chế độ tuân thủ"
                    : "Gian hàng đang bị tạm dừng hoạt động (Suspended)"}
                </AlertTitle>
                <Badge
                  className={
                    isBanned
                      ? "border-destructive/40 bg-destructive/20 text-destructive-foreground"
                      : "border-amber-500/40 bg-amber-500/20 text-amber-300"
                  }
                >
                  {isBanned ? "BANNED" : "SUSPENDED"}
                </Badge>
              </div>

              <AlertDescription className="space-y-2 text-xs leading-relaxed text-foreground/90">
                {action ? (
                  <EnforcementReasonDetails
                    action={action}
                    expiresAt={enforcement.expiresAt}
                  />
                ) : null}

                <EnforcementScopeDescription isSuspended={isSuspended} />

                <EnforcementActionButtons
                  canSubmitAppeal={canSubmitAppeal}
                  latestAppeal={latestAppeal}
                  onOpenAppealDialog={() => setAppealDialogOpen(true)}
                  onToggleViewAppeal={() => setViewAppealDetails((p) => !p)}
                  viewAppealDetails={viewAppealDetails}
                />
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {viewAppealDetails && latestAppeal ? (
          <SellerAppealStatusCard appealId={latestAppeal.id} />
        ) : null}
      </div>

      {action ? (
        <SellerAppealDialog
          actionId={action.id}
          actionSummary={{
            effectiveAt: action.effectiveAt,
            newState: action.newState,
            reasonCode: action.reasonCode,
            sellerReason: action.sellerReason,
          }}
          onOpenChange={setAppealDialogOpen}
          open={appealDialogOpen}
        />
      ) : null}
    </>
  );
};
