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

import { useUpdateParentCategory } from "../api/categories-api";
import { editParentCategoryFormSchema } from "../schemas/category-form-schema";
import type { ParentCategory } from "../types";

interface Props {
  readonly category: ParentCategory | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

interface FormProps {
  readonly category: ParentCategory;
  readonly onClose: () => void;
}

const EditParentCategoryForm = ({ category, onClose }: FormProps) => {
  const updateMutation = useUpdateParentCategory();

  const form = useForm({
    defaultValues: {
      description: category.description ?? "",
      name: category.name,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateMutation.mutateAsync({
          description: value.description.trim() || undefined,
          id: category.id,
          name: value.name.trim(),
        });
        toast.success("Cập nhật danh mục cha thành công");
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      }
    },
    validators: {
      onSubmit: editParentCategoryFormSchema,
    },
  });

  return (
    <form
      id="edit-parent-category-form"
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
        <form.Field name="description">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Mô tả</FieldLabel>
                <Textarea
                  aria-invalid={isInvalid}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
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

export const EditParentCategoryDialog = ({
  category,
  onOpenChange,
  open,
}: Props) => {
  if (!category) {
    return null;
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa danh mục cha</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin danh mục cha.
          </DialogDescription>
        </DialogHeader>
        <EditParentCategoryForm
          category={category}
          key={category.id}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
