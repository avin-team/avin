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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { FieldError } from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import { Progress } from "@avin/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { SidebarTrigger } from "@avin/ui/components/sidebar";
import { Skeleton } from "@avin/ui/components/skeleton";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm, useStore } from "@tanstack/react-form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  Eye,
  FileCheck2,
  ListChecks,
  PackageCheck,
  PencilLine,
  Plus,
  Rocket,
  Save,
  Trash2,
  Wrench,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { ListingImageUploader } from "@/features/seller/components/listing-image-uploader";
import { SellerLayout } from "@/features/seller/layout/seller-layout";
import { listingEditorFormSchema } from "@/features/seller/schemas/listing-editor-schema";
import { orpc } from "@/utils/orpc";

import type { StoreSection } from "../data/store-types";
import {
  areListingServiceInputsValid,
  getFirstIncompleteEditorStepIndex,
  isListingEditorStepLocked,
  LISTING_EDITOR_STEP_ORDER,
} from "./listing-editor-logic";
import type {
  ListingEditorServiceInput,
  ListingEditorStepId,
} from "./listing-editor-logic";

type ListingStatus = "DRAFT" | "HIDDEN" | "PAUSED" | "PUBLISHED" | "ARCHIVED";

interface ServiceInputField extends ListingEditorServiceInput {
  required: boolean;
}

interface ListingEditorForm {
  categoryId: string;
  description: string;
  images: string[];
  priceAmount: string;
  processingTimeHours: string;
  serviceInputFields: ServiceInputField[];
  thumbnailUrl: string;
  title: string;
  type: "" | "COURSE" | "SERVICE";
  warrantyDurationHours: string;
  warrantyTerms: string;
}

const useListingEditorForm = (
  defaultValues: ListingEditorForm,
  onSubmit: (value: ListingEditorForm) => Promise<void>
) =>
  useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
    validators: {
      onChange: listingEditorFormSchema,
      onSubmit: listingEditorFormSchema,
    },
  });

type ListingEditorFormApi = ReturnType<typeof useListingEditorForm>;

interface EditorCategory {
  defaultServiceInputs: ServiceInputField[];
  id: string;
  name: string;
  parentId: string;
  parentName: string;
  warrantyBounds: { maxHours: number; minHours: number };
}

interface ReadinessItem {
  complete: boolean;
  id: string;
  label: string;
  step: ListingEditorStepId;
}

type SaveStatus = "error" | "saved" | "saving" | "unsaved";

const MAX_LONG_TEXT_LENGTH = 10_000;
const MAX_TITLE_LENGTH = 200;

const EDITOR_STEP_COPY: Record<
  ListingEditorStepId,
  { description: string; label: string }
> = {
  basics: {
    description: "Tên, loại và danh mục",
    label: "Thông tin cơ bản",
  },
  inputs: {
    description: "Những gì khách hàng cần cung cấp",
    label: "Thông tin từ khách",
  },
  media: {
    description: "Ảnh đại diện và thư viện ảnh",
    label: "Hình ảnh",
  },
  offer: {
    description: "Giá bán và thời gian hoàn thành",
    label: "Giá & thực hiện",
  },
  warranty: { description: "Thời hạn và điều khoản", label: "Bảo hành" },
};

const EDITOR_STEPS = LISTING_EDITOR_STEP_ORDER.map((id) => ({
  ...EDITOR_STEP_COPY[id],
  id,
}));

const INPUT_TYPE_ITEMS = [
  { label: "Văn bản ngắn", value: "text" },
  { label: "URL", value: "url" },
  { label: "Tệp", value: "file" },
  { label: "Số", value: "number" },
];

const LISTING_TYPE_ITEMS = [
  { label: "Dịch vụ", value: "SERVICE" },
  { label: "Khóa học", value: "COURSE" },
];

const STATUS_LABELS: Record<ListingStatus, string> = {
  ARCHIVED: "Đã lưu trữ",
  DRAFT: "Bản nháp",
  HIDDEN: "Đang ẩn",
  PAUSED: "Tạm dừng",
  PUBLISHED: "Đang bán",
};

const getSaveIndicatorClass = (status: SaveStatus): string => {
  if (status === "error") {
    return "bg-destructive";
  }
  if (status === "saving" || status === "unsaved") {
    return "bg-amber-400";
  }
  return "bg-emerald-400";
};

const getSaveStatusLabel = (status: SaveStatus): string => {
  if (status === "saving") {
    return "Đang lưu…";
  }
  if (status === "unsaved") {
    return "Chưa lưu";
  }
  if (status === "error") {
    return "Lưu thất bại";
  }
  return "Đã lưu";
};

const getNewSaveStatusLabel = (
  status: SaveStatus,
  isNew: boolean,
  draftId: string | null
): string => {
  if (!isNew || draftId) {
    return getSaveStatusLabel(status);
  }
  if (status === "saving") {
    return "Đang tạo bản nháp…";
  }
  if (status === "error") {
    return "Chưa thể tạo bản nháp";
  }
  return "Chọn loại và danh mục để bắt đầu";
};

const getEditorTypeLabel = (type: ListingEditorForm["type"]): string => {
  if (type === "SERVICE") {
    return "Dịch vụ";
  }
  if (type === "COURSE") {
    return "Khóa học";
  }
  return "Sản phẩm";
};

const isListingType = (
  type: ListingEditorForm["type"]
): type is "COURSE" | "SERVICE" => type === "COURSE" || type === "SERVICE";

const parseInteger = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const buildUpdateInput = (form: ListingEditorForm) => ({
  categoryId: form.categoryId || undefined,
  description: form.description.trim() || null,
  images: form.images,
  priceAmount: parseInteger(form.priceAmount),
  processingTimeHours: parseInteger(form.processingTimeHours),
  serviceInputFields: form.serviceInputFields,
  thumbnailUrl: form.thumbnailUrl.trim() || null,
  title: form.title.trim() || null,
  type: form.type || undefined,
  warrantyDurationHours: parseInteger(form.warrantyDurationHours),
  warrantyTerms: form.warrantyTerms.trim() || null,
});

