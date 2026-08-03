import type { BuyerOrderView } from "@avin/api/commerce/orders";
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
  canBuyerCancel,
  canBuyerConfirmDelivery,
  canBuyerOpenDispute,
  formatOrderDeadline,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
} from "@/features/commerce/order-status";
import { buyerDisputeSchema } from "@/features/commerce/schemas/order-action-schemas";
import { formatVND } from "@/utils/format";
import { getErrorMessage } from "@/utils/get-error-message";
import { orpc } from "@/utils/orpc";

export const BuyerOrderItemCard = ({
  item,
}: {
  item: BuyerOrderView["items"][number];
}) => {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
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
        queryKey: orpc.commerce.orders.listMineAsBuyer.queryOptions().queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.commerce.orders.item.timeline.queryOptions({
          input: { itemId: item.id },
        }).queryKey,
      }),
    ]);
  };

  const confirmMutation = useMutation(
    orpc.commerce.orders.item.confirmDelivery.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể xác nhận bàn giao."));
      },
      onSuccess: async () => {
        await invalidateItem();
        toast.success("Đã xác nhận bàn giao. Warranty đã bắt đầu.");
      },
    })
  );
  const cancelMutation = useMutation(
    orpc.commerce.orders.item.cancelByBuyer.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể hủy OrderItem."));
      },
      onSuccess: async () => {
        setCancelOpen(false);
        await invalidateItem();
        toast.success("Đã hủy OrderItem và hoàn tiền.");
      },
    })
  );
  const disputeMutation = useMutation(
    orpc.commerce.orders.item.openDispute.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể mở Dispute."));
      },
      onSuccess: async () => {
        setDisputeOpen(false);
        await invalidateItem();
        toast.success("Đã mở Dispute cho OrderItem.");
      },
    })
  );
  const disputeForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      try {
        await disputeMutation.mutateAsync({
          commandKey: crypto.randomUUID(),
          itemId: item.id,
          reason: value.reason,
        });
        disputeForm.reset();
      } catch {
        // The mutation error handler already shows the failure to the Buyer.
      }
    },
    validators: { onSubmit: buyerDisputeSchema },
  });

  const current = timelineQuery.data?.current;
  const status = current?.status ?? item.status;
  const processingDeadlineAt =
    current?.processingDeadlineAt ?? item.processingDeadlineAt;
  const deliveryReviewDeadlineAt =
    current?.deliveryReviewDeadlineAt ?? item.deliveryReviewDeadlineAt;
  const warrantyExpiresAt =
    current?.warrantyExpiresAt ?? item.warrantyExpiresAt;
  const canConfirm = canBuyerConfirmDelivery(status, deliveryReviewDeadlineAt);
  const canCancel = canBuyerCancel(status);
  const canDispute = canBuyerOpenDispute({
    deliveryReviewDeadlineAt,
    processingDeadlineAt,
    status,
    warrantyExpiresAt,
  });
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
            <span>Vui lòng thử lại để xem bằng chứng bàn giao.</span>
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
      return <OrderItemTimeline timeline={timelineQuery.data} />;
    }

    return null;
  })();

  const handleConfirm = async (): Promise<void> => {
    try {
      await confirmMutation.mutateAsync({
        commandKey: crypto.randomUUID(),
        itemId: item.id,
      });
    } catch {
      // The mutation error handler already shows the failure to the Buyer.
    }
  };

  const handleCancel = async (): Promise<void> => {
    try {
      await cancelMutation.mutateAsync({
        commandKey: crypto.randomUUID(),
        itemId: item.id,
      });
    } catch {
      // The mutation error handler already shows the failure to the Buyer.
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">
              {item.listing.title}
            </CardTitle>
            <CardDescription className="mt-1">
              OrderItem {item.id.slice(0, 8)} · {formatVND(item.priceAmount)}
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
              {formatOrderDeadline(processingDeadlineAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Review bàn giao</p>
            <p className="mt-1 font-medium">
              {formatOrderDeadline(deliveryReviewDeadlineAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Warranty</p>
            <p className="mt-1 font-medium">
              {item.warrantyPolicy.durationHours} giờ · Escrow{" "}
              {formatVND(item.escrowHold.amount)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canConfirm ? (
            <Button
              disabled={confirmMutation.isPending}
              onClick={() => void handleConfirm()}
            >
              <CheckCircle aria-hidden="true" />
              {confirmMutation.isPending
                ? "Đang xác nhận…"
                : "Xác nhận đã nhận"}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              disabled={cancelMutation.isPending}
              onClick={() => setCancelOpen(true)}
              variant="outline"
            >
              <XCircle aria-hidden="true" />
              Hủy trước khi Seller bắt đầu
            </Button>
          ) : null}
          {canDispute ? (
            <Button
              onClick={() => setDisputeOpen((open) => !open)}
              variant="outline"
            >
              <WarningCircle aria-hidden="true" />
              {disputeOpen ? "Đóng Dispute" : "Mở Dispute"}
            </Button>
          ) : null}
        </div>

        {disputeOpen ? (
          <form
            className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4"
            id={`dispute-form-${item.id}`}
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await disputeForm.handleSubmit();
            }}
          >
            <FieldGroup className="gap-4">
              <disputeForm.Field name="reason">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={`dispute-reason-${item.id}`}>
                        Lý do Dispute
                      </FieldLabel>
                      <Textarea
                        aria-describedby={`dispute-help-${item.id}`}
                        aria-invalid={isInvalid}
                        id={`dispute-reason-${item.id}`}
                        maxLength={5000}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Mô tả vấn đề với OrderItem..."
                        value={field.state.value}
                      />
                      <FieldDescription id={`dispute-help-${item.id}`}>
                        Dispute sẽ dừng các bước tự động và chuyển item cho
                        Admin xử lý.
                      </FieldDescription>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </disputeForm.Field>
            </FieldGroup>
            <div className="mt-4 flex justify-end">
              <disputeForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    disabled={
                      !canSubmit || isSubmitting || disputeMutation.isPending
                    }
                    type="submit"
                    variant="destructive"
                  >
                    {isSubmitting || disputeMutation.isPending
                      ? "Đang mở…"
                      : "Xác nhận mở Dispute"}
                  </Button>
                )}
              </disputeForm.Subscribe>
            </div>
          </form>
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
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy OrderItem?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn chỉ có thể hủy khi Seller chưa bắt đầu. Escrow của item này sẽ
              được hoàn lại; các item khác không bị ảnh hưởng.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Quay lại
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelMutation.isPending}
              onClick={() => void handleCancel()}
              variant="destructive"
            >
              {cancelMutation.isPending ? "Đang hủy…" : "Xác nhận hủy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
