import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { ListingImageUploader } from "@/features/seller/components/listing-image-uploader";
import { listingEditorFormSchema } from "@/features/seller/schemas/listing-editor-schema";
import { orpc } from "@/utils/orpc";

type ListingStatus = "DRAFT" | "HIDDEN" | "PAUSED" | "PUBLISHED" | "ARCHIVED";

type ServiceInputFieldType = "file" | "number" | "text" | "url";

interface ServiceInputField {
  id: string;
  key: string;
  label: string;
  required: boolean;
  type: ServiceInputFieldType;
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
  type: "COURSE" | "SERVICE";
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

type EditorStepId = "basics" | "inputs" | "media" | "offer" | "warranty";

interface ReadinessItem {
  complete: boolean;
  id: string;
  label: string;
  step: EditorStepId;
}

type SaveStatus = "error" | "saved" | "saving" | "unsaved";

const MAX_LONG_TEXT_LENGTH = 10_000;
const MAX_TITLE_LENGTH = 200;

const EDITOR_STEPS: {
  description: string;
  id: EditorStepId;
  label: string;
}[] = [
  { description: "Name and promise", id: "basics", label: "Basics" },
  { description: "Price and delivery", id: "offer", label: "Offer" },
  { description: "Make it tangible", id: "media", label: "Media" },
  { description: "What buyers provide", id: "inputs", label: "Inputs" },
  { description: "Set expectations", id: "warranty", label: "Warranty" },
];

const INPUT_TYPE_ITEMS = [
  { label: "Short text", value: "text" },
  { label: "URL", value: "url" },
  { label: "File", value: "file" },
  { label: "Number", value: "number" },
];

const LISTING_TYPE_ITEMS = [
  { label: "Service", value: "SERVICE" },
  { label: "Course", value: "COURSE" },
];

const STATUS_LABELS: Record<ListingStatus, string> = {
  ARCHIVED: "Archived",
  DRAFT: "Draft",
  HIDDEN: "Hidden by Avin",
  PAUSED: "Paused",
  PUBLISHED: "Published",
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
    return "Saving…";
  }
  if (status === "unsaved") {
    return "Unsaved changes";
  }
  if (status === "error") {
    return "Save failed";
  }
  return "Saved just now";
};

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
  type: form.type,
  warrantyDurationHours: parseInteger(form.warrantyDurationHours),
  warrantyTerms: form.warrantyTerms.trim() || null,
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
  const serviceInputsValid = form.serviceInputFields.every(
    (field) =>
      field.id.trim() &&
      field.key.trim() &&
      field.label.trim() &&
      ["file", "number", "text", "url"].includes(field.type)
  );
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
      label: "Category selected",
      step: "basics",
    },
    {
      complete:
        Boolean(form.title.trim()) &&
        form.title.trim().length <= MAX_TITLE_LENGTH,
      id: "title",
      label: "Clear listing title",
      step: "basics",
    },
    {
      complete:
        Boolean(form.description.trim()) &&
        form.description.trim().length <= MAX_LONG_TEXT_LENGTH,
      id: "description",
      label: "Description",
      step: "basics",
    },
    {
      complete: price !== null && price > 0,
      id: "price",
      label: "Positive price",
      step: "offer",
    },
    {
      complete: processingTime !== null && processingTime > 0,
      id: "processing-time",
      label: "Processing time",
      step: "offer",
    },
    {
      complete: Boolean(primaryImage),
      id: "primary-image",
      label: "Primary image",
      step: "media",
    },
    {
      complete: serviceInputsValid,
      id: "service-inputs",
      label: "Buyer requirements are valid",
      step: "inputs",
    },
    {
      complete: warrantyInBounds,
      id: "warranty-duration",
      label: "Warranty duration in range",
      step: "warranty",
    },
    {
      complete:
        Boolean(form.warrantyTerms.trim()) &&
        form.warrantyTerms.trim().length <= MAX_LONG_TEXT_LENGTH,
      id: "warranty-terms",
      label: "Warranty terms",
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
        <p className="text-sm font-semibold">Buyer requirement</p>
        <p className="text-xs text-muted-foreground">
          Describe what the buyer must provide before you start.
        </p>
      </div>
      <Button
        aria-label={`Remove ${field.label || "buyer requirement"}`}
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
        <Label htmlFor={`input-label-${field.id}`}>Label</Label>
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
                  placeholder="Brand assets"
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
        <Label htmlFor={`input-key-${field.id}`}>Key</Label>
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
                  placeholder="brand_assets"
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
        <Label htmlFor={`input-type-${field.id}`}>Response type</Label>
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
                <SelectItem value="text">Short text</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="number">Number</SelectItem>
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
            Required from buyer
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
  stepId: EditorStepId;
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
            <Label htmlFor="listing-editor-title">Listing title</Label>
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
                      placeholder="Give your service a clear name"
                      value={field.state.value}
                    />
                    <EditorFieldError field={field} />
                  </>
                );
              }}
            </editorForm.Field>
            <FieldHint>Use the words a buyer would search for.</FieldHint>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="listing-editor-type">Type</Label>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SERVICE">
                        <span className="flex items-center gap-2">
                          <Wrench className="size-4 text-muted-foreground" />
                          Service
                        </span>
                      </SelectItem>
                      <SelectItem value="COURSE">Course</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </editorForm.Field>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="listing-editor-parent-category">Category</Label>
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
                  <SelectValue placeholder="Choose a category" />
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
            <Label htmlFor="listing-editor-sub-category">Sub-category</Label>
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
                    <SelectValue placeholder="Choose a sub-category" />
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
                Warranty range: {selectedCategory.warrantyBounds.minHours}–
                {selectedCategory.warrantyBounds.maxHours} hours.
              </FieldHint>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-description">Description</Label>
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
                      placeholder="Describe your process, deliverables, and what makes this valuable"
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
            <Label htmlFor="listing-editor-price">Price (VND)</Label>
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
              Use a positive integer amount in Vietnamese đồng.
            </FieldHint>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-processing">
              Processing time (hours)
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
            <FieldHint>When can the buyer expect delivery?</FieldHint>
          </div>
          <div className="rounded-2xl bg-muted/45 p-4 text-sm leading-6 text-muted-foreground sm:col-span-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <PackageCheck className="size-4 text-primary" />
              Buyer clarity check
            </div>
            <p className="mt-1">
              Price and turnaround appear together on the storefront listing.
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
            This image is shown first and is required before publishing.
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
              These questions are shown to buyers after they order. Keep them
              specific enough that you can start work immediately.
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
            Add buyer requirement
          </Button>
        </div>
      );
    }
    case "warranty": {
      return (
        <div className="space-y-5">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="listing-editor-warranty-duration">
              Duration (hours)
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
                Must be between {selectedCategory.warrantyBounds.minHours} and{" "}
                {selectedCategory.warrantyBounds.maxHours} hours.
              </FieldHint>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="listing-editor-warranty-terms">
              Warranty terms
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
                      placeholder="Explain what is covered and how buyers should request help."
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
  items,
  onSelectStep,
}: {
  items: ReadinessItem[];
  onSelectStep: (step: EditorStepId) => void;
}) => {
  const completedCount = items.filter((item) => item.complete).length;
  const progress = Math.round((completedCount / items.length) * 100);

  return (
    <Card className="border-primary/20">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="size-4 text-primary" />
              Publish readiness
            </CardTitle>
            <CardDescription className="mt-1">
              {completedCount} of {items.length} requirements complete
            </CardDescription>
          </div>
          <Badge variant="secondary">{progress}%</Badge>
        </div>
        <Progress value={progress}>
          <span className="sr-only">{progress} percent complete</span>
        </Progress>
      </CardHeader>
      <CardContent>
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
        {progress < 100 ? (
          <div className="mt-5 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>Finish the remaining items to unlock publishing.</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const ListingEditorLoading = () => (
  <Shell variant="default">
    <div className="mx-auto max-w-7xl space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-14 w-96 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-[560px] w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  </Shell>
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
  type: "COURSE" | "SERVICE";
  warrantyDurationHours: number | null;
  warrantyTerms: string | null;
}

const ListingEditorFormPage = ({
  categories: categoryOptions,
  listing,
}: {
  categories: EditorCategory[];
  listing: ListingEditorListing;
}) => {
  const { id } = listing;
  const navigate = useNavigate({ from: "/seller/listings/$id" });
  const queryClient = useQueryClient();
  const [activeStepIndex, setActiveStepIndex] = useState(0);
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
  const hasDefaultInputsToPersist =
    listing.status !== "ARCHIVED" &&
    listing.serviceInputFields.length === 0 &&
    (initialCategory?.defaultServiceInputs.length ?? 0) > 0;
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    hasDefaultInputsToPersist ? "unsaved" : "saved"
  );
  const listingStatus = listing.status;
  const isArchived = listingStatus === "ARCHIVED";
  const isPublished = listingStatus === "PUBLISHED";
  const isHidden = listingStatus === "HIDDEN";

  const updateDraftMutation = useMutation(
    orpc.listing.sellerWorkspace.updateDraft.mutationOptions({
      onError: (error) => {
        setSaveStatus("error");
        toast.error(error.message || "Unable to save listing changes");
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
    await enqueueSave({ id, ...buildUpdateInput(value) });
  });
  const form = useStore(editorForm.store, (state) => state.values);
  const selectedCategory = categoryOptions.find(
    (category) => category.id === form.categoryId
  );
  const readinessItems = getReadinessItems(form, selectedCategory);
  const isReadyToPublish = readinessItems.every((item) => item.complete);
  const publishMutation = useMutation(
    orpc.listing.sellerWorkspace.publish.mutationOptions({
      onError: (error) => {
        toast.error(error.message || "Unable to publish listing");
      },
      onSuccess: async () => {
        toast.success("Listing published successfully");
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
      onError: (error) => {
        toast.error(error.message || "Unable to resume listing");
      },
      onSuccess: async () => {
        toast.success("Listing resumed and published");
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

  useEffect(() => {
    if (isArchived) {
      return;
    }

    const canPersistPublishedForm = !isPublished || isReadyToPublish;
    if (!canPersistPublishedForm) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveStatus("saving");
      const persistAutosave = async (): Promise<void> => {
        try {
          await enqueueSave({ id, ...buildUpdateInput(form) });
        } catch {
          // The mutation's error handler provides feedback to the seller.
        }
      };
      void persistAutosave();
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [enqueueSave, form, id, isArchived, isPublished, isReadyToPublish]);

  const activeStep = EDITOR_STEPS[activeStepIndex];
  const stepIsComplete = (stepId: EditorStepId) =>
    readinessItems
      .filter((item) => item.step === stepId)
      .every((item) => item.complete);
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

  const saveNow = async (): Promise<boolean> => {
    if (isArchived || (isPublished && !isReadyToPublish)) {
      if (isPublished) {
        toast.error("Complete the readiness checklist before saving changes");
      }
      return false;
    }

    setSaveStatus("saving");
    await editorForm.handleSubmit();
    if (!editorForm.state.isValid) {
      setSaveStatus("unsaved");
      return false;
    }
    return true;
  };

  const handleSaveAndExit = async () => {
    try {
      if (await saveNow()) {
        await navigate({
          search: { section: "products" },
          to: "/seller/store",
        });
      }
    } catch {
      // The mutation already surfaces the error to the seller.
    }
  };

  const handlePrimaryAction = async () => {
    if (!form || !isReadyToPublish) {
      return;
    }

    try {
      if (!(await saveNow())) {
        return;
      }
      if (listingStatus === "DRAFT") {
        await publishMutation.mutateAsync({ id });
      } else if (listingStatus === "PAUSED") {
        await resumeMutation.mutateAsync({ id });
      }
    } catch {
      // The mutation already surfaces the error to the seller.
    }
  };

  const isActionPending =
    updateDraftMutation.isPending ||
    publishMutation.isPending ||
    resumeMutation.isPending;
  const primaryActionLabel =
    listingStatus === "PAUSED" ? "Resume listing" : "Publish listing";
  const primaryActionAvailable =
    listingStatus === "DRAFT" || listingStatus === "PAUSED";
  const saveIndicatorClass = getSaveIndicatorClass(saveStatus);
  const saveStatusLabel = getSaveStatusLabel(saveStatus);

  return (
    <Shell variant="default">
      <div className="mx-auto max-w-7xl space-y-6 pb-28">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                if (isActionPending) {
                  event.preventDefault();
                  toast.info("Saving your changes…");
                  return;
                }

                if (saveStatus === "error" || saveStatus === "unsaved") {
                  event.preventDefault();
                  void handleSaveAndExit();
                }
              }}
              search={{ section: "products" }}
              to="/seller/store"
            >
              <ArrowLeft className="size-4" />
              Sản phẩm
            </Link>
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
              {form.type === "SERVICE" ? "New service" : "New course"} ·{" "}
              {STATUS_LABELS[listingStatus]}
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {form.title || "Set up your listing"}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Complete each step at your own pace. Your changes are saved
              automatically.
            </p>
          </div>
        </header>

        {isHidden ? (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>This listing is hidden by Avin</AlertTitle>
            <AlertDescription>
              You can update the content, but publication remains controlled by
              the moderation team.
            </AlertDescription>
          </Alert>
        ) : null}
        {isArchived ? (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertTitle>This listing is archived</AlertTitle>
            <AlertDescription>
              Archived listings are retained for order history and cannot be
              edited or restored.
            </AlertDescription>
          </Alert>
        ) : null}
        {saveStatus === "error" ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>We could not save your latest change</AlertTitle>
            <AlertDescription>
              Check your connection and try again.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
          <aside className="space-y-3 lg:sticky lg:top-6">
            <div className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Setup progress
            </div>
            <nav aria-label="Listing setup steps" className="space-y-1">
              {EDITOR_STEPS.map((step, index) => {
                const isActive = index === activeStepIndex;
                const isComplete = stepIsComplete(step.id);
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
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    key={step.id}
                    onClick={() => setActiveStepIndex(index)}
                    type="button"
                  >
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${stepIndicatorClass}`}
                    >
                      {isComplete ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
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
            <Card className="hidden bg-muted/25 lg:block">
              <CardContent className="flex gap-2 p-3 text-xs leading-5 text-muted-foreground">
                <Save className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Autosaved as you edit. You can return to any step later.
              </CardContent>
            </Card>
          </aside>

          <main>
            <Card className="min-h-[560px]">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Step {activeStepIndex + 1} of {EDITOR_STEPS.length}
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
                    Autosave on
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                <EditorStepContent
                  categories={categoryOptions}
                  disabled={isArchived}
                  editorForm={editorForm}
                  form={form}
                  onAddInputField={handleAddInputField}
                  onDirty={markUnsaved}
                  onParentCategoryChange={handleParentCategoryChange}
                  onRemoveInputField={handleRemoveInputField}
                  parentCategoryId={parentCategoryId}
                  listingId={id}
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
                  Back
                </Button>
                <Button
                  disabled={
                    isActionPending ||
                    activeStepIndex === EDITOR_STEPS.length - 1
                  }
                  onClick={() =>
                    setActiveStepIndex((index) =>
                      Math.min(index + 1, EDITOR_STEPS.length - 1)
                    )
                  }
                >
                  Continue
                  <ArrowRight />
                </Button>
              </CardFooter>
            </Card>
          </main>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <ReadinessPanel
              items={readinessItems}
              onSelectStep={(stepId) =>
                setActiveStepIndex(
                  EDITOR_STEPS.findIndex((step) => step.id === stepId)
                )
              }
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Eye className="size-4 text-primary" />
                  What happens next?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-5 text-muted-foreground">
                <p>
                  Review the storefront preview, then publish when every
                  requirement is complete.
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 p-3">
                  <FileCheck2 className="size-4 shrink-0 text-primary" />
                  {isPublished
                    ? "Published changes save automatically."
                    : "You can return to any step later."}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Save className="size-3.5 text-primary" />
            {saveStatus === "saving"
              ? "Saving your draft…"
              : "Your draft is safe"}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              disabled={isActionPending || isArchived}
              onClick={handleSaveAndExit}
              variant="outline"
            >
              Save & exit
            </Button>
            {primaryActionAvailable ? (
              <Button
                disabled={
                  isActionPending || isArchived || !isReadyToPublish || isHidden
                }
                onClick={handlePrimaryAction}
              >
                <Rocket />
                {primaryActionLabel}
              </Button>
            ) : null}
            {!isReadyToPublish && primaryActionAvailable ? (
              <span className="basis-full text-right text-[11px] text-muted-foreground sm:basis-auto">
                Complete the readiness checklist to continue.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
};

export const ListingEditorPage = () => {
  const { id } = useParams({ from: "/_authenticated/seller/listings/$id" });
  const navigate = useNavigate({ from: "/seller/listings/$id" });
  const listingQuery = useQuery(
    orpc.listing.sellerWorkspace.get.queryOptions({ input: { id } })
  );
  const categoriesQuery = useQuery(
    orpc.listing.discovery.categories.queryOptions()
  );
  const categoryOptions = useMemo(
    () => getCategoryOptions(categoriesQuery.data ?? []),
    [categoriesQuery.data]
  );

  if (listingQuery.isLoading || categoriesQuery.isLoading) {
    return <ListingEditorLoading />;
  }

  if (listingQuery.isError || categoriesQuery.isError || !listingQuery.data) {
    return (
      <Shell variant="default">
        <div className="mx-auto max-w-2xl py-12">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Unable to open this listing</AlertTitle>
            <AlertDescription>
              {listingQuery.error?.message ||
                categoriesQuery.error?.message ||
                "The listing may no longer be available to your seller account."}
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
      </Shell>
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
