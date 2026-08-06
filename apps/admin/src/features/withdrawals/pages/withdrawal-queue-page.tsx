import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import {
  CheckCircleIcon,
  BankIcon,
  MagnifyingGlassIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import { useWithdrawals } from "../api/mock-withdrawals";
import { WithdrawalActionDialog } from "../components/withdrawal-action-dialog";
import { WithdrawalStatusBadge } from "../components/withdrawal-status-badge";
import type { WithdrawalRequest, WithdrawalStatus } from "../types";

type StatusFilter = "ALL" | WithdrawalStatus;

const STATUS_FILTER_ITEMS: { label: string; value: StatusFilter }[] = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Pending (Đang chờ)", value: "PENDING" },
  { label: "Approved (Đã duyệt)", value: "APPROVED" },
  { label: "Paid (Đã chuyển khoản)", value: "PAID" },
  { label: "Rejected (Từ chối)", value: "REJECTED" },
];

export const WithdrawalQueuePage = () => {
  const withdrawals = useWithdrawals();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const [selectedRequest, setSelectedRequest] =
    useState<WithdrawalRequest | null>(null);
  const [targetStatus, setTargetStatus] = useState<WithdrawalStatus | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const filteredWithdrawals = withdrawals.filter((wth) => {
    const matchStatus = statusFilter === "ALL" || wth.status === statusFilter;
    const matchQuery =
      q.length === 0 ||
      wth.storefrontName.toLowerCase().includes(q) ||
      wth.applicantName.toLowerCase().includes(q) ||
      wth.bankAccount.accountNumber.includes(q);
    return matchStatus && matchQuery;
  });

  const handleAction = (
    request: WithdrawalRequest,
    nextStatus: WithdrawalStatus
  ) => {
    setSelectedRequest(request);
    setTargetStatus(nextStatus);
    setDialogOpen(true);
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
          <p className="text-sm font-medium text-primary">PAYOUT MANAGEMENT</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            SellerWallet Withdrawals
          </h1>
          <p className="text-muted-foreground">
            Duyệt yêu cầu rút tiền khả dụng của Seller, kiểm tra thông tin ngân
            hàng đã xác minh và xác nhận hoàn tất giao dịch.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BankIcon className="size-4 text-primary" />
              Hàng đợi Rút tiền{" "}
              <span className="text-muted-foreground">
                ({filteredWithdrawals.length})
              </span>
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search withdrawal requests"
                  className="ps-9"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm storefront hoặc STK"
                  value={query}
                />
              </div>
              <Select
                items={STATUS_FILTER_ITEMS}
                onValueChange={(val) =>
                  setStatusFilter((val as StatusFilter) ?? "ALL")
                }
                value={statusFilter}
              >
                <SelectTrigger
                  aria-label="Filter status"
                  className="w-full sm:w-44"
                >
                  <SelectValue placeholder="Trạng thái rút tiền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
                  <SelectItem value="PENDING">Pending (Đang chờ)</SelectItem>
                  <SelectItem value="APPROVED">Approved (Đã duyệt)</SelectItem>
                  <SelectItem value="PAID">Paid (Đã chuyển khoản)</SelectItem>
                  <SelectItem value="REJECTED">Rejected (Từ chối)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>StorefrontIcon</TableHead>
                    <TableHead>Ngân hàng nhận</TableHead>
                    <TableHead>Số tiền rút</TableHead>
                    <TableHead>Thời gian gửi</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-end">Thao tác Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((wth) => (
                    <TableRow key={wth.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{wth.storefrontName}</p>
                          <p className="text-xs text-muted-foreground">
                            {wth.applicantName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-semibold">
                            {wth.bankAccount.bankName}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {wth.bankAccount.accountNumber} ·{" "}
                            {wth.bankAccount.accountName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {wth.amountVnd.toLocaleString("vi-VN")} đ
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(wth.requestedAt).toLocaleString("vi-VN")}
                      </TableCell>
                      <TableCell>
                        <WithdrawalStatusBadge status={wth.status} />
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1.5">
                          {wth.status === "PENDING" && (
                            <>
                              <Button
                                className="gap-1 text-xs"
                                onClick={() => handleAction(wth, "APPROVED")}
                                size="sm"
                                variant="outline"
                              >
                                <CheckCircleIcon className="size-3.5 text-blue-600" />{" "}
                                Duyệt
                              </Button>
                              <Button
                                className="gap-1 text-xs"
                                onClick={() => handleAction(wth, "REJECTED")}
                                size="sm"
                                variant="destructive"
                              >
                                <XCircleIcon className="size-3.5" /> Từ chối
                              </Button>
                            </>
                          )}
                          {wth.status === "APPROVED" && (
                            <Button
                              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleAction(wth, "PAID")}
                              size="sm"
                            >
                              <BankIcon className="size-3.5" /> Nhập mã đã CK
                              (Paid)
                            </Button>
                          )}
                          {(wth.status === "PAID" ||
                            wth.status === "REJECTED") && (
                            <span className="text-xs font-mono text-muted-foreground">
                              {wth.bankTransactionRef
                                ? `Ref: ${wth.bankTransactionRef}`
                                : "Hoàn tất"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredWithdrawals.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Không có yêu cầu rút tiền nào phù hợp bộ lọc.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Main>

      <WithdrawalActionDialog
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        request={selectedRequest}
        targetStatus={targetStatus}
      />
    </>
  );
};
