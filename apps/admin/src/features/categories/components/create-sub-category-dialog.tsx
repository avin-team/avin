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

import { useCreateSubCategory } from "../api/categories-api";
import { createSubCategoryFormSchema } from "../schemas/category-form-schema";
import type { ParentCategory } from "../types";

interface Props {
  readonly open: boolean;
  readonly parentCategory: ParentCategory | null;
  readonly onOpenChange: (open: boolean) => void;
}

export const CreateSubCategoryDialog = ({
  open,
  parentCategory,
  onOpenChange,
}: Props) => {
  const createSubMutation = useCreateSubCategory();

  const form = useForm({
    defaultValues: {
      commissionRate: "5",
      maxWarranty: "720",
      minWarranty: "24",
      name: "",
      slug: "",
      warrantyHours: "72",
      warrantyTerms: "Bảo hành mặc định 1 đổi 1",
    },
    onSubmit: async ({ value }) => {
      if (!parentCategory) {
        return;
      }

      try {
        await createSubMutation.mutateAsync({
          commissionRatePercent: Number(value.commissionRate),
          defaultWarrantyDurationHours: Number(value.warrantyHours),
          defaultWarrantyTerms: value.warrantyTerms.trim(),
          maxWarrantyHours: Number(value.maxWarranty),
          minWarrantyHours: Number(value.minWarranty),
          name: value.name.trim(),
          parentId: parentCategory.id,
          slug: value.slug.trim() || undefined,
        });
        toast.success("Tạo Sub-Category thành công", {
          description: `Đã thêm ${value.name.trim()} vào ${parentCategory.name}`,
        });
        form.reset();
        onOpenChange(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi tạo Sub-Category"
        );
      }
    },
    validators: {
      onSubmit: createSubCategoryFormSchema,
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  if (!parentCategory) {
    return null;
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-lg">
        <form
          id="create-sub-category-form"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Thêm Sub-Category mới</DialogTitle>
            <DialogDescription>
              Thêm danh mục con vào <strong>{parentCategory.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <form.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="subcat-name">
                      Tên Sub-Category
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id="subcat-name"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        field.handleChange(nextName);
                        if (!form.getFieldValue("slug")) {
                          form.setFieldValue(
                            "slug",
                            nextName
                              .toLowerCase()
                              .replaceAll(/[^a-z0-9]+/gu, "-")
                          );
                        }
                      }}
                      placeholder="VD: Tài Khoản OpenAI ChatGPT"
                      required
                      value={field.state.value}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <form.Field name="slug">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="subcat-slug">URL Slug</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id="subcat-slug"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="chatgpt-accounts"
                      required
                      value={field.state.value}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <FieldGroup className="grid grid-cols-2 gap-4">
              <form.Field name="commissionRate">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="commission">
                        Chiết khấu sàn (%)
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id="commission"
                        max="100"
                        min="0"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        step="0.5"
                        type="number"
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
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
                      <FieldLabel htmlFor="default-warranty">
                        Bảo hành mặc định (Giờ)
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id="default-warranty"
                        min="0"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        type="number"
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
            <FieldGroup className="grid grid-cols-2 gap-4">
              <form.Field name="minWarranty">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="min-warranty">
                        Hạn bảo hành tối thiểu (Giờ)
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id="min-warranty"
                        min="0"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        type="number"
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
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
                      <FieldLabel htmlFor="max-warranty">
                        Hạn bảo hành tối đa (Giờ)
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        id="max-warranty"
                        min="0"
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        type="number"
                        value={field.state.value}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
            <form.Field name="warrantyTerms">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="terms">
                      Điều khoản bảo hành mẫu
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      id="terms"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      required
                      rows={2}
                      value={field.state.value}
                    />
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
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
                  disabled={
                    !canSubmit || isSubmitting || createSubMutation.isPending
                  }
                  type="submit"
                >
                  {isSubmitting || createSubMutation.isPending
                    ? "Đang xử lý..."
                    : "Thêm Sub-Category"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
