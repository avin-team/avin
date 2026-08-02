import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import { FieldError } from "@avin/ui/components/field";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Skeleton } from "@avin/ui/components/skeleton";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  CirclePlus,
  ExternalLink,
  FileEdit,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

import { sellerProductCreationSchema } from "../schemas/store-product-creation-schema";
import {
  formatSellerListingPrice,
  getSellerListingStatusClass,
  getSellerListingStatusLabel,
  getSellerListingTypeLabel,
} from "./store-products-logic";
import type { SellerListingType } from "./store-products-logic";

type CreationStep = 1 | 2 | 3;

const LISTING_TYPE_OPTIONS: {
  description: string;
  icon: typeof Wrench;
  label: string;
  value: SellerListingType;
}[] = [
  {
    description: "Nhận yêu cầu và bàn giao kết quả cho khách hàng.",
    icon: Wrench,
    label: "Dịch vụ",
    value: "SERVICE",
  },
  {
    description: "Đóng gói kiến thức thành nội dung học có cấu trúc.",
    icon: BookOpen,
    label: "Khóa học",
    value: "COURSE",
  },
];

const ProductTypeChoice = ({
  onSelect,
  selected,
  type,
}: {
  onSelect: () => void;
  selected: boolean;
  type: (typeof LISTING_TYPE_OPTIONS)[number];
}) => {
  const Icon = type.icon;
  return (
    <button
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-background hover:border-primary/50"
      }`}
      onClick={onSelect}
      aria-pressed={selected}
      type="button"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{type.label}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
          {type.description}
        </span>
      </span>
      {selected ? <CircleCheck className="size-5 text-primary" /> : null}
    </button>
  );
};

const ProductCreationWizard = ({ onCancel }: { onCancel: () => void }) => {
  const navigate = useNavigate({ from: "/seller/store" });
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery(
    orpc.listing.discovery.categories.queryOptions()
  );
  const [step, setStep] = useState<CreationStep>(1);

  const createMutation = useMutation(
    orpc.listing.sellerWorkspace.createDraft.mutationOptions({
      onError: () => {
        toast.error("Không thể tạo bản nháp sản phẩm. Vui lòng thử lại.");
      },
      onSuccess: async (created) => {
        setStep(3);
        await queryClient.invalidateQueries({
          queryKey: orpc.listing.sellerWorkspace.listMine.key(),
        });
        toast.success("Đã tạo bản nháp. Tiếp tục hoàn thiện sản phẩm nhé.");
        await navigate({
          params: { id: created.id },
          to: "/seller/listings/$id",
        });
      },
    })
  );

  const form = useForm({
    defaultValues: {
      categoryId: "",
      parentCategoryId: "",
      title: "",
      type: "SERVICE" as SellerListingType,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync({
        categoryId: value.categoryId,
        title: value.title.trim() || null,
        type: value.type,
      });
    },
    validators: {
      onChange: sellerProductCreationSchema,
      onSubmit: sellerProductCreationSchema,
    },
  });

  const categoryId = useStore(form.store, (state) => state.values.categoryId);
  const parentCategoryId = useStore(
    form.store,
    (state) => state.values.parentCategoryId
  );
  const title = useStore(form.store, (state) => state.values.title);
  const type = useStore(form.store, (state) => state.values.type);

  const selectedParent = categoriesQuery.data?.find(
    (category) => category.id === parentCategoryId
  );
  const parentCategories = categoriesQuery.data ?? [];
  const subCategories = selectedParent?.subCategories ?? [];
  const selectedCategory = subCategories.find(
    (category) => category.id === categoryId
  );

  const handleParentCategoryChange = (value: string | null) => {
    form.setFieldValue("parentCategoryId", value ?? "");
    form.setFieldValue("categoryId", "");
  };

  return (
    <form
      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      id="seller-product-creation-form"
      onSubmit={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        await form.handleSubmit();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <Button
            aria-label="Quay lại danh sách sản phẩm"
            onClick={onCancel}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge
                className="border-primary/30 text-primary"
                variant="outline"
              >
                BẢN NHÁP
              </Badge>
              <span className="text-xs text-muted-foreground">
                Bước {step}/3
              </span>
            </div>
            <p className="mt-1 font-semibold">Thêm sản phẩm</p>
          </div>
        </div>
        <Button onClick={onCancel} type="button" variant="ghost">
          Hủy
        </Button>
      </div>

      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/20 p-5 lg:border-b-0 lg:border-r">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Quy trình
          </p>
          <div className="mt-6 space-y-5">
            {[
              "Chọn loại sản phẩm",
              "Xác nhận bản nháp",
              "Hoàn thiện & đăng bán",
            ].map((label, index) => {
              const stepNumber = index + 1;
              const isComplete = stepNumber < step;
              const isCurrent = stepNumber === step;
              let stepClass = "border border-border text-muted-foreground";
              if (isComplete) {
                stepClass = "bg-primary text-primary-foreground";
              } else if (isCurrent) {
                stepClass = "border-2 border-primary text-primary";
              }

              return (
                <div className="flex items-start gap-3" key={label}>
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${stepClass}`}
                  >
                    {isComplete ? <Check className="size-3.5" /> : stepNumber}
                  </span>
                  <span
                    className={`pt-1 text-sm ${
                      isCurrent ? "font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
            Bản nháp được lưu trước khi bạn điền các thông tin chi tiết.
          </div>
        </aside>

        <div className="flex min-h-[540px] flex-col">
          <div className="flex-1 p-6 sm:p-8">
            {(() => {
              if (step === 1) {
                return (
                  <div className="mx-auto max-w-2xl">
                    <p className="text-sm font-medium text-primary">Bước 1/3</p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Bạn muốn bán gì?
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Chọn loại và danh mục để Avin chuẩn bị đúng bộ thông tin
                      cho sản phẩm.
                    </p>

                    <form.Field name="type">
                      {(field) => (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {LISTING_TYPE_OPTIONS.map((option) => (
                            <ProductTypeChoice
                              key={option.value}
                              onSelect={() => field.handleChange(option.value)}
                              selected={field.state.value === option.value}
                              type={option}
                            />
                          ))}
                        </div>
                      )}
                    </form.Field>

                    <div className="mt-7 grid gap-5 sm:grid-cols-2">
                      <form.Field name="parentCategoryId">
                        {(field) => (
                          <div className="grid gap-2">
                            <Label htmlFor="seller-product-parent-category">
                              Nhóm danh mục
                            </Label>
                            <Select
                              disabled={categoriesQuery.isPending}
                              items={parentCategories.map((category) => ({
                                label: category.name,
                                value: category.id,
                              }))}
                              onValueChange={handleParentCategoryChange}
                              value={field.state.value}
                            >
                              <SelectTrigger id="seller-product-parent-category">
                                <SelectValue
                                  placeholder={
                                    categoriesQuery.isPending
                                      ? "Đang tải danh mục..."
                                      : "Chọn nhóm danh mục"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {parentCategories.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                          </div>
                        )}
                      </form.Field>

                      <form.Field name="categoryId">
                        {(field) => (
                          <div className="grid gap-2">
                            <Label htmlFor="seller-product-category">
                              Danh mục
                            </Label>
                            <Select
                              disabled={
                                !parentCategoryId || categoriesQuery.isPending
                              }
                              items={subCategories.map((category) => ({
                                label: category.name,
                                value: category.id,
                              }))}
                              onValueChange={(value) =>
                                field.handleChange(value ?? "")
                              }
                              value={field.state.value}
                            >
                              <SelectTrigger id="seller-product-category">
                                <SelectValue
                                  placeholder={
                                    parentCategoryId
                                      ? "Chọn danh mục"
                                      : "Chọn nhóm trước"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {subCategories.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={category.id}
                                  >
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                          </div>
                        )}
                      </form.Field>
                    </div>

                    <form.Field name="title">
                      {(field) => (
                        <div className="mt-5 grid gap-2">
                          <Label htmlFor="seller-product-title">
                            Tên sản phẩm tạm thời
                          </Label>
                          <Input
                            aria-invalid={
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid
                            }
                            id="seller-product-title"
                            maxLength={200}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                            placeholder="Ví dụ: Thiết kế logo cho thương hiệu mới"
                            value={field.state.value}
                          />
                          <p className="text-xs text-muted-foreground">
                            Bạn có thể đổi tên và hoàn thiện nội dung ở bước
                            tiếp theo.
                          </p>
                          <FieldError errors={field.state.meta.errors} />
                        </div>
                      )}
                    </form.Field>

                    {categoriesQuery.isError ? (
                      <Alert className="mt-5" variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Không tải được danh mục</AlertTitle>
                        <AlertDescription>
                          Vui lòng thử lại trước khi tạo sản phẩm.
                        </AlertDescription>
                        <Button
                          className="mt-3"
                          onClick={() => void categoriesQuery.refetch()}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <RefreshCw />
                          Thử lại
                        </Button>
                      </Alert>
                    ) : null}
                  </div>
                );
              }

              if (step === 2) {
                return (
                  <div className="mx-auto max-w-2xl">
                    <p className="text-sm font-medium text-primary">Bước 2/3</p>
                    <h2 className="mt-2 text-xl font-semibold">
                      Xác nhận để tạo bản nháp
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sau khi tạo, bạn sẽ được đưa thẳng tới màn hình hoàn thiện
                      có autosave và checklist đăng bán.
                    </p>
                    <div className="mt-7 space-y-3">
                      {[
                        {
                          label: "Loại sản phẩm",
                          value: getSellerListingTypeLabel(type),
                        },
                        {
                          label: "Danh mục",
                          value: selectedCategory?.name ?? "Chưa chọn",
                        },
                        {
                          label: "Tên tạm thời",
                          value: title.trim() || "Chưa đặt tên",
                        },
                      ].map((item) => (
                        <div
                          className="flex items-center gap-3 rounded-2xl border border-border p-4"
                          key={item.label}
                        >
                          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Check className="size-4" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-xs text-muted-foreground">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-sm font-medium">
                              {item.value}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Tiếp theo</p>
                      <p className="mt-1 leading-6">
                        Điền mô tả, giá, thời gian hoàn thành, hình ảnh và chính
                        sách bảo hành trong editor. Bạn không cần làm lại bước
                        này.
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-20 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="size-7 animate-spin" />
                  </span>
                  <h2 className="mt-5 text-xl font-semibold">
                    Đang mở trình hoàn thiện sản phẩm
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    Bản nháp đã được tạo. Bạn sẽ được chuyển tới editor để điền
                    các thông tin chi tiết và hoàn thiện checklist đăng bán.
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/10 px-6 py-4 sm:px-8">
            <Button
              disabled={step !== 2 || createMutation.isPending}
              onClick={() => setStep(1)}
              type="button"
              variant="ghost"
            >
              <ArrowLeft />
              Quay lại
            </Button>
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => {
                const isPending = isSubmitting || createMutation.isPending;

                if (step === 1) {
                  return (
                    <Button
                      disabled={!canSubmit || isPending}
                      onClick={() => setStep(2)}
                      type="button"
                    >
                      Tiếp tục
                      <ArrowRight />
                    </Button>
                  );
                }

                if (step === 2) {
                  return (
                    <Button disabled={!canSubmit || isPending} type="submit">
                      {isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CirclePlus />
                      )}
                      Tạo bản nháp & tiếp tục
                    </Button>
                  );
                }

                return (
                  <Button disabled type="button">
                    <Loader2 className="size-4 animate-spin" />
                    Đang chuyển tới editor...
                  </Button>
                );
              }}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </form>
  );
};

const ProductRow = ({
  listing,
  onOpen,
}: {
  listing: {
    id: string;
    priceAmount: number | null;
    slug: string | null;
    status: "ARCHIVED" | "DRAFT" | "HIDDEN" | "PAUSED" | "PUBLISHED";
    title: string | null;
    type: SellerListingType;
  };
  onOpen: () => void;
}) => (
  <li className="flex flex-wrap items-center gap-4 border-b border-border/60 py-4 last:border-b-0">
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Package className="size-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-sm font-semibold">
          {listing.title || "Sản phẩm chưa đặt tên"}
        </p>
        <Badge
          className={getSellerListingStatusClass(listing.status)}
          variant="outline"
        >
          {getSellerListingStatusLabel(listing.status)}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {getSellerListingTypeLabel(listing.type)} ·{" "}
        {formatSellerListingPrice(listing.priceAmount)}
      </p>
    </div>
    <div className="flex items-center gap-2">
      <Button onClick={onOpen} size="sm" variant="outline">
        <FileEdit />
        Mở hồ sơ
      </Button>
      {listing.status === "PUBLISHED" && listing.slug ? (
        <Button
          render={<Link params={{ id: listing.slug }} to="/listing/$id" />}
          size="sm"
          variant="ghost"
        >
          <ExternalLink />
          Xem
        </Button>
      ) : null}
    </div>
  </li>
);

export const StoreProductsPanel = () => {
  const navigate = useNavigate({ from: "/seller/store" });
  const [isCreating, setIsCreating] = useState(false);
  const listingsQuery = useQuery(
    orpc.listing.sellerWorkspace.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );

  if (isCreating) {
    return <ProductCreationWizard onCancel={() => setIsCreating(false)} />;
  }

  if (listingsQuery.isPending) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold">Sản phẩm</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quản lý những gì bạn cung cấp cho khách hàng.
            </p>
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </section>
    );
  }

  if (listingsQuery.isError) {
    return (
      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Không thể tải sản phẩm</AlertTitle>
          <AlertDescription>
            Vui lòng thử lại để tải danh sách sản phẩm.
          </AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => void listingsQuery.refetch()}
          variant="outline"
        >
          <RefreshCw />
          Thử lại
        </Button>
      </section>
    );
  }

  const listings = listingsQuery.data;

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">Sản phẩm</p>
            <Badge variant="secondary">{listings.length}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý những gì bạn cung cấp cho khách hàng.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus />
          Thêm sản phẩm
        </Button>
      </div>

      {listings.length > 0 ? (
        <ul className="mt-4">
          {listings.map((listing) => (
            <ProductRow
              key={listing.id}
              listing={listing}
              onOpen={() =>
                void navigate({
                  params: { id: listing.id },
                  to: "/seller/listings/$id",
                })
              }
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package className="size-6" />
          </span>
          <h2 className="mt-4 font-semibold">Gian hàng chưa có sản phẩm</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Tạo sản phẩm đầu tiên để bắt đầu hoàn thiện gian hàng và mở bán.
          </p>
          <Button className="mt-5" onClick={() => setIsCreating(true)}>
            <Plus />
            Tạo sản phẩm đầu tiên
          </Button>
        </div>
      )}
    </section>
  );
};
