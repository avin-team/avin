import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrdersButton } from "./orders-button";

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/orders">{children}</a>
  ),
}));
vi.mock("@avin/ui/components/button", () => ({
  Button: ({
    children,
    render: _render,
    ...props
  }: {
    children: React.ReactNode;
    render?: React.ReactNode;
  }) => (
    <button {...props} type="button">
      {children}
    </button>
  ),
}));
vi.mock("@/features/auth/api/session-query", () => ({
  useSession: mocks.useSession,
}));

describe("OrdersButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders order button for a buyer", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { role: "BUYER" } },
      isPending: false,
    });

    render(<OrdersButton />);

    expect(
      screen.getByRole("button", { name: "Đơn hàng" })
    ).toBeInTheDocument();
  });

  it("does not render for sellers", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { role: "SELLER" } },
      isPending: false,
    });

    const { container } = render(<OrdersButton />);

    expect(container).toBeEmptyDOMElement();
  });
});
