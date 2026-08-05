import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import {
  getAfterMessages,
  getUnreadCount,
  listMessages,
  markChatRead,
  redactMessage,
  sendMessage,
} from "./chat";

describe("Order Chat Logic", () => {
  const orderId = "018f3b4c-9f88-7555-8000-000000000001";
  const buyerId = "buyer_123";
  const sellerId = "seller_456";
  const adminId = "admin_789";

  const createMockDb = (overrides: Record<string, unknown> = {}) => ({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue({}),
        returning: vi.fn().mockResolvedValue([
          {
            content: "Hello",
            createdAt: new Date(),
            id: "018f3b4c-9f88-7777-8000-000000000099",
            orderId,
            senderId: buyerId,
            senderRole: "buyer",
            type: "text",
          },
        ]),
      }),
    }),
    query: {
      chatReadCursor: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      dispute: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      order: {
        findFirst: vi.fn().mockResolvedValue({
          buyerId,
          id: orderId,
          sellerId,
        }),
      },
      orderFile: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      orderItem: {
        findMany: vi.fn().mockResolvedValue([{ id: "item_1" }]),
      },
      orderMessage: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({ banned: false, id: sellerId }),
      },
      ...(overrides.query as Record<string, unknown>),
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: 0 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "msg_1",
              redactedAt: new Date(),
              redactedByUserId: adminId,
            },
          ]),
        }),
      }),
    }),
    ...overrides,
  });

  it("rejects empty messages without content or attachments", async () => {
    const db = createMockDb() as unknown as typeof db;

    await expect(
      sendMessage({
        database: db,
        input: { content: "   ", orderId },
        userId: buyerId,
      })
    ).rejects.toThrow(ORPCError);
  });

  it("rejects messages exceeding 2000 characters", async () => {
    const db = createMockDb() as unknown as typeof db;

    await expect(
      sendMessage({
        database: db,
        input: { content: "a".repeat(2001), orderId },
        userId: buyerId,
      })
    ).rejects.toThrow(ORPCError);
  });

  it("rejects messages with more than 5 attachments", async () => {
    const db = createMockDb() as unknown as typeof db;

    await expect(
      sendMessage({
        database: db,
        input: {
          attachmentFileIds: ["1", "2", "3", "4", "5", "6"],
          content: "Hi",
          orderId,
        },
        userId: buyerId,
      })
    ).rejects.toThrow(ORPCError);
  });

  it("allows Buyer of order to send message", async () => {
    const db = createMockDb() as unknown as typeof db;

    const result = await sendMessage({
      database: db,
      input: { content: "Hello seller", orderId },
      userId: buyerId,
    });

    expect(result).toMatchObject({
      content: "Hello",
      senderRole: "buyer",
    });
  });

  it("rejects Banned seller from sending messages", async () => {
    const db = createMockDb({
      query: {
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({ banned: true, id: sellerId }),
        },
      },
    }) as unknown as typeof db;

    await expect(
      sendMessage({
        database: db,
        input: { content: "I am seller", orderId },
        userId: sellerId,
      })
    ).rejects.toThrow("Banned seller cannot access order chat");
  });

  it("allows Admin to send message ONLY during an open dispute", async () => {
    const dbNoDispute = createMockDb() as unknown as typeof db;

    await expect(
      sendMessage({
        database: dbNoDispute,
        input: { content: "Admin message", orderId },
        userId: adminId,
        userRole: "ADMIN",
      })
    ).rejects.toThrow("Admin can only send messages during an open dispute");

    const dbWithDispute = createMockDb({
      query: {
        dispute: {
          findFirst: vi.fn().mockResolvedValue({ status: "OPEN" }),
        },
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        orderItem: {
          findMany: vi.fn().mockResolvedValue([{ id: "item_1" }]),
        },
      },
    }) as unknown as typeof db;

    const result = await sendMessage({
      database: dbWithDispute,
      input: { content: "Admin mediation message", orderId },
      userId: adminId,
      userRole: "ADMIN",
    });

    expect(result).toBeDefined();
  });

  it("obscures redacted message content for non-admin viewers", async () => {
    const redactedMsg = {
      content: "Secret offensive text",
      id: "018f3b4c-9f88-7777-8000-000000000010",
      orderId,
      redactedAt: new Date(),
      redactedByUserId: adminId,
      senderId: buyerId,
      senderRole: "buyer",
    };

    const db = createMockDb({
      query: {
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        orderMessage: {
          findMany: vi.fn().mockResolvedValue([redactedMsg]),
        },
      },
    }) as unknown as typeof db;

    const buyerView = await listMessages({
      database: db,
      input: { orderId },
      userId: buyerId,
    });

    expect(buyerView.messages[0]?.content).toBe(
      "[Tin nhắn đã bị ẩn bởi quản trị viên]"
    );

    const adminView = await listMessages({
      database: db,
      input: { orderId },
      userId: adminId,
      userRole: "ADMIN",
    });

    expect(adminView.messages[0]?.content).toBe("Secret offensive text");
  });

  it("fetches messages after cursor for reconnect recovery", async () => {
    const msg = {
      content: "New msg after reconnect",
      id: "018f3b4c-9f88-7777-8000-000000000011",
      orderId,
    };

    const db = createMockDb({
      query: {
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        orderMessage: {
          findMany: vi.fn().mockResolvedValue([msg]),
        },
      },
    }) as unknown as typeof db;

    const res = await getAfterMessages({
      database: db,
      input: { after: "018f3b4c-9f88-7777-8000-000000000000", orderId },
      userId: buyerId,
    });

    expect(res).toHaveLength(1);
    expect(res[0]?.content).toBe("New msg after reconnect");
  });

  it("marks chat as read and fetches unread count", async () => {
    const db = createMockDb() as unknown as typeof db;

    const markRes = await markChatRead({
      database: db,
      input: { messageId: "018f3b4c-9f88-7777-8000-000000000010", orderId },
      userId: buyerId,
    });
    expect(markRes).toEqual({ success: true });

    const unreadRes = await getUnreadCount({
      database: db,
      orderId,
      userId: buyerId,
    });
    expect(unreadRes).toEqual({ unreadCount: 0 });
  });

  it("redacts a message as admin", async () => {
    const db = createMockDb({
      query: {
        orderMessage: {
          findFirst: vi.fn().mockResolvedValue({ id: "msg_1" }),
        },
      },
    }) as unknown as typeof db;

    const redacted = await redactMessage({
      adminUserId: adminId,
      database: db,
      input: { messageId: "msg_1" },
    });

    expect(redacted).toMatchObject({
      id: "msg_1",
      redactedByUserId: adminId,
    });
  });
});
