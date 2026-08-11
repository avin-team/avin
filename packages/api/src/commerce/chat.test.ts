import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import {
  getAfterMessages,
  getAttachmentUrl,
  getChatNotificationSummary,
  getNotificationRealtimeToken,
  getRealtimeToken,
  getUnreadCount,
  listMessages,
  markChatRead,
  redactMessage,
  sendMessage,
  createAttachment,
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
      sellerEnforcement: {
        findFirst: vi.fn().mockResolvedValue(null),
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

  type MockDatabase = Parameters<typeof sendMessage>[0]["database"];

  it("rejects empty messages without content or attachments", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;

    await expect(
      sendMessage({
        database: mockDb,
        input: { content: "   ", orderId },
        userId: buyerId,
      })
    ).rejects.toThrow(ORPCError);
  });

  it("rejects messages exceeding 2000 characters", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;

    await expect(
      sendMessage({
        database: mockDb,
        input: { content: "a".repeat(2001), orderId },
        userId: buyerId,
      })
    ).rejects.toThrow(ORPCError);
  });

  it("rejects messages with more than 5 attachments", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;

    await expect(
      sendMessage({
        database: mockDb,
        input: {
          attachmentFileIds: ["1", "2", "3", "4", "5", "6"],
          content: "Hi",
          orderId,
        },
        userId: buyerId,
      })
    ).rejects.toThrow(ORPCError);
  });

  it("rejects messages whose attachment total exceeds 50 MB", async () => {
    const mockDb = createMockDb({
      query: {
        dispute: { findFirst: vi.fn().mockResolvedValue(null) },
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        orderFile: {
          findMany: vi.fn().mockResolvedValue([
            {
              byteSize: 30 * 1024 * 1024,
              id: "018f3b4c-9f88-7777-8000-000000000101",
              orderId,
              orderMessageId: null,
              uploadedByUserId: buyerId,
            },
            {
              byteSize: 21 * 1024 * 1024,
              id: "018f3b4c-9f88-7777-8000-000000000102",
              orderId,
              orderMessageId: null,
              uploadedByUserId: buyerId,
            },
          ]),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({ banned: false, id: sellerId }),
        },
      },
    }) as unknown as MockDatabase;

    await expect(
      sendMessage({
        database: mockDb,
        input: {
          attachmentFileIds: [
            "018f3b4c-9f88-7777-8000-000000000101",
            "018f3b4c-9f88-7777-8000-000000000102",
          ],
          content: "",
          orderId,
        },
        userId: buyerId,
      })
    ).rejects.toThrow("Message attachments must not exceed 50 MB in total");
  });

  it("rejects unsupported or oversized chat attachment metadata", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;
    const storageKey = `orders/${orderId}/chat/${buyerId}/attachment_123`;

    await expect(
      createAttachment({
        database: mockDb,
        input: {
          byteSize: 100,
          contentType: "application/x-msdownload",
          fileName: "dangerous.exe",
          orderId,
          storageKey,
        },
        user: { id: buyerId, role: "BUYER" } as never,
      })
    ).rejects.toThrow("Unsupported order chat attachment type");

    await expect(
      createAttachment({
        database: mockDb,
        input: {
          byteSize: 20 * 1024 * 1024 + 1,
          contentType: "application/pdf",
          fileName: "too-large.pdf",
          orderId,
          storageKey,
        },
        user: { id: buyerId, role: "BUYER" } as never,
      })
    ).rejects.toThrow("Order chat attachments must be 20 MB or smaller");
  });

  it("returns signed attachment URLs through the Storage API path", async () => {
    const mockDb = createMockDb({
      query: {
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        orderFile: {
          findFirst: vi.fn().mockResolvedValue({
            id: "018f3b4c-9f88-7777-8000-000000000103",
            orderId,
            storageKey: `orders/${orderId}/chat/${buyerId}/attachment_123`,
          }),
        },
      },
    }) as unknown as MockDatabase;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        signedURL: "/object/sign/order-files/orders/example/file.png",
      })
    );

    const result = await getAttachmentUrl({
      database: mockDb,
      input: { attachmentId: "018f3b4c-9f88-7777-8000-000000000103" },
      userId: buyerId,
    });

    expect(result.url).toContain(
      "/storage/v1/object/sign/order-files/orders/example/file.png"
    );
    fetchMock.mockRestore();
  });

  it("allows Buyer of order to send message", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;

    const result = await sendMessage({
      database: mockDb,
      input: { content: "Hello seller", orderId },
      userId: buyerId,
    });

    expect(result).toMatchObject({
      content: "Hello",
      senderRole: "buyer",
    });
  });

  /* eslint-disable promise/prefer-await-to-callbacks */
  it("preserves the database receiver when using a transaction", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase & {
      transaction: <Result>(
        callback: (transaction: MockDatabase) => Promise<Result>
      ) => Promise<Result>;
    };
    const transaction = vi.fn(function transaction(
      this: typeof mockDb,
      callback: (transaction: MockDatabase) => Promise<unknown>
    ) {
      expect(this).toBe(mockDb);
      return callback(mockDb);
    });
    mockDb.transaction = transaction as never;

    await expect(
      sendMessage({
        database: mockDb,
        input: { content: "Hello seller", orderId },
        userId: buyerId,
      })
    ).resolves.toMatchObject({ content: "Hello", senderRole: "buyer" });
  });
  /* eslint-enable promise/prefer-await-to-callbacks */

  it("rejects marketplace-banned seller from sending messages", async () => {
    const mockDb = createMockDb({
      query: {
        order: {
          findFirst: vi.fn().mockResolvedValue({
            buyerId,
            id: orderId,
            sellerId,
          }),
        },
        sellerEnforcement: {
          findFirst: vi.fn().mockResolvedValue({
            expiresAt: null,
            sellerId,
            state: "BANNED",
          }),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({ banned: true, id: sellerId }),
        },
      },
    }) as unknown as MockDatabase;

    await expect(
      sendMessage({
        database: mockDb,
        input: { content: "I am seller", orderId },
        userId: sellerId,
      })
    ).rejects.toThrow("Banned seller cannot send order chat messages");
  });

  it("allows Admin to send message ONLY during an open dispute", async () => {
    const dbNoDispute = createMockDb() as unknown as MockDatabase;

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
    }) as unknown as MockDatabase;

    const result = await sendMessage({
      database: dbWithDispute,
      input: { content: "Admin mediation message", orderId },
      userId: adminId,
      userRole: "ADMIN",
    });

    expect(result).toBeDefined();
  });

  it("obscures redacted message content and masks attachments & admin metadata for non-admin viewers", async () => {
    const redactedMsg = {
      attachments: [{ id: "file_1", name: "secret.pdf" }],
      content: "Secret offensive text",
      id: "018f3b4c-9f88-7777-8000-000000000010",
      orderId,
      redactedAt: new Date(),
      redactedByUserId: adminId,
      senderId: buyerId,
      senderRole: "buyer",
    };

    const mockDb = createMockDb({
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
    }) as unknown as MockDatabase;

    const buyerView = await listMessages({
      database: mockDb,
      input: { orderId },
      userId: buyerId,
    });

    expect(buyerView.messages[0]?.content).toBe(
      "[Tin nhắn đã bị ẩn bởi quản trị viên]"
    );
    expect(buyerView.messages[0]?.attachments).toEqual([]);
    expect(buyerView.messages[0]?.redactedByUserId).toBeNull();

    const adminView = await listMessages({
      database: mockDb,
      input: { orderId },
      userId: adminId,
      userRole: "ADMIN",
    });

    expect(adminView.messages[0]?.content).toBe("Secret offensive text");
    expect(adminView.messages[0]?.attachments).toHaveLength(1);
    expect(adminView.messages[0]?.redactedByUserId).toBe(adminId);
  });

  it("fetches messages after cursor for reconnect recovery", async () => {
    const msg = {
      content: "New msg after reconnect",
      id: "018f3b4c-9f88-7777-8000-000000000011",
      orderId,
    };

    const mockDb = createMockDb({
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
    }) as unknown as MockDatabase;

    const res = await getAfterMessages({
      database: mockDb,
      input: { after: "018f3b4c-9f88-7777-8000-000000000000", orderId },
      userId: buyerId,
    });

    expect(res).toHaveLength(1);
    expect(res[0]?.content).toBe("New msg after reconnect");
  });

  it("marks chat as read and fetches unread count", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;

    const markRes = await markChatRead({
      database: mockDb,
      input: { messageId: "018f3b4c-9f88-7777-8000-000000000010", orderId },
      userId: buyerId,
    });
    expect(markRes).toEqual({ success: true });

    const unreadRes = await getUnreadCount({
      database: mockDb,
      orderId,
      userId: buyerId,
    });
    expect(unreadRes).toEqual({ unreadCount: 0 });
  });

  it("redacts a message as admin", async () => {
    const mockDb = createMockDb({
      query: {
        orderMessage: {
          findFirst: vi.fn().mockResolvedValue({ id: "msg_1" }),
        },
      },
    }) as unknown as MockDatabase;

    const redacted = await redactMessage({
      adminUserId: adminId,
      database: mockDb,
      input: { messageId: "msg_1" },
    });

    expect(redacted).toMatchObject({
      id: "msg_1",
      redactedByUserId: adminId,
    });
  });

  it("generates realtime channel token for authorized participant", async () => {
    const mockDb = createMockDb() as unknown as MockDatabase;

    const res = await getRealtimeToken({
      createAccessToken: () => Promise.resolve("realtime-access-token"),
      database: mockDb,
      input: { orderId },
      userId: buyerId,
      userRole: "BUYER",
    });

    expect(res).toMatchObject({
      accessToken: "realtime-access-token",
      channel: `order:${orderId}`,
      expiresInSeconds: 600,
    });
  });

  it("generates a private inbox token for chat notifications", async () => {
    const res = await getNotificationRealtimeToken({
      createAccessToken: () => Promise.resolve("realtime-access-token"),
      userId: buyerId,
      userRole: "BUYER",
    });

    expect(res).toEqual({
      accessToken: "realtime-access-token",
      channel: `inbox:buyer:${buyerId}`,
      expiresInSeconds: 600,
    });
  });

  it("returns a total unread count and only the latest notification previews", async () => {
    const mockDb = createMockDb({
      query: {
        order: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    }) as unknown as MockDatabase;
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ value: 4 }]),
          }),
        }),
      }),
    });

    await expect(
      getChatNotificationSummary({ database: mockDb, userId: buyerId })
    ).resolves.toEqual({ conversations: [], unreadCount: 4 });
  });
});
