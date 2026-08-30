import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Textarea } from "@avin/ui/components/textarea";
import { StarIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  StarRating,
  StarRatingInput,
} from "@/features/catalog/components/star-rating";
import { orderItemReviewFormSchema } from "@/features/commerce/schemas/order-item-review-schema";
import { getErrorMessage } from "@/utils/get-error-message";
import { orpc } from "@/utils/orpc";

export interface OrderItemReviewSectionProps {
  closedAt?: Date | string | null;
  orderItemId: string;
}

export const OrderItemReviewSection = ({
  closedAt,
  orderItemId,
}: OrderItemReviewSectionProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const reviewFormId = `order-item-review-form-${orderItemId}`;

  const reviewQuery = useQuery(
    orpc.commerce.review.getForOrderItem.queryOptions({
      input: { orderItemId },
    })
  );

  const createMutation = useMutation(
    orpc.commerce.review.create.mutationOptions({
      onError: (error) => {
        toast.error(getErrorMessage(error, "Không thể gửi đánh giá."));
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.commerce.review.getForOrderItem.queryOptions({
            input: { orderItemId },
          }).queryKey,
        });
      },
    })
  );

  const reviewForm = useForm({
    defaultValues: {
      comment: "",
      rating: 5,
    },
    onSubmit: async ({ value }) => {
      try {
        await createMutation.mutateAsync({
          comment: value.comment.trim(),
          orderItemId,
          rating: value.rating,
        });
        reviewForm.reset();
        setOpen(false);
        toast.success("Đã gửi đánh giá thành công! Cảm ơn ý kiến của bạn.");
      } catch {
        // The mutation's onError callback provides the user-facing message.
      }
    },
    validators: { onSubmit: orderItemReviewFormSchema },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reviewForm.reset();
    }
  };

  const [now, setNow] = useState(() => Date.now());
  void setNow;
  const isExpired = useMemo(() => {
    if (!closedAt) {
      return false;
    }
    const closedTime = new Date(closedAt).getTime();
    return closedTime > 0 && now - closedTime > 30 * 24 * 60 * 60 * 1000;
  }, [closedAt, now]);

  if (reviewQuery.isPending) {
    return null;
  }

  const existingReview = reviewQuery.data;

  if (existingReview) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              Đánh giá của bạn
            </span>
            {existingReview.servicePackageName ? (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-md text-muted-foreground font-medium">
                Gói: {existingReview.servicePackageName}
              </span>
            ) : null}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(existingReview.createdAt).toLocaleDateString("vi-VN")}
          </span>
        </div>
        <StarRating rating={existingReview.rating} size="sm" />
        {existingReview.comment ? (
          <p className="mt-2 text-foreground/90 whitespace-pre-line leading-relaxed">
            &ldquo;{existingReview.comment}&rdquo;
          </p>
        ) : null}
      </div>
    );
  }

  if (isExpired) {
    return (
      <p className="text-xs text-muted-foreground">
        Hạn gửi đánh giá cho sản phẩm này (30 ngày kể từ khi hoàn tất) đã hết.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
        <div className="flex items-center gap-2">
          <StarIcon className="h-5 w-5 text-amber-500 fill-amber-500" />
          <span className="text-sm font-medium">
            Đánh giá trải nghiệm dịch vụ
          </span>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" variant="default">
          Viết đánh giá
        </Button>
      </div>

      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đánh giá sản phẩm & dịch vụ</DialogTitle>
            <DialogDescription>
              Chia sẻ trải nghiệm của bạn để giúp cộng đồng người mua khác.
            </DialogDescription>
          </DialogHeader>

          <form
            id={reviewFormId}
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await reviewForm.handleSubmit();
            }}
          >
            <FieldGroup className="py-2">
              <reviewForm.Field name="rating">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel>Mức độ hài lòng</FieldLabel>
                      <div className="mt-1 flex justify-center">
                        <StarRatingInput
                          disabled={createMutation.isPending}
                          onChange={field.handleChange}
                          value={field.state.value}
                        />
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </reviewForm.Field>

              <reviewForm.Field name="comment">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Nhận xét (không bắt buộc)
                      </FieldLabel>
                      <Textarea
                        aria-invalid={isInvalid}
                        id={field.name}
                        maxLength={2000}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        placeholder="Dịch vụ chu đáo, giao hàng nhanh, chất lượng tuyệt vời..."
                        rows={4}
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </reviewForm.Field>
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button
              disabled={createMutation.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Hủy
            </Button>
            <reviewForm.Subscribe
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
                  form={reviewFormId}
                  type="submit"
                >
                  {isSubmitting || createMutation.isPending
                    ? "Đang gửi…"
                    : "Gửi đánh giá"}
                </Button>
              )}
            </reviewForm.Subscribe>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
