import { cleanupOrderChatDraftAttachments } from "@avin/api/commerce/chat";
import { db } from "@avin/db";

const ORDER_CHAT_ATTACHMENT_MAINTENANCE_INTERVAL_MS = 15 * 60_000;

export const runOrderChatAttachmentMaintenance = async (): Promise<void> => {
  try {
    await cleanupOrderChatDraftAttachments({ database: db });
  } catch (error) {
    console.error("Order chat attachment maintenance failed", error);
  }
};

export const startOrderChatAttachmentMaintenanceSchedule = (): ReturnType<
  typeof setInterval
> => {
  const runMaintenance = (): void => {
    void runOrderChatAttachmentMaintenance();
  };

  runMaintenance();
  const timer = setInterval(
    runMaintenance,
    ORDER_CHAT_ATTACHMENT_MAINTENANCE_INTERVAL_MS
  );
  timer.unref?.();
  return timer;
};
