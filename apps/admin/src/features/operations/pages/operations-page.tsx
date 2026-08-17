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
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { orpc } from "@/lib/orpc";

import {
  useOperationsAuditLog,
  useAdvisorAnalyticsOverview,
  useAdvisorFeedbackDetail,
  useAdvisorFeedbackList,
  useOperationsEmailDelivery,
  useOperationsReconciliation,
  useOperationsTransactions,
  useReconcileDeposit,
  useRetryEmailDelivery,
} from "../api/operations-api";
import type {
  EmailDeliveryStatus,
  AdvisorAnalyticsTimeframe,
  ReconciliationStatus,
  TransactionType,
} from "../api/operations-api";

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

const formatPercent = (value: number): string => `${(value * 100).toFixed(1)}%`;

const AdvisorFeedbackAttachmentLink = ({
  attachmentId,
  feedbackId,
}: {
  attachmentId: string;
  feedbackId: string;
}) => {
  const query = useQuery(
    orpc.advisor.feedback.attachmentUrl.queryOptions({
      input: { attachmentId, feedbackId },
    })
  );
  if (query.isPending) {
    return (
      <span className="text-muted-foreground text-xs">Đang tạo link…</span>
    );
  }
  if (query.isError || !query.data?.url) {
    return <span className="text-destructive text-xs">Không mở được ảnh</span>;
  }
  return (
    <a
      className="text-primary text-sm underline-offset-4 hover:underline"
      href={query.data.url}
      rel="noopener"
      target="_blank"
    >
      Mở ảnh đã consent
    </a>
  );
};

interface AdvisorAnalyticsDay {
  checkouts: number;
  date: string;
  noMatches: number;
  recommendations: number;
  sessions: number;
}

interface AdvisorFeedbackListItem {
  attachmentCount: number;
  feedbackId: string;
  includeConversation: boolean;
  reason: string | null;
  sentiment: "NEGATIVE" | "POSITIVE";
}

interface AdvisorAnalyticsSummary {
  conversion: {
    checkoutRate: number;
    recommendationRate: number;
  };
  errors: {
    count: number;
    rate: number;
  };
  feedback: { total: number };
  latency: {
    firstTokenP95Ms: number | null;
    imageTurnP95Ms: number | null;
    turnP95Ms: number | null;
  };
  model: string | null;
  noMatches: number;
  recommendations: number;
  rollout: {
    allowlistSize: number;
    enabled: boolean;
    percentage: number;
  };
  sessions: number;
  technicalTokens: number;
  technicalRequests: number;
  turns: number;
}

interface AdvisorQuotaSummary {
  exhausted: boolean;
  requestLimit: number;
  requests: number;
  tokenLimit: number;
  tokens: number;
  warning: boolean;
}

interface AdvisorMetric {
  isDuration?: boolean;
  isPercent?: boolean;
  label: string;
  value: number | null;
}

const metricValue = (value: number | null | undefined): number | null =>
  value ?? 0;

const nullableMetricValue = (
  value: number | null | undefined
): number | null => (value === undefined ? null : value);

const getAdvisorMetrics = (
  overview: AdvisorAnalyticsSummary | undefined
): AdvisorMetric[] => [
  { label: "Sessions", value: metricValue(overview?.sessions) },
  { label: "Turns completed", value: metricValue(overview?.turns) },
  { label: "Recommendations", value: metricValue(overview?.recommendations) },
  { label: "No-match", value: metricValue(overview?.noMatches) },
  {
    isPercent: true,
    label: "Checkout",
    value: metricValue(overview?.conversion.checkoutRate),
  },
  {
    isPercent: true,
    label: "Recommendation rate",
    value: metricValue(overview?.conversion.recommendationRate),
  },
  { label: "Feedback", value: metricValue(overview?.feedback.total) },
  { label: "AI requests", value: metricValue(overview?.technicalRequests) },
  { label: "AI tokens", value: metricValue(overview?.technicalTokens) },
  { label: "Errors", value: metricValue(overview?.errors.count) },
  {
    isPercent: true,
    label: "Error rate",
    value: metricValue(overview?.errors.rate),
  },
  {
    isDuration: true,
    label: "First-token p95",
    value: nullableMetricValue(overview?.latency.firstTokenP95Ms),
  },
  {
    isDuration: true,
    label: "Turn p95",
    value: nullableMetricValue(overview?.latency.turnP95Ms),
  },
  {
    isDuration: true,
    label: "Image turn p95",
    value: nullableMetricValue(overview?.latency.imageTurnP95Ms),
  },
];

