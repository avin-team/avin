import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
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
import { Spinner } from "@avin/ui/components/spinner";
import {
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  BankIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { formatVND } from "@/utils/format";

import {
  createDepositRequestMutationOptions,
  depositStatusQueryOptions,
} from "../api/wallet-api";
import {
  DEPOSIT_MINIMUM_AMOUNT,
  depositAmountSchema,
} from "../schemas/deposit-schema";

const DEPOSIT_UI_DURATION_MS = 15 * 60_000;
const QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

interface DepositRequest {
  accountName: string;
  accountNumber: string;
  amount: number;
  bank: string;
  createdAt: string;
  paymentCode: string;
  qrUrl: string;
  requestId: string;
  status: "CREDITED" | "PENDING";
}

type DepositStep = "amount" | "qr" | "success";

const copyValue = async (label: string, value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã sao chép ${label}.`);
  } catch {
    toast.error("Không thể sao chép. Vui lòng chọn và sao chép thủ công.");
  }
};

const CopyRow = ({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy?: () => void;
  value: string;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
    {onCopy ? (
      <Button
        aria-label={`Sao chép ${label}`}
        onClick={onCopy}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <CopyIcon />
      </Button>
    ) : null}
  </div>
);

export const DepositPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<DepositStep>("amount");
  const [request, setRequest] = useState<DepositRequest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const createMutation = useMutation(createDepositRequestMutationOptions());
  const statusQuery = useQuery({
    ...depositStatusQueryOptions(
      request?.requestId ?? "00000000-0000-0000-0000-000000000000"
    ),
    enabled: step === "qr" && request !== null,
    refetchInterval: (query) => {
      if (query.state.data?.status === "CREDITED") {
        return false;
      }
      return step === "qr" ? 3000 : false;
    },
    refetchIntervalInBackground: false,
  });

  const form = useForm({
    defaultValues: { amount: 50_000 },
    onSubmit: async ({ value }) => {
      try {
        const createdRequest = await createMutation.mutateAsync({
          amount: value.amount,
        });
        setRequest(createdRequest);
        setNow(Date.now());
        setStep("qr");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể tạo yêu cầu nạp tiền."
        );
      }
    },
    validators: { onSubmit: depositAmountSchema },
  });

  const expiresAt = request
    ? new Date(request.createdAt).getTime() + DEPOSIT_UI_DURATION_MS
    : null;
  const remainingSeconds = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - now) / 1000))
    : 0;
  const remainingLabel = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);
  const isCredited = statusQuery.data?.status === "CREDITED";
  const visibleStep: DepositStep = isCredited ? "success" : step;

  useEffect(() => {
    if (step !== "qr" || !request || isCredited) {
      return;
    }
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      if (expiresAt !== null && currentNow >= expiresAt) {
        setStep("amount");
        toast.info(
          "Màn hình QR đã hết thời gian. Yêu cầu vẫn có thể được khớp nếu bạn chuyển đúng nội dung."
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, isCredited, request, step]);

  const resetForAnotherDeposit = () => {
    setRequest(null);
    setStep("amount");
    setNow(Date.now());
  };

  return (
    <Shell variant="default">
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <div>
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            to="/wallet"
          >
            ← Về ví của tôi
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Nạp tiền vào ví
          </h1>
          <p className="mt-2 text-muted-foreground">
            Chuyển khoản bằng VietQR ngay trong Avin. Không cần rời khỏi trang.
          </p>
        </div>

        {visibleStep === "amount" ? (
          <Card>
            <CardHeader>
              <CardTitle>Nhập số tiền</CardTitle>
              <CardDescription>
                Số tiền tối thiểu là 5.000 ₫. Mỗi lần đổi số tiền sẽ tạo một yêu
                cầu mới.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                id="deposit-amount-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  await form.handleSubmit();
                }}
              >
                <FieldGroup>
                  <form.Field name="amount">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Số tiền (VND)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            id={field.name}
                            inputMode="numeric"
                            min={DEPOSIT_MINIMUM_AMOUNT}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.valueAsNumber)
                            }
                            type="number"
                            value={
                              Number.isNaN(field.state.value)
                                ? ""
                                : field.state.value
                            }
                          />
                          <FieldDescription>
                            {formatVND(field.state.value || 0)}
                          </FieldDescription>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </form.Field>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((amount) => (
                      <Button
                        key={amount}
                        onClick={() => form.setFieldValue("amount", amount)}
                        type="button"
                        variant="outline"
                      >
                        {formatVND(amount)}
                      </Button>
                    ))}
                  </div>
                  <form.Subscribe
                    selector={(state) => ({
                      canSubmit: state.canSubmit,
                      isSubmitting: state.isSubmitting,
                    })}
                  >
                    {({ canSubmit, isSubmitting }) => (
                      <Button
                        disabled={
                          !canSubmit || isSubmitting || createMutation.isPending
                        }
                        form="deposit-amount-form"
                        type="submit"
                      >
                        {(isSubmitting || createMutation.isPending) && (
                          <Spinner data-icon="inline-start" />
                        )}
                        Hiển thị mã QR
                      </Button>
                    )}
                  </form.Subscribe>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {visibleStep === "qr" && request ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Quét mã để chuyển khoản</CardTitle>
                  <CardDescription>
                    Yêu cầu được giữ trên hệ thống; chỉ màn hình này hết thời
                    gian sau 15 phút.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  <ClockIcon className="size-4" />
                  {remainingLabel}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr] md:items-center">
                <div className="mx-auto rounded-3xl border border-border bg-white p-4">
                  <img
                    alt="Mã QR chuyển khoản VietQR"
                    className="size-60"
                    src={request.qrUrl}
                  />
                </div>
                <div className="space-y-3">
                  <CopyRow label="Ngân hàng" value={request.bank} />
                  <CopyRow
                    label="Số tài khoản"
                    value={request.accountNumber}
                    onCopy={() =>
                      copyValue("số tài khoản", request.accountNumber)
                    }
                  />
                  <CopyRow
                    label="Chủ tài khoản"
                    value={request.accountName}
                    onCopy={() =>
                      copyValue("tên tài khoản", request.accountName)
                    }
                  />
                  <CopyRow
                    label="Số tiền"
                    value={formatVND(request.amount)}
                    onCopy={() => copyValue("số tiền", String(request.amount))}
                  />
                  <CopyRow
                    label="Nội dung chuyển khoản"
                    value={request.paymentCode}
                    onCopy={() =>
                      copyValue("nội dung chuyển khoản", request.paymentCode)
                    }
                  />
                </div>
              </div>
              <Alert>
                <BankIcon />
                <AlertTitle>Luôn kiểm tra nội dung chuyển khoản</AlertTitle>
                <AlertDescription>
                  Chuyển đúng số tiền và nội dung{" "}
                  <strong>{request.paymentCode}</strong>. Bạn có thể rời trang;
                  một khoản chuyển hợp lệ sau đó vẫn được ghi có đúng một lần.
                </AlertDescription>
              </Alert>
              {statusQuery.isError ? (
                <p className="text-sm text-destructive">
                  Chưa thể kiểm tra trạng thái. Hệ thống sẽ tự thử lại.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {visibleStep === "success" && request ? (
          <Card>
            <CardContent className="space-y-6 py-10 text-center">
              <CheckCircleIcon className="mx-auto size-14 text-emerald-500" />
              <div>
                <h2 className="text-2xl font-bold">Nạp tiền thành công</h2>
                <p className="mt-2 text-muted-foreground">
                  Đã ghi có{" "}
                  {formatVND(
                    statusQuery.data?.creditedAmount ?? request.amount
                  )}{" "}
                  vào ví của bạn.
                </p>
              </div>
              <div className="rounded-2xl bg-muted/50 p-4 text-sm">
                <p>Số dư khả dụng mới</p>
                <p className="mt-1 text-xl font-bold text-primary">
                  {formatVND(statusQuery.data?.newAvailableBalance ?? 0)}
                </p>
                <p className="mt-3 text-muted-foreground">
                  Mã giao dịch:{" "}
                  {statusQuery.data?.transactionReference ??
                    request.paymentCode}
                </p>
              </div>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button onClick={() => navigate({ to: "/wallet" })}>
                  Về ví
                </Button>
                <Button onClick={resetForAnotherDeposit} variant="outline">
                  Nạp thêm
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Shell>
  );
};
