import { Badge } from "@avin/ui/components/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@avin/ui/components/tabs";
import { ActivityIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useOperationsAuditLog,
  useOperationsEmailDelivery,
  useOperationsReconciliation,
  useOperationsTransactions,
  useReconcileDeposit,
  useRetryEmailDelivery,
} from "../api/operations-api";
import type {
  EmailDeliveryStatus,
  ReconciliationStatus,
  TransactionType,
} from "../api/operations-api";
import { ProtectionOperationsQueuePanel } from "../components/protection-operations-queue-panel";

const RECONCILIATION_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Đã nhận", value: "RECEIVED" },
  { label: "Chưa khớp", value: "UNMATCHED" },
  { label: "Đã ghi có", value: "CREDITED" },
  { label: "Đã đối soát", value: "RECONCILED" },
] as const;

const TRANSACTION_TYPE_OPTIONS = [
  { label: "Tất cả loại", value: "ALL" },
  { label: "Deposit", value: "DEPOSIT" },
  { label: "Purchase hold", value: "PURCHASE_HOLD" },
  { label: "Escrow release", value: "ESCROW_RELEASE" },
  { label: "Platform commission", value: "PLATFORM_COMMISSION" },
  { label: "Refund", value: "REFUND" },
  { label: "Reversal", value: "REVERSAL" },
  { label: "Seller wallet migration", value: "SELLER_WALLET_MIGRATION" },
  { label: "Withdrawal request", value: "WITHDRAWAL_REQUEST" },
  { label: "Withdrawal paid", value: "WITHDRAWAL_PAID" },
] as const;

const EMAIL_STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Pending", value: "pending" },
  { label: "Retrying", value: "retrying" },
  { label: "Sent", value: "sent" },
  { label: "Failed", value: "failed" },
] as const;

const AUDIT_OUTCOME_OPTIONS = [
  { label: "Tất cả kết quả", value: "ALL" },
  { label: "Thành công", value: "SUCCESS" },
  { label: "Thất bại", value: "FAILURE" },
] as const;

type OperationsCursorKey =
  | "audit"
  | "email"
  | "reconciliation"
  | "transactions";

const NextPageButton = ({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) => (
  <div className="flex justify-end border-t p-3">
    <Button disabled={disabled} onClick={onClick} size="sm" variant="outline">
      Tải thêm {label}
    </Button>
  </div>
);

const formatDate = (value: string): string =>
  new Date(value).toLocaleString("vi-VN");

const getOptionalFilter = <T extends string>(
  value: T | "ALL"
): T | undefined => (value === "ALL" ? undefined : value);

const QueryState = ({
  isError,
  isPending,
  label,
  onRetry,
}: {
  isError: boolean;
  isPending: boolean;
  label: string;
  onRetry: () => void;
}) => {
  if (isPending) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Đang tải {label}…
      </p>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-sm text-destructive">
        <p>Không thể tải {label}.</p>
        <Button onClick={onRetry} size="sm" variant="outline">
          <ArrowClockwiseIcon /> Thử lại
        </Button>
      </div>
    );
  }
  return null;
};

