import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
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
import {
  ArchiveIcon,
  EyeClosedIcon,
  ClockCounterClockwiseIcon,
  ArrowCounterClockwiseIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";

import {
  useAdminListingAudit,
  useAdminListings,
  useArchiveListing,
  useHideListing,
  useRestoreListing,
} from "../api/listings-api";
import { ListingModerationDialog } from "../components/listing-moderation-dialog";
import { ListingStatusBadge } from "../components/listing-status-badge";
import { getModerationActionLabel, getModerationActions } from "../workflow";
import type {
  ListingFilterStatus,
  ListingStatus,
  ModerationAction,
} from "../workflow";

const STATUS_FILTER_ITEMS: { label: string; value: ListingFilterStatus }[] = [
  { label: "Tất cả trạng thái", value: "ALL" },
  { label: "Bản nháp", value: "DRAFT" },
  { label: "Đang công khai", value: "PUBLISHED" },
  { label: "Seller tạm dừng", value: "PAUSED" },
  { label: "Đã ẩn bởi Admin", value: "HIDDEN" },
  { label: "Đã lưu trữ", value: "ARCHIVED" },
];

const ACTION_ICONS: Record<ModerationAction, typeof EyeClosedIcon> = {
  ARCHIVE: ArchiveIcon,
  HIDE: EyeClosedIcon,
  RESTORE: ArrowCounterClockwiseIcon,
};

const LISTING_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDate = (value: Date | string): string =>
  LISTING_DATE_FORMATTER.format(new Date(value));

const formatPrice = (value: number | null): string =>
  value === null ? "—" : `${value.toLocaleString("vi-VN")} đ`;

const getMetadataText = (
  metadata: Record<string, unknown> | null,
  key: string
): string => {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "—";
};

const getAuditActionLabel = (action: string): string => {
  if (action.endsWith(".hide")) {
    return "Ẩn Listing";
  }
  if (action.endsWith(".restore")) {
    return "Khôi phục Listing";
  }
  if (action.endsWith(".archive")) {
    return "Lưu trữ Listing";
  }
  return action;
};

const showModerationError = (actionError: Error): void => {
  toast.error(actionError.message || "Không thể xử lý Listing");
};

export const ListingsPage = () => {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListingFilterStatus>("ALL");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(
    null
  );
  const [moderationAction, setModerationAction] =
    useState<ModerationAction | null>(null);
  const [selectedListing, setSelectedListing] = useState<{
    id: string;
    status: ListingStatus;
    title: string | null;
  } | null>(null);

  const {
    data: listings = [],
    error,
    isLoading,
  } = useAdminListings({ search, status });
  const { data: auditEntries = [], isLoading: isAuditLoading } =
    useAdminListingAudit(selectedListingId);

  const hideMutation = useHideListing();
  const restoreMutation = useRestoreListing();
  const archiveMutation = useArchiveListing();

  const mutationIsPending =
    hideMutation.isPending ||
    restoreMutation.isPending ||
    archiveMutation.isPending;

  const statusCounts: Record<ListingStatus, number> = {
    ARCHIVED: 0,
    DRAFT: 0,
    HIDDEN: 0,
    PAUSED: 0,
    PUBLISHED: 0,
  };
  for (const listing of listings) {
    statusCounts[listing.status] += 1;
  }

  const handleOpenModeration = (
    listing: { id: string; status: ListingStatus; title: string | null },
    action: ModerationAction
  ) => {
    setSelectedListing(listing);
    setModerationAction(action);
  };

  const handleConfirmModeration = (reason: string) => {
    if (!selectedListing || !moderationAction) {
      return;
    }

    const input = { id: selectedListing.id, reason };
    const onSuccess = () => {
      toast.success(
        `${getModerationActionLabel(moderationAction)} thành công`,
        {
          description:
            "Trạng thái công khai và nhật ký xử lý đã được cập nhật.",
        }
      );
      setModerationAction(null);
    };
    if (moderationAction === "HIDE") {
      hideMutation.mutate(input, {
        onError: showModerationError,
        onSuccess,
      });
      return;
    }
    if (moderationAction === "RESTORE") {
      restoreMutation.mutate(input, {
        onError: showModerationError,
        onSuccess,
      });
      return;
    }
    archiveMutation.mutate(input, {
      onError: showModerationError,
      onSuccess,
    });
  };

  return (
    <>
      <Header fixed>
        <div className="ml-auto">
          <ThemeSwitch />
        </div>
      </Header>
      <Main className="flex flex-1 flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-primary">LISTING GOVERNANCE</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Duyệt sản phẩm
          </h1>
          <p className="text-muted-foreground">
            Post-moderate Listing bằng hide, restore và archive; mọi thay đổi
            đều yêu cầu lý do và được lưu vào nhật ký bất biến.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Đang công khai</CardTitle>
              <ShieldCheckIcon className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{statusCounts.PUBLISHED}</p>
              <CardDescription>Có thể xuất hiện trên sàn</CardDescription>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Cần xử lý</CardTitle>
              <EyeClosedIcon className="size-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{statusCounts.HIDDEN}</p>
              <CardDescription>Listing đang bị ẩn bởi Admin</CardDescription>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Đã lưu trữ</CardTitle>
              <ArchiveIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{statusCounts.ARCHIVED}</p>
              <CardDescription>Terminal, không thể khôi phục</CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="gap-4 border-b sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ArchiveIcon className="size-4 text-primary" />
                Danh sách Listing ({listings.length})
              </CardTitle>
              <CardDescription>
                Seller chỉ kiểm soát pause; Admin là bên duy nhất được hide,
                restore hoặc archive.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search listings"
                  className="ps-9"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm title, slug, Seller..."
                  value={search}
                />
              </div>
              <Select
                items={STATUS_FILTER_ITEMS}
                onValueChange={(value) =>
                  setStatus((value as ListingFilterStatus) ?? "ALL")
                }
                value={status}
              >
                <SelectTrigger
                  aria-label="Filter listing status"
                  className="w-full sm:w-48"
                >
                  <SelectValue placeholder="Trạng thái Listing" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                Đang tải danh sách Listing...
              </div>
            )}
            {error && (
              <div className="m-4 flex h-24 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 px-4 text-center text-destructive">
                Không thể tải danh sách Listing: {error.message}
              </div>
            )}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Listing</TableHead>
                    <TableHead>Seller / Danh mục</TableHead>
                    <TableHead>Giá</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className="text-end">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell className="min-w-52 whitespace-normal">
                        <p className="font-medium">
                          {listing.title?.trim() || "Untitled Listing"}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {listing.slug}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{listing.seller.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {listing.category.parentCategory.name} ·{" "}
                          {listing.category.name}
                        </p>
                      </TableCell>
                      <TableCell>{formatPrice(listing.priceAmount)}</TableCell>
                      <TableCell>
                        <ListingStatusBadge status={listing.status} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(listing.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-56 flex-wrap justify-end gap-2">
                          {getModerationActions(listing.status).map(
                            (action) => {
                              const ActionIcon = ACTION_ICONS[action];
                              return (
                                <Button
                                  key={action}
                                  onClick={() =>
                                    handleOpenModeration(listing, action)
                                  }
                                  size="sm"
                                  variant={
                                    action === "ARCHIVE"
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  <ActionIcon />
                                  {getModerationActionLabel(action)}
                                </Button>
                              );
                            }
                          )}
                          <Button
                            aria-label={`View audit log for ${listing.title ?? listing.slug}`}
                            onClick={() => setSelectedListingId(listing.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <ClockCounterClockwiseIcon />
                            Nhật ký
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {listings.length === 0 && (
                    <TableRow>
                      <TableCell
                        className="h-28 text-center text-muted-foreground"
                        colSpan={6}
                      >
                        Không tìm thấy Listing phù hợp bộ lọc.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {selectedListingId && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Nhật ký moderation</CardTitle>
                <CardDescription>
                  Listing ID:{" "}
                  <span className="font-mono">{selectedListingId}</span>
                </CardDescription>
              </div>
              <Button
                aria-label="Close audit log"
                onClick={() => setSelectedListingId(null)}
                size="sm"
                variant="outline"
              >
                Đóng
              </Button>
            </CardHeader>
            <CardContent>
              {isAuditLoading && (
                <p className="text-sm text-muted-foreground">
                  Đang tải nhật ký...
                </p>
              )}
              {!isAuditLoading && auditEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Listing chưa có moderation audit nào.
                </p>
              )}
              {!isAuditLoading && auditEntries.length > 0 && (
                <div className="grid gap-4">
                  {auditEntries.map((entry) => (
                    <div
                      className="grid gap-2 rounded-lg border p-4 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
                      key={entry.id}
                    >
                      <div>
                        <p className="font-medium">
                          {getAuditActionLabel(entry.action)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                      <div className="grid gap-1 text-sm">
                        <p>
                          {getMetadataText(
                            entry.metadata,
                            "priorVisibilityState"
                          )}{" "}
                          →{" "}
                          {getMetadataText(
                            entry.metadata,
                            "newVisibilityState"
                          )}
                        </p>
                        <p className="text-muted-foreground">
                          {getMetadataText(entry.metadata, "reason")}
                        </p>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        Actor: {entry.actorUserId}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </Main>

      <ListingModerationDialog
        action={moderationAction}
        listing={selectedListing}
        onConfirm={handleConfirmModeration}
        onOpenChange={(open) => {
          if (!open) {
            setModerationAction(null);
          }
        }}
        open={moderationAction !== null}
        pending={mutationIsPending}
      />
    </>
  );
};