const AdvisorQuotaBanner = ({
  quota,
}: {
  quota: AdvisorQuotaSummary | undefined;
}) => {
  if (!quota) {
    return null;
  }
  if (quota.exhausted) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        Daily quota đã đạt giới hạn: {quota.requests}/{quota.requestLimit}{" "}
        request, {quota.tokens.toLocaleString("vi-VN")}/
        {quota.tokenLimit.toLocaleString("vi-VN")} token.
      </p>
    );
  }
  if (quota.warning) {
    return (
      <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
        Cảnh báo 80% quota: {quota.requests}/{quota.requestLimit} request,{" "}
        {quota.tokens.toLocaleString("vi-VN")}/
        {quota.tokenLimit.toLocaleString("vi-VN")} token.
      </p>
    );
  }
  return (
    <p className="text-muted-foreground text-sm">
      Quota hôm nay: {quota.requests}/{quota.requestLimit} request ·{" "}
      {quota.tokens.toLocaleString("vi-VN")}/
      {quota.tokenLimit.toLocaleString("vi-VN")} token.
    </p>
  );
};

const formatAdvisorMetric = ({
  isDuration,
  isPercent,
  value,
}: Pick<AdvisorMetric, "isDuration" | "isPercent" | "value">): string => {
  if (value === null) {
    return "—";
  }
  if (isPercent) {
    return formatPercent(value);
  }
  if (isDuration) {
    return `${value.toLocaleString("vi-VN")} ms`;
  }
  return value.toLocaleString("vi-VN");
};

const AdvisorMetricGrid = ({ metrics }: { metrics: AdvisorMetric[] }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {metrics.map(({ isDuration, isPercent, label, value }) => (
      <div className="rounded-lg border p-3" key={label}>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="mt-1 font-semibold text-2xl">
          {formatAdvisorMetric({ isDuration, isPercent, value })}
        </p>
      </div>
    ))}
  </div>
);

