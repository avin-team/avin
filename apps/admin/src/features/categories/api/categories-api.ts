import { useMutation } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export const categoriesQueryOptions = () =>
  orpc.category.list.queryOptions({ input: undefined });

const invalidateCategoriesList = () =>
  queryClient.invalidateQueries({
    queryKey: categoriesQueryOptions().queryKey,
  });

export const useCreateParentCategory = () =>
  useMutation({
    ...orpc.category.createParent.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useCreateSubCategory = () =>
  useMutation({
    ...orpc.category.createSub.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useUpdateParentCategory = () =>
  useMutation({
    ...orpc.category.updateParent.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useUpdateSubCategory = () =>
  useMutation({
    ...orpc.category.updateSub.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useReorderParents = () =>
  useMutation({
    ...orpc.category.reorderParents.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useReorderSubs = () =>
  useMutation({
    ...orpc.category.reorderSubs.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useUpdateCategoryStatus = () =>
  useMutation({
    ...orpc.category.updateStatus.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useArchiveCategory = () =>
  useMutation({
    ...orpc.category.archive.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });

export const useDeleteCategory = () =>
  useMutation({
    ...orpc.category.delete.mutationOptions(),
    onSuccess: () => {
      invalidateCategoriesList();
    },
  });
