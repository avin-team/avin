import { describe, expect, it, vi } from "vitest";

import type { CommerceExecutor } from "./cart";
import { getBuyerOrders } from "./orders";

describe("getBuyerOrders", () => {
  it("includes seller storefrontName, storeSlug, and avatarUrl when seller profile exists", async () => {
    const mockExecutor = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          buyerId: "buyer_1",
          checkoutId: "chk_1",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          currency: "VND",
          id: "order_1",
          sellerAvatarUrl: "https://example.com/store-avatar.jpg",
          sellerId: "seller_1",
          sellerImage: "https://example.com/user-avatar.jpg",
          sellerName: "Lê Anh Ngọc",
          sellerStoreSlug: "studio-ngoc",
          sellerStorefrontName: "Studio của Ngọc",
          totalAmount: 100_000,
        },
      ]),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    } as unknown as CommerceExecutor;

    // Mock orderItem query
    vi.spyOn(mockExecutor, "select").mockImplementationOnce(
      () => mockExecutor as unknown as ReturnType<CommerceExecutor["select"]>
    );
    vi.spyOn(mockExecutor, "select").mockImplementationOnce(
      () =>
        ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve([]),
              }),
            }),
          }),
        }) as unknown as ReturnType<CommerceExecutor["select"]>
    );

    const orders = await getBuyerOrders(mockExecutor, "buyer_1");

    expect(orders).toHaveLength(1);
    expect(orders[0]?.seller).toEqual({
      avatarUrl: "https://example.com/store-avatar.jpg",
      id: "seller_1",
      image: "https://example.com/store-avatar.jpg",
      name: "Studio của Ngọc",
      storeSlug: "studio-ngoc",
      storefrontName: "Studio của Ngọc",
    });
  });

  it("falls back to user name and image when storefrontName is missing", async () => {
    const mockExecutor = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          buyerId: "buyer_1",
          checkoutId: "chk_1",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          currency: "VND",
          id: "order_2",
          sellerAvatarUrl: null,
          sellerId: "seller_2",
          sellerImage: "https://example.com/user-avatar.jpg",
          sellerName: "Nguyễn Văn A",
          sellerStoreSlug: null,
          sellerStorefrontName: null,
          totalAmount: 50_000,
        },
      ]),
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    } as unknown as CommerceExecutor;

    vi.spyOn(mockExecutor, "select").mockImplementationOnce(
      () => mockExecutor as unknown as ReturnType<CommerceExecutor["select"]>
    );
    vi.spyOn(mockExecutor, "select").mockImplementationOnce(
      () =>
        ({
          from: () => ({
            innerJoin: () => ({
              where: () => ({
                orderBy: () => Promise.resolve([]),
              }),
            }),
          }),
        }) as unknown as ReturnType<CommerceExecutor["select"]>
    );

    const orders = await getBuyerOrders(mockExecutor, "buyer_1");

    expect(orders).toHaveLength(1);
    expect(orders[0]?.seller).toEqual({
      avatarUrl: null,
      id: "seller_2",
      image: "https://example.com/user-avatar.jpg",
      name: "Nguyễn Văn A",
      storeSlug: null,
      storefrontName: null,
    });
  });
});
