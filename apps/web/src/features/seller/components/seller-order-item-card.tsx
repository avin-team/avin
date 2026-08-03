import type { SellerOrderView } from "@avin/api/commerce/orders";
import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@avin/ui/components/alert-dialog";
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
import { Skeleton } from "@avin/ui/components/skeleton";
import { Textarea } from "@avin/ui/components/textarea";
import {
  ArrowClockwise,
  CheckCircle,
  ClipboardText,
  Play,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { OrderItemTimeline } from "@/features/commerce/components/order-item-timeline";
import {
  ORDER_TIMELINE_REFRESH_INTERVAL_MS,
  formatOrderDeadline,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
  getWarrantyPolicyLabel,
} from "@/features/commerce/order-status";
import {
  sellerCancellationSchema,
  sellerDeliverySchema,
} from "@/features/commerce/schemas/order-action-schemas";
import { formatVND } from "@/utils/format";
import { getErrorMessage } from "@/utils/get-error-message";
import { orpc } from "@/utils/orpc";

const getEscrowHoldStatusLabel = (status: string): string => {
  if (status === "HELD") {
    return "Đang giữ tiền";
  }
  if (status === "RELEASED") {
    return "Đã giải ngân";
  }
  if (status === "REFUNDED") {
    return "Đã hoàn tiền";
  }
  return "Đã hủy";
};

const getEvidenceFiles = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((storageKey, index) => ({
      byteSize: null,
      contentType: "text/uri-list",
      fileName: `Bằng chứng ${index + 1}`,
      storageKey,
    }));

const formatInputValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value) ?? "—";
  } catch {
    return "—";
  }
};

const SellerDeliveryForm = ({
  itemId,
  onCompleted,
}: {
  itemId: string;
  onCompleted: () => Promise<void>;
}) => {
  const mutation = useMutation(
    orpc.commerce.orders.item.submitDelivery.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể gửi bàn giao."));
      },
      onSuccess: async () => {
        await onCompleted();
        toast.success("Đã bàn giao OrderItem cho Buyer.");
      },
    })
  );
  const deliveryForm = useForm({
    defaultValues: { deliveryNote: "", evidence: "" },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          commandKey: crypto.randomUUID(),
          deliveryNote: value.deliveryNote,
          files: getEvidenceFiles(value.evidence),
          itemId,
        });
        deliveryForm.reset();
      } catch {
        // The mutation error handler already shows the failure to the Seller.
      }
    },
    validators: { onSubmit: sellerDeliverySchema },
  });

  return (
    <form
      className="rounded-2xl border border-primary/25 bg-primary/5 p-4"
      id={`delivery-form-${itemId}`}
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await deliveryForm.handleSubmit();
      }}
    >
      <div className="flex items-start gap-3">
        <ClipboardText aria-hidden="true" className="mt-0.5 text-primary" />
        <div>
          <h4 className="font-semibold">Gửi kết quả cho Buyer</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Ghi chú và ít nhất một liên kết HTTP hoặc HTTPS là bắt buộc.
          </p>
        </div>
      </div>
      <FieldGroup className="mt-4 gap-4">
        <deliveryForm.Field name="deliveryNote">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={`delivery-note-${itemId}`}>
                  Ghi chú bàn giao
                </FieldLabel>
                <Textarea
                  aria-invalid={isInvalid}
                  id={`delivery-note-${itemId}`}
                  maxLength={20_000}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="Mô tả kết quả, cách sử dụng hoặc bước tiếp theo..."
                  value={field.state.value}
                />
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </deliveryForm.Field>
        <deliveryForm.Field name="evidence">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={`delivery-evidence-${itemId}`}>
                  Liên kết bằng chứng (URL)
                </FieldLabel>
                <Textarea
                  aria-describedby={`delivery-evidence-help-${itemId}`}
                  aria-invalid={isInvalid}
                  id={`delivery-evidence-${itemId}`}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="https://example.com/proof"
                  value={field.state.value}
                />
                <FieldDescription id={`delivery-evidence-help-${itemId}`}>
                  Có thể nhập nhiều URL, mỗi URL một dòng.
                </FieldDescription>
                {isInvalid ? (
                  <FieldError errors={field.state.meta.errors} />
                ) : null}
              </Field>
            );
          }}
        </deliveryForm.Field>
      </FieldGroup>
      <div className="mt-4 flex justify-end">
        <deliveryForm.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting || mutation.isPending}
              form={`delivery-form-${itemId}`}
              type="submit"
            >
              <CheckCircle aria-hidden="true" />
              {isSubmitting || mutation.isPending
                ? "Đang gửi…"
                : "Gửi bàn giao"}
            </Button>
          )}
        </deliveryForm.Subscribe>
      </div>
    </form>
  );
};

