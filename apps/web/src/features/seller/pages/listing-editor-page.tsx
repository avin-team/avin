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
import { NumberInput } from "@avin/ui/components/number-input";
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
import { cn } from "@avin/ui/lib/utils";
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
  GraduationCap,
  ListChecks,
  PackageCheck,
  Rocket,
  Save,
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
  getFirstIncompleteEditorStepIndex,
  getServiceInputFieldsForDraft,
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
    description: "Tên, loại, danh mục, giá và thời gian hoàn thành",
    label: "Thông tin cơ bản",
  },
  media: {
    description: "Ảnh đại diện và thư viện ảnh",
    label: "Hình ảnh",
  },
  warranty: { description: "Thời hạn và điều khoản", label: "Bảo hành" },
};

const EDITOR_STEPS = LISTING_EDITOR_STEP_ORDER.map((id) => ({
  ...EDITOR_STEP_COPY[id],
  id,
}));

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
  draftId: string | null,
  canCreateDraft: boolean
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
  return canCreateDraft
    ? "Bấm “Tiếp theo” để lưu bản nháp"
    : "Chọn loại và danh mục để bắt đầu";
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
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  const parsed = Number(trimmedValue);
  return Number.isInteger(parsed) ? parsed : null;
};

const buildUpdateInput = (form: ListingEditorForm) => ({
  categoryId: form.categoryId || undefined,
  description: form.description.trim() || null,
  images: form.images,
  priceAmount: parseInteger(form.priceAmount),
  processingTimeHours: parseInteger(form.processingTimeHours),
  serviceInputFields: form.serviceInputFields,
  thumbnailUrl: form.images[0]?.trim() || form.thumbnailUrl.trim() || null,
  title: form.title.trim() || null,
  type: form.type || undefined,
  warrantyDurationHours: parseInteger(form.warrantyDurationHours),
  warrantyTerms: form.warrantyTerms.trim() || null,
});

