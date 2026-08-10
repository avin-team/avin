import { Button } from "@avin/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@avin/ui/components/dialog";
import { Field, FieldLabel } from "@avin/ui/components/field";
import { Textarea } from "@avin/ui/components/textarea";
import { StarIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  StarRating,
  StarRatingInput,
} from "@/features/catalog/components/star-rating";
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
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

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
        setOpen(false);
        setComment("");
        toast.success("Đã gửi đánh giá thành công! Cảm ơn ý kiến của bạn.");
        await queryClient.invalidateQueries({
          queryKey: orpc.commerce.review.getForOrderItem.queryOptions({
            input: { orderItemId },
          }).queryKey,
        });
      },
    })
  );

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

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đánh giá sản phẩm & dịch vụ</DialogTitle>
            <DialogDescription>
              Chia sẻ trải nghiệm của bạn để giúp cộng đồng người mua khác.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <Field>
              <FieldLabel>Mức độ hài lòng</FieldLabel>
              <div className="mt-1 flex justify-center">
                <StarRatingInput onChange={setRating} value={rating} />
              </div>
            </Field>

            <Field>
              <FieldLabel>Nhận xét (không bắt buộc)</FieldLabel>
              <Textarea
                maxLength={2000}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Dịch vụ chu đáo, giao hàng nhanh, chất lượng tuyệt vời..."
                rows={4}
                value={comment}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              disabled={createMutation.isPending}
              onClick={() => setOpen(false)}
              variant="outline"
            >
              Hủy
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => {
                createMutation.mutate({
                  comment,
                  orderItemId,
                  rating,
                });
              }}
            >
              {createMutation.isPending ? "Đang gửi…" : "Gửi đánh giá"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
