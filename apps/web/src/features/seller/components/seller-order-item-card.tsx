import type { DisputeEvidenceInput } from "@avin/api/commerce/dispute-contracts";
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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Skeleton } from "@avin/ui/components/skeleton";
import { Textarea } from "@avin/ui/components/textarea";
import {
  ArrowClockwiseIcon,
  CaretDownIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  PlayIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { DisputeEvidenceUploader } from "@/features/commerce/components/dispute-evidence-uploader";
import { OrderImageUploader } from "@/features/commerce/components/order-image-uploader";
import type { OrderImageAttachment } from "@/features/commerce/components/order-image-uploader";
import { OrderItemTimeline } from "@/features/commerce/components/order-item-timeline";
import {
  ORDER_TIMELINE_REFRESH_INTERVAL_MS,
  formatOrderDate,
  formatOrderDeadline,
  getOrderItemStatusLabel,
  getOrderItemStatusVariant,
  getOrderItemStatusColorClassName,
  getWarrantyPolicyLabel,
  isNoWarrantyPolicy,
} from "@/features/commerce/order-status";
import {
  sellerCancellationSchema,
  sellerDeliverySchema,
} from "@/features/commerce/schemas/order-action-schemas";
import { formatVND } from "@/utils/format";
import { getErrorMessage } from "@/utils/get-error-message";
import { orpc } from "@/utils/orpc";

import { useSellerEnforcement } from "../api/seller-enforcement-api";

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

const getEscrowReleaseMessage = (
  status: string,
  warrantyExpiresAt: string | null,
  warrantyPolicy: SellerOrderView["items"][number]["warrantyPolicy"],
  deliveryReviewDeadlineAt: string | null
): string => {
  if (status === "IN_WARRANTY" && warrantyExpiresAt) {
    return `Giải ngân vào: ${formatOrderDate(warrantyExpiresAt)}`;
  }
  if (
    status === "DELIVERED" &&
    isNoWarrantyPolicy(warrantyPolicy) &&
    deliveryReviewDeadlineAt
  ) {
    return `Giải ngân vào: ${formatOrderDate(deliveryReviewDeadlineAt)}`;
  }
  return "Sẽ giải ngân khi hoàn tất đơn hàng";
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
        toast.success("Đã bàn giao đơn hàng cho người mua.");
      },
    })
  );
  const createAttachmentMutation = useMutation(
    orpc.commerce.orders.item.createAttachment.mutationOptions()
  );
  const discardAttachmentMutation = useMutation(
    orpc.commerce.orders.item.discardAttachment.mutationOptions()
  );
  const [attachments, setAttachments] = useState<OrderImageAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [uploaderKey, setUploaderKey] = useState(0);
  const deliveryForm = useForm({
    defaultValues: { deliveryNote: "" },
    onSubmit: async ({ value }) => {
      if (attachmentBusy) {
        return;
      }
      try {
        await mutation.mutateAsync({
          attachmentIds: attachments.map((attachment) => attachment.id),
          commandKey: crypto.randomUUID(),
          deliveryNote: value.deliveryNote,
          itemId,
        });
        deliveryForm.reset();
        setAttachments([]);
        setUploaderKey((current) => current + 1);
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
        <ClipboardTextIcon aria-hidden="true" className="mt-0.5 text-primary" />
        <div>
          <h4 className="font-semibold">Bàn giao cho người mua</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Mô tả và hình ảnh bàn giao đều không bắt buộc.
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
                  maxLength={1000}
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
        <OrderImageUploader
          disabled={mutation.isPending}
          key={uploaderKey}
          metadata={{ itemId }}
          onAttachmentsChange={setAttachments}
          onBusyChange={setAttachmentBusy}
          onCreateAttachment={async (input) => {
            const attachment = await createAttachmentMutation.mutateAsync({
              ...input,
              itemId,
            });
            return {
              ...attachment,
              byteSize: attachment.byteSize ?? input.byteSize,
            };
          }}
          onDiscardAttachment={(attachmentId) =>
            discardAttachmentMutation.mutateAsync({ attachmentId })
          }
          route="delivery-attachment"
          uploadPath="/api/delivery-attachment-upload"
        />
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
              disabled={
                !canSubmit ||
                isSubmitting ||
                mutation.isPending ||
                attachmentBusy
              }
              form={`delivery-form-${itemId}`}
              type="submit"
            >
              <CheckCircleIcon aria-hidden="true" />
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

// oxlint-disable-next-line complexity
export const SellerOrderItemCard = ({
  item,
}: {
  item: SellerOrderView["items"][number];
}) => {
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [sellerEvidence, setSellerEvidence] = useState<DisputeEvidenceInput[]>(
    []
  );
  const [sellerEvidenceOpen, setSellerEvidenceOpen] = useState(false);
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
        toast.error(
          getErrorMessage(error, "Không thể bắt đầu xử lý đơn hàng.")
        );
      },
      onSuccess: async () => {
        await invalidateItem();
        toast.success("Đã bắt đầu thực hiện đơn hàng.");
      },
    })
  );
  const cancelMutation = useMutation(
    orpc.commerce.orders.item.cancelBySeller.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể hủy đơn hàng."));
      },
      onSuccess: async () => {
        setCancelOpen(false);
        await invalidateItem();
        toast.success("Đã hủy đơn hàng và hoàn tiền cho người mua.");
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
  const sellerEvidenceMutation = useMutation(
    orpc.commerce.disputes.submitSellerEvidence.mutationOptions({
      onError: (error) => {
        toast.error(
          getErrorMessage(error, "Không thể gửi bằng chứng khiếu nại.")
        );
      },
      onSuccess: async () => {
        setSellerEvidence([]);
        setSellerEvidenceOpen(false);
        await invalidateItem();
        toast.success("Đã gửi bằng chứng cho người mua và ban quản trị.");
      },
    })
  );

  const { data: enforcement } = useSellerEnforcement();
  const isBanned = enforcement?.state === "BANNED";

  const current = timelineQuery.data?.current;
  const status = current?.status ?? item.status;
  const warrantyExpiresAt =
    current?.warrantyExpiresAt ?? item.warrantyExpiresAt;
  const deliveryReviewDeadlineAt =
    current?.deliveryReviewDeadlineAt ?? item.deliveryReviewDeadlineAt;
  const canCancel =
    (status === "AWAITING_SELLER" || status === "IN_PROGRESS") && !isBanned;
  const currentDispute = timelineQuery.data?.dispute;
  const canSubmitSellerEvidence =
    status === "DISPUTED" && currentDispute?.status === "OPEN";
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
            <span>Vui lòng thử lại để xem bằng chứng và lịch sử.</span>
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
      return (
        <details className="group rounded-2xl border border-border/60 p-4">
          <summary className="flex cursor-pointer items-center justify-between list-none font-semibold outline-none focus-visible:ring-2 focus-visible:ring-primary marker:hidden">
            <span>Chi tiết yêu cầu, bàn giao & lịch sử</span>
            <CaretDownIcon className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4">
            <OrderItemTimeline
              timeline={timelineQuery.data}
              viewerRole="seller"
            />
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

  const handleSubmitSellerEvidence = async (): Promise<void> => {
    if (!currentDispute?.id) {
      toast.error("Không tìm thấy khiếu nại đang mở.");
      return;
    }
    if (sellerEvidence.length === 0) {
      toast.error("Hãy tải ít nhất một tệp bằng chứng.");
      return;
    }
    try {
      await sellerEvidenceMutation.mutateAsync({
        commandKey: crypto.randomUUID(),
        disputeId: currentDispute.id,
        evidence: sellerEvidence,
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
          <Badge
            className={getOrderItemStatusColorClassName(status)}
            variant={getOrderItemStatusVariant(status)}
          >
            {getOrderItemStatusLabel(status, "seller")}
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
            <p className="text-xs text-muted-foreground">Tiền tạm giữ</p>
            <p className="mt-1 font-medium">
              {formatVND(item.escrowHold.amount)} ·{" "}
              {getEscrowHoldStatusLabel(item.escrowHold.status)}
            </p>
            {item.escrowHold.status === "HELD" && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {getEscrowReleaseMessage(
                  status,
                  warrantyExpiresAt,
                  item.warrantyPolicy,
                  deliveryReviewDeadlineAt
                )}
              </p>
            )}
            {item.escrowHold.status === "RELEASED" && (
              <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-500">
                Tiền đã cộng vào số dư của bạn
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "AWAITING_SELLER" && !isBanned ? (
            <Button
              disabled={startMutation.isPending}
              onClick={() => void handleStart()}
              type="button"
            >
              <PlayIcon aria-hidden="true" />
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
              <XCircleIcon aria-hidden="true" />
              Hủy đơn hàng
            </Button>
          ) : null}
        </div>

        {status === "IN_PROGRESS" && !isBanned ? (
          <SellerDeliveryForm itemId={item.id} onCompleted={invalidateItem} />
        ) : null}

        {isBanned &&
        (status === "AWAITING_SELLER" || status === "IN_PROGRESS") ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            Tài khoản Seller đang trong chế độ Banned. Các thao tác bắt đầu, bàn
            giao hoặc hủy đơn đã bị vô hiệu hóa.
          </div>
        ) : null}

        {canSubmitSellerEvidence ? (
          <div className="rounded-2xl border border-amber-300/40 bg-amber-50/60 p-4 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold">Phản hồi khiếu nại</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cung cấp bằng chứng phản hồi trong vòng 48 giờ kể từ khi người
                  mua mở khiếu nại. Nếu gửi trễ trước khi ban quản trị đưa ra
                  quyết định, hệ thống sẽ đánh dấu &quot;nộp quá hạn&quot;.
                </p>
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Hạn phản hồi:{" "}
                  {formatOrderDate(currentDispute.responseDeadlineAt)}
                </p>
              </div>
              <Button
                onClick={() => setSellerEvidenceOpen((open) => !open)}
                type="button"
                variant="outline"
              >
                {sellerEvidenceOpen ? "Đóng biểu mẫu" : "Gửi bằng chứng"}
              </Button>
            </div>
            {sellerEvidenceOpen ? (
              <div className="mt-4 grid gap-3">
                <DisputeEvidenceUploader
                  existingEvidenceCount={currentDispute.evidence.length}
                  itemId={item.id}
                  onEvidenceChange={setSellerEvidence}
                />
                <div className="flex justify-end">
                  <Button
                    disabled={
                      sellerEvidence.length === 0 ||
                      sellerEvidenceMutation.isPending
                    }
                    onClick={() => void handleSubmitSellerEvidence()}
                    type="button"
                  >
                    {sellerEvidenceMutation.isPending
                      ? "Đang gửi…"
                      : "Gửi phản hồi khiếu nại"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
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
                <WarningCircleIcon aria-hidden="true" className="size-6" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-bold text-foreground">
                  Xác nhận hủy đơn hàng
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Số tiền tạm giữ của sản phẩm này sẽ được hoàn trả cho khách
                  hàng. Các sản phẩm khác trong đơn (nếu có) không bị ảnh hưởng.
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
                      className="mt-1.5 min-h-25 text-sm"
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
