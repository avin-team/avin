import type { DisputeEvidenceInput } from "@avin/api/commerce/dispute-contracts";
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
  ArrowClockwiseIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DisputeEvidenceUploader } from "@/features/commerce/components/dispute-evidence-uploader";
import { OrderItemReviewSection } from "@/features/commerce/components/order-item-review-section";
import { OrderItemTimeline } from "@/features/commerce/components/order-item-timeline";
import {
  ORDER_TIMELINE_REFRESH_INTERVAL_MS,
  canBuyerCancel,
  canBuyerConfirmDelivery,
  canBuyerOpenDispute,
  formatOrderDeadline,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
  getOrderItemStatusColorClassName,
  getWarrantyPolicyLabel,
  isNoWarrantyPolicy,
} from "@/features/commerce/order-status";
import {
  buyerDisputeCancellationSchema,
  buyerDisputeSchema,
} from "@/features/commerce/schemas/order-action-schemas";
import { walletSummaryQueryOptions } from "@/features/wallet/api/wallet-api";
import { formatVND } from "@/utils/format";
import { getErrorMessage } from "@/utils/get-error-message";
import { orpc } from "@/utils/orpc";

const getConfirmationMessage = (
  warrantyPolicy: BuyerOrderView["items"][number]["warrantyPolicy"]
): string =>
  isNoWarrantyPolicy(warrantyPolicy)
    ? "Đã xác nhận bàn giao. Tiền tạm giữ đã được giải ngân."
    : "Đã xác nhận bàn giao. Warranty đã bắt đầu.";