export const SellerOrderItemCard = ({
  item,
}: {
  item: SellerOrderView["items"][number];
}) => {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const timelineQuery = useQuery(
    orpc.commerce.orders.item.timeline.queryOptions({
      input: { itemId: item.id },
      refetchInterval: ORDER_TIMELINE_REFRESH_INTERVAL_MS,
      retry: false,
      throwOnError: false,
    })
  );

  const invalidateItem = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.commerce.orders.listMine.queryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.commerce.orders.item.timeline.queryOptions({
          input: { itemId: item.id },
        }).queryKey,
      }),
    ]);
  };

  const startMutation = useMutation(
    orpc.commerce.orders.item.startFulfillment.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể bắt đầu fulfillment."));
      },
      onSuccess: async () => {
        await invalidateItem();
        toast.success("Đã bắt đầu thực hiện OrderItem.");
      },
    })
  );
  const cancelMutation = useMutation(
    orpc.commerce.orders.item.cancelBySeller.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể hủy OrderItem."));
      },
      onSuccess: async () => {
        setCancelOpen(false);
        await invalidateItem();
        toast.success("Đã hủy OrderItem và hoàn tiền cho Buyer.");
      },
    })
  );
  const cancelForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      try {
        await cancelMutation.mutateAsync({
          commandKey: crypto.randomUUID(),
          itemId: item.id,
          reason: value.reason,
        });
        cancelForm.reset();
      } catch {
        // The mutation error handler already shows the failure to the Seller.
      }
    },
    validators: { onSubmit: sellerCancellationSchema },
  });

  const current = timelineQuery.data?.current;
  const status = current?.status ?? item.status;
  const canCancel = status === "AWAITING_SELLER" || status === "IN_PROGRESS";
  const timelineContent = (() => {
    if (timelineQuery.isPending) {
      return (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      );
    }

    if (timelineQuery.isError) {
      return (
        <Alert variant="destructive">
          <WarningCircle aria-hidden="true" />
          <AlertTitle>Không thể tải timeline</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Vui lòng thử lại để xem bằng chứng và lịch sử.</span>
            <Button
              onClick={() => void timelineQuery.refetch()}
              size="sm"
              variant="outline"
            >
              <ArrowClockwise aria-hidden="true" />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (timelineQuery.data) {
      return (
        <details className="group rounded-2xl border border-border/60 p-4">
          <summary className="cursor-pointer list-none font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Xem timeline và bằng chứng
          </summary>
          <div className="mt-4">
            <OrderItemTimeline timeline={timelineQuery.data} />
          </div>
        </details>
      );
    }

    return null;
  })();

  const handleStart = async (): Promise<void> => {
    try {
      await startMutation.mutateAsync({
        commandKey: crypto.randomUUID(),
        itemId: item.id,
      });
    } catch {
      // The mutation error handler already shows the failure to the Seller.
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">
              {item.listing.title}
            </CardTitle>
            <CardDescription className="mt-1 font-semibold text-foreground">
              {formatVND(item.priceAmount)}
            </CardDescription>
          </div>
          <Badge variant={getOrderItemStatusVariant(status)}>
            {getOrderItemStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Hạn xử lý</p>
            <p className="mt-1 font-medium">
              {formatOrderDeadline(
                current?.processingDeadlineAt ?? item.processingDeadlineAt
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Thời gian bảo hành</p>
            <p className="mt-1 font-medium">
              {getWarrantyPolicyLabel(item.warrantyPolicy)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Tiền tạm giữ (Escrow)
            </p>
            <p className="mt-1 font-medium">
              {formatVND(item.escrowHold.amount)} ·{" "}
              {getEscrowHoldStatusLabel(item.escrowHold.status)}
            </p>
          </div>
        </div>

        {item.customInputs.length > 0 ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <h4 className="font-semibold">Thông tin Khách hàng cung cấp</h4>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {item.customInputs.map((input) => (
                <div key={input.fieldKey}>
                  <dt className="text-xs text-muted-foreground">
                    {input.fieldKey}
                  </dt>
                  <dd className="mt-1 break-words text-sm">
                    {formatInputValue(input.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {status === "AWAITING_SELLER" ? (
            <Button
              disabled={startMutation.isPending}
              onClick={() => void handleStart()}
              type="button"
            >
              <Play aria-hidden="true" />
              {startMutation.isPending ? "Đang bắt đầu…" : "Bắt đầu thực hiện"}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              disabled={cancelMutation.isPending}
              onClick={() => setCancelOpen(true)}
              type="button"
              variant="destructive"
            >
              <XCircle aria-hidden="true" />
              Hủy đơn hàng
            </Button>
          ) : null}
        </div>

        {status === "IN_PROGRESS" ? (
          <SellerDeliveryForm itemId={item.id} onCompleted={invalidateItem} />
        ) : null}

        {timelineContent}
      </CardContent>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !cancelMutation.isPending) {
            setCancelOpen(false);
          }
        }}
        open={cancelOpen}
      >
        <AlertDialogContent className="p-6 sm:max-w-lg">
          <AlertDialogHeader className="place-items-start text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <WarningCircle aria-hidden="true" className="size-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-foreground">
                  Xác nhận hủy đơn hàng
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Số tiền tạm giữ (Escrow) của sản phẩm này sẽ được hoàn trả cho
                  khách hàng. Các sản phẩm khác trong đơn (nếu có) không bị ảnh
                  hưởng.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <form
            className="mt-2 space-y-4"
            id={`cancel-form-${item.id}`}
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await cancelForm.handleSubmit();
            }}
          >
            <cancelForm.Field name="reason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`cancel-reason-${item.id}`}>
                      Lý do hủy đơn
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      className="mt-1.5 min-h-[100px] text-sm"
                      id={`cancel-reason-${item.id}`}
                      maxLength={5000}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nhập lý do chi tiết để khách hàng hiểu rõ lý do bạn hủy đơn..."
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </cancelForm.Field>
            <AlertDialogFooter className="mt-6 gap-2 sm:justify-end">
              <AlertDialogCancel disabled={cancelMutation.isPending}>
                Quay lại
              </AlertDialogCancel>
              <cancelForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <AlertDialogAction
                    disabled={
                      !canSubmit || isSubmitting || cancelMutation.isPending
                    }
                    form={`cancel-form-${item.id}`}
                    type="submit"
                    variant="destructive"
                  >
                    {isSubmitting || cancelMutation.isPending
                      ? "Đang hủy…"
                      : "Xác nhận hủy đơn"}
                  </AlertDialogAction>
                )}
              </cancelForm.Subscribe>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
