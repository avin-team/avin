import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { NumberInput } from "@avin/ui/components/number-input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@avin/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@avin/ui/components/table";
import { Textarea } from "@avin/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, PackagePlus, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { servicePackagesQueryOptions } from "@/features/seller/api/service-packages";
import { servicePackageFormSchema } from "@/features/seller/schemas/service-package-schema";
import type { ServicePackageFormState } from "@/features/seller/schemas/service-package-schema";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

const EMPTY_SERVICE_PACKAGE_FORM: ServicePackageFormState = {
  description: "",
  name: "",
  priceAmount: "",
  processingTimeHours: "",
  warrantyDurationHours: "24",
  warrantyMode: "TIMED",
};

const WARRANTY_MODE_ITEMS = [
  { label: "Bảo hành", value: "TIMED" },
  { label: "Không BH", value: "NO_WARRANTY" },
] as const;

const STATUS_ITEMS = [
  { label: "Đang bán", value: "AVAILABLE" },
  { label: "Tạm tắt", value: "UNAVAILABLE" },
] as const;

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

// oxlint-disable-next-line complexity
export const ServicePackageManager = ({
  categoryBounds,
  disabled,
  listingId,
}: {
  categoryBounds: { maxHours: number; minHours: number } | undefined;
  disabled: boolean;
  inputFields?: unknown;
  listingId: string;
}) => {
  const queryClient = useQueryClient();
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
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
      warrantyDurationHours: String(categoryBounds?.minHours ?? 24),
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
        description: value.description.trim(),
        name: value.name.trim(),
        priceAmount: Number(value.priceAmount),
        processingTimeHours: Number(value.processingTimeHours),
        warrantyPolicy:
          value.warrantyMode === "TIMED"
            ? {
                durationHours: duration,
                kind: "TIMED" as const,
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
        setIsAdding(false);
        packageForm.reset({
          ...EMPTY_SERVICE_PACKAGE_FORM,
          warrantyDurationHours: String(categoryBounds?.minHours ?? 24),
        });
      } catch {
        // Mutation error handler shows toast
      }
    },
    validators: { onSubmit: servicePackageFormSchema },
  });

  const resetForm = (): void => {
    setEditingPackageId(null);
    setIsAdding(false);
    packageForm.reset({
      ...EMPTY_SERVICE_PACKAGE_FORM,
      warrantyDurationHours: String(categoryBounds?.minHours ?? 24),
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
    setIsAdding(false);
    setEditingPackageId(packageItem.id);
    packageForm.reset(
      packageItem.warrantyPolicy.kind === "TIMED"
        ? {
            description: packageItem.description,
            name: packageItem.name,
            priceAmount: String(packageItem.priceAmount),
            processingTimeHours: String(packageItem.processingTimeHours),
            warrantyDurationHours: String(
              packageItem.warrantyPolicy.durationHours
            ),
            warrantyMode: "TIMED",
          }
        : {
            description: packageItem.description,
            name: packageItem.name,
            priceAmount: String(packageItem.priceAmount),
            processingTimeHours: String(packageItem.processingTimeHours),
            warrantyDurationHours: String(categoryBounds?.minHours ?? 24),
            warrantyMode: "NO_WARRANTY",
          }
    );
  };

  const startAdding = (): void => {
    setEditingPackageId(null);
    setIsAdding(true);
    packageForm.reset({
      ...EMPTY_SERVICE_PACKAGE_FORM,
      warrantyDurationHours: String(categoryBounds?.minHours ?? 24),
    });
  };

  const renderInlineEditCells = () => (
    <>
      <TableCell className="min-w-56 align-top">
        <div className="flex items-center gap-1.5">
          <packageForm.Field name="name">
            {(field) => (
              <Input
                aria-label="Tên gói"
                className="h-8 text-xs font-medium"
                disabled={disabled || isPending}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Tên gói (Cơ bản…)"
                value={field.state.value}
              />
            )}
          </packageForm.Field>
          <packageForm.Field name="description">
            {(field) => (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      className="h-8 shrink-0 px-2 text-xs"
                      disabled={disabled || isPending}
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  <FileText aria-hidden="true" className="mr-1 size-3.5" />
                  {field.state.value.trim() ? "Mô tả ✓" : "Mô tả"}
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <PopoverHeader className="mb-2">
                    <PopoverTitle className="text-xs font-semibold">
                      Mô tả gói dịch vụ
                    </PopoverTitle>
                  </PopoverHeader>
                  <Textarea
                    aria-label="Mô tả gói dịch vụ"
                    className="text-xs"
                    disabled={disabled || isPending}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Khách hàng nhận được gì trong gói này?"
                    rows={4}
                    value={field.state.value}
                  />
                </PopoverContent>
              </Popover>
            )}
          </packageForm.Field>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <packageForm.Field name="priceAmount">
          {(field) => (
            <NumberInput
              aria-label="Giá VND"
              className="w-28"
              disabled={disabled || isPending}
              inputClassName="h-8 text-xs font-semibold"
              inputProps={{ onBlur: field.handleBlur }}
              min={1}
              name={field.name}
              onValueChange={(val) =>
                field.handleChange(val === null ? "" : String(val))
              }
              placeholder="100000"
              step={1}
              value={field.state.value ? Number(field.state.value) : null}
            />
          )}
        </packageForm.Field>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center gap-1">
          <packageForm.Field name="processingTimeHours">
            {(field) => (
              <NumberInput
                aria-label="Thời gian xử lý (giờ)"
                className="w-20"
                disabled={disabled || isPending}
                inputClassName="h-8 text-xs"
                inputProps={{ onBlur: field.handleBlur }}
                min={1}
                name={field.name}
                onValueChange={(val) =>
                  field.handleChange(val === null ? "" : String(val))
                }
                placeholder="24"
                step={1}
                value={field.state.value ? Number(field.state.value) : null}
              />
            )}
          </packageForm.Field>
          <span className="text-xs text-muted-foreground">giờ</span>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center gap-1.5">
          <packageForm.Field name="warrantyMode">
            {(field) => (
              <Select
                disabled={disabled || isPending}
                items={WARRANTY_MODE_ITEMS}
                onValueChange={(val) => {
                  if (val === "TIMED" || val === "NO_WARRANTY") {
                    field.handleChange(val);
                  }
                }}
                value={field.state.value}
              >
                <SelectTrigger className="h-8 text-xs" size="sm">
                  <SelectValue placeholder="Bảo hành" />
                </SelectTrigger>
                <SelectContent>
                  {WARRANTY_MODE_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </packageForm.Field>
          <packageForm.Subscribe
            selector={(state) => state.values.warrantyMode}
          >
            {(warrantyMode) =>
              warrantyMode === "TIMED" ? (
                <packageForm.Field name="warrantyDurationHours">
                  {(field) => (
                    <NumberInput
                      aria-label="Thời hạn bảo hành (giờ)"
                      className="w-16"
                      disabled={disabled || isPending}
                      inputClassName="h-8 text-xs"
                      inputProps={{ onBlur: field.handleBlur }}
                      max={categoryBounds?.maxHours}
                      min={categoryBounds?.minHours}
                      name={field.name}
                      onValueChange={(val) =>
                        field.handleChange(val === null ? "" : String(val))
                      }
                      placeholder="24"
                      step={1}
                      value={
                        field.state.value ? Number(field.state.value) : null
                      }
                    />
                  )}
                </packageForm.Field>
              ) : null
            }
          </packageForm.Subscribe>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant="outline" className="h-8 px-2 text-xs">
          Đang bán
        </Badge>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex items-center justify-end gap-1">
          <Button
            aria-label="Lưu gói"
            disabled={disabled || isPending}
            onClick={() => packageForm.handleSubmit()}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Check
              aria-hidden="true"
              className="size-4 text-emerald-600 dark:text-emerald-400"
            />
          </Button>
          <Button
            aria-label="Hủy"
            disabled={isPending}
            onClick={resetForm}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </>
  );

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus aria-hidden="true" className="size-4 text-primary" />
            Gói giá dịch vụ
          </CardTitle>
          <CardDescription className="mt-1 max-w-2xl">
            Mỗi dòng là một lựa chọn mà khách hàng có thể mua. Chỉnh sửa thông
            tin trực tiếp trên từng dòng.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {packagesQuery.isError ? (
          <p className="text-sm text-destructive">
            Không thể tải danh sách gói dịch vụ. Vui lòng thử lại.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Table>
            <TableHeader className="bg-muted/35">
              <TableRow>
                <TableHead className="min-w-48">Tên gói</TableHead>
                <TableHead>Giá (VND)</TableHead>
                <TableHead>Thời gian xử lý</TableHead>
                <TableHead>Bảo hành</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packagesQuery.data?.map((packageItem) => {
                const isEditingThisRow = editingPackageId === packageItem.id;
                if (isEditingThisRow) {
                  return (
                    <TableRow key={packageItem.id} className="bg-muted/20">
                      {renderInlineEditCells()}
                    </TableRow>
                  );
                }

                return (
                  <TableRow key={packageItem.id}>
                    <TableCell className="min-w-48 whitespace-normal">
                      <div className="font-semibold">{packageItem.name}</div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {packageItem.description}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatVND(packageItem.priceAmount)}
                    </TableCell>
                    <TableCell>{packageItem.processingTimeHours} giờ</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          packageItem.warrantyPolicy.kind === "TIMED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {packageItem.warrantyPolicy.kind === "TIMED"
                          ? `BH ${packageItem.warrantyPolicy.durationHours}h`
                          : "Không BH"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        disabled={disabled || isPending}
                        items={STATUS_ITEMS}
                        onValueChange={(val) =>
                          availabilityMutation.mutate({
                            available: val === "AVAILABLE",
                            id: packageItem.id,
                          })
                        }
                        value={packageItem.status}
                      >
                        <SelectTrigger className="h-8 text-xs" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={`Sửa ${packageItem.name}`}
                          disabled={disabled || isPending || isAdding}
                          onClick={() => startEditing(packageItem)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        {packageItem.firstPublishedAt === null && (
                          <Button
                            aria-label={`Xóa ${packageItem.name}`}
                            disabled={disabled || isPending || isAdding}
                            onClick={() =>
                              deleteMutation.mutate({ id: packageItem.id })
                            }
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2
                              aria-hidden="true"
                              className="size-4 text-destructive"
                            />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {isAdding && (
                <TableRow className="bg-muted/20">
                  {renderInlineEditCells()}
                </TableRow>
              )}

              {!packagesQuery.data?.length && !isAdding && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="font-medium text-sm">Chưa có gói giá nào</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Thêm ít nhất một gói để dịch vụ có thể đăng bán.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!isAdding && !editingPackageId && (
          <Button
            disabled={disabled || !isPersistedListing || isPending}
            onClick={startAdding}
            type="button"
            variant="outline"
          >
            <PackagePlus aria-hidden="true" className="mr-1.5 size-4" />
            Thêm gói giá
          </Button>
        )}

        {!isPersistedListing && (
          <p className="text-xs text-muted-foreground">
            Lưu bản nháp trước để mở quản lý gói dịch vụ.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