const AdvisorRolloutBanner = ({
  model,
  rollout,
}: {
  model: string | null | undefined;
  rollout: AdvisorAnalyticsSummary["rollout"] | undefined;
}) => {
  if (!rollout) {
    return null;
  }
  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        rollout.enabled
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-destructive/30 bg-destructive/5 text-destructive"
      }`}
    >
      <p className="font-medium">
        AI beta rollout: {rollout.enabled ? "enabled" : "disabled"} ·{" "}
        {rollout.percentage}% public traffic
      </p>
      <p className="text-muted-foreground text-xs">
        Model: {model ?? "chưa có request"} · allowlist: {rollout.allowlistSize}
      </p>
    </div>
  );
};

const AdvisorTrendTable = ({ days }: { days: AdvisorAnalyticsDay[] }) => (
  <div className="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ngày</TableHead>
          <TableHead>Sessions</TableHead>
          <TableHead>Recommendations</TableHead>
          <TableHead>No-match</TableHead>
          <TableHead>Checkout</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {days
          .toReversed()
          .slice(0, 14)
          .map((day) => (
            <TableRow key={day.date}>
              <TableCell>{day.date}</TableCell>
              <TableCell>{day.sessions}</TableCell>
              <TableCell>{day.recommendations}</TableCell>
              <TableCell>{day.noMatches}</TableCell>
              <TableCell>{day.checkouts}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  </div>
);

const AdvisorFeedbackTable = ({
  items,
  selectedFeedbackId,
  onSelect,
}: {
  items: AdvisorFeedbackListItem[];
  onSelect: (feedbackId: string) => void;
  selectedFeedbackId: string | undefined;
}) => (
  <div className="overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sentiment</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Chia sẻ</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.feedbackId}>
            <TableCell>
              <Badge
                variant={
                  item.sentiment === "POSITIVE" ? "secondary" : "destructive"
                }
              >
                {item.sentiment}
              </Badge>
            </TableCell>
            <TableCell className="max-w-52 truncate text-sm">
              {item.reason ?? "—"}
            </TableCell>
            <TableCell className="text-xs">
              {item.includeConversation ? "Transcript" : "Không"}
              {item.attachmentCount > 0 ? ` · ${item.attachmentCount} ảnh` : ""}
            </TableCell>
            <TableCell className="text-end">
              <Button
                onClick={() => onSelect(item.feedbackId)}
                size="sm"
                variant={
                  selectedFeedbackId === item.feedbackId ? "default" : "outline"
                }
              >
                Xem đã chia sẻ
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const AdvisorFeedbackDetailPanel = ({
  feedbackId,
}: {
  feedbackId: string | undefined;
}) => {
  const detailQuery = useAdvisorFeedbackDetail(feedbackId);
  if (!feedbackId) {
    return (
      <p className="text-muted-foreground text-sm">
        Chọn một Feedback để xem phần người tham gia đã consent.
      </p>
    );
  }
  if (detailQuery.isPending) {
    return (
      <p className="text-muted-foreground text-sm">
        Đang tải nội dung đã chia sẻ…
      </p>
    );
  }
  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="space-y-2 text-sm text-destructive">
        <p>Không thể tải Feedback.</p>
        <Button
          onClick={() => void detailQuery.refetch()}
          size="sm"
          variant="outline"
        >
          Thử lại
        </Button>
      </div>
    );
  }
  const detail = detailQuery.data;
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{detail.sentiment}</p>
        <p className="text-muted-foreground text-sm">
          {detail.reason ?? "Không có lý do bổ sung."}
        </p>
      </div>
      {detail.conversation ? (
        <div className="space-y-2">
          <p className="font-medium text-sm">Transcript đã consent</p>
          <ol className="max-h-64 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
            {detail.conversation.map((message) => (
              <li className="text-sm" key={message.id}>
                <span className="font-medium">{message.role}: </span>
                {message.text}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Participant không consent transcript; phần này vẫn ẩn.
        </p>
      )}
      {detail.attachments.length > 0 ? (
        <div className="space-y-2">
          <p className="font-medium text-sm">Ảnh đã consent</p>
          <ul className="space-y-2">
            {detail.attachments.map((attachment) => (
              <li
                className="flex items-center justify-between gap-3 text-sm"
                key={attachment.id}
              >
                <span className="truncate">{attachment.fileName}</span>
                <AdvisorFeedbackAttachmentLink
                  attachmentId={attachment.id}
                  feedbackId={detail.feedbackId}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const AdvisorTimeframeButtons = ({
  onChange,
  value,
}: {
  onChange: (value: AdvisorAnalyticsTimeframe) => void;
  value: AdvisorAnalyticsTimeframe;
}) => (
  <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1">
    {(["7d", "30d", "90d"] as const).map((option) => (
      <Button
        className="text-xs"
        key={option}
        onClick={() => onChange(option)}
        size="xs"
        variant={value === option ? "default" : "ghost"}
      >
        {option}
      </Button>
    ))}
  </div>
);

const AdvisorAnalyticsPanel = ({ enabled }: { enabled: boolean }) => {
  const [timeframe, setTimeframe] = useState<AdvisorAnalyticsTimeframe>("30d");
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string>();
  const analyticsQuery = useAdvisorAnalyticsOverview(timeframe, enabled);
  const feedbackQuery = useAdvisorFeedbackList(undefined, enabled);
  const overview = analyticsQuery.data;
  const metrics = getAdvisorMetrics(overview);
  const days = overview?.days ?? [];
  const feedbackItems = feedbackQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Service Advisor analytics</CardTitle>
            <CardDescription>
              Funnel và usage content-free; không có transcript browser mặc
              định.
            </CardDescription>
          </div>
          <AdvisorTimeframeButtons onChange={setTimeframe} value={timeframe} />
        </CardHeader>
        <CardContent className="space-y-4">
          <QueryState
            isError={analyticsQuery.isError}
            isPending={analyticsQuery.isPending}
            label="Advisor analytics"
            onRetry={() => void analyticsQuery.refetch()}
          />
          <AdvisorMetricGrid metrics={metrics} />
          <AdvisorRolloutBanner
            model={overview?.model}
            rollout={overview?.rollout}
          />
          <AdvisorQuotaBanner quota={overview?.quota} />
          <AdvisorTrendTable days={days} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advisor Feedback</CardTitle>
          <CardDescription>
            Chỉ bản ghi người tham gia đã gửi. Nội dung chia sẻ được tải riêng
            và audit khi Admin mở.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <QueryState
              isError={feedbackQuery.isError}
              isPending={feedbackQuery.isPending}
              label="Advisor Feedback"
              onRetry={() => void feedbackQuery.refetch()}
            />
            <AdvisorFeedbackTable
              items={feedbackItems}
              onSelect={setSelectedFeedbackId}
              selectedFeedbackId={selectedFeedbackId}
            />
          </div>
          <div className="rounded-lg border p-4">
            <AdvisorFeedbackDetailPanel feedbackId={selectedFeedbackId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const OperationsPage = () => {
  const [tab, setTab] = useState("reconciliation");
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
            Read-only surfaces cho reconciliation, ledger, audit và email
            health.
          </p>
        </div>

        <Tabs onValueChange={setTab} value={tab}>
          <TabsList className="grid h-auto w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="reconciliation">
              Deposit reconciliation
            </TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
            <TabsTrigger value="email">Email health</TabsTrigger>
            <TabsTrigger value="advisor">Advisor</TabsTrigger>
          </TabsList>

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

          <TabsContent value="advisor">
            <AdvisorAnalyticsPanel enabled={tab === "advisor"} />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
};
