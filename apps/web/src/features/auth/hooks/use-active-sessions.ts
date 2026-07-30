import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/features/auth/api/auth-client";

export type ActiveSession = NonNullable<
  Awaited<ReturnType<typeof authClient.listSessions>>["data"]
>[number];

const activeSessionsQueryKey = ["auth", "sessions"] as const;

const listActiveSessions = async (): Promise<ActiveSession[]> => {
  const result = await authClient.listSessions();

  if (result.error) {
    throw new Error(result.error.message ?? "Không thể tải phiên đăng nhập.");
  }

  return result.data ?? [];
};

const revokeActiveSession = async (token: string): Promise<string> => {
  let result: Awaited<ReturnType<typeof authClient.revokeSession>>;

  try {
    result = await authClient.revokeSession({ token });
  } catch {
    throw new Error("Không thể thu hồi phiên lúc này. Vui lòng thử lại.");
  }

  if (result.error) {
    throw new Error(result.error.message ?? "Không thể thu hồi phiên.");
  }

  return token;
};

export const useActiveSessions = (currentSessionToken: string | undefined) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    queryFn: listActiveSessions,
    queryKey: activeSessionsQueryKey,
  });
  const revokeSessionMutation = useMutation({
    mutationFn: revokeActiveSession,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async (token) => {
      toast.success("Đã thu hồi phiên đăng nhập.");

      if (token === currentSessionToken) {
        await navigate({ to: "/(auth)/login" });
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: activeSessionsQueryKey,
      });
    },
  });

  return {
    revokeSession: revokeSessionMutation.mutate,
    revokingToken: revokeSessionMutation.isPending
      ? revokeSessionMutation.variables
      : null,
    sessionsQuery,
  };
};
