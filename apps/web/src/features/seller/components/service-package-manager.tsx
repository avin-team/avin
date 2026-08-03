import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Pencil, Power, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { servicePackagesQueryOptions } from "@/features/seller/api/service-packages";
import { servicePackageFormSchema } from "@/features/seller/schemas/service-package-schema";
import type {
  ServicePackageFormInputField,
  ServicePackageFormState,
} from "@/features/seller/schemas/service-package-schema";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

const EMPTY_SERVICE_PACKAGE_FORM: ServicePackageFormState = {
  name: "",
  priceAmount: "",
  processingTimeHours: "",
  scope: "",
  serviceInputFields: [],
  warrantyDurationHours: "",
  warrantyMode: "TIMED",
  warrantyTerms: "",
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// oxlint-disable-next-line complexity
export const ServicePackageManager = ({
  categoryBounds,
  disabled,
  inputFields,
  listingId,
}: {
  categoryBounds: { maxHours: number; minHours: number } | undefined;
  disabled: boolean;
  inputFields: ServicePackageFormInputField[];
  listingId: string;
}) => {
  const queryClient = useQueryClient();
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const isPersistedListing = listingId !== "new";
  const packagesQuery = useQuery({
    ...servicePackagesQueryOptions(listingId),
    enabled: isPersistedListing,
  });
  const invalidatePackages = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: servicePackagesQueryOptions(listingId).queryKey,
    });
  };
  const createMutation = useMutation({
    ...orpc.listing.sellerWorkspace.servicePackages.create.mutationOptions(),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể tạo gói."));
    },
    onSuccess: async () => {
      await invalidatePackages();
      toast.success("Đã thêm gói dịch vụ.");
    },
  });
  const updateMutation = useMutation({
    ...orpc.listing.sellerWorkspace.servicePackages.update.mutationOptions(),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật gói."));
    },
    onSuccess: async () => {
      await invalidatePackages();
      toast.success("Đã cập nhật gói dịch vụ.");
    },
  });
  const availabilityMutation = useMutation({
    ...orpc.listing.sellerWorkspace.servicePackages.setAvailability.mutationOptions(),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật trạng thái gói."));
    },
    onSuccess: invalidatePackages,
  });
  const deleteMutation = useMutation({
    ...orpc.listing.sellerWorkspace.servicePackages.delete.mutationOptions(),
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa gói."));
    },
    onSuccess: invalidatePackages,
  });

  const packageForm = useForm({
    defaultValues: {
      ...EMPTY_SERVICE_PACKAGE_FORM,
      serviceInputFields: inputFields,
    },
    onSubmit: async ({ value }) => {
      if (!isPersistedListing) {
        toast.info("Lưu bản nháp trước rồi thêm gói dịch vụ.");
        return;
      }

      const duration = Number(value.warrantyDurationHours);
      if (
        value.warrantyMode === "TIMED" &&
        (!categoryBounds ||
          duration < categoryBounds.minHours ||
          duration > categoryBounds.maxHours)
      ) {
        toast.error(
          "Điền thời hạn bảo hành trong giới hạn của danh mục hiện tại."
        );
        return;
      }

      const packageInput = {
        name: value.name.trim(),
        priceAmount: Number(value.priceAmount),
        processingTimeHours: Number(value.processingTimeHours),
        scope: value.scope.trim(),
        serviceInputFields: value.serviceInputFields,
        warrantyPolicy:
          value.warrantyMode === "TIMED"
            ? {
                durationHours: duration,
                kind: "TIMED" as const,
                terms: value.warrantyTerms.trim(),
              }
            : { kind: "NO_WARRANTY" as const },
      };

      try {
        await (editingPackageId
          ? updateMutation.mutateAsync({
              id: editingPackageId,
              ...packageInput,
            })
          : createMutation.mutateAsync({ listingId, ...packageInput }));
        setEditingPackageId(null);
        packageForm.reset({
          ...EMPTY_SERVICE_PACKAGE_FORM,
          serviceInputFields: inputFields,
        });
      } catch {
        // The mutation error handler already shows the failure to the Seller.
      }
    },
    validators: { onSubmit: servicePackageFormSchema },
  });

  const resetPackageForm = (): void => {
    setEditingPackageId(null);
    packageForm.reset({
      ...EMPTY_SERVICE_PACKAGE_FORM,
      serviceInputFields: inputFields,
    });
  };

  const isPending =
    createMutation.isPending ||
    availabilityMutation.isPending ||
    deleteMutation.isPending ||
    updateMutation.isPending;
  const startEditing = (
    packageItem: NonNullable<typeof packagesQuery.data>[number]
  ): void => {
    setEditingPackageId(packageItem.id);
    packageForm.reset(
      packageItem.warrantyPolicy.kind === "TIMED"
        ? {
            name: packageItem.name,
            priceAmount: String(packageItem.priceAmount),
            processingTimeHours: String(packageItem.processingTimeHours),
            scope: packageItem.scope,
            serviceInputFields: packageItem.serviceInputFields,
            warrantyDurationHours: String(
              packageItem.warrantyPolicy.durationHours
            ),
            warrantyMode: "TIMED",
            warrantyTerms: packageItem.warrantyPolicy.terms,
          }
        : {
            name: packageItem.name,
            priceAmount: String(packageItem.priceAmount),
            processingTimeHours: String(packageItem.processingTimeHours),
            scope: packageItem.scope,
            serviceInputFields: packageItem.serviceInputFields,
            warrantyDurationHours: "",
            warrantyMode: "NO_WARRANTY",
            warrantyTerms: "",
          }
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackagePlus aria-hidden="true" className="size-4 text-primary" />
          Gói dịch vụ
        </CardTitle>
        <CardDescription>
          Mỗi gói có giá, phạm vi, thời gian xử lý và chính sách riêng. Gói đã
          từng bán chỉ có thể chuyển sang không khả dụng.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {packagesQuery.isError ? (
          <p className="text-sm text-destructive">
            Không thể tải danh sách gói dịch vụ. Vui lòng thử lại.
          </p>
        ) : null}
        {packagesQuery.data?.length ? (
          <div className="space-y-3">
            {packagesQuery.data.map((packageItem) => (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4"
                key={packageItem.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{packageItem.name}</p>
                    <Badge
                      variant={
                        packageItem.status === "AVAILABLE"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {packageItem.status === "AVAILABLE"
                        ? "Đang bán"
                        : "Tạm tắt"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-primary">
                    {formatVND(packageItem.priceAmount)} ·{" "}
                    {packageItem.processingTimeHours} giờ xử lý
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {packageItem.scope}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    aria-label={`Sửa ${packageItem.name}`}
                    disabled={disabled || isPending}
                    onClick={() => startEditing(packageItem)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    disabled={disabled || isPending}
                    onClick={() =>
                      availabilityMutation.mutate({
                        available: packageItem.status !== "AVAILABLE",
                        id: packageItem.id,
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Power aria-hidden="true" />
                    {packageItem.status === "AVAILABLE" ? "Tắt" : "Bật"}
                  </Button>
                  {packageItem.firstPublishedAt === null && (
                    <Button
                      aria-label={`Xóa ${packageItem.name}`}
                      disabled={disabled || isPending}
                      onClick={() =>
                        deleteMutation.mutate({ id: packageItem.id })
                      }
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <form
          className="space-y-4 border-t border-border/60 pt-5"
          onSubmit={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await packageForm.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4 sm:grid-cols-2">
            <packageForm.Field name="name">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="service-package-name">
                      Tên gói
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      disabled={disabled || !isPersistedListing || isPending}
                      id="service-package-name"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Cơ bản, Tiêu chuẩn, Cao cấp…"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </packageForm.Field>
            <packageForm.Field name="priceAmount">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="service-package-price">
                      Giá (VND)
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      disabled={disabled || !isPersistedListing || isPending}
                      id="service-package-price"
                      min={1}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      type="number"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </packageForm.Field>
            <packageForm.Field name="processingTimeHours">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="service-package-processing">
                      Thời gian xử lý (giờ)
                    </FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      disabled={disabled || !isPersistedListing || isPending}
                      id="service-package-processing"
                      min={1}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      type="number"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </packageForm.Field>
            <packageForm.Field name="warrantyMode">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="service-package-warranty-mode">
                      Chính sách bảo hành
                    </FieldLabel>
                    <select
                      aria-invalid={isInvalid}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                      disabled={disabled || !isPersistedListing || isPending}
                      id="service-package-warranty-mode"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        const nextMode = event.target.value;
                        if (
                          nextMode === "TIMED" ||
                          nextMode === "NO_WARRANTY"
                        ) {
                          field.handleChange(nextMode);
                        }
                      }}
                      value={field.state.value}
                    >
                      <option value="TIMED">Bảo hành theo thời hạn</option>
                      <option value="NO_WARRANTY">Không có bảo hành</option>
                    </select>
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </packageForm.Field>
            <packageForm.Field name="scope">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field className="sm:col-span-2" data-invalid={isInvalid}>
                    <FieldLabel htmlFor="service-package-scope">
                      Phạm vi bàn giao
                    </FieldLabel>
                    <Textarea
                      aria-invalid={isInvalid}
                      disabled={disabled || !isPersistedListing || isPending}
                      id="service-package-scope"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="Khách hàng nhận được gì trong gói này?"
                      rows={3}
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                );
              }}
            </packageForm.Field>
          </FieldGroup>

          <packageForm.Field name="serviceInputFields">
            {(field) => {
              const selectedFieldIds = new Set(
                field.state.value.map((inputField) => inputField.id)
              );
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field
                  className="rounded-xl border border-border/60 p-4 sm:col-span-2"
                  data-invalid={isInvalid}
                >
                  <FieldLabel>Thông tin Buyer cần cung cấp</FieldLabel>
                  <FieldDescription>
                    Chọn các trường riêng cho gói này. Có thể dùng tập trường
                    khác nhau giữa các gói.
                  </FieldDescription>
                  {inputFields.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {inputFields.map((inputField) => (
                        <label
                          aria-label={inputField.label}
                          className="flex items-start gap-2 rounded-lg border border-border/50 p-3 text-sm"
                          key={inputField.id}
                        >
                          <input
                            aria-invalid={isInvalid}
                            checked={selectedFieldIds.has(inputField.id)}
                            disabled={
                              disabled || !isPersistedListing || isPending
                            }
                            name={`${field.name}-${inputField.id}`}
                            onBlur={field.handleBlur}
                            onChange={(event) => {
                              const nextFields = event.target.checked
                                ? [...field.state.value, inputField]
                                : field.state.value.filter(
                                    (selectedField) =>
                                      selectedField.id !== inputField.id
                                  );
                              field.handleChange(nextFields);
                            }}
                            type="checkbox"
                          />
                          <span>
                            <span className="block font-medium">
                              {inputField.label}
                              {inputField.required ? " · bắt buộc" : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {inputField.key} · {inputField.type}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Listing này chưa có trường thông tin Buyer.
                    </p>
                  )}
                  {isInvalid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              );
            }}
          </packageForm.Field>

          <packageForm.Subscribe
            selector={(state) => state.values.warrantyMode}
          >
            {(warrantyMode) =>
              warrantyMode === "TIMED" ? (
                <FieldGroup className="gap-4 sm:grid-cols-2">
                  <packageForm.Field name="warrantyDurationHours">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="service-package-warranty-duration">
                            Thời hạn (giờ)
                          </FieldLabel>
                          <Input
                            aria-invalid={isInvalid}
                            disabled={
                              disabled || !isPersistedListing || isPending
                            }
                            id="service-package-warranty-duration"
                            max={categoryBounds?.maxHours}
                            min={categoryBounds?.minHours}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            type="number"
                            value={field.state.value}
                          />
                          <FieldDescription>
                            Phạm vi danh mục: {categoryBounds?.minHours ?? "—"}–
                            {categoryBounds?.maxHours ?? "—"} giờ.
                          </FieldDescription>
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </packageForm.Field>
                  <packageForm.Field name="warrantyTerms">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="service-package-warranty-terms">
                            Điều khoản
                          </FieldLabel>
                          <Textarea
                            aria-invalid={isInvalid}
                            disabled={
                              disabled || !isPersistedListing || isPending
                            }
                            id="service-package-warranty-terms"
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            rows={3}
                            value={field.state.value}
                          />
                          {isInvalid ? (
                            <FieldError errors={field.state.meta.errors} />
                          ) : null}
                        </Field>
                      );
                    }}
                  </packageForm.Field>
                </FieldGroup>
              ) : null
            }
          </packageForm.Subscribe>

          <div className="flex flex-wrap gap-2">
            <packageForm.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => {
                let submitLabel = "Thêm gói";
                if (isSubmitting) {
                  submitLabel = "Đang lưu…";
                } else if (editingPackageId) {
                  submitLabel = "Cập nhật gói";
                }

                return (
                  <Button
                    disabled={
                      disabled ||
                      !isPersistedListing ||
                      isPending ||
                      isSubmitting ||
                      !canSubmit
                    }
                    type="submit"
                  >
                    {editingPackageId ? (
                      <Pencil aria-hidden="true" />
                    ) : (
                      <PackagePlus aria-hidden="true" />
                    )}
                    {submitLabel}
                  </Button>
                );
              }}
            </packageForm.Subscribe>
            {editingPackageId ? (
              <Button
                disabled={isPending}
                onClick={resetPackageForm}
                type="button"
                variant="ghost"
              >
                <X aria-hidden="true" />
                Hủy sửa
              </Button>
            ) : null}
          </div>
        </form>
        {!isPersistedListing && (
          <p className="text-xs text-muted-foreground">
            Lưu bản nháp trước để mở quản lý gói. Các ServiceInputFields hiện
            tại sẽ được gắn vào gói mới.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
