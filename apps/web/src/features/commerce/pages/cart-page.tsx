import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Skeleton } from "@avin/ui/components/skeleton";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Shell } from "@/components/shell";
import {
  removeCartItemOptimistically,
  setCartItemPackageOptimistically,
  setCartItemSelectedOptimistically,
} from "@/features/commerce/cart-cache";
import type { CartView } from "@/features/commerce/cart-cache";
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
          className="h-8 min-w-[130px] text-xs font-medium"
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
  item,
  onRemove,
  onSelectPackage,
  onToggle,
  selectionPending,
}: {
  actionPending: boolean;
  item: CartItem;
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
  const disabled = actionPending || selectionPending;

  return (
    <Card className={item.selected ? "border-primary/40" : "opacity-80"}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <input
            aria-label={`Chọn ${item.listing.title ?? "Listing"}`}
            checked={item.selected}
            className="mt-1 size-4 accent-primary"
            disabled={actionPending}
            onChange={(event) => onToggle(event.target.checked)}
            type="checkbox"
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
                  <Clock3 className="size-3.5 text-muted-foreground" />
                  {item.listing.processingTimeHours ?? "—"} giờ xử lý
                </span>
                <span className="inline-flex items-center gap-1">
                  <LockKeyhole className="size-3.5 text-primary" />
                  Escrow bảo vệ
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
                  aria-label={`Xóa ${item.listing.title ?? "Listing"} khỏi Cart`}
                  disabled={disabled}
                  onClick={onRemove}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
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
      <CardTitle>Tóm tắt Checkout</CardTitle>
      <CardDescription>{selectedCount} Listing được chọn</CardDescription>
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
          <CheckCircle2 className="size-4 text-emerald-500" />
          Mỗi người bán có đơn hàng riêng
        </p>
        <p className="flex items-center gap-2">
          <LockKeyhole className="size-4 text-primary" />
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
          Cart cần được tải lại để xem lại contract hiện tại.
        </p>
      ) : null}
      {children}
    </CardContent>
  </Card>
);

export const CartPage = () => {
  const queryClient = useQueryClient();
  const cartQuery = useQuery(orpc.commerce.cart.get.queryOptions());
  const [contractChanged, setContractChanged] = useState(false);
  const checkoutKey = useRef<string | null>(null);
  const confirmationRequested = useRef(false);
  const selectionQueueRef = useRef<Promise<void> | null>(null);
  const pendingSelectionCountRef = useRef(0);
  const selectionLastServerCartRef = useRef<CartView | null>(null);
  const selectionHadErrorRef = useRef(false);
  const [selectionPending, setSelectionPending] = useState(false);

  const getCheckoutKey = (): string => {
    if (checkoutKey.current === null) {
      checkoutKey.current = crypto.randomUUID();
    }
    return checkoutKey.current;
  };

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
      _variables,
      context: { previousCart?: CartView } | undefined
    ) => {
      if (context?.previousCart) {
        queryClient.setQueryData(
          orpc.commerce.cart.get.queryOptions().queryKey,
          context.previousCart
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
    onSettled: invalidateCart,
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(
        orpc.commerce.cart.get.queryOptions().queryKey,
        updatedCart
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
            : "Không thể cập nhật Cart. Vui lòng thử lại."
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
          : "Không thể xóa Listing khỏi Cart. Vui lòng thử lại."
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

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const selectedItems = items.filter((item) => item.selected);
  const hasUnavailableSelected = selectedItems.some((item) => !item.available);
  const hasMissingContract = selectedItems.some(
    (item) => item.contractFingerprint === null
  );
  const actionPending = removeMutation.isPending || checkoutMutation.isPending;
  const busy = actionPending || selectionPending;

  const submitCheckout = async (confirm = false): Promise<void> => {
    if (!cart || selectedItems.length === 0) {
      return;
    }

    try {
      await checkoutMutation.mutateAsync({
        confirmMaterialChanges: confirm,
        idempotencyKey: getCheckoutKey(),
        items: selectedItems.map((item) => ({
          contractFingerprint: item.contractFingerprint ?? "0".repeat(64),
          listingId: item.listing.id,
          packageId: item.selectedPackageId,
        })),
      });
      checkoutKey.current = crypto.randomUUID();
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
      toast.success("Checkout thành công. Tiền đã được giữ trong Escrow.");
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

  if (cartQuery.isError) {
    return (
      <Shell variant="default">
        <div className="py-16 text-center">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-xl font-bold">Không thể tải Cart</h1>
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
            Cart của bạn
          </h1>
          <p className="mt-2 text-muted-foreground">
            Chọn Listing và thanh toán được bảo vệ bởi Escrow.
          </p>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg font-semibold">Cart đang trống</p>
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
                    item={item}
                    key={item.cartItemId}
                    onRemove={() => {
                      removeMutation.mutate({ listingId: item.listing.id });
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