const buildCreateDraftInput = (
  form: ListingEditorForm,
  type: "COURSE" | "SERVICE"
) => ({
  ...buildUpdateInput(form),
  categoryId: form.categoryId,
  serviceInputFields: getServiceInputFieldsForDraft(form.serviceInputFields),
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
      id: string;
      name: string;
      parentId: string;
      warrantyBounds: { maxHours: number; minHours: number };
    }[];
  }[]
): EditorCategory[] =>
  parents.flatMap((parent) =>
    parent.subCategories.map((category) => ({
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
  const primaryImage = form.images[0]?.trim() || form.thumbnailUrl.trim();
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
      step: "basics",
    },
    {
      complete: processingTime !== null && processingTime > 0,
      id: "processing-time",
      label: "Thời gian hoàn thành",
      step: "basics",
    },
    {
      complete: Boolean(primaryImage),
      id: "primary-image",
      label: "Ảnh đại diện",
      step: "media",
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

const EditorStepContent = ({
  disabled,
  editorForm,
  form,
  onDirty,
  onImagesUploaded,
  onImageUploadingChange,
  onParentCategoryChange,
  parentCategoryId,
  listingId,
  categories,
  stepId,
}: {
  categories: EditorCategory[];
  disabled: boolean;
  editorForm: ListingEditorFormApi;
  form: ListingEditorForm;
  onDirty: () => void;
  onImagesUploaded: (imageUrls: string[]) => void;
  onImageUploadingChange: (isUploading: boolean) => void;
  onParentCategoryChange: (parentCategoryId: string) => void;
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
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-foreground">
                Loại sản phẩm
              </Label>
              <span className="text-xs text-muted-foreground">
                Chọn 1 trong 2 hình thức cung cấp
              </span>
            </div>
            <editorForm.Field name="type">
              {(field) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className={cn(
                      "group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      field.state.value === "SERVICE"
                        ? "border-primary/80 bg-primary/5 text-foreground shadow-sm ring-1 ring-primary/30"
                        : "border-border/70 bg-card hover:border-foreground/30 hover:bg-accent/40 text-muted-foreground",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) {
                        onDirty();
                        field.handleChange("SERVICE");
                      }
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl transition-colors",
                            field.state.value === "SERVICE"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                          )}
                        >
                          <Wrench className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            Dịch vụ
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Hoàn thành & Bàn giao
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          field.state.value === "SERVICE"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 text-transparent"
                        )}
                      >
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Dành cho dịch vụ làm theo yêu cầu, cày thuê, thiết kế, tư
                      vấn hoặc cung cấp giải pháp.
                    </p>
                  </button>

                  <button
                    className={cn(
                      "group relative flex cursor-pointer flex-col justify-between rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      field.state.value === "COURSE"
                        ? "border-primary/80 bg-primary/5 text-foreground shadow-sm ring-1 ring-primary/30"
                        : "border-border/70 bg-card hover:border-foreground/30 hover:bg-accent/40 text-muted-foreground",
                      disabled && "cursor-not-allowed opacity-50"
                    )}
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) {
                        onDirty();
                        field.handleChange("COURSE");
                      }
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex size-10 items-center justify-center rounded-xl transition-colors",
                            field.state.value === "COURSE"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                          )}
                        >
                          <GraduationCap className="size-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            Khóa học
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Đào tạo & Hướng dẫn
                          </div>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          field.state.value === "COURSE"
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 text-transparent"
                        )}
                      >
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      Dành cho bài giảng video, tài liệu hướng dẫn, khóa đào tạo
                      trực tuyến dành cho học viên.
                    </p>
                  </button>
                </div>
              )}
            </editorForm.Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                <SelectTrigger
                  className="w-full"
                  id="listing-editor-parent-category"
                >
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
                    <SelectTrigger
                      className="w-full"
                      id="listing-editor-sub-category"
                    >
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
            </div>
          </div>
          {selectedCategory ? (
            <FieldHint>
              Thời hạn bảo hành: {selectedCategory.warrantyBounds.minHours}–
              {selectedCategory.warrantyBounds.maxHours} giờ.
            </FieldHint>
          ) : null}
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
          <div className="grid gap-5 border-t border-border/60 pt-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="listing-editor-price">Giá bán (VND)</Label>
              <editorForm.Field name="priceAmount">
                {(field) => (
                  <NumberInput
                    aria-invalid={
                      field.state.meta.isTouched && !field.state.meta.isValid
                    }
                    disabled={disabled}
                    id="listing-editor-price"
                    inputProps={{ onBlur: field.handleBlur }}
                    name={field.name}
                    min={1}
                    onValueChange={(value) => {
                      onDirty();
                      field.handleChange(value === null ? "" : String(value));
                    }}
                    placeholder="1500000"
                    step={1}
                    value={parseInteger(field.state.value)}
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
                  <NumberInput
                    aria-invalid={
                      field.state.meta.isTouched && !field.state.meta.isValid
                    }
                    disabled={disabled}
                    id="listing-editor-processing"
                    inputProps={{ onBlur: field.handleBlur }}
                    name={field.name}
                    min={1}
                    onValueChange={(value) => {
                      onDirty();
                      field.handleChange(value === null ? "" : String(value));
                    }}
                    placeholder="48"
                    step={1}
                    value={parseInteger(field.state.value)}
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
        </div>
      );
    }
    case "media": {
      return (
        <div className="space-y-5">
          <ListingImageUploader
            disabled={disabled}
            images={form.images}
            listingId={listingId}
            onDirty={onDirty}
            onImageChange={({ images, thumbnailUrl }) => {
              editorForm.setFieldValue("images", images);
              editorForm.setFieldValue("thumbnailUrl", thumbnailUrl);
            }}
            onImagesUploaded={onImagesUploaded}
            onUploadingChange={onImageUploadingChange}
            thumbnailUrl={form.thumbnailUrl}
          />
          <FieldHint>
            Ảnh đầu tiên là ảnh đại diện. Bạn có thể thêm tối đa 5 ảnh khác; cần
            ít nhất một ảnh trước khi đăng bán.
          </FieldHint>
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
                <NumberInput
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                  disabled={disabled}
                  id="listing-editor-warranty-duration"
                  inputProps={{ onBlur: field.handleBlur }}
                  name={field.name}
                  max={selectedCategory?.warrantyBounds.maxHours}
                  min={selectedCategory?.warrantyBounds.minHours}
                  onValueChange={(value) => {
                    onDirty();
                    field.handleChange(value === null ? "" : String(value));
                  }}
                  placeholder="72"
                  step={1}
                  value={parseInteger(field.state.value)}
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

// oxlint-disable-next-line complexity
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
    serviceInputFields: getServiceInputFieldsForDraft(
      listing.serviceInputFields
    ),
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    isNew ? "unsaved" : "saved"
  );
  const [isImageUploading, setIsImageUploading] = useState(false);
  const pendingImageUploadsRef = useRef<string[]>([]);
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
  const discardImageUploadsMutation = useMutation(
    orpc.listing.sellerWorkspace.discardImageUploads.mutationOptions()
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
    const draftInput = buildCreateDraftInput(form, form.type);
    try {
      const created = await createDraftMutation.mutateAsync(draftInput);
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
    form,
    hasCreateAttempt,
    canCreateDraft,
    navigate,
    queryClient,
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
    isListingEditorStepLocked(isNew, Boolean(draftId), stepIndex);
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

  const isActionPending =
    createDraftMutation.isPending ||
    discardImageUploadsMutation.isPending ||
    isImageUploading ||
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
      pendingImageUploadsRef.current = [];
      return true;
    }

    try {
      await enqueueSave({ id: draftId, ...buildUpdateInput(form) });
      pendingImageUploadsRef.current = [];
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

  const handleDiscardChanges = async () => {
    const targetSection = pendingNavigationSectionRef.current ?? "products";
    if (draftId && pendingImageUploadsRef.current.length > 0) {
      try {
        await discardImageUploadsMutation.mutateAsync({
          id: draftId,
          imageUrls: pendingImageUploadsRef.current,
        });
        pendingImageUploadsRef.current = [];
      } catch {
        pendingNavigationSectionRef.current = targetSection;
        toast.error("Không thể dọn ảnh chưa lưu. Vui lòng thử lại.");
        return;
      }
    }

    setIsDiscardDialogOpen(false);
    pendingNavigationSectionRef.current = null;
    await navigate({
      search: { section: targetSection },
      to: "/seller/store",
    });
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

  const handleNextStep = async (): Promise<void> => {
    if (isActionPending || activeStepIndex === EDITOR_STEPS.length - 1) {
      return;
    }

    if (isNew && !draftId && activeStepIndex === 0) {
      await saveNow();
      return;
    }

    if (isEditorStepLocked(activeStepIndex + 1)) {
      return;
    }

    setActiveStepIndex((index) => Math.min(index + 1, EDITOR_STEPS.length - 1));
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
  const saveStatusLabel = getNewSaveStatusLabel(
    saveStatus,
    isNew,
    draftId,
    canCreateDraft
  );
  const editorTypeLabel = isNew
    ? "Tạo sản phẩm"
    : getEditorTypeLabel(form.type);
  const editorStatusLabel = isNew
    ? "Bản nháp mới"
    : STATUS_LABELS[listingStatus];
  const editorTitle =
    form.title || (isNew ? "Sản phẩm mới" : "Đặt tên sản phẩm");
  const editorDescription =
    isNew && !draftId
      ? "Chọn loại sản phẩm và danh mục, sau đó bấm “Tiếp theo” để lưu bản nháp."
      : "Hoàn thiện từng bước theo tốc độ của bạn. Bấm “Lưu” khi muốn giữ lại thay đổi.";
  const isActiveStepLocked = isEditorStepLocked(activeStepIndex);
  const isEditorStepDisabled =
    isArchived || isActionPending || isActiveStepLocked;
  const isNextStepDisabled =
    isActionPending ||
    (isNew && !draftId && !canCreateDraft) ||
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
                {editorDescription}
              </p>
            </div>
          </header>

          <nav
            aria-label="Các bước hoàn thiện sản phẩm"
            className="grid gap-2 md:grid-cols-3"
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
                    onDirty={markUnsaved}
                    onImagesUploaded={(imageUrls) =>
                      (pendingImageUploadsRef.current = [
                        ...new Set([
                          ...pendingImageUploadsRef.current,
                          ...imageUrls,
                        ]),
                      ])
                    }
                    onImageUploadingChange={setIsImageUploading}
                    onParentCategoryChange={handleParentCategoryChange}
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
                  {activeStepIndex === EDITOR_STEPS.length - 1 &&
                  primaryActionAvailable ? (
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
                  ) : (
                    <Button
                      disabled={isNextStepDisabled}
                      onClick={() => void handleNextStep()}
                    >
                      Tiếp theo
                      <ArrowRight />
                    </Button>
                  )}
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
              onClick={() => void handleDiscardChanges()}
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
