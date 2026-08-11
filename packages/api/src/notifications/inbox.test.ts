import { ORPCError } from "@orpc/server";
import { describe, expect, it, vi } from "vitest";

import { listNotifications, markNotificationRead } from "./inbox";
import type { NotificationExecutor } from "./notification";

const notificationRow = {
  body: "OrderItem đã cập nhật.",
  context: { orderId: "order-1" },
  createdAt: new Date("2026-08-11T03:00:00.000Z"),
  deepLink: "/orders/order-1",
  eventType: "order_item.transition",
  id: "018f3b4c-9f88-7555-8000-000000000001",
  readAt: null,
  recipientUserId: "buyer-1",
  sourceId: "event-1",
  sourceType: "ORDER_ITEM_LIFECYCLE",
  title: "Cập nhật OrderItem",
};

const createListDatabase = (row = notificationRow) => {
  const rowsQuery = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([row]),
        }),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([row]),
        }),
      }),
    }),
  };
  const countQuery = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ count: 1 }]),
    }),
  };

  return {
    select: vi
      .fn()
      .mockReturnValueOnce(rowsQuery)
      .mockReturnValueOnce(countQuery),
  } as unknown as NotificationExecutor;
};

describe("Notification inbox", () => {
  it("lists only the recipient's safe notification view and unread count", async () => {
    const result = await listNotifications({
      database: createListDatabase(),
      input: { limit: 20 },
      userId: "buyer-1",
    });

    expect(result).toEqual({
      items: [
        {
          body: "OrderItem đã cập nhật.",
          context: { orderId: "order-1" },
          createdAt: "2026-08-11T03:00:00.000Z",
          deepLink: "/orders/order-1",
          eventType: "order_item.transition",
          id: "018f3b4c-9f88-7555-8000-000000000001",
          readAt: null,
          sourceId: "event-1",
          sourceType: "ORDER_ITEM_LIFECYCLE",
          title: "Cập nhật OrderItem",
        },
      ],
      nextCursor: null,
      unreadCount: 1,
    });
  });

  it("marks one notification read idempotently for its own recipient", async () => {
    const returning = vi.fn().mockResolvedValue([
      {
        id: notificationRow.id,
        readAt: new Date("2026-08-11T04:00:00.000Z"),
      },
    ]);
    const where = vi.fn().mockReturnValue({ returning });
    const database = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({ where }),
      }),
    } as unknown as NotificationExecutor;

    await expect(
      markNotificationRead({
        database,
        notificationId: notificationRow.id,
        now: new Date("2026-08-11T04:00:00.000Z"),
        userId: "buyer-1",
      })
    ).resolves.toEqual({
      id: notificationRow.id,
      readAt: "2026-08-11T04:00:00.000Z",
    });
  });

  it("falls back to the inbox for an unsafe legacy deep link", async () => {
    const result = await listNotifications({
      database: createListDatabase({
        ...notificationRow,
        deepLink: "https://external.example/phishing",
      }),
      input: { limit: 20 },
      userId: "buyer-1",
    });

    expect(result.items[0]?.deepLink).toBe("/notifications");
  });

  it("does not reveal another recipient's notification", async () => {
    const database = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    } as unknown as NotificationExecutor;

    await expect(
      markNotificationRead({
        database,
        notificationId: notificationRow.id,
        userId: "seller-1",
      })
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
