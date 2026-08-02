import * as z from "zod";

export const sellerProductCreationSchema = z.object({
  categoryId: z.string().min(1, "Vui lòng chọn danh mục sản phẩm."),
  parentCategoryId: z.string().min(1, "Vui lòng chọn nhóm danh mục."),
  title: z.string().max(200, "Tên sản phẩm không được quá 200 ký tự."),
  type: z.enum(["COURSE", "SERVICE"]),
});
