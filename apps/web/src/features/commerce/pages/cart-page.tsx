import { ACCOUNT_ROLE } from "@avin/auth/permissions";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Checkbox } from "@avin/ui/components/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Skeleton } from "@avin/ui/components/skeleton";
import { Textarea } from "@avin/ui/components/textarea";
import {
  WarningCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LockKeyIcon,
  TrashIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import { useSession } from "@/features/auth/api/session-query";
import {
  reconcileCartItemPackageMutation,
  removeCartItemOptimistically,
  setCartItemPackageOptimistically,
  setCartItemSelectedOptimistically,
} from "@/features/commerce/cart-cache";
import type { CartView } from "@/features/commerce/cart-cache";
import { OrderImageUploader } from "@/features/commerce/components/order-image-uploader";
import type {
  OrderImageAttachment,
  OrderImageUploadMetadata,
} from "@/features/commerce/components/order-image-uploader";
import {
  walletSummaryQueryOptions,
  walletTransactionsQueryOptions,
} from "@/features/wallet/api/wallet-api";
import { formatVND } from "@/utils/format";
import { orpc } from "@/utils/orpc";

interface CartItem {
  available: boolean;
  cartItemId: string;
  contractFingerprint: string | null;
  listing: {
    id: string;
    priceAmount: number | null;
    processingTimeHours: number | null;
    servicePackages?: {
      description: string;
      id: string;
      name: string;
      priceAmount: number;
      processingTimeHours: number;
      status: "AVAILABLE" | "UNAVAILABLE";
    }[];
    slug: string;
    thumbnailUrl: string | null;
    title: string | null;
    type: "COURSE" | "SERVICE";
    warrantyDurationHours: number | null;
  };
  selected: boolean;
  selectedPackageId?: string | null;
  seller: {
    id: string;
    image: string | null;
    name: string;
  };
}

const EMPTY_CART_ITEMS: CartItem[] = [];

const noopDescriptionChange = (_description: string): void => undefined;

const unavailableAttachmentAction = (): Promise<never> =>
  Promise.reject(new Error("Checkout attachment actions are unavailable"));

const CartItemThumbnail = ({
  title,
  type,
  url,
}: {
  title: string | null;
  type: "COURSE" | "SERVICE";
  url: string | null;
}) => (
  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border">
    {url ? (
      <img
        alt={title ?? "Listing"}
        className="size-full object-cover"
        src={url}
      />
    ) : (
      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
        {type === "SERVICE" ? "Dịch vụ" : "Khóa học"}
      </div>
    )}
  </div>
);

const CartItemPackageSelect = ({
  disabled,
  listingId,
  onSelectPackage,
  packages,
  selectedPackageId,
}: {
  disabled: boolean;
  listingId: string;
  onSelectPackage?: (packageId: string) => void;
  packages: NonNullable<CartItem["listing"]["servicePackages"]>;
  selectedPackageId?: string | null;
}) => {
  const items = packages.map((pkg) => ({
    label: `${pkg.name}${pkg.status === "UNAVAILABLE" ? " (không khả dụng)" : ""}`,
    value: pkg.id,
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">Gói:</span>
      <Select
        disabled={disabled}
        items={items}
        onValueChange={(val) => {
          if (val) {
            onSelectPackage?.(val);
          }
        }}
        value={selectedPackageId ?? undefined}
      >
        <SelectTrigger
          aria-label={`Chọn gói dịch vụ cho ${listingId}`}
          className="h-8 min-w-32.5 text-xs font-medium"
          size="sm"
        >
          <SelectValue placeholder="Chọn một gói" />
        </SelectTrigger>
        <SelectContent align="end">
          {packages.map((packageItem) => (
            <SelectItem
              disabled={packageItem.status !== "AVAILABLE"}
              key={packageItem.id}
              value={packageItem.id}
            >
              {packageItem.name}
              {packageItem.status === "UNAVAILABLE" ? " (không khả dụng)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

/**
 * Option C — Side-by-Side Split Cart Item Card using theme colors & design system tokens
 */
export const CartItemCard = ({
  actionPending,
  checkoutKey = "",
  item,
  onBusyChange,
  onDescriptionChange = noopDescriptionChange,
  onCreateAttachment,
  onDiscardAttachment,
  onRemove,
  onSelectPackage,
  onToggle,
  selectionPending,
}: {
  actionPending: boolean;
  checkoutKey?: string;
  item: CartItem;
  onCreateAttachment?: (
    input: OrderImageUploadMetadata
  ) => Promise<OrderImageAttachment>;
  onBusyChange?: (busy: boolean) => void;
  onDescriptionChange?: (description: string) => void;
  onDiscardAttachment?: (attachmentId: string) => Promise<void>;
  onRemove: () => void;
  onSelectPackage?: (packageId: string) => void;
  onToggle: (selected: boolean) => void;
  selectionPending: boolean;
}) => {
  const currentPkg = item.listing.servicePackages?.find(
    (p) => p.id === item.selectedPackageId
  );
  const currentPrice = currentPkg
    ? currentPkg.priceAmount
    : (item.listing.priceAmount ?? 0);
  const packages = item.listing.servicePackages ?? [];
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const disabled = actionPending || selectionPending || attachmentBusy;
  const inputDisabled = disabled || !item.selected;
  const [description, setDescription] = useState("");

  return (
    <Card className={item.selected ? "border-primary/40" : "opacity-80"}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Checkbox
            aria-label={`Chọn ${item.listing.title ?? "Listing"}`}
            checked={item.selected}
            className="mt-1"
            disabled={actionPending}
            onCheckedChange={(checked) => onToggle(Boolean(checked))}
          />

          <CartItemThumbnail
            title={item.listing.title}
            type={item.listing.type}
            url={item.listing.thumbnailUrl}
          />

          <div className="grid flex-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <Link
                className="font-bold text-foreground hover:text-primary"
                params={{ id: item.listing.slug }}
                to="/listing/$id"
              >
                {item.listing.title ?? "Listing chưa đặt tên"}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Người bán: {item.seller.name}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ClockIcon className="size-3.5 text-muted-foreground" />
                  {item.listing.processingTimeHours ?? "—"} giờ xử lý
                </span>
                <span className="inline-flex items-center gap-1">
                  <LockKeyIcon className="size-3.5 text-primary" />
                  Thanh toán an toàn
                </span>
                {item.available ? null : (
                  <span className="font-medium text-destructive">
                    Không còn khả dụng
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end justify-between gap-3 sm:text-right">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-primary">
                  {formatVND(currentPrice)}
                </span>
                <Button
                  aria-label={`Xóa ${item.listing.title ?? "sản phẩm"} khỏi Giỏ hàng`}
                  disabled={disabled}
                  onClick={onRemove}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>

              {item.listing.type === "SERVICE" && packages.length > 0 ? (
                <CartItemPackageSelect
                  disabled={disabled}
                  listingId={item.listing.id}
                  onSelectPackage={onSelectPackage}
                  packages={packages}
                  selectedPackageId={item.selectedPackageId}
                />
              ) : null}
            </div>
          </div>
        </div>
        <details className="group mt-4 rounded-xl border border-border/60 bg-muted/20">
          <summary className="flex cursor-pointer items-center justify-between list-none px-3 py-2 text-sm font-semibold marker:hidden">
            <span>
              Thêm mô tả hoặc hình ảnh{" "}
              <span className="font-normal text-muted-foreground">
                (Không bắt buộc)
              </span>
            </span>
            <CaretDownIcon className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-border/60 p-3">
            <label
              className="grid gap-1.5 text-sm font-medium"
              htmlFor={`checkout-description-${item.listing.id}`}
            >
              Mô tả cho người bán
              <Textarea
                disabled={inputDisabled}
                id={`checkout-description-${item.listing.id}`}
                maxLength={1000}
                onChange={(event) => {
                  const nextDescription = event.target.value;
                  setDescription(nextDescription);
                  onDescriptionChange(nextDescription);
                }}
                placeholder="Mô tả yêu cầu hoặc thông tin bạn muốn gửi người bán..."
                value={description}
              />
            </label>
            <OrderImageUploader
              disabled={inputDisabled}
              metadata={{
                checkoutKey,
                listingId: item.listing.id,
              }}
              onBusyChange={(busy) => {
                setAttachmentBusy(busy);
                onBusyChange?.(busy);
              }}
              onCreateAttachment={
                onCreateAttachment ?? unavailableAttachmentAction
              }
              onDiscardAttachment={
                onDiscardAttachment ?? unavailableAttachmentAction
              }
              route="checkout-attachment"
              uploadPath="/api/checkout-attachment-upload"
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

const CheckoutSummary = ({
  children,
  hasMissingContract,
  hasUnavailableSelected,
  selectedCount,
  totalAmount,
}: {
  children: ReactNode;
  hasMissingContract: boolean;
  hasUnavailableSelected: boolean;
  selectedCount: number;
  totalAmount: number;
}) => (
  <Card className="h-fit lg:sticky lg:top-24">
    <CardHeader>
      <CardTitle>Tóm tắt thanh toán</CardTitle>
      <CardDescription>{selectedCount} sản phẩm được chọn</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="text-sm text-muted-foreground">Tạm tính</span>
        <span className="text-xl font-bold text-primary">
          {formatVND(totalAmount)}
        </span>
      </div>
      <div className="space-y-2 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-emerald-500" />
          Mỗi người bán có đơn hàng riêng
        </p>
        <p className="flex items-center gap-2">
          <LockKeyIcon className="size-4 text-primary" />
          Giữ tiền an toàn tới khi hoàn tất
        </p>
      </div>
      {hasUnavailableSelected ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          Bỏ chọn hoặc xóa Listing không còn khả dụng trước khi Checkout.
        </p>
      ) : null}
      {hasMissingContract ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          Giỏ hàng cần được tải lại để xem lại thông tin mới nhất.
        </p>
      ) : null}
      {children}
    </CardContent>
  </Card>
);

export const CartPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isSeller = session?.user?.role === ACCOUNT_ROLE.SELLER;
  const cartQuery = useQuery({
    ...orpc.commerce.cart.get.queryOptions(),
    enabled: !isSeller,
  });
  const [contractChanged, setContractChanged] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const checkoutDescriptionsRef = useRef(new Map<string, string>());
  const checkoutAttachmentBusyRef = useRef(new Set<string>());
  const confirmationRequested = useRef(false);
  const selectionQueueRef = useRef<Promise<void> | null>(null);
  const pendingSelectionCountRef = useRef(0);
  const selectionLastServerCartRef = useRef<CartView | null>(null);
  const selectionHadErrorRef = useRef(false);
  const [selectionPending, setSelectionPending] = useState(false);
  const [checkoutAttachmentsBusy, setCheckoutAttachmentsBusy] = useState(false);

  const invalidateCart = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.commerce.cart.get.queryOptions().queryKey,
    });
  };

  const toggleMutation = useMutation(
    orpc.commerce.cart.setSelected.mutationOptions()
  );
  const packageMutation = useMutation({
    ...orpc.commerce.cart.selectPackage.mutationOptions(),
    onError: (
      error,
      { listingId, packageId },
      context: { previousCart?: CartView } | undefined
    ) => {
      if (context?.previousCart) {
        queryClient.setQueryData<CartView>(
          orpc.commerce.cart.get.queryOptions().queryKey,
          (currentCart) =>
            reconcileCartItemPackageMutation(
              currentCart,
              context.previousCart,
              listingId,
              packageId
            )
        );
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật gói dịch vụ."
      );
    },
    onMutate: async ({ listingId, packageId }) => {
      const cartQueryKey = orpc.commerce.cart.get.queryOptions().queryKey;
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousCart = queryClient.getQueryData<CartView>(cartQueryKey);

      queryClient.setQueryData<CartView>(cartQueryKey, (currentCart) =>
        setCartItemPackageOptimistically(currentCart, listingId, packageId)
      );

      return { previousCart };
    },
    onSuccess: (updatedCart, { listingId, packageId }) => {
      queryClient.setQueryData<CartView>(
        orpc.commerce.cart.get.queryOptions().queryKey,
        (currentCart) =>
          reconcileCartItemPackageMutation(
            currentCart,
            updatedCart,
            listingId,
            packageId
          )
      );
    },
  });

  const queueSelectionUpdate = (variables: {
    listingId: string;
    selected: boolean;
  }): void => {
    const cartQueryKey = orpc.commerce.cart.get.queryOptions().queryKey;
    queryClient.setQueryData<CartView>(cartQueryKey, (currentCart) =>
      setCartItemSelectedOptimistically(
        currentCart,
        variables.listingId,
        variables.selected
      )
    );
    pendingSelectionCountRef.current += 1;
    setSelectionPending(true);

    const runSelectionUpdate = async (): Promise<void> => {
      try {
        const serverCart = await toggleMutation.mutateAsync(variables);
        selectionLastServerCartRef.current = serverCart;
      } catch (error) {
        selectionHadErrorRef.current = true;
        toast.error(
          error instanceof Error
            ? error.message
            : "Không thể cập nhật Giỏ hàng. Vui lòng thử lại."
        );
      }
      pendingSelectionCountRef.current -= 1;
      if (pendingSelectionCountRef.current === 0) {
        if (
          selectionHadErrorRef.current ||
          selectionLastServerCartRef.current === null
        ) {
          await invalidateCart();
        } else {
          queryClient.setQueryData(
            cartQueryKey,
            selectionLastServerCartRef.current
          );
        }
        selectionLastServerCartRef.current = null;
        selectionHadErrorRef.current = false;
        setSelectionPending(false);
      }
    };

    const previousPromise = selectionQueueRef.current;
    const queuedRequest = (async () => {
      if (previousPromise) {
        try {
          await previousPromise;
        } catch {
          // ignore previous error
        }
      }
      await runSelectionUpdate();
    })();

    selectionQueueRef.current = queuedRequest;
  };

  const removeMutation = useMutation({
    ...orpc.commerce.cart.remove.mutationOptions(),
    onError: (error) => {
      void invalidateCart();
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xóa sản phẩm khỏi Giỏ hàng. Vui lòng thử lại."
      );
    },
    onMutate: async ({ listingId }) => {
      const cartQueryKey = orpc.commerce.cart.get.queryOptions().queryKey;
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousCart = queryClient.getQueryData<CartView>(cartQueryKey);

      queryClient.setQueryData<CartView>(cartQueryKey, (currentCart) =>
        removeCartItemOptimistically(currentCart, listingId)
      );

      return { previousCart };
    },
    onSettled: invalidateCart,
    onSuccess: (cart) => {
      queryClient.setQueryData(
        orpc.commerce.cart.get.queryOptions().queryKey,
        cart
      );
    },
  });

  const checkoutMutation = useMutation(
    orpc.commerce.checkout.create.mutationOptions()
  );
  const createCheckoutAttachmentMutation = useMutation(
    orpc.commerce.checkout.attachments.create.mutationOptions()
  );
  const discardCheckoutAttachmentMutation = useMutation(
    orpc.commerce.checkout.attachments.discard.mutationOptions()
  );

  const cart = cartQuery.data;
  const items = useMemo(() => cart?.items ?? EMPTY_CART_ITEMS, [cart?.items]);
  const selectedItems = items.filter((item) => item.selected);
  useEffect(() => {
    const visibleListingIds = new Set(items.map((item) => item.listing.id));
    for (const listingId of checkoutDescriptionsRef.current.keys()) {
      if (!visibleListingIds.has(listingId)) {
        checkoutDescriptionsRef.current.delete(listingId);
      }
    }
    for (const listingId of checkoutAttachmentBusyRef.current) {
      if (!visibleListingIds.has(listingId)) {
        checkoutAttachmentBusyRef.current.delete(listingId);
      }
    }
    setCheckoutAttachmentsBusy(checkoutAttachmentBusyRef.current.size > 0);
  }, [items]);
  const hasUnavailableSelected = selectedItems.some((item) => !item.available);
  const hasMissingContract = selectedItems.some(
    (item) => item.contractFingerprint === null
  );
  const actionPending = removeMutation.isPending || checkoutMutation.isPending;
  const busy = actionPending || selectionPending || checkoutAttachmentsBusy;

  const submitCheckout = async (confirm = false): Promise<void> => {
    if (!cart || selectedItems.length === 0 || checkoutAttachmentsBusy) {
      return;
    }

    try {
      await checkoutMutation.mutateAsync({
        confirmMaterialChanges: confirm,
        idempotencyKey: checkoutKey,
        items: selectedItems.map((item) => ({
          contractFingerprint: item.contractFingerprint ?? "0".repeat(64),
          description:
            checkoutDescriptionsRef.current.get(item.listing.id) ?? "",
          listingId: item.listing.id,
          packageId: item.selectedPackageId,
        })),
      });
      checkoutDescriptionsRef.current.clear();
      checkoutAttachmentBusyRef.current.clear();
      setCheckoutAttachmentsBusy(false);
      setCheckoutKey(crypto.randomUUID());
      setContractChanged(false);
      await Promise.all([
        invalidateCart(),
        queryClient.invalidateQueries({
          queryKey: walletSummaryQueryOptions().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: walletTransactionsQueryOptions().queryKey,
        }),
      ]);
      toast.success("Thanh toán thành công. Tiền đang được tạm giữ an toàn.");
      await navigate({ to: "/orders" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("thay đổi")) {
        setContractChanged(true);
        return;
      }
      toast.error(message || "Không thể Checkout. Vui lòng thử lại.");
    }
  };

  const checkoutForm = useForm({
    defaultValues: {},
    onSubmit: async () => {
      await submitCheckout(confirmationRequested.current);
    },
  });

  if (cartQuery.isPending) {
    return (
      <Shell variant="default">
        <div className="space-y-4 py-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Shell>
    );
  }

  if (isSeller) {
    return (
      <Shell variant="default">
        <div className="py-16">
          <Card className="mx-auto max-w-xl">
            <CardContent className="space-y-4 px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <WarningCircleIcon className="h-7 w-7" />
              </div>
              <h2 className="font-bold text-xl">Giỏ hàng dành cho Người mua</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Bạn đang đăng nhập bằng tài khoản Người bán. Tài khoản Người bán
                không thể sử dụng giỏ hàng hoặc mua sắm trên hệ thống.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button render={<Link to="/seller/store" />}>
                  Về Kênh người bán
                </Button>
                <Button render={<Link to="/category" />} variant="outline">
                  Khám phá dịch vụ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Shell>
    );
  }

  if (cartQuery.isError) {
    return (
      <Shell variant="default">
        <div className="py-16 text-center">
          <WarningCircleIcon className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Không thể tải Giỏ hàng</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng thử lại sau.
          </p>
          <Button className="mt-5" onClick={() => void cartQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell variant="default">
      <div className="space-y-8 py-8">
        <div>
          <p className="text-sm font-medium text-primary">Mua sắm</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Giỏ hàng của bạn
          </h1>
          <p className="mt-2 text-muted-foreground">
            Chọn sản phẩm và sử dụng thanh toán an toàn.
          </p>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-semibold">Giỏ hàng đang trống</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Thêm Listing từ Catalog để bắt đầu.
              </p>
              <Button className="mt-5" render={<Link to="/category" />}>
                Khám phá dịch vụ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form
            id="checkout-form"
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              try {
                await checkoutForm.handleSubmit();
              } finally {
                confirmationRequested.current = false;
              }
            }}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-4">
                {items.map((item) => (
                  <CartItemCard
                    actionPending={actionPending}
                    checkoutKey={checkoutKey}
                    item={item}
                    key={item.cartItemId}
                    onRemove={() => {
                      checkoutDescriptionsRef.current.delete(item.listing.id);
                      removeMutation.mutate({ listingId: item.listing.id });
                    }}
                    onDescriptionChange={(description) => {
                      checkoutDescriptionsRef.current.set(
                        item.listing.id,
                        description
                      );
                    }}
                    onCreateAttachment={async (input) => {
                      const attachment =
                        await createCheckoutAttachmentMutation.mutateAsync({
                          ...input,
                          checkoutKey,
                          listingId: item.listing.id,
                        });
                      return {
                        ...attachment,
                        byteSize: attachment.byteSize ?? input.byteSize,
                      };
                    }}
                    onDiscardAttachment={(attachmentId) =>
                      discardCheckoutAttachmentMutation.mutateAsync({
                        attachmentId,
                      })
                    }
                    onBusyChange={(attachmentBusy) => {
                      if (attachmentBusy) {
                        checkoutAttachmentBusyRef.current.add(item.listing.id);
                      } else {
                        checkoutAttachmentBusyRef.current.delete(
                          item.listing.id
                        );
                      }
                      setCheckoutAttachmentsBusy(
                        checkoutAttachmentBusyRef.current.size > 0
                      );
                    }}
                    onSelectPackage={(packageId) => {
                      packageMutation.mutate({
                        listingId: item.listing.id,
                        packageId,
                      });
                    }}
                    onToggle={(selected) => {
                      queueSelectionUpdate({
                        listingId: item.listing.id,
                        selected,
                      });
                    }}
                    selectionPending={selectionPending}
                  />
                ))}
              </div>

              <CheckoutSummary
                hasMissingContract={hasMissingContract}
                hasUnavailableSelected={hasUnavailableSelected}
                selectedCount={selectedItems.length}
                totalAmount={cart?.selectedTotalAmount ?? 0}
              >
                <checkoutForm.Subscribe
                  selector={(state) => ({
                    canSubmit: state.canSubmit,
                    isSubmitting: state.isSubmitting,
                  })}
                >
                  {({ canSubmit, isSubmitting }) => (
                    <>
                      {contractChanged ? (
                        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Một Listing đã thay đổi giá hoặc điều khoản. Bạn cần
                            xác nhận contract mới trước khi tiền di chuyển.
                          </p>
                          <Button
                            className="w-full"
                            disabled={busy || isSubmitting}
                            onClick={() => {
                              confirmationRequested.current = true;
                            }}
                            type="submit"
                          >
                            Xác nhận contract mới
                          </Button>
                        </div>
                      ) : null}
                      <Button
                        className="w-full"
                        disabled={
                          busy ||
                          isSubmitting ||
                          !canSubmit ||
                          selectedItems.length === 0 ||
                          hasUnavailableSelected ||
                          hasMissingContract
                        }
                        size="lg"
                        type="submit"
                      >
                        Thanh toán an toàn
                      </Button>
                    </>
                  )}
                </checkoutForm.Subscribe>
              </CheckoutSummary>
            </div>
          </form>
        )}
      </div>
    </Shell>
  );
};
