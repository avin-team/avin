import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Skeleton } from "@avin/ui/components/skeleton";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Shell } from "@/components/shell";
import { formatVND } from "@/utils/format";

import {
  walletSummaryQueryOptions,
  walletTransactionsQueryOptions,
} from "../api/wallet-api";

interface WalletTransaction {
  amount: number;
  currency: string;
  id: string;
  paymentReference: string;
  resultingAvailableBalance: number | null;
  status: "ATTENTION" | "COMPLETED" | "PENDING" | "REVERSED";
  timestamp: string;
  type: string;
}

const unavailableBalance = (
  <p className="text-2xl font-bold text-muted-foreground">—</p>
);
const balanceSkeleton = <Skeleton className="h-9 w-44" />;
const TRANSACTION_REFRESH_INTERVAL_MS = 3000;
const transactionNumberFormatter = new Intl.NumberFormat("vi-VN");

const transactionStatusLabels = {
  ATTENTION: "Cần kiểm tra",
  COMPLETED: "Đã hoàn tất",
  PENDING: "Đang chờ xử lý",
  REVERSED: "Đã đảo giao dịch",
} as const;

const getTransactionStatusLabel = (transaction: WalletTransaction): string => {
  if (transaction.type === "Nạp tiền" && transaction.status === "COMPLETED") {
    return "Đã cộng vào ví";
  }

  return transactionStatusLabels[transaction.status];
};

const isRefreshableTransactionStatus = (
  status: WalletTransaction["status"]
): boolean => status === "ATTENTION" || status === "PENDING";

const getTransactionStatusClassName = (
  status: WalletTransaction["status"]
): string => {
  if (status === "ATTENTION") {
    return "text-amber-500";
  }
  if (status === "COMPLETED") {
    return "text-emerald-500";
  }
  if (status === "PENDING") {
    return "text-amber-500";
  }
  return "text-muted-foreground";
};

const getTransactionAmountClassName = (
  transaction: WalletTransaction
): string => {
  if (transaction.status === "PENDING" || transaction.status === "ATTENTION") {
    return "font-semibold text-amber-500";
  }
  if (transaction.amount >= 0) {
    return "font-semibold text-emerald-500";
  }
  return "font-semibold text-foreground";
};

const formatTransactionAmount = (transaction: WalletTransaction): string => {
  const amount = Math.abs(transaction.amount);
  if (transaction.currency === "VND") {
    return formatVND(amount);
  }
  return `${transactionNumberFormatter.format(amount)} ${transaction.currency}`;
};

const getTransactionBalanceLabel = (transaction: WalletTransaction): string => {
  if (transaction.resultingAvailableBalance !== null) {
    return `Số dư ${formatVND(transaction.resultingAvailableBalance)}`;
  }
  if (transaction.status === "ATTENTION" || transaction.status === "PENDING") {
    return "Chưa cộng vào số dư";
  }
  return "Số dư khả dụng không đổi";
};

const mergeTransactionPages = (
  pages: (WalletTransaction[] | undefined)[]
): WalletTransaction[] => {
  const seenIds = new Set<string>();
  const merged: WalletTransaction[] = [];

  for (const page of pages) {
    for (const transaction of page ?? []) {
      if (seenIds.has(transaction.id)) {
        continue;
      }
      seenIds.add(transaction.id);
      merged.push(transaction);
    }
  }

  return merged;
};

// oxlint-disable-next-line complexity
export const WalletPage = () => {
  const [loadedCursors, setLoadedCursors] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const hasLoadedAdditionalPages = loadedCursors.length > 1;
  const transactionQueries = useQueries({
    queries: loadedCursors.map((pageCursor, pageIndex) => ({
      ...walletTransactionsQueryOptions(pageCursor),
      refetchInterval:
        pageIndex === 0 && !hasLoadedAdditionalPages
          ? (query: {
              state: {
                data?: { items: Pick<WalletTransaction, "status">[] };
              };
            }) =>
              query.state.data?.items.some(({ status }) =>
                isRefreshableTransactionStatus(status)
              )
                ? TRANSACTION_REFRESH_INTERVAL_MS
                : false
          : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: pageIndex === 0 && !hasLoadedAdditionalPages,
    })),
  });
  const transactionsQuery = transactionQueries.at(-1);
  const [firstTransactionsQuery] = transactionQueries;
  const hasRefreshableTransaction =
    firstTransactionsQuery?.data?.items.some(({ status }) =>
      isRefreshableTransactionStatus(status)
    ) ?? false;
  const summaryQuery = useQuery({
    ...walletSummaryQueryOptions(),
    refetchInterval: hasRefreshableTransaction
      ? TRANSACTION_REFRESH_INTERVAL_MS
      : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const transactions = useMemo(
    () =>
      mergeTransactionPages(
        transactionQueries.map((query) => query.data?.items)
      ),
    [transactionQueries]
  );

  const summary = summaryQuery.data;
  const nextCursor = transactionsQuery?.data?.nextCursor ?? null;
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

  if (transactionsQuery?.isError) {
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
  } else if (transactionsQuery?.isLoading && transactions.length === 0) {
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
          Khi hệ thống nhận được một khoản chuyển hoặc ví phát sinh giao dịch,
          thông tin sẽ xuất hiện ở đây.
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
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-medium">{transaction.type}</p>
                <p
                  className={`text-xs font-medium ${getTransactionStatusClassName(transaction.status)}`}
                >
                  {getTransactionStatusLabel(transaction)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(transaction.timestamp).toLocaleString("vi-VN")} ·{" "}
                {transaction.paymentReference}
              </p>
              {transaction.status === "ATTENTION" ? (
                <p className="mt-1 text-xs text-amber-500">
                  Kiểm tra số tiền và nội dung chuyển khoản, sau đó liên hệ Avin
                  nếu cần.
                </p>
              ) : null}
            </div>
            <div className="text-left sm:text-right">
              <p className={getTransactionAmountClassName(transaction)}>
                {transaction.amount >= 0 ? "+" : "−"}
                {formatTransactionAmount(transaction)}
              </p>
              <p className="text-xs text-muted-foreground">
                {getTransactionBalanceLabel(transaction)}
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
          <CardHeader>
            <div>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Các giao dịch và khoản nạp hệ thống đã nhận, mới nhất ở trên.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {transactionContent}

            {nextCursor ? (
              <Button
                className="mt-4 w-full"
                disabled={transactionsQuery?.isFetching}
                onClick={() => {
                  setLoadedCursors((current) =>
                    current.includes(nextCursor)
                      ? current
                      : [...current, nextCursor]
                  );
                }}
                variant="outline"
              >
                <ChevronDown data-icon="inline-start" />
                {transactionsQuery?.isFetching ? "Đang tải…" : "Xem thêm"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
};
