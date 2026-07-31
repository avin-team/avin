import { useMutation, useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

import type { SellerApplicationStatus } from "../types";

export const sellerApplicationsQueryOptions = (params?: {
  search?: string;
  status?: SellerApplicationStatus | "ALL";
}) =>
  orpc.sellerApplication.adminList.queryOptions({
    input: {
      search: params?.search,
      status: params?.status,
    },
  });

export const sellerApplicationDetailQueryOptions = (id: string) =>
  orpc.sellerApplication.adminGet.queryOptions({
    input: { id },
  });

export const invalidateSellerApplications = () => {
  queryClient.invalidateQueries({
    queryKey: orpc.sellerApplication.adminList.key(),
  });
  queryClient.invalidateQueries({
    queryKey: orpc.sellerApplication.adminGet.key(),
  });
};

export const useAdminSellerApplications = (params?: {
  search?: string;
  status?: SellerApplicationStatus | "ALL";
}) => {
  return useQuery(sellerApplicationsQueryOptions(params));
};

export const useAdminSellerApplication = (id: string) => {
  return useQuery(sellerApplicationDetailQueryOptions(id));
};

export const useAdminDecideSellerApplication = () => {
  return useMutation({
    ...orpc.sellerApplication.adminDecide.mutationOptions(),
    onSuccess: () => {
      invalidateSellerApplications();
    },
  });
};