const buildCreateDraftInput = (
  form: ListingEditorForm,
  type: "COURSE" | "SERVICE",
  category: EditorCategory | undefined
) => ({
  ...buildUpdateInput(form),
  categoryId: form.categoryId,
  serviceInputFields:
    form.serviceInputFields.length > 0
      ? form.serviceInputFields
      : (category?.defaultServiceInputs ?? []),
  type,
});

type ListingEditorUpdateInput = {
  id: string;
} & ReturnType<typeof buildUpdateInput>;

const getCategoryOptions = (
  parents: {
    id: string;
    name: string;
    subCategories: {
      defaultServiceInputs: ServiceInputField[];
      id: string;
      name: string;
      parentId: string;
      warrantyBounds: { maxHours: number; minHours: number };
    }[];
  }[]
): EditorCategory[] =>
  parents.flatMap((parent) =>
    parent.subCategories.map((category) => ({
      defaultServiceInputs: category.defaultServiceInputs,
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      parentName: parent.name,
      warrantyBounds: category.warrantyBounds,
    }))
  );

const getReadinessItems = (
  form: ListingEditorForm,
  category: EditorCategory | undefined
): ReadinessItem[] => {
  const price = parseInteger(form.priceAmount);
  const processingTime = parseInteger(form.processingTimeHours);
  const warrantyDuration = parseInteger(form.warrantyDurationHours);
  const primaryImage = form.thumbnailUrl.trim() || form.images[0]?.trim();
  const serviceInputsValid =
    form.type === "COURSE" ||
    areListingServiceInputsValid(form.serviceInputFields);
  const warrantyInBounds = Boolean(
    category &&
    warrantyDuration !== null &&
    warrantyDuration >= category.warrantyBounds.minHours &&
    warrantyDuration <= category.warrantyBounds.maxHours
  );

  return [
    {
      complete: Boolean(form.categoryId && category),
      id: "category",
      label: "Đã chọn danh mục",
      step: "basics",
    },
    {
      complete: form.type === "SERVICE" || form.type === "COURSE",
      id: "type",
      label: "Đã chọn loại sản phẩm",
      step: "basics",
    },
    {
      complete:
        Boolean(form.title.trim()) &&
        form.title.trim().length <= MAX_TITLE_LENGTH,
      id: "title",
      label: "Tên sản phẩm rõ ràng",
      step: "basics",
    },
    {
      complete:
        Boolean(form.description.trim()) &&
        form.description.trim().length <= MAX_LONG_TEXT_LENGTH,
      id: "description",
      label: "Mô tả",
      step: "basics",
    },
    {
      complete: price !== null && price > 0,
      id: "price",
      label: "Giá bán hợp lệ",
      step: "offer",
    },
    {
      complete: processingTime !== null && processingTime > 0,
      id: "processing-time",
      label: "Thời gian hoàn thành",
      step: "offer",
    },
    {
      complete: Boolean(primaryImage),
      id: "primary-image",
      label: "Ảnh đại diện",
      step: "media",
    },
    {
      complete: serviceInputsValid,
      id: "service-inputs",
      label: "Thông tin khách hợp lệ",
      step: "inputs",
    },
    {
      complete: warrantyInBounds,
      id: "warranty-duration",
      label: "Thời hạn bảo hành trong giới hạn",
      step: "warranty",
    },
    {
      complete:
        Boolean(form.warrantyTerms.trim()) &&
        form.warrantyTerms.trim().length <= MAX_LONG_TEXT_LENGTH,
      id: "warranty-terms",
      label: "Điều khoản bảo hành",
      step: "warranty",
    },
  ];
};

const FieldHint = ({ children }: { children: ReactNode }) => (
  <p className="text-xs leading-5 text-muted-foreground">{children}</p>
);

const EditorFieldError = ({ field }: { field: AnyFieldApi }) => {
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return isInvalid ? <FieldError errors={field.state.meta.errors} /> : null;
};

type ServiceInputFieldPath =
  | `serviceInputFields[${number}].key`
  | `serviceInputFields[${number}].label`
  | `serviceInputFields[${number}].required`
  | `serviceInputFields[${number}].type`;

