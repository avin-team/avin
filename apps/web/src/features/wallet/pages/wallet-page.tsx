import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, ChevronDown, WalletCards } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Shell } from "@/components/shell";
import { formatVND } from "@/utils/format";

import {
  walletSummaryQueryOptions,
  walletTransactionsQueryOptions,
} from "../api/wallet-api";

interface WalletTransaction {
  amount: number;
  id: string;
  paymentReference: string;
  resultingAvailableBalance: number;
  timestamp: string;
  type: string;
}

const unavailableBalance = (
  <p className="text-2xl font-bold text-muted-foreground">—</p>
);
const balanceSkeleton = <Skeleton className="h-9 w-44" />;

export const WalletPage = () => {
  const [cursor, setCursor] = useState<string | undefined>();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const loadedCursor = useRef<string | undefined>(undefined);
  const summaryQuery = useQuery(walletSummaryQueryOptions());
  const transactionsQuery = useQuery(walletTransactionsQueryOptions(cursor));

  useEffect(() => {
    if (!transactionsQuery.data || loadedCursor.current === cursor) {
      return;
    }
    loadedCursor.current = cursor;
    setTransactions((current) =>
      cursor
        ? [...current, ...transactionsQuery.data.items]
        : transactionsQuery.data.items
    );
  }, [cursor, transactionsQuery.data]);

  const summary = summaryQuery.data;
  const nextCursor = transactionsQuery.data?.nextCursor ?? null;
  let availableBalanceContent: ReactNode;
  let heldBalanceContent: ReactNode;

  if (summaryQuery.isError) {
    availableBalanceContent = unavailableBalance;
    heldBalanceContent = unavailableBalance;
  } else if (summaryQuery.isLoading) {
    availableBalanceContent = balanceSkeleton;
    heldBalanceContent = balanceSkeleton;
  } else {
    availableBalanceContent = (
      <p className="text-3xl font-bold text-primary">
        {formatVND(summary?.availableBalance ?? 0)}
      </p>
    );
    heldBalanceContent = (
      <p className="text-3xl font-bold">
        {formatVND(summary?.heldBalance ?? 0)}
      </p>
    );
  }

  let transactionContent: ReactNode;

  if (transactionsQuery.isError) {
    transactionContent = (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <p className="text-sm text-destructive">
          Không thể tải lịch sử giao dịch. Vui lòng thử lại.
        </p>
        <Button
          onClick={() => {
            void transactionsQuery.refetch();
          }}
          size="sm"
          variant="outline"
        >
          Thử lại
        </Button>
      </div>
    );
  } else if (transactionsQuery.isLoading && transactions.length === 0) {
    transactionContent = (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (transactions.length === 0) {
    transactionContent = (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="font-medium">Chưa có giao dịch nào</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Khi một khoản nạp được ghi nhận, giao dịch sẽ xuất hiện ở đây.
        </p>
      </div>
    );
  } else {
    transactionContent = (
      <div className="divide-y divide-border">
        {transactions.map((transaction) => (
          <div
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
            key={transaction.id}
          >
            <div>
              <p className="font-medium">{transaction.type}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(transaction.timestamp).toLocaleString("vi-VN")} ·{" "}
                {transaction.paymentReference}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p
                className={
                  transaction.amount >= 0
                    ? "font-semibold text-emerald-500"
                    : "font-semibold text-foreground"
                }
              >
                {transaction.amount >= 0 ? "+" : "−"}
                {formatVND(Math.abs(transaction.amount))}
              </p>
              <p className="text-xs text-muted-foreground">
                Số dư {formatVND(transaction.resultingAvailableBalance)}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Shell variant="default">
      <div className="space-y-8 py-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">
              Tài chính của bạn
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Ví của tôi
            </h1>
            <p className="mt-2 text-muted-foreground">
              Theo dõi số dư và lịch sử giao dịch của bạn.
            </p>
          </div>
          <Button render={<Link to="/wallet/deposit" />}>
            <ArrowDownToLine data-icon="inline-start" />
            Nạp tiền
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-primary/15 via-card to-card">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Số dư khả dụng
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableBalanceContent}
              {summaryQuery.isError ? (
                <p className="mt-2 text-sm text-destructive">
                  Không thể tải số dư.
                </p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                Có thể dùng cho các đơn hàng mới.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                Số dư đang giữ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heldBalanceContent}
              {summaryQuery.isError ? (
                <p className="mt-2 text-sm text-destructive">
                  Không thể tải số dư.
                </p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">
                Đang được giữ cho các đơn hàng đang xử lý.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Các giao dịch đã thực sự phát sinh, mới nhất ở trên.
              </p>
            </div>
            <WalletCards className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {transactionContent}

            {nextCursor ? (
              <Button
                className="mt-4 w-full"
                disabled={transactionsQuery.isFetching}
                onClick={() => setCursor(nextCursor)}
                variant="outline"
              >
                <ChevronDown data-icon="inline-start" />
                {transactionsQuery.isFetching ? "Đang tải…" : "Xem thêm"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
};
