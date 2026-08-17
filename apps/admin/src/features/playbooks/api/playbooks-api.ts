import { useMutation } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";

export const advisorPlaybooksQueryOptions = () =>
  orpc.advisor.playbook.list.queryOptions({ input: undefined });

const invalidateAdvisorPlaybooks = () =>
  queryClient.invalidateQueries({
    queryKey: advisorPlaybooksQueryOptions().queryKey,
  });

export const useCreateAdvisorPlaybookDraft = () =>
  useMutation({
    ...orpc.advisor.playbook.createDraft.mutationOptions(),
    onSuccess: () => {
      invalidateAdvisorPlaybooks();
    },
  });

export const useUpdateAdvisorPlaybookDraft = () =>
  useMutation({
    ...orpc.advisor.playbook.updateDraft.mutationOptions(),
    onSuccess: () => {
      invalidateAdvisorPlaybooks();
    },
  });

export const useTestAdvisorPlaybook = () =>
  useMutation({
    ...orpc.advisor.playbook.test.mutationOptions(),
    onSuccess: () => {
      invalidateAdvisorPlaybooks();
    },
  });

export const usePublishAdvisorPlaybook = () =>
  useMutation({
    ...orpc.advisor.playbook.publish.mutationOptions(),
    onSuccess: () => {
      invalidateAdvisorPlaybooks();
    },
  });

export const useArchiveAdvisorPlaybook = () =>
  useMutation({
    ...orpc.advisor.playbook.archive.mutationOptions(),
    onSuccess: () => {
      invalidateAdvisorPlaybooks();
    },
  });
