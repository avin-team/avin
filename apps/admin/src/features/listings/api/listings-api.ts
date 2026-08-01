import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

import type { ListingFilterStatus } from "../workflow";

export const adminListingsQueryOptions = (params?: {
  search?: string;
  status?: ListingFilterStatus;
}) =>
  orpc.listing.adminModeration.list.queryOptions({
    input: {
      search: params?.search,
      status: params?.status ?? "ALL",
    },
  });

export const adminListingAuditQueryOptions = (listingId: string) =>
  orpc.listing.adminModeration.auditLog.queryOptions({
    input: { listingId },
  });

const invalidateAdminListings = () => {
  queryClient.invalidateQueries({
    queryKey: orpc.listing.adminModeration.list.key(),
  });
  queryClient.invalidateQueries({
    queryKey: orpc.listing.adminModeration.auditLog.key(),
  });
};

export const useAdminListings = (params?: {
  search?: string;
  status?: ListingFilterStatus;
}) => useQuery(adminListingsQueryOptions(params));

export const useAdminListingAudit = (listingId: string | null) =>
  useQuery({
    ...adminListingAuditQueryOptions(listingId ?? ""),
    enabled: Boolean(listingId),
  });

export const useHideListing = () =>
  useMutation({
    ...orpc.listing.adminModeration.hide.mutationOptions(),
    onSuccess: invalidateAdminListings,
  });

export const useRestoreListing = () =>
  useMutation({
    ...orpc.listing.adminModeration.restore.mutationOptions(),
    onSuccess: invalidateAdminListings,
  });

export const useArchiveListing = () =>
  useMutation({
    ...orpc.listing.adminModeration.archive.mutationOptions(),
    onSuccess: invalidateAdminListings,
  });
