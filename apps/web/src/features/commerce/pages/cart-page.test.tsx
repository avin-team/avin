import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  quantity: 1,
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

    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(
      screen.getByRole("button", { name: "Xóa Kháng 282 khỏi Giỏ hàng" })
    ).toBeDisabled();
  });

  it("renders quantity controls and triggers onQuantityChange", async () => {
    const onQuantityChange = vi.fn();
    const user = userEvent.setup();
    render(
      <CartItemCard
        actionPending={false}
        item={{ ...item, quantity: 2 }}
        onQuantityChange={onQuantityChange}
        onRemove={vi.fn()}
        onToggle={vi.fn()}
        selectionPending={false}
      />
    );

    expect(screen.getByText("300.000 ₫")).toBeInTheDocument();
    expect(
      screen.getByText(/150\.000 ₫ \/ lượt × 2 lượt/u)
    ).toBeInTheDocument();

    const increaseBtn = screen.getByRole("button", {
      name: "Tăng số lượng cho Kháng 282",
    });
    await user.click(increaseBtn);
    expect(onQuantityChange).toHaveBeenCalledWith(3);
  });
});