const InputFieldEditor = ({
  disabled,
  editorForm,
  field,
  fieldIndex,
  onDirty,
  onRemove,
}: {
  disabled: boolean;
  editorForm: ListingEditorFormApi;
  field: ServiceInputField;
  fieldIndex: number;
  onDirty: () => void;
  onRemove: () => void;
}) => (
  <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">Thông tin khách hàng</p>
        <p className="text-xs text-muted-foreground">
          Mô tả thông tin khách cần cung cấp trước khi bạn bắt đầu.
        </p>
      </div>
      <Button
        aria-label={`Xóa ${field.label || "yêu cầu của khách hàng"}`}
        disabled={disabled}
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        <Trash2 />
      </Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`input-label-${field.id}`}>Nhãn hiển thị</Label>
        <editorForm.Field
          name={
            `serviceInputFields[${fieldIndex}].label` as ServiceInputFieldPath
          }
        >
          {(inputField) => {
            const isInvalid =
              inputField.state.meta.isTouched && !inputField.state.meta.isValid;
            return (
              <>
                <Input
                  aria-invalid={isInvalid}
                  disabled={disabled}
                  id={`input-label-${field.id}`}
                  name={inputField.name}
                  onBlur={inputField.handleBlur}
                  onChange={(event) => {
                    onDirty();
                    inputField.handleChange(event.target.value);
                  }}
                  placeholder="Tài liệu thương hiệu"
                  value={
                    typeof inputField.state.value === "string"
                      ? inputField.state.value
                      : ""
                  }
                />
                <EditorFieldError field={inputField} />
              </>
            );
          }}
        </editorForm.Field>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`input-key-${field.id}`}>Khóa dữ liệu</Label>
        <editorForm.Field
          name={
            `serviceInputFields[${fieldIndex}].key` as ServiceInputFieldPath
          }
        >
          {(inputField) => {
            const isInvalid =
              inputField.state.meta.isTouched && !inputField.state.meta.isValid;
            return (
              <>
                <Input
                  aria-invalid={isInvalid}
                  disabled={disabled}
                  id={`input-key-${field.id}`}
                  name={inputField.name}
                  onBlur={inputField.handleBlur}
                  onChange={(event) => {
                    onDirty();
                    inputField.handleChange(event.target.value);
                  }}
                  placeholder="tai_lieu_thuong_hieu"
                  value={
                    typeof inputField.state.value === "string"
                      ? inputField.state.value
                      : ""
                  }
                />
                <EditorFieldError field={inputField} />
              </>
            );
          }}
        </editorForm.Field>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`input-type-${field.id}`}>Kiểu trả lời</Label>
        <editorForm.Field
          name={
            `serviceInputFields[${fieldIndex}].type` as ServiceInputFieldPath
          }
        >
          {(inputField) => (
            <Select
              disabled={disabled}
              items={INPUT_TYPE_ITEMS}
              onValueChange={(value) => {
                if (
                  value === "file" ||
                  value === "number" ||
                  value === "text" ||
                  value === "url"
                ) {
                  onDirty();
                  inputField.handleChange(value);
                }
              }}
              value={
                typeof inputField.state.value === "string"
                  ? inputField.state.value
                  : "text"
              }
            >
              <SelectTrigger id={`input-type-${field.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Văn bản ngắn</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="file">Tệp</SelectItem>
                <SelectItem value="number">Số</SelectItem>
              </SelectContent>
            </Select>
          )}
        </editorForm.Field>
      </div>
      <editorForm.Field
        name={
          `serviceInputFields[${fieldIndex}].required` as ServiceInputFieldPath
        }
      >
        {(inputField) => (
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              checked={inputField.state.value === true}
              className="size-4 accent-primary"
              disabled={disabled}
              name={inputField.name}
              onBlur={inputField.handleBlur}
              onChange={(event) => {
                onDirty();
                inputField.handleChange(event.target.checked);
              }}
              type="checkbox"
            />
            Bắt buộc với khách hàng
          </label>
        )}
      </editorForm.Field>
    </div>
  </div>
);

const EditorStepContent = ({
  disabled,
  editorForm,
  form,
  onAddInputField,
  onDirty,
  onParentCategoryChange,
  onRemoveInputField,
  parentCategoryId,
  listingId,
  categories,
  stepId,
}: {
  categories: EditorCategory[];
  disabled: boolean;
  editorForm: ListingEditorFormApi;
  form: ListingEditorForm;
  onAddInputField: () => void;
  onDirty: () => void;
  onParentCategoryChange: (parentCategoryId: string) => void;
  onRemoveInputField: (fieldId: string) => void;
  parentCategoryId: string;
  listingId: string;
  stepId: ListingEditorStepId;
}) => {
  const parentCategories: { label: string; value: string }[] = [];
  const subCategories: { label: string; value: string }[] = [];
  const parentIds = new Set<string>();
  for (const category of categories) {
    if (!parentIds.has(category.parentId)) {
      parentIds.add(category.parentId);
      parentCategories.push({
        label: category.parentName,
        value: category.parentId,
      });
    }
    if (category.parentId === parentCategoryId) {
      subCategories.push({ label: category.name, value: category.id });
    }
  }
  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId
  );

  switch (stepId) {
    case "basics": {
      return (
        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-title">Tên sản phẩm</Label>
            <editorForm.Field name="title">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <>
                    <Input
                      aria-invalid={isInvalid}
                      disabled={disabled}
                      id="listing-editor-title"
                      maxLength={MAX_TITLE_LENGTH}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        onDirty();
                        field.handleChange(event.target.value);
                      }}
                      placeholder="Đặt tên rõ ràng để khách dễ tìm"
                      value={field.state.value}
                    />
                    <EditorFieldError field={field} />
                  </>
                );
              }}
            </editorForm.Field>
            <FieldHint>Dùng những từ khách hàng thường tìm kiếm.</FieldHint>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="listing-editor-type">Loại sản phẩm</Label>
              <editorForm.Field name="type">
                {(field) => (
                  <Select
                    disabled={disabled}
                    items={LISTING_TYPE_ITEMS}
                    onValueChange={(value) => {
                      if (value === "COURSE" || value === "SERVICE") {
                        onDirty();
                        field.handleChange(value);
                      }
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger id="listing-editor-type">
                      <SelectValue placeholder="Chọn loại sản phẩm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICE">
                        <span className="flex items-center gap-2">
                          <Wrench className="size-4 text-muted-foreground" />
                          Dịch vụ
                        </span>
                      </SelectItem>
                      <SelectItem value="COURSE">Khóa học</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </editorForm.Field>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="listing-editor-parent-category">
                Nhóm danh mục
              </Label>
              <Select
                disabled={disabled}
                items={parentCategories}
                onValueChange={(value) => {
                  if (value) {
                    onParentCategoryChange(value);
                  }
                }}
                value={parentCategoryId}
              >
                <SelectTrigger id="listing-editor-parent-category">
                  <SelectValue placeholder="Chọn nhóm danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {parentCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-sub-category">Danh mục con</Label>
            <editorForm.Field name="categoryId">
              {(field) => (
                <Select
                  disabled={disabled || !parentCategoryId}
                  items={subCategories}
                  onValueChange={(value) => {
                    if (value) {
                      onDirty();
                      field.handleChange(value);
                    }
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger id="listing-editor-sub-category">
                    <SelectValue placeholder="Chọn danh mục con" />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </editorForm.Field>
            {selectedCategory ? (
              <FieldHint>
                Thời hạn bảo hành: {selectedCategory.warrantyBounds.minHours}–
                {selectedCategory.warrantyBounds.maxHours} giờ.
              </FieldHint>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-description">Mô tả</Label>
            <editorForm.Field name="description">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={disabled}
                      id="listing-editor-description"
                      maxLength={MAX_LONG_TEXT_LENGTH}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        onDirty();
                        field.handleChange(event.target.value);
                      }}
                      placeholder="Mô tả quy trình, kết quả bàn giao và giá trị khách hàng nhận được"
                      rows={7}
                      value={field.state.value}
                    />
                    <EditorFieldError field={field} />
                  </>
                );
              }}
            </editorForm.Field>
          </div>
        </div>
      );
    }
    case "offer": {
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-price">Giá bán (VND)</Label>
            <editorForm.Field name="priceAmount">
              {(field) => (
                <Input
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  disabled={disabled}
                  id="listing-editor-price"
                  inputMode="numeric"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    onDirty();
                    field.handleChange(event.target.value);
                  }}
                  placeholder="1500000"
                  value={field.state.value}
                />
              )}
            </editorForm.Field>
            <FieldHint>
              Nhập số nguyên dương theo đơn vị Việt Nam đồng.
            </FieldHint>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-processing">
              Thời gian hoàn thành (giờ)
            </Label>
            <editorForm.Field name="processingTimeHours">
              {(field) => (
                <Input
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  disabled={disabled}
                  id="listing-editor-processing"
                  inputMode="numeric"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    onDirty();
                    field.handleChange(event.target.value);
                  }}
                  placeholder="48"
                  value={field.state.value}
                />
              )}
            </editorForm.Field>
            <FieldHint>Khi nào khách hàng có thể nhận kết quả?</FieldHint>
          </div>
          <div className="rounded-2xl bg-muted/45 p-4 text-sm leading-6 text-muted-foreground sm:col-span-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <PackageCheck className="size-4 text-primary" />
              Kiểm tra thông tin cho khách
            </div>
            <p className="mt-1">
              Giá bán và thời gian hoàn thành sẽ hiển thị cùng nhau trên gian
              hàng.
            </p>
          </div>
        </div>
      );
    }
    case "media": {
      return (
        <div className="space-y-5">
          <ListingImageUploader
            disabled={disabled}
            listingId={listingId}
            onDirty={onDirty}
            onImageChange={({ images, thumbnailUrl }) => {
              editorForm.setFieldValue("images", images);
              editorForm.setFieldValue("thumbnailUrl", thumbnailUrl);
            }}
            thumbnailUrl={form.thumbnailUrl}
          />
          <FieldHint>
            Ảnh này được hiển thị đầu tiên và bắt buộc trước khi đăng bán.
          </FieldHint>
        </div>
      );
    }
    case "inputs": {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
            <PencilLine className="mt-1 size-4 shrink-0 text-primary" />
            <p>
              Những câu hỏi này hiển thị với khách sau khi họ đặt mua. Hãy viết
              đủ cụ thể để bạn có thể bắt đầu công việc ngay.
            </p>
          </div>
          {form.serviceInputFields.map((field, fieldIndex) => (
            <InputFieldEditor
              disabled={disabled}
              editorForm={editorForm}
              field={field}
              fieldIndex={fieldIndex}
              key={field.id}
              onDirty={onDirty}
              onRemove={() => onRemoveInputField(field.id)}
            />
          ))}
          <Button
            disabled={disabled}
            onClick={onAddInputField}
            type="button"
            variant="outline"
          >
            <Plus />
            Thêm thông tin khách cần cung cấp
          </Button>
        </div>
      );
    }
    case "warranty": {
      return (
        <div className="space-y-5">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="listing-editor-warranty-duration">
              Thời hạn (giờ)
            </Label>
            <editorForm.Field name="warrantyDurationHours">
              {(field) => (
                <Input
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  disabled={disabled}
                  id="listing-editor-warranty-duration"
                  inputMode="numeric"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    onDirty();
                    field.handleChange(event.target.value);
                  }}
                  placeholder="72"
                  value={field.state.value}
                />
              )}
            </editorForm.Field>
            {selectedCategory ? (
              <FieldHint>
                Phải nằm trong khoảng {selectedCategory.warrantyBounds.minHours}{" "}
                đến {selectedCategory.warrantyBounds.maxHours} giờ.
              </FieldHint>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-warranty-terms">
              Điều khoản bảo hành
            </Label>
            <editorForm.Field name="warrantyTerms">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={disabled}
                      id="listing-editor-warranty-terms"
                      maxLength={MAX_LONG_TEXT_LENGTH}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        onDirty();
                        field.handleChange(event.target.value);
                      }}
                      placeholder="Nêu phạm vi bảo hành và cách khách hàng yêu cầu hỗ trợ."
                      rows={6}
                      value={field.state.value}
                    />
                    <EditorFieldError field={field} />
                  </>
                );
              }}
            </editorForm.Field>
          </div>
        </div>
      );
    }
    default: {
      return null;
    }
  }
};

const ReadinessPanel = ({
  compact = false,
  items,
  onSelectStep,
}: {
  compact?: boolean;
  items: ReadinessItem[];
  onSelectStep: (step: ListingEditorStepId) => void;
}) => {
  const completedCount = items.filter((item) => item.complete).length;
  const progress = Math.round((completedCount / items.length) * 100);

  const checklist = (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className="flex w-full items-start gap-2.5 text-left text-sm"
            onClick={() => onSelectStep(item.step)}
            type="button"
          >
            <span
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                item.complete
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-transparent"
              }`}
            >
              <Check className="size-2.5" />
            </span>
            <span
              className={
                item.complete ? "text-foreground" : "text-muted-foreground"
              }
            >
              {item.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  const progressNote =
    progress < 100 ? (
      <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <span>Hoàn tất các mục còn thiếu để mở khóa đăng bán.</span>
      </div>
    ) : null;

  if (compact) {
    return (
      <details className="rounded-2xl border border-primary/20 bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-primary" />
            Sẵn sàng đăng bán · {completedCount}/{items.length}
          </span>
          <Badge variant="secondary">{progress}%</Badge>
        </summary>
        <div className="border-t border-border/60 p-4">
          <Progress value={progress}>
            <span className="sr-only">Đã hoàn thành {progress}%</span>
          </Progress>
          <div className="mt-4">{checklist}</div>
          {progressNote}
        </div>
      </details>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" />
              Sẵn sàng đăng bán
            </CardTitle>
            <CardDescription className="mt-1">
              Đã hoàn thành {completedCount}/{items.length} điều kiện
            </CardDescription>
          </div>
          <Badge variant="secondary">{progress}%</Badge>
        </div>
        <Progress value={progress}>
          <span className="sr-only">Đã hoàn thành {progress}%</span>
        </Progress>
      </CardHeader>
      <CardContent>
        {checklist}
        {progressNote}
      </CardContent>
    </Card>
  );
};

const ListingEditorLoading = ({
  onNavigate,
}: {
  onNavigate: (section: StoreSection) => void;
}) => (
  <SellerLayout active="products" onChange={onNavigate}>
    <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 w-96 max-w-full" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-[560px] w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </main>
  </SellerLayout>
);

interface ListingEditorListing {
  categoryId: string;
  description: string | null;
  id: string;
  images: string[];
  priceAmount: number | null;
  processingTimeHours: number | null;
  serviceInputFields: ServiceInputField[];
  status: ListingStatus;
  thumbnailUrl: string | null;
  title: string | null;
  type: "" | "COURSE" | "SERVICE";
  warrantyDurationHours: number | null;
  warrantyTerms: string | null;
}

const EMPTY_NEW_LISTING: ListingEditorListing = {
  categoryId: "",
  description: null,
  id: "new",
  images: [],
  priceAmount: null,
  processingTimeHours: null,
  serviceInputFields: [],
  status: "DRAFT",
  thumbnailUrl: null,
  title: null,
  type: "",
  warrantyDurationHours: null,
  warrantyTerms: null,
};

const ListingEditorFormPage = ({
  categories: categoryOptions,
  listing,
  isNew = false,
}: {
  categories: EditorCategory[];
  listing: ListingEditorListing;
  isNew?: boolean;
}) => {
  const navigate = useNavigate({ from: "/seller/listings/$id" });
  const queryClient = useQueryClient();
  const initialCategory = categoryOptions.find(
    (category) => category.id === listing.categoryId
  );
  const initialForm: ListingEditorForm = {
    categoryId: listing.categoryId,
    description: listing.description ?? "",
    images: listing.images ?? [],
    priceAmount: listing.priceAmount?.toString() ?? "",
    processingTimeHours: listing.processingTimeHours?.toString() ?? "",
    serviceInputFields:
      listing.serviceInputFields.length > 0
        ? listing.serviceInputFields
        : (initialCategory?.defaultServiceInputs ?? []),
    thumbnailUrl: listing.thumbnailUrl ?? "",
    title: listing.title ?? "",
    type: listing.type,
    warrantyDurationHours: listing.warrantyDurationHours?.toString() ?? "",
    warrantyTerms: listing.warrantyTerms ?? "",
  };
  const [parentCategoryId, setParentCategoryId] = useState(
    initialCategory?.parentId ?? ""
  );
  const [draftId, setDraftId] = useState<string | null>(
    isNew ? null : listing.id
  );
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const pendingNavigationSectionRef = useRef<StoreSection | null>(null);
  const [hasCreateAttempt, setHasCreateAttempt] = useState(false);
  const hasDefaultInputsToPersist =
    !isNew &&
    listing.status !== "ARCHIVED" &&
    listing.serviceInputFields.length === 0 &&
    (initialCategory?.defaultServiceInputs.length ?? 0) > 0;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    isNew || hasDefaultInputsToPersist ? "unsaved" : "saved"
  );
  const listingStatus = listing.status;
  const isArchived = listingStatus === "ARCHIVED";
  const isPublished = listingStatus === "PUBLISHED";
  const isHidden = listingStatus === "HIDDEN";

  const updateDraftMutation = useMutation(
    orpc.listing.sellerWorkspace.updateDraft.mutationOptions({
      onError: () => {
        setSaveStatus("error");
        toast.error("Không thể lưu thay đổi sản phẩm. Vui lòng thử lại.");
      },
      onSuccess: () => {
        setSaveStatus("saved");
      },
    })
  );
  const { mutateAsync: updateDraftAsync } = updateDraftMutation;
  const saveQueueRef = useRef<Promise<unknown> | null>(null);
  const enqueueSave = useCallback(
    async (input: ListingEditorUpdateInput) => {
      const previousSave = saveQueueRef.current;
      if (previousSave) {
        try {
          await previousSave;
        } catch {
          // Continue with the newest form state after an earlier save fails.
        }
      }

      const currentSave = updateDraftAsync(input);
      saveQueueRef.current = currentSave;
      try {
        await currentSave;
      } finally {
        if (saveQueueRef.current === currentSave) {
          saveQueueRef.current = null;
        }
      }
    },
    [updateDraftAsync]
  );
  const editorForm = useListingEditorForm(initialForm, async (value) => {
    if (!draftId) {
      return;
    }
    await enqueueSave({ id: draftId, ...buildUpdateInput(value) });
  });
  const form = useStore(editorForm.store, (state) => state.values);
  const hasValidDraftType = isListingType(form.type);
  const hasDraftCategory = Boolean(form.categoryId);
  const canCreateDraft =
    isNew && !draftId && hasValidDraftType && hasDraftCategory;
  const selectedCategory = categoryOptions.find(
    (category) => category.id === form.categoryId
  );
  const readinessItems = getReadinessItems(form, selectedCategory);
  const isReadyToPublish = readinessItems.every((item) => item.complete);
  const [activeStepIndex, setActiveStepIndex] = useState(() =>
    isNew ? 0 : getFirstIncompleteEditorStepIndex(readinessItems)
  );
  const hasNewListingContent = Boolean(
    form.type ||
    parentCategoryId ||
    form.categoryId ||
    form.title.trim() ||
    form.description.trim() ||
    form.priceAmount.trim() ||
    form.processingTimeHours.trim() ||
    form.images.length > 0 ||
    form.thumbnailUrl.trim() ||
    form.serviceInputFields.length > 0 ||
    form.warrantyDurationHours.trim() ||
    form.warrantyTerms.trim()
  );
  const isNewFormDirty = isNew && !draftId && hasNewListingContent;
  const createDraftMutation = useMutation(
    orpc.listing.sellerWorkspace.createDraft.mutationOptions({
      onError: () => {
        setHasCreateAttempt(false);
        setSaveStatus("error");
        toast.error("Không thể tạo bản nháp sản phẩm. Vui lòng thử lại.");
      },
    })
  );
  const createDraft = useCallback(async (): Promise<boolean> => {
    if (!canCreateDraft || hasCreateAttempt || !isListingType(form.type)) {
      return false;
    }

    setHasCreateAttempt(true);
    setSaveStatus("saving");
    const draftInput = buildCreateDraftInput(form, form.type, selectedCategory);
    try {
      const created = await createDraftMutation.mutateAsync(draftInput);
      if (form.serviceInputFields.length === 0 && selectedCategory) {
        editorForm.setFieldValue(
          "serviceInputFields",
          draftInput.serviceInputFields
        );
      }
      setDraftId(created.id);
      setSaveStatus("saved");
      await queryClient.invalidateQueries({
        queryKey: orpc.listing.sellerWorkspace.listMine.key(),
      });
      await navigate({
        params: { id: created.id },
        replace: true,
        to: "/seller/listings/$id",
      });
      return true;
    } catch {
      // The mutation's error handler keeps the form available for retry.
      return false;
    }
  }, [
    createDraftMutation,
    editorForm,
    form,
    hasCreateAttempt,
    canCreateDraft,
    navigate,
    queryClient,
    selectedCategory,
  ]);
  const publishMutation = useMutation(
    orpc.listing.sellerWorkspace.publish.mutationOptions({
      onError: () => {
        toast.error(
          "Không thể đăng bán sản phẩm. Vui lòng kiểm tra các mục còn thiếu."
        );
      },
      onSuccess: async () => {
        toast.success("Sản phẩm đã được đăng bán.");
        await queryClient.invalidateQueries({
          queryKey: orpc.listing.sellerWorkspace.listMine.key(),
        });
        await navigate({
          search: { section: "products" },
          to: "/seller/store",
        });
      },
    })
  );
  const resumeMutation = useMutation(
    orpc.listing.sellerWorkspace.resume.mutationOptions({
      onError: () => {
        toast.error(
          "Không thể đăng bán lại sản phẩm. Vui lòng kiểm tra các mục còn thiếu."
        );
      },
      onSuccess: async () => {
        toast.success("Sản phẩm đã được đăng bán lại.");
        await queryClient.invalidateQueries({
          queryKey: orpc.listing.sellerWorkspace.listMine.key(),
        });
        await navigate({
          search: { section: "products" },
          to: "/seller/store",
        });
      },
    })
  );

  const activeStep = EDITOR_STEPS[activeStepIndex];
  const isEditorStepLocked = (stepIndex: number): boolean =>
    isListingEditorStepLocked(
      isNew,
      Boolean(draftId),
      canCreateDraft,
      stepIndex
    );
  const stepIsComplete = (stepId: ListingEditorStepId) =>
    readinessItems
      .filter((item) => item.step === stepId)
      .every((item) => item.complete);
  const handleSelectStep = (stepId: ListingEditorStepId) => {
    const nextStepIndex = EDITOR_STEPS.findIndex((step) => step.id === stepId);
    if (isEditorStepLocked(nextStepIndex)) {
      return;
    }
    setActiveStepIndex(nextStepIndex);
  };
  const markUnsaved = () => setSaveStatus("unsaved");

  const handleParentCategoryChange = (nextParentCategoryId: string) => {
    markUnsaved();
    setParentCategoryId(nextParentCategoryId);
    editorForm.setFieldValue("categoryId", "");
  };

  const handleAddInputField = () => {
    markUnsaved();
    editorForm.setFieldValue("serviceInputFields", (current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        key: "",
        label: "",
        required: true,
        type: "text",
      },
    ]);
  };

  const handleRemoveInputField = (fieldId: string) => {
    markUnsaved();
    editorForm.setFieldValue("serviceInputFields", (current) =>
      current.filter((field) => field.id !== fieldId)
    );
  };

  const isActionPending =
    createDraftMutation.isPending ||
    updateDraftMutation.isPending ||
    publishMutation.isPending ||
    resumeMutation.isPending;

  const saveNow = async (): Promise<boolean> => {
    if (isNew && !draftId) {
      if (!hasValidDraftType) {
        toast.error("Chọn loại sản phẩm trước khi lưu bản nháp.");
        return false;
      }
      if (!hasDraftCategory) {
        toast.error("Chọn danh mục con trước khi lưu bản nháp.");
        return false;
      }
      return createDraft();
    }

    if (!draftId) {
      return false;
    }
    if (isArchived || (isPublished && !isReadyToPublish)) {
      if (isPublished) {
        toast.error("Hoàn tất checklist trước khi lưu thay đổi.");
      }
      return false;
    }

    setSaveStatus("saving");
    if (isPublished) {
      await editorForm.handleSubmit();
      if (!editorForm.state.isValid) {
        setSaveStatus("unsaved");
        return false;
      }
      return true;
    }

    try {
      await enqueueSave({ id: draftId, ...buildUpdateInput(form) });
      return true;
    } catch {
      return false;
    }
  };

  const handleManualSave = async (): Promise<void> => {
    try {
      await saveNow();
    } catch {
      setSaveStatus("error");
      toast.error("Không thể lưu thay đổi. Vui lòng thử lại.");
    }
  };

  const handleNavigateFromEditor = async (section: StoreSection) => {
    if (isActionPending) {
      toast.info("Đang lưu thay đổi…");
      return;
    }

    const hasUnsavedChanges = saveStatus !== "saved";
    const isEmptyNewListing = isNew && !draftId && !isNewFormDirty;
    if (hasUnsavedChanges && !isEmptyNewListing) {
      pendingNavigationSectionRef.current = section;
      setIsDiscardDialogOpen(true);
      return;
    }

    try {
      await navigate({
        search: { section },
        to: "/seller/store",
      });
    } catch {
      toast.error("Không thể rời màn hình. Vui lòng thử lại.");
    }
  };

  const handleReturnToProducts = async () => {
    await handleNavigateFromEditor("products");
  };

  const handlePrimaryAction = async () => {
    if (!form || !isReadyToPublish) {
      return;
    }

    try {
      if (!(await saveNow())) {
        return;
      }
      if (listingStatus === "DRAFT" && draftId) {
        await publishMutation.mutateAsync({ id: draftId });
      } else if (listingStatus === "PAUSED" && draftId) {
        await resumeMutation.mutateAsync({ id: draftId });
      }
    } catch {
      // The mutation already surfaces the error to the seller.
    }
  };

  const primaryActionLabel =
    listingStatus === "PAUSED" ? "Đăng bán lại" : "Đăng bán sản phẩm";
  const primaryActionAvailable =
    listingStatus === "DRAFT" || listingStatus === "PAUSED";
  let saveButtonLabel = "Lưu thay đổi";
  if (isNew && !draftId) {
    saveButtonLabel = "Lưu bản nháp";
  } else if (listingStatus === "DRAFT") {
    saveButtonLabel = "Lưu bản nháp";
  }
  const saveButtonDisabled =
    isActionPending ||
    isArchived ||
    saveStatus === "saved" ||
    (isNew && !draftId && !canCreateDraft);
  const saveIndicatorClass = getSaveIndicatorClass(saveStatus);
  const saveStatusLabel = getNewSaveStatusLabel(saveStatus, isNew, draftId);
  const editorTypeLabel = isNew
    ? "Tạo sản phẩm"
    : getEditorTypeLabel(form.type);
  const editorStatusLabel = isNew
    ? "Bản nháp mới"
    : STATUS_LABELS[listingStatus];
  const editorTitle =
    form.title || (isNew ? "Sản phẩm mới" : "Đặt tên sản phẩm");
  const isActiveStepLocked = isEditorStepLocked(activeStepIndex);
  const isActiveMediaBeforeDraft =
    isNew && !draftId && activeStep.id === "media";
  const isEditorStepDisabled =
    isArchived ||
    isActionPending ||
    isActiveStepLocked ||
    isActiveMediaBeforeDraft;
  const isNextStepDisabled =
    isActionPending ||
    isEditorStepLocked(activeStepIndex + 1) ||
    activeStepIndex === EDITOR_STEPS.length - 1;
  const handleStoreNavigation = (section: StoreSection) => {
    void handleNavigateFromEditor(section);
  };

  return (
    <SellerLayout active="products" onChange={handleStoreNavigation}>
      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
          <header className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="shrink-0" />
                <Link
                  className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                  onClick={(event) => {
                    if (isActionPending) {
                      event.preventDefault();
                      toast.info("Đang lưu thay đổi…");
                      return;
                    }

                    if (isNew && !draftId) {
                      event.preventDefault();
                      void handleReturnToProducts();
                      return;
                    }

                    if (saveStatus !== "saved") {
                      event.preventDefault();
                      void handleReturnToProducts();
                    }
                  }}
                  search={{ section: "products" }}
                  to="/seller/store"
                >
                  <ArrowLeft className="size-4" />
                  Sản phẩm
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline">{STATUS_LABELS[listingStatus]}</Badge>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`size-1.5 rounded-full ${saveIndicatorClass}`}
                  />
                  {saveStatusLabel}
                </div>
              </div>
            </div>
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {editorTypeLabel} · {editorStatusLabel}
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {editorTitle}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Hoàn thiện từng bước theo tốc độ của bạn. Bấm “Lưu” khi muốn giữ
                lại thay đổi.
              </p>
            </div>
          </header>

          <nav
            aria-label="Các bước hoàn thiện sản phẩm"
            className="grid gap-2 md:grid-cols-5"
          >
            {EDITOR_STEPS.map((step, index) => {
              const isActive = index === activeStepIndex;
              const isComplete = stepIsComplete(step.id);
              const isLocked = isEditorStepLocked(index);
              let stepIndicatorClass = "border-border text-muted-foreground";
              if (isComplete) {
                stepIndicatorClass =
                  "border-primary bg-primary text-primary-foreground";
              }
              if (isActive) {
                stepIndicatorClass =
                  "border-primary-foreground/40 bg-primary-foreground/15";
              }
              return (
                <button
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted"
                  } ${isLocked ? "cursor-not-allowed opacity-50" : ""}`}
                  disabled={isLocked || isActionPending}
                  key={step.id}
                  onClick={() => handleSelectStep(step.id)}
                  type="button"
                >
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${stepIndicatorClass}`}
                  >
                    {isComplete ? <Check className="size-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {step.label}
                    </span>
                    <span
                      className={`block truncate text-xs ${
                        isActive
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          {isHidden ? (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Sản phẩm này đang bị Avin ẩn</AlertTitle>
              <AlertDescription>
                Bạn vẫn có thể cập nhật nội dung, nhưng việc đăng bán do đội ngũ
                kiểm duyệt kiểm soát.
              </AlertDescription>
            </Alert>
          ) : null}
          {isArchived ? (
            <Alert>
              <AlertCircle className="size-4" />
              <AlertTitle>Sản phẩm này đã được lưu trữ</AlertTitle>
              <AlertDescription>
                Sản phẩm đã lưu trữ được giữ cho lịch sử đơn hàng và không thể
                chỉnh sửa hoặc khôi phục.
              </AlertDescription>
            </Alert>
          ) : null}
          {!isNew && saveStatus === "error" ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Không thể lưu thay đổi mới nhất</AlertTitle>
              <AlertDescription>Kiểm tra kết nối rồi thử lại.</AlertDescription>
            </Alert>
          ) : null}

          {isNew && saveStatus === "error" ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Chưa thể tạo bản nháp</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                Dữ liệu bạn đã nhập vẫn còn trên màn hình.
                <Button
                  onClick={() => void createDraft()}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="xl:hidden">
            <ReadinessPanel
              compact
              items={readinessItems}
              onSelectStep={handleSelectStep}
            />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <section>
              <Card className="min-h-[560px]">
                <CardHeader className="border-b border-border/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        Bước {activeStepIndex + 1}/{EDITOR_STEPS.length}
                      </p>
                      <CardTitle className="mt-2 text-2xl">
                        {activeStep.label}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {activeStep.description}
                      </CardDescription>
                    </div>
                    <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                      <Clock3 className="size-3.5 text-primary" />
                      Lưu thủ công
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  <EditorStepContent
                    categories={categoryOptions}
                    disabled={isEditorStepDisabled}
                    editorForm={editorForm}
                    form={form}
                    onAddInputField={handleAddInputField}
                    onDirty={markUnsaved}
                    onParentCategoryChange={handleParentCategoryChange}
                    onRemoveInputField={handleRemoveInputField}
                    parentCategoryId={parentCategoryId}
                    listingId={draftId ?? "new"}
                    stepId={activeStep.id}
                  />
                </CardContent>
                <CardFooter className="justify-between border-t border-border/60">
                  <Button
                    disabled={isActionPending || activeStepIndex === 0}
                    onClick={() =>
                      setActiveStepIndex((index) => Math.max(index - 1, 0))
                    }
                    variant="ghost"
                  >
                    <ArrowLeft />
                    Quay lại
                  </Button>
                  <Button
                    disabled={isNextStepDisabled}
                    onClick={() =>
                      setActiveStepIndex((index) =>
                        Math.min(index + 1, EDITOR_STEPS.length - 1)
                      )
                    }
                  >
                    Tiếp theo
                    <ArrowRight />
                  </Button>
                </CardFooter>
              </Card>
            </section>

            <aside className="hidden space-y-4 xl:sticky xl:top-6 xl:block">
              <ReadinessPanel
                items={readinessItems}
                onSelectStep={handleSelectStep}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="size-4 text-primary" />
                    Tiếp theo là gì?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
                  <p>
                    Xem trước gian hàng, sau đó đăng bán khi mọi điều kiện đã
                    hoàn tất.
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
                    <FileCheck2 className="size-4 shrink-0 text-primary" />
                    {isPublished
                      ? "Thay đổi chỉ được lưu khi bạn bấm Lưu thay đổi."
                      : "Bạn có thể quay lại bất kỳ bước nào sau."}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Save className="size-3.5 text-primary" />
              {saveStatusLabel}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                disabled={saveButtonDisabled}
                onClick={() => void handleManualSave()}
                variant="outline"
              >
                <Save />
                {saveStatus === "saving" ? "Đang lưu…" : saveButtonLabel}
              </Button>
              <Button
                disabled={isActionPending || isArchived}
                onClick={() => void handleReturnToProducts()}
                variant="outline"
              >
                Quay lại sản phẩm
              </Button>
              {primaryActionAvailable ? (
                <Button
                  disabled={
                    isActionPending ||
                    isArchived ||
                    !isReadyToPublish ||
                    isHidden
                  }
                  onClick={handlePrimaryAction}
                >
                  <Rocket />
                  {primaryActionLabel}
                </Button>
              ) : null}
              {!isReadyToPublish && primaryActionAvailable ? (
                <span className="basis-full text-right text-[11px] text-muted-foreground sm:basis-auto">
                  Hoàn tất checklist để tiếp tục.
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <AlertDialog
        onOpenChange={(open) => {
          setIsDiscardDialogOpen(open);
          if (!open) {
            pendingNavigationSectionRef.current = null;
          }
        }}
        open={isDiscardDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rời đi khi chưa lưu?</AlertDialogTitle>
            <AlertDialogDescription>
              Những thay đổi chưa được lưu sẽ bị mất nếu bạn rời khỏi màn hình.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const targetSection =
                  pendingNavigationSectionRef.current ?? "products";
                setIsDiscardDialogOpen(false);
                pendingNavigationSectionRef.current = null;
                void navigate({
                  search: { section: targetSection },
                  to: "/seller/store",
                });
              }}
              variant="destructive"
            >
              Bỏ thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SellerLayout>
  );
};

export const ListingEditorPage = () => {
  const { id } = useParams({ from: "/_authenticated/seller/listings/$id" });
  const navigate = useNavigate({ from: "/seller/listings/$id" });
  const isNew = id === "new";
  const listingQuery = useQuery({
    ...orpc.listing.sellerWorkspace.get.queryOptions({ input: { id } }),
    enabled: !isNew,
  });
  const categoriesQuery = useQuery(
    orpc.listing.discovery.categories.queryOptions()
  );
  const categoryOptions = useMemo(
    () => getCategoryOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data]
  );
  const handleStoreNavigation = (section: StoreSection) => {
    void navigate({ search: { section }, to: "/seller/store" });
  };

  if (categoriesQuery.isLoading || (!isNew && listingQuery.isLoading)) {
    return <ListingEditorLoading onNavigate={handleStoreNavigation} />;
  }

  if (isNew) {
    if (categoriesQuery.isError) {
      return (
        <SellerLayout active="products" onChange={handleStoreNavigation}>
          <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl py-12">
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Không thể tải danh mục</AlertTitle>
                <AlertDescription>
                  Vui lòng thử lại để tạo sản phẩm.
                </AlertDescription>
              </Alert>
            </div>
          </main>
        </SellerLayout>
      );
    }

    return (
      <ListingEditorFormPage
        categories={categoryOptions}
        isNew
        listing={EMPTY_NEW_LISTING}
      />
    );
  }

  if (listingQuery.isError || categoriesQuery.isError || !listingQuery.data) {
    return (
      <SellerLayout active="products" onChange={handleStoreNavigation}>
        <main className="min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl py-12">
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Không thể mở sản phẩm</AlertTitle>
              <AlertDescription>
                Sản phẩm có thể không còn khả dụng với tài khoản seller của bạn.
              </AlertDescription>
            </Alert>
            <Button
              className="mt-4"
              onClick={() =>
                navigate({
                  search: { section: "products" },
                  to: "/seller/store",
                })
              }
            >
              <ArrowLeft />
              Về danh sách sản phẩm
            </Button>
          </div>
        </main>
      </SellerLayout>
    );
  }

  return (
    <ListingEditorFormPage
      categories={categoryOptions}
      key={listingQuery.data.id}
      listing={listingQuery.data}
    />
  );
};
