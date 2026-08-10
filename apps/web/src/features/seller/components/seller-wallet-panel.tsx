import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Skeleton } from "@avin/ui/components/skeleton";
import { BankIcon, WalletIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { formatVND } from "@/utils/format";
import { getErrorMessage } from "@/utils/get-error-message";
import { orpc } from "@/utils/orpc";

import {
  sellerWalletSummaryQueryOptions,
  sellerWithdrawalQueryKey,
  sellerWithdrawalsQueryOptions,
} from "../api/seller-wallet-api";
import {
  SELLER_WITHDRAWAL_MINIMUM_AMOUNT,
  sellerWithdrawalSchema,
} from "../schemas/withdrawal-schema";

type WithdrawalStatus =
  | "APPROVED"
  | "CANCELLED"
  | "PAID"
  | "REJECTED"
  | "REQUESTED";

interface WithdrawalRequestView {
  amount: number;
  bankAccount: { accountName: string; accountNumber: string; bankName: string };
  createdAt: string;
  id: string;
  paymentReference: string | null;
  rejectionReason: string | null;
  status: WithdrawalStatus;
}

const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  APPROVED: "Đã duyệt",
  CANCELLED: "Đã hủy",
  PAID: "Đã chuyển khoản",
  REJECTED: "Đã từ chối",
  REQUESTED: "Đang chờ duyệt",
};

const getWithdrawalStatusVariant = (status: WithdrawalStatus) => {
  if (status === "PAID") {
    return "default";
  }
  if (status === "REJECTED") {
    return "destructive";
  }
  return "secondary";
};

const SellerBalanceCard = ({
  description,
  title,
  value,
}: {
  description: string;
  title: string;
  value: number | undefined;
}) => (
  <Card size="sm">
    <CardHeader>
      <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {value === undefined ? (
        <Skeleton className="h-8 w-36" />
      ) : (
        <p className="text-2xl font-bold">{formatVND(value)}</p>
      )}
    </CardContent>
  </Card>
);

const WithdrawalRow = ({
  onCancel,
  request,
}: {
  onCancel: (request: WithdrawalRequestView) => void;
  request: WithdrawalRequestView;
}) => (
  <div className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{formatVND(request.amount)}</p>
        <Badge variant={getWithdrawalStatusVariant(request.status)}>
          {WITHDRAWAL_STATUS_LABELS[request.status]}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {new Date(request.createdAt).toLocaleString("vi-VN")} ·{" "}
        {request.bankAccount.bankName} · {request.bankAccount.accountNumber}
      </p>
      {request.rejectionReason ? (
        <p className="mt-1 text-sm text-destructive">
          {request.rejectionReason}
        </p>
      ) : null}
      {request.paymentReference ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Mã giao dịch: {request.paymentReference}
        </p>
      ) : null}
    </div>
    {request.status === "REQUESTED" ? (
      <Button onClick={() => onCancel(request)} size="sm" variant="outline">
        Hủy yêu cầu
      </Button>
    ) : null}
  </div>
);

