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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@avin/ui/components/dropdown-menu";
import { Skeleton } from "@avin/ui/components/skeleton";
import {
  WarningCircleIcon,
  ArrowSquareOutIcon,
  NotePencilIcon,
  DotsThreeIcon,
  PackageIcon,
  PlusIcon,
  ArrowClockwiseIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

import { useSellerEnforcement } from "../api/seller-enforcement-api";
import {
  formatSellerListingPrice,
  getSellerListingActionLabel,
  getSellerListingStatusClass,
  getSellerListingStatusLabel,
  getSellerListingTypeLabel,
} from "./store-products-logic";
import type {
  SellerListingStatus,
  SellerListingType,
} from "./store-products-logic";

interface SellerProductListItem {
  id: string;
  priceAmount: number | null;
  slug: string | null;
  status: SellerListingStatus;
  title: string | null;
  type: SellerListingType;
}

const ProductRow = ({
  listing,
  onDelete,
  onOpen,
}: {
  listing: SellerProductListItem;
  onDelete: () => void;
  onOpen: () => void;
}) => (
  <li className="relative flex flex-wrap items-center gap-4 rounded-2xl border-b border-border/60 px-2 py-4 transition-colors hover:bg-muted/30 last:border-b-0">
    <Link
      aria-label={`Mở ${listing.title || "sản phẩm chưa đặt tên"}`}
      className="absolute inset-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary"
      params={{ id: listing.id }}
      to="/seller/listings/$id"
    />
    <div className="pointer-events-none flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <PackageIcon className="size-4" />
    </div>
    <div className="pointer-events-none min-w-0 flex-1">
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
    <div className="relative z-10 flex items-center gap-2">
      <Button onClick={onOpen} size="sm" variant="outline">
        <NotePencilIcon />
        {getSellerListingActionLabel(listing.status)}
      </Button>
      {listing.status === "PUBLISHED" && listing.slug ? (
        <Button
          render={<Link params={{ id: listing.slug }} to="/listing/$id" />}
          size="sm"
          variant="ghost"
        >
          <ArrowSquareOutIcon />
          Xem
        </Button>
      ) : null}
      {listing.status === "DRAFT" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="Thao tác với bản nháp"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <DotsThreeIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete} variant="destructive">
              <TrashIcon />
              Xóa bản nháp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  </li>
);

export const StoreProductsPanel = () => {
  const navigate = useNavigate({ from: "/seller/store" });
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] =
    useState<SellerProductListItem | null>(null);
  const { data: enforcement } = useSellerEnforcement();
  const isEnforced =
    enforcement?.state === "SUSPENDED" || enforcement?.state === "BANNED";

  const listingsQuery = useQuery(
    orpc.listing.sellerWorkspace.listMine.queryOptions({
      retry: false,
      throwOnError: false,
    })
  );
  const deleteMutation = useMutation(
    orpc.listing.sellerWorkspace.deleteDraft.mutationOptions({
      onError: () => {
        toast.error("Không thể xóa bản nháp. Vui lòng thử lại.");
      },
      onSuccess: async () => {
        setPendingDelete(null);
        await queryClient.invalidateQueries({
          queryKey: orpc.listing.sellerWorkspace.listMine.key(),
        });
        toast.success("Đã xóa bản nháp.");
      },
    })
  );

  const openEditor = (id: string) => {
    if (isEnforced && id === "new") {
      toast.error(
        `Không thể tạo sản phẩm mới khi tài khoản đang bị ${enforcement.state}`
      );
      return;
    }
    void navigate({ params: { id }, to: "/seller/listings/$id" });
  };

  const openNewEditor = () => openEditor("new");

  const handleDelete = async (): Promise<void> => {
    if (!pendingDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: pendingDelete.id });
    } catch {
      // The mutation's error handler already surfaces feedback to the seller.
    }
  };

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
          <WarningCircleIcon className="size-4" />
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
          <ArrowClockwiseIcon />
          Thử lại
        </Button>
      </section>
    );
  }

  const listings = listingsQuery.data ?? [];

  return (
    <>
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
          <Button onClick={openNewEditor}>
            <PlusIcon />
            Thêm sản phẩm
          </Button>
        </div>

        {listings.length > 0 ? (
          <ul className="mt-4">
            {listings.map((listing) => (
              <ProductRow
                key={listing.id}
                listing={listing}
                onDelete={() => setPendingDelete(listing)}
                onOpen={() => openEditor(listing.id)}
              />
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/10 px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PackageIcon className="size-6" />
            </span>
            <h2 className="mt-4 font-semibold">Gian hàng chưa có sản phẩm</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              Tạo sản phẩm đầu tiên để bắt đầu giới thiệu dịch vụ tới khách
              hàng.
            </p>
            <Button className="mt-5" onClick={openNewEditor}>
              <PlusIcon />
              Tạo sản phẩm đầu tiên
            </Button>
          </div>
        )}
      </section>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setPendingDelete(null);
          }
        }}
        open={pendingDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bản nháp?</AlertDialogTitle>
            <AlertDialogDescription>
              Bản nháp “{pendingDelete?.title || "Sản phẩm chưa đặt tên"}” và
              các hình ảnh đã tải lên sẽ bị xóa. Thao tác này không thể hoàn
              tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Tiếp tục chỉnh sửa
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => void handleDelete()}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Đang xóa…" : "Xóa bản nháp"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
