import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartItemCard } from "./cart-page";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
}));

const item = {
  available: true,
  cartItemId: "cart-item-1",
  contractFingerprint: "fingerprint-1",
  listing: {
    id: "listing-1",
    priceAmount: 150_000,
    processingTimeHours: 48,
    slug: "listing-1",
    thumbnailUrl: null,
    title: "Kháng 282",
    type: "SERVICE" as const,
    warrantyDurationHours: 72,
  },
  selected: true,
  seller: { id: "seller-1", image: null, name: "Dịch vụ Facebook" },
};

describe("CartItemCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps the checkbox enabled while a selection request is pending", () => {
    render(
      <CartItemCard
        actionPending={false}
        item={item}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
        selectionPending
      />
    );

    expect(screen.getByRole("checkbox")).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Xóa Kháng 282 khỏi Giỏ hàng" })
    ).toBeDisabled();
  });

  it("disables both cart actions while a conflicting action is pending", () => {
    render(
      <CartItemCard
        actionPending
        item={item}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
        selectionPending={false}
      />
    );

    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Xóa Kháng 282 khỏi Giỏ hàng" })
    ).toBeDisabled();
  });
});
