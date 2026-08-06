import type { BuyerOrderView } from "@avin/api/commerce/orders";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { BuyerOrdersTable } from "./buyer-orders-table";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    children?: ReactNode;
    to?: string;
    params?: Record<string, string>;
  }) => (
    <a href={`${to}?slug=${params?.slug}`} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

const mockOrders: BuyerOrderView[] = [
  {
    buyerId: "buyer-1",
    checkoutId: "chk-1",
    createdAt: "2026-08-01T00:00:00.000Z",
    currency: "VND",
    id: "ord-1",
    items: [
      {
        deliveredAt: null,
        deliveryReviewDeadlineAt: null,
        escrowHold: { amount: 150_000, id: "esc-1", status: "HELD" },
        id: "item-1",
        listing: {
          slug: "mo-khoa-facebook",
          thumbnailUrl: "https://example.com/fb.png",
          title: "Mở Khoá Facebook",
          type: "SERVICE",
        },
        listingId: "list-1",
        priceAmount: 150_000,
        processingDeadlineAt: "2026-08-05T00:00:00.000Z",
        processingTimeHours: 48,
        status: "IN_PROGRESS",
        warrantyExpiresAt: null,
        warrantyPolicy: { durationHours: 24, terms: "Warranty 24h" },
      },
    ],
    seller: {
      avatarUrl: "https://example.com/store-avatar.png",
      id: "seller-1",
      image: "https://example.com/user-avatar.png",
      name: "Lê Anh Ngọc",
      storeSlug: "studio-ngoc",
      storefrontName: "Studio của Ngọc",
    },
    sellerId: "seller-1",
    totalAmount: 150_000,
  },
];

describe("BuyerOrdersTable", () => {
  it("renders 'Cửa hàng' header and displays store storefrontName with a store link", () => {
    render(<BuyerOrdersTable orders={mockOrders} />);

    // Header should be "Cửa hàng"
    expect(screen.getByText("Cửa hàng")).toBeInTheDocument();

    // Storefront name should be displayed
    const storeLink = screen.getByText("Studio của Ngọc");
    expect(storeLink).toBeInTheDocument();

    // Link should point to store page
    expect(storeLink.closest("a")).toHaveAttribute(
      "href",
      "/store/$slug?slug=studio-ngoc"
    );
  });

  it("falls back to seller name if storefrontName is missing", () => {
    const ordersWithoutStorefrontName: BuyerOrderView[] = [
      {
        ...mockOrders[0],
        seller: {
          avatarUrl: null,
          id: "seller-2",
          image: null,
          name: "Đăng Phúc Lê Quý",
          storeSlug: null,
          storefrontName: null,
        },
      },
    ];

    render(<BuyerOrdersTable orders={ordersWithoutStorefrontName} />);

    expect(screen.getByText("Đăng Phúc Lê Quý")).toBeInTheDocument();
  });
});
