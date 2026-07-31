import { useMutation } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export const categoriesQueryOptions = () =>
  orpc.listing.categoryGovernance.list.queryOptions({ input: undefined });

const invalidateCategoriesList = () =>
  queryClient.invalidateQueries({
    queryKey: categoriesQueryOptions().queryKey,
  });

export const useCreateParentCategory = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.createParent.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useCreateSubCategory = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.createSub.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useUpdateParentCategory = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.updateParent.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useUpdateSubCategory = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.updateSub.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useReorderParents = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.reorderParents.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useReorderSubs = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.reorderSubs.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useUpdateCategoryStatus = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.updateStatus.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useArchiveCategory = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.archive.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useDeleteCategory = () =>
  useMutation({
    ...orpc.listing.categoryGovernance.delete.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });
