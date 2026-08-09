import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import { BankIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminWithdrawals,
  useApproveWithdrawal,
  useMarkWithdrawalPaid,
  useRejectWithdrawal,
} from "../api/withdrawals-api";
import { WithdrawalActionDialog } from "../components/withdrawal-action-dialog";
import { WithdrawalStatusBadge } from "../components/withdrawal-status-badge";
import type { AdminWithdrawal, WithdrawalAction } from "../types";

export const WithdrawalQueuePage = () => {
  const withdrawalsQuery = useAdminWithdrawals();
  const approveMutation = useApproveWithdrawal();
  const rejectMutation = useRejectWithdrawal();
  const paidMutation = useMarkWithdrawalPaid();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminWithdrawal | null>(null);
  const [action, setAction] = useState<WithdrawalAction | null>(null);
  const q = query.trim().toLowerCase();
  const withdrawals = (withdrawalsQuery.data ?? []).filter(
    (request) =>
      q.length === 0 ||
      request.sellerId.toLowerCase().includes(q) ||
      request.bankAccount.accountNumber.includes(q) ||
      request.bankAccount.bankName.toLowerCase().includes(q)
  );
  const pending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    paidMutation.isPending;
  const openAction = (
    request: AdminWithdrawal,
    nextAction: WithdrawalAction
  ) => {
    setSelected(request);
    setAction(nextAction);
  };
  const completeAction = async (value?: string) => {
    if (!selected || !action) {
      return;
    }
    try {
      if (action === "APPROVE") {
        await approveMutation.mutateAsync({ withdrawalRequestId: selected.id });
      }
      if (action === "REJECT" && value) {
        await rejectMutation.mutateAsync({
          reason: value,
          withdrawalRequestId: selected.id,
        });
      }
      if (action === "MARK_PAID" && value) {
        await paidMutation.mutateAsync({
          paymentReference: value,
          withdrawalRequestId: selected.id,
        });
      }
      toast.success("Đã cập nhật yêu cầu rút tiền.");
      setAction(null);
      setSelected(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật yêu cầu rút tiền."
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
          <p className="text-sm font-medium text-primary">TÀI CHÍNH</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Yêu cầu rút tiền
          </h1>
          <p className="text-muted-foreground">
            Kiểm tra tài khoản ngân hàng đã được chụp và xử lý các yêu cầu rút
            tiền của Seller.
          </p>
        </div>
        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <BankIcon /> Hàng đợi rút tiền
            </CardTitle>
            <Input
              aria-label="Tìm yêu cầu rút tiền"
              className="sm:w-72"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Seller ID, ngân hàng hoặc STK"
              value={query}
            />
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Ngân hàng nhận</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Thời gian gửi</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-end">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalsQuery.isPending ? (
                  <TableRow>
                    <TableCell className="h-28 text-center" colSpan={6}>
                      Đang tải yêu cầu rút tiền…
                    </TableCell>
                  </TableRow>
                ) : null}
                {withdrawalsQuery.isError ? (
                  <TableRow>
                    <TableCell
                      className="h-28 text-center text-destructive"
                      colSpan={6}
                    >
                      Không thể tải yêu cầu rút tiền.
                    </TableCell>
                  </TableRow>
                ) : null}
                {withdrawals.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">
                      {request.sellerId}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {request.bankAccount.bankName}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {request.bankAccount.accountNumber} ·{" "}
                        {request.bankAccount.accountName}
                      </p>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {request.amount.toLocaleString("vi-VN")} ₫
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <WithdrawalStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-end">
                      {request.status === "REQUESTED" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => openAction(request, "APPROVE")}
                            size="sm"
                            variant="outline"
                          >
                            Duyệt
                          </Button>
                          <Button
                            onClick={() => openAction(request, "REJECT")}
                            size="sm"
                            variant="destructive"
                          >
                            Từ chối
                          </Button>
                        </div>
                      ) : null}
                      {request.status === "APPROVED" ? (
                        <Button
                          onClick={() => openAction(request, "MARK_PAID")}
                          size="sm"
                        >
                          Xác nhận đã chuyển
                        </Button>
                      ) : null}
                      {request.status === "PAID" && request.paymentReference ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          {request.paymentReference}
                        </span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {!withdrawalsQuery.isPending &&
                !withdrawalsQuery.isError &&
                withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="h-28 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      Không có yêu cầu rút tiền phù hợp.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
      <WithdrawalActionDialog
        action={action}
        onConfirm={(value) => {
          void completeAction(value);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setSelected(null);
          }
        }}
        open={Boolean(action)}
        pending={pending}
        request={selected}
      />
    </>
  );
};
