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
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";

import { useUpdateSubCategory } from "../api/categories-api";
import { editSubCategoryFormSchema } from "../schemas/category-form-schema";
import type { SubCategory } from "../types";

interface Props {
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly subCategory: SubCategory | null;
}

interface FormProps {
  readonly onClose: () => void;
  readonly subCategory: SubCategory;
}

const EditSubCategoryForm = ({ onClose, subCategory }: FormProps) => {
  const updateMutation = useUpdateSubCategory();

  const form = useForm({
    defaultValues: {
      commissionRate: subCategory.commissionRatePercent.toString(),
      maxWarranty: subCategory.warrantyBounds?.maxHours.toString() ?? "720",
      minWarranty: subCategory.warrantyBounds?.minHours.toString() ?? "24",
      name: subCategory.name,
      warrantyHours:
        subCategory.defaultWarrantyPolicy?.durationHours.toString() ?? "72",
      warrantyTerms: subCategory.defaultWarrantyPolicy?.terms ?? "",
    },
    onSubmit: async ({ value }) => {
      try {
        await updateMutation.mutateAsync({
          commissionRatePercent: Number(value.commissionRate),
          defaultWarrantyDurationHours: Number(value.warrantyHours),
          defaultWarrantyTerms: value.warrantyTerms.trim(),
          id: subCategory.id,
          maxWarrantyHours: Number(value.maxWarranty),
          minWarrantyHours: Number(value.minWarranty),
          name: value.name.trim(),
        });
        toast.success("Cập nhật Sub-Category thành công");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      }
    },
    validators: {
      onSubmit: editSubCategoryFormSchema,
    },
  });

  return (
    <form
      id="edit-sub-category-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <FieldGroup className="py-4">
        <form.Field name="name">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Tên</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="commissionRate">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="commissionRate">
                  Chiết khấu sàn (%)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id="commissionRate"
                  max="100"
                  min="0"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  step="0.5"
                  type="number"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="warrantyHours">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="defaultWarranty">
                  Bảo hành mặc định (Giờ)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id="defaultWarranty"
                  min="0"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  type="number"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="minWarranty">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="minWarranty">
                  Hạn bảo hành tối thiểu (Giờ)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id="minWarranty"
                  min="0"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  type="number"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="maxWarranty">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="maxWarranty">
                  Hạn bảo hành tối đa (Giờ)
                </FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  id="maxWarranty"
                  min="0"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  type="number"
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
        <form.Field name="warrantyTerms">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor="warrantyTerms">
                  Điều khoản bảo hành mẫu
                </FieldLabel>
                <Textarea
                  aria-invalid={isInvalid}
                  id="warrantyTerms"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                  value={field.state.value}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>
      <DialogFooter>
        <Button onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              disabled={!canSubmit || isSubmitting || updateMutation.isPending}
              type="submit"
            >
              {isSubmitting || updateMutation.isPending
                ? "Đang xử lý..."
                : "Lưu"}
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  );
};

export const EditSubCategoryDialog = ({
  onOpenChange,
  open,
  subCategory,
}: Props) => {
  if (!subCategory) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sửa Sub-Category</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin Sub-Category.
          </DialogDescription>
        </DialogHeader>
        <EditSubCategoryForm
          key={subCategory.id}
          onClose={() => onOpenChange(false)}
          subCategory={subCategory}
        />
      </DialogContent>
    </Dialog>
  );
};
