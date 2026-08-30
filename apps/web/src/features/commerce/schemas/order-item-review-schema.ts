import { z } from "zod";

export const orderItemReviewFormSchema = z.object({
  comment: z.string().max(2000, "Nhận xét không được vượt quá 2.000 ký tự."),
  rating: z
    .number()
    .int()
    .min(1, "Vui lòng chọn số sao đánh giá.")
    .max(5, "Số sao đánh giá không hợp lệ."),
});

export type OrderItemReviewFormValues = z.infer<
  typeof orderItemReviewFormSchema
>;
