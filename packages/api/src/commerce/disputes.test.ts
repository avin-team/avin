import { describe, expect, it, vi } from "vitest";

import { getChatMessagesForOrders } from "./disputes";
import type { CommerceExecutor } from "./executor";

describe("getChatMessagesForOrders", () => {
  it("keeps image attachments on chat messages with no text", async () => {
    const orderId = "order_1";
    const queryRows = [
      {
        attachmentByteSize: 1024,
        attachmentContentType: "image/png",
        attachmentFileName: "logo.png",
        attachmentId: "file_1",
        content: null,
        id: "message_1",
        orderId,
        senderName: "Buyer",
        senderRole: "buyer",
        sentAt: new Date("2026-08-07T10:00:00.000Z"),
      },
    ];
    const orderBy = vi.fn().mockResolvedValue(queryRows);
    const query = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy,
      where: vi.fn().mockReturnThis(),
    };
    const database = {
      select: vi.fn().mockReturnValue(query),
    } as unknown as CommerceExecutor;

    const messagesByOrder = await getChatMessagesForOrders(database, [orderId]);

    expect(database.select).toHaveBeenCalledWith(
      expect.objectContaining({ attachmentId: expect.anything() })
    );
    expect(messagesByOrder.get(orderId)).toEqual([
      {
        attachments: [
          {
            byteSize: 1024,
            contentType: "image/png",
            fileName: "logo.png",
            id: "file_1",
          },
        ],
        content: "[Tin nhắn không có nội dung]",
        id: "message_1",
        senderName: "Buyer",
        senderRole: "BUYER",
        sentAt: "2026-08-07T10:00:00.000Z",
      },
    ]);
  });
});