export const BuyerOrderItemCard = ({
  item,
}: {
  item: BuyerOrderView["items"][number];
}) => {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [disputeCancelOpen, setDisputeCancelOpen] = useState(false);
  const [disputeEvidence, setDisputeEvidence] = useState<
    DisputeEvidenceInput[]
  >([]);
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
      queryClient.invalidateQueries({
        queryKey: walletSummaryQueryOptions().queryKey,
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
        toast.success(getConfirmationMessage(item.warrantyPolicy));
      },
    })
  );
  const cancelMutation = useMutation(
    orpc.commerce.orders.item.cancelByBuyer.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể huỷ sản phẩm này."));
      },
      onSuccess: async () => {
        setCancelOpen(false);
        await invalidateItem();
        toast.success("Đã huỷ sản phẩm và hoàn tiền.");
      },
    })
  );
  const disputeMutation = useMutation(
    orpc.commerce.orders.item.openDispute.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể tạo khiếu nại."));
      },
      onSuccess: async () => {
        setDisputeOpen(false);
        setDisputeEvidence([]);
        await invalidateItem();
        toast.success("Đã gửi yêu cầu khiếu nại cho sản phẩm này.");
      },
    })
  );
  const cancelDisputeMutation = useMutation(
    orpc.commerce.disputes.cancel.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể huỷ yêu cầu khiếu nại."));
      },
      onSuccess: async () => {
        setDisputeCancelOpen(false);
        await invalidateItem();
        toast.success(
          "Đã huỷ khiếu nại. Hệ thống vẫn tạm giữ tiền để bảo đảm giao dịch."
        );
      },
    })
  );
  const disputeForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      try {
        if (disputeEvidence.length === 0) {
          toast.error(
            "Hãy tải ít nhất một tệp bằng chứng trước khi tạo khiếu nại."
          );
          return;
        }
        await disputeMutation.mutateAsync({
          commandKey: crypto.randomUUID(),
          evidence: disputeEvidence,
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
  const cancelDisputeForm = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      const disputeId = timelineQuery.data?.dispute?.id;
      if (!disputeId) {
        toast.error("Không tìm thấy khiếu nại nào đang mở.");
        return;
      }
      try {
        await cancelDisputeMutation.mutateAsync({
          commandKey: crypto.randomUUID(),
          disputeId,
          reason: value.reason.trim(),
        });
        cancelDisputeForm.reset();
      } catch {
        // The mutation error handler already shows the failure to the Buyer.
      }
    },
    validators: { onSubmit: buyerDisputeCancellationSchema },
  });

  const resolveOrderState = () => {
    const current = timelineQuery.data?.current;
    const status = current?.status ?? item.status;
    const processingDeadlineAt =
      current?.processingDeadlineAt ?? item.processingDeadlineAt;
    const deliveryReviewDeadlineAt =
      current?.deliveryReviewDeadlineAt ?? item.deliveryReviewDeadlineAt;
    const warrantyExpiresAt =
      current?.warrantyExpiresAt ?? item.warrantyExpiresAt;
    return {
      canCancel: canBuyerCancel(status),
      canCancelDispute:
        status === "DISPUTED" && timelineQuery.data?.dispute?.status === "OPEN",
      canConfirm: canBuyerConfirmDelivery(status, deliveryReviewDeadlineAt),
      canDispute:
        canBuyerOpenDispute({
          deliveryReviewDeadlineAt,
          processingDeadlineAt,
          status,
          warrantyExpiresAt,
        }) && !timelineQuery.data?.dispute,
      deliveryReviewDeadlineAt,
      processingDeadlineAt,
      status,
    };
  };
  const {
    canCancel,
    canCancelDispute,
    canConfirm,
    canDispute,
    deliveryReviewDeadlineAt,
    processingDeadlineAt,
    status,
  } = resolveOrderState();
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
          <WarningCircleIcon aria-hidden="true" />
          <AlertTitle>Không thể tải timeline</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>Vui lòng thử lại để xem bằng chứng bàn giao.</span>
            <Button
              onClick={() => void timelineQuery.refetch()}
              size="sm"
              variant="outline"
            >
              <ArrowClockwiseIcon aria-hidden="true" />
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
              Mã chi tiết {item.id.slice(0, 8)} · {formatVND(item.priceAmount)}
            </CardDescription>
          </div>
          <Badge
            className={getOrderItemStatusColorClassName(status)}
            variant={getOrderItemStatusVariant(status)}
          >
            {getOrderItemStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Hạn xử lý đơn</p>
            <p className="mt-1 font-medium">
              {formatOrderDeadline(processingDeadlineAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hạn nghiệm thu</p>
            <p className="mt-1 font-medium">
              {formatOrderDeadline(deliveryReviewDeadlineAt, "Chờ bàn giao")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bảo hành</p>
            <p className="mt-1 font-medium">
              {getWarrantyPolicyLabel(item.warrantyPolicy)} · Tiền bảo đảm{" "}
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
              <CheckCircleIcon aria-hidden="true" />
              {confirmMutation.isPending
                ? "Đang xác nhận…"
                : "Xác nhận đã nhận hàng"}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              disabled={cancelMutation.isPending}
              onClick={() => setCancelOpen(true)}
              variant="outline"
            >
              <XCircleIcon aria-hidden="true" />
              Hủy đơn (Chưa xử lý)
            </Button>
          ) : null}
          {canDispute ? (
            <Button
              onClick={() => setDisputeOpen((open) => !open)}
              variant="outline"
            >
              <WarningCircleIcon aria-hidden="true" />
              {disputeOpen ? "Thu gọn khiếu nại" : "Mở khiếu nại"}
            </Button>
          ) : null}
          {canCancelDispute ? (
            <Button
              disabled={cancelDisputeMutation.isPending}
              onClick={() => setDisputeCancelOpen(true)}
              variant="ghost"
            >
              Hủy khiếu nại
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
                        Lý do khiếu nại
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
                        placeholder="Mô tả chi tiết vấn đề bạn gặp phải với đơn hàng..."
                        value={field.state.value}
                      />
                      <FieldDescription id={`dispute-help-${item.id}`}>
                        Khiếu nại sẽ tạm dừng các tiến trình tự động và gửi tới
                        Admin hỗ trợ xử lý.
                      </FieldDescription>
                      {isInvalid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  );
                }}
              </disputeForm.Field>
              <DisputeEvidenceUploader
                itemId={item.id}
                onEvidenceChange={setDisputeEvidence}
              />
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
                      ? "Đang gửi…"
                      : "Xác nhận gửi khiếu nại"}
                  </Button>
                )}
              </disputeForm.Subscribe>
            </div>
          </form>
        ) : null}

        {(status === "IN_WARRANTY" || status === "CLOSED") && (
          <OrderItemReviewSection
            closedAt={
              timelineQuery.data?.events.find(
                (e) => e.newStatus === "IN_WARRANTY" || e.newStatus === "CLOSED"
              )?.effectiveAt
            }
            orderItemId={item.id}
          />
        )}

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
            <AlertDialogTitle>Hủy đơn hàng?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn chỉ có thể hủy khi người bán chưa bắt đầu xử lý. Tiền tạm giữ
              sẽ được hoàn lại ví của bạn; các mục khác không bị ảnh hưởng.
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

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !cancelDisputeMutation.isPending) {
            setDisputeCancelOpen(false);
          }
        }}
        open={disputeCancelOpen}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy khiếu nại?</AlertDialogTitle>
            <AlertDialogDescription>
              Khoản tiền bảo đảm vẫn được giữ an toàn và đơn hàng quay lại trạng
              thái trước khi mở khiếu nại. Bạn không thể mở lại khiếu nại này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            id={`cancel-dispute-form-${item.id}`}
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await cancelDisputeForm.handleSubmit();
            }}
          >
            <cancelDisputeForm.Field name="reason">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      Lý do hủy khiếu nại
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={cancelDisputeMutation.isPending}
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Nhập lý do hủy khiếu nại…"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </cancelDisputeForm.Field>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={cancelDisputeMutation.isPending}>
                Quay lại
              </AlertDialogCancel>
              <cancelDisputeForm.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <AlertDialogAction
                    disabled={
                      !canSubmit ||
                      isSubmitting ||
                      cancelDisputeMutation.isPending
                    }
                    form={`cancel-dispute-form-${item.id}`}
                    type="submit"
                    variant="destructive"
                  >
                    {isSubmitting || cancelDisputeMutation.isPending
                      ? "Đang hủy…"
                      : "Xác nhận hủy"}
                  </AlertDialogAction>
                )}
              </cancelDisputeForm.Subscribe>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