export const SellerWalletPanel = () => {
  const queryClient = useQueryClient();
  const summaryQuery = useQuery(sellerWalletSummaryQueryOptions());
  const withdrawalsQuery = useQuery(sellerWithdrawalsQueryOptions());
  const invalidateWallet = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: sellerWalletSummaryQueryOptions().queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: sellerWithdrawalQueryKey() }),
    ]);
  };
  const requestMutation = useMutation(
    orpc.wallet.seller.requestWithdrawal.mutationOptions({
      onError: (error) =>
        toast.error(getErrorMessage(error, "Không thể tạo yêu cầu rút tiền.")),
      onSuccess: async () => {
        await invalidateWallet();
        toast.success("Đã gửi yêu cầu rút tiền.");
      },
    })
  );
  const cancelMutation = useMutation(
    orpc.wallet.seller.cancelWithdrawal.mutationOptions({
      onError: (error) =>
        toast.error(getErrorMessage(error, "Không thể hủy yêu cầu rút tiền.")),
      onSuccess: async () => {
        await invalidateWallet();
        toast.success("Đã hủy yêu cầu rút tiền.");
      },
    })
  );
  const withdrawalForm = useForm({
    defaultValues: { amount: SELLER_WITHDRAWAL_MINIMUM_AMOUNT },
    onSubmit: async ({ value }) => {
      try {
        await requestMutation.mutateAsync({
          amount: value.amount,
          idempotencyKey: crypto.randomUUID(),
        });
        withdrawalForm.reset();
      } catch {
        // The mutation error handler already surfaces feedback to the Seller.
      }
    },
    validators: { onSubmit: sellerWithdrawalSchema },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Rút Tiền</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi doanh thu đã giải ngân và gửi yêu cầu rút tiền về tài khoản
          ngân hàng đã xác minh.
        </p>
      </div>
      {summaryQuery.isError ? (
        <p className="text-sm text-destructive">
          Không thể tải số dư SellerWallet. Vui lòng thử lại.
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <SellerBalanceCard
          description="Đơn hàng đang được tạm giữ tiền"
          title="Chờ giải ngân"
          value={summaryQuery.data?.pendingBalance}
        />
        <SellerBalanceCard
          description="Có thể yêu cầu rút tiền"
          title="Khả dụng"
          value={summaryQuery.data?.availableBalance}
        />
        <SellerBalanceCard
          description="Đang chờ xử lý rút tiền"
          title="Đang giữ"
          value={summaryQuery.data?.heldBalance}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử rút tiền</CardTitle>
            <CardDescription>
              Yêu cầu mới nhất hiển thị ở trên cùng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withdrawalsQuery.isPending ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : null}
            {withdrawalsQuery.isError ? (
              <p className="text-sm text-destructive">
                Không thể tải lịch sử rút tiền.
              </p>
            ) : null}
            {!withdrawalsQuery.isPending &&
            !withdrawalsQuery.isError &&
            withdrawalsQuery.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có yêu cầu rút tiền nào.
              </p>
            ) : null}
            {withdrawalsQuery.data?.map((request) => (
              <WithdrawalRow
                key={request.id}
                onCancel={(item) => {
                  cancelMutation.mutate({
                    withdrawalRequestId: item.id,
                  });
                }}
                request={request}
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BankIcon /> Yêu cầu rút tiền
            </CardTitle>
            <CardDescription>
              Tối thiểu {formatVND(SELLER_WITHDRAWAL_MINIMUM_AMOUNT)}. Tiền được
              chuyển về tài khoản ngân hàng đã xác minh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                await withdrawalForm.handleSubmit();
              }}
            >
              <FieldGroup>
                <withdrawalForm.Field name="amount">
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor="withdrawal-amount">
                          Số tiền rút (VND)
                        </FieldLabel>
                        <Input
                          aria-invalid={invalid}
                          id="withdrawal-amount"
                          min={SELLER_WITHDRAWAL_MINIMUM_AMOUNT}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(Number(event.target.value))
                          }
                          type="number"
                          value={field.state.value}
                        />
                        {invalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : (
                          <FieldDescription>
                            Số dư khả dụng sẽ được giữ ngay khi gửi yêu cầu.
                          </FieldDescription>
                        )}
                      </Field>
                    );
                  }}
                </withdrawalForm.Field>
                <withdrawalForm.Subscribe
                  selector={(state) =>
                    [state.canSubmit, state.isSubmitting] as const
                  }
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      disabled={
                        !canSubmit || isSubmitting || requestMutation.isPending
                      }
                      type="submit"
                    >
                      <WalletIcon data-icon="inline-start" />
                      {isSubmitting || requestMutation.isPending
                        ? "Đang gửi..."
                        : "Gửi yêu cầu rút"}
                    </Button>
                  )}
                </withdrawalForm.Subscribe>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
