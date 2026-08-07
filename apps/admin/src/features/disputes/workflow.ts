import type {
  Dispute,
  DisputeChatMessage,
  DisputeResolutionOutcome,
  DisputeStatus,
} from "./types";

export const canResolveDispute = (status: DisputeStatus): boolean =>
  status === "OPEN" || status === "UNDER_REVIEW";

export const resolveDispute = (
  dispute: Dispute,
  outcome: DisputeResolutionOutcome,
  note: string,
  adminMessage?: string,
  adminName = "Avin Admin Mediation"
): Dispute => {
  if (!canResolveDispute(dispute.status)) {
    throw new Error(`Tranh chấp đã được xử lý xong (${dispute.status})`);
  }

  const trimmedNote = note.trim();
  if (trimmedNote.length === 0) {
    throw new Error("Ghi chú quyết định xử lý khiếu nại không được để trống");
  }

  const now = new Date().toISOString();

  const newChatMessages: DisputeChatMessage[] = [...dispute.chatMessages];

  if (adminMessage && adminMessage.trim().length > 0) {
    newChatMessages.push({
      attachments: [],
      content: adminMessage.trim(),
      id: `msg_admin_${Date.now()}`,
      senderName: adminName,
      senderRole: "ADMIN",
      sentAt: now,
    });
  }

  return {
    ...dispute,
    chatMessages: newChatMessages,
    resolutionNote: trimmedNote,
    resolvedAt: now,
    status: outcome,
  };
};