export const OperationsPage = () => {
  const [tab, setTab] = useState("protection");
  const [reconciliationStatus, setReconciliationStatus] =
    useState<(typeof RECONCILIATION_STATUS_OPTIONS)[number]["value"]>("ALL");
  const [transactionType, setTransactionType] =
    useState<(typeof TRANSACTION_TYPE_OPTIONS)[number]["value"]>("ALL");
  const [auditOutcome, setAuditOutcome] =
    useState<(typeof AUDIT_OUTCOME_OPTIONS)[number]["value"]>("ALL");
  const [auditAction, setAuditAction] = useState("");
  const [emailStatus, setEmailStatus] =
    useState<(typeof EMAIL_STATUS_OPTIONS)[number]["value"]>("ALL");
  const [cursors, setCursors] = useState<
    Partial<Record<OperationsCursorKey, string>>
  >({});
  const reconciliationQuery = useOperationsReconciliation({
    cursor: cursors.reconciliation,
    status: getOptionalFilter<ReconciliationStatus>(reconciliationStatus),
  });
  const transactionsQuery = useOperationsTransactions({
    cursor: cursors.transactions,
    type: getOptionalFilter<TransactionType>(transactionType),
  });
  const auditQuery = useOperationsAuditLog({
    action: auditAction.trim() || undefined,
    cursor: cursors.audit,
    outcome: getOptionalFilter<"FAILURE" | "SUCCESS">(auditOutcome),
  });
  const emailQuery = useOperationsEmailDelivery({
    cursor: cursors.email,
    status: getOptionalFilter<EmailDeliveryStatus>(emailStatus),
  });
  const reconcileMutation = useReconcileDeposit();
  const retryMutation = useRetryEmailDelivery();

  const resetCursor = (key: OperationsCursorKey) => {
    setCursors((current) => ({ ...current, [key]: undefined }));
  };

  const goToNextPage = (key: OperationsCursorKey, cursor: string | null) => {
    if (!cursor) {
      return;
    }
    setCursors((current) => ({ ...current, [key]: cursor }));
  };

  const reconcileDeposit = async (item: {
    depositRequestId: string | null;
    eventId: string;
  }) => {
    if (!item.depositRequestId) {
      return;
    }
    try {
      await reconcileMutation.mutateAsync({
        depositRequestId: item.depositRequestId,
        eventId: item.eventId,
      });
      toast.success("Deposit đã được đối soát.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể đối soát deposit."
      );
    }
  };

  const retryDelivery = async (deliveryId: string) => {
    try {
      await retryMutation.mutateAsync({ deliveryId });
      toast.success(
        "Email Delivery đã được mở lại trong một retry window mới."
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể retry email."
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
          <p className="text-sm font-medium text-primary">OPERATIONS</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Operations Console
          </h1>
          <p className="text-muted-foreground">
            Queue vận hành Avin Check cùng reconciliation, ledger, audit và
            email health.
          </p>
        </div>

        <Tabs onValueChange={setTab} value={tab}>
          <TabsList className="grid h-auto w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="protection">Protection queue</TabsTrigger>
            <TabsTrigger value="reconciliation">
              Deposit reconciliation
            </TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
            <TabsTrigger value="email">Email health</TabsTrigger>
          </TabsList>

          <TabsContent value="protection">
            <ProtectionOperationsQueuePanel />
          </TabsContent>

          <TabsContent value="reconciliation">
            <Card>
              <CardHeader>
                <CardTitle>Deposit reconciliation</CardTitle>
                <CardDescription>
                  Không hiển thị raw bank payload, account number hoặc evidence.
                </CardDescription>
                <Select
                  items={RECONCILIATION_STATUS_OPTIONS}
                  onValueChange={(value) => {
                    if (value) {
                      setReconciliationStatus(
                        value as (typeof RECONCILIATION_STATUS_OPTIONS)[number]["value"]
                      );
                      resetCursor("reconciliation");
                    }
                  }}
                  value={reconciliationStatus}
                >
                  <SelectTrigger aria-label="Filter reconciliation status">
                    <SelectValue placeholder="Trạng thái deposit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {RECONCILIATION_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <QueryState
                  isError={reconciliationQuery.isError}
                  isPending={reconciliationQuery.isPending}
                  label="reconciliation"
                  onRetry={() => void reconciliationQuery.refetch()}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Payment code</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reconciliationQuery.data?.items ?? []).map((item) => (
                      <TableRow key={item.eventId}>
                        <TableCell className="font-mono text-xs">
                          {item.eventId}
                        </TableCell>
                        <TableCell>
                          {item.amount.toLocaleString("vi-VN")} ₫
                        </TableCell>
                        <TableCell>{item.paymentCode ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.receivedAt)}
                        </TableCell>
                        <TableCell className="text-end">
                          {item.status === "UNMATCHED" &&
                          item.depositRequestId ? (
                            <Button
                              disabled={reconcileMutation.isPending}
                              onClick={() => void reconcileDeposit(item)}
                              size="sm"
                              variant="outline"
                            >
                              Đối soát
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {reconciliationQuery.data?.nextCursor ? (
                  <NextPageButton
                    disabled={reconciliationQuery.isFetching}
                    label="reconciliation"
                    onClick={() =>
                      goToNextPage(
                        "reconciliation",
                        reconciliationQuery.data?.nextCursor ?? null
                      )
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ActivityIcon /> Transaction explorer
                </CardTitle>
                <CardDescription>
                  Chỉ đọc; posting details được giữ ở backend.
                </CardDescription>
                <Select
                  items={TRANSACTION_TYPE_OPTIONS}
                  onValueChange={(value) => {
                    if (value) {
                      setTransactionType(
                        value as (typeof TRANSACTION_TYPE_OPTIONS)[number]["value"]
                      );
                      resetCursor("transactions");
                    }
                  }}
                  value={transactionType}
                >
                  <SelectTrigger aria-label="Filter transaction type">
                    <SelectValue placeholder="Loại Transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TRANSACTION_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <QueryState
                  isError={transactionsQuery.isError}
                  isPending={transactionsQuery.isPending}
                  label="transactions"
                  onRetry={() => void transactionsQuery.refetch()}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Reversal of</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(transactionsQuery.data?.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">
                          {item.reference}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.amount.toLocaleString("vi-VN")} {item.currency}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.reversalOfId ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {transactionsQuery.data?.nextCursor ? (
                  <NextPageButton
                    disabled={transactionsQuery.isFetching}
                    label="transactions"
                    onClick={() =>
                      goToNextPage(
                        "transactions",
                        transactionsQuery.data?.nextCursor ?? null
                      )
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit log</CardTitle>
                <CardDescription>
                  Metadata nhạy cảm không được đưa vào list DTO.
                </CardDescription>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-label="Filter audit action"
                    onChange={(event) => {
                      setAuditAction(event.target.value);
                      resetCursor("audit");
                    }}
                    placeholder="Lọc theo action..."
                    value={auditAction}
                  />
                  <Select
                    items={AUDIT_OUTCOME_OPTIONS}
                    onValueChange={(value) => {
                      if (value) {
                        setAuditOutcome(
                          value as (typeof AUDIT_OUTCOME_OPTIONS)[number]["value"]
                        );
                        resetCursor("audit");
                      }
                    }}
                    value={auditOutcome}
                  >
                    <SelectTrigger aria-label="Filter audit outcome">
                      <SelectValue placeholder="Kết quả audit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {AUDIT_OUTCOME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <QueryState
                  isError={auditQuery.isError}
                  isPending={auditQuery.isPending}
                  label="audit log"
                  onRetry={() => void auditQuery.refetch()}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Outcome</TableHead>
                      <TableHead>Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditQuery.data?.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.action}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.actorUserId}
                        </TableCell>
                        <TableCell>
                          {item.targetType
                            ? `${item.targetType}:${item.targetId ?? "—"}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.outcome === "SUCCESS"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {item.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {auditQuery.data?.nextCursor ? (
                  <NextPageButton
                    disabled={auditQuery.isFetching}
                    label="audit log"
                    onClick={() =>
                      goToNextPage("audit", auditQuery.data?.nextCursor ?? null)
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email delivery health</CardTitle>
                <CardDescription>
                  Retry failed delivery mở một bounded window mới và được audit.
                </CardDescription>
                <Select
                  items={EMAIL_STATUS_OPTIONS}
                  onValueChange={(value) => {
                    if (value) {
                      setEmailStatus(
                        value as (typeof EMAIL_STATUS_OPTIONS)[number]["value"]
                      );
                      resetCursor("email");
                    }
                  }}
                  value={emailStatus}
                >
                  <SelectTrigger aria-label="Filter email delivery status">
                    <SelectValue placeholder="Trạng thái email" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {EMAIL_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <QueryState
                  isError={emailQuery.isError}
                  isPending={emailQuery.isPending}
                  label="email health"
                  onRetry={() => void emailQuery.refetch()}
                />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(emailQuery.data?.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p>{item.eventType}</p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {item.sourceId}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {item.recipientUserId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.attemptCount}</TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                          {item.lastError ?? "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          {item.status === "failed" ? (
                            <Button
                              disabled={retryMutation.isPending}
                              onClick={() => void retryDelivery(item.id)}
                              size="sm"
                              variant="outline"
                            >
                              Retry
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {emailQuery.data?.nextCursor ? (
                  <NextPageButton
                    disabled={emailQuery.isFetching}
                    label="email health"
                    onClick={() =>
                      goToNextPage("email", emailQuery.data?.nextCursor ?? null)
                    }
                  />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
};
