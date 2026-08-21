import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CartButton } from "./cart-button";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="/cart">{children}</a>
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
vi.mock("@avin/ui/components/badge", () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => (
    <span {...props}>{children}</span>
  ),
}));
vi.mock("@/features/auth/api/session-query", () => ({
  useSession: mocks.useSession,
}));

vi.mock("@/utils/orpc", () => ({
  orpc: {
    commerce: {
      cart: {
        get: { queryOptions: () => ({ queryKey: ["cart"] }) },
      },
    },
  },
}));

describe("CartButton", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the current unique Listing count for a buyer", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { role: "BUYER" } },
      isPending: false,
    });
    mocks.useQuery.mockReturnValue({ data: { items: [{}, {}] } });

    render(<CartButton />);

    expect(
      screen.getByRole("button", { name: "Giỏ hàng, 2 sản phẩm" })
    ).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not render for sellers", () => {
    mocks.useSession.mockReturnValue({
      data: { user: { role: "SELLER" } },
      isPending: false,
    });
    mocks.useQuery.mockReturnValue({ data: { items: [{}, {}] } });

    const { container } = render(<CartButton />);

    expect(container).toBeEmptyDOMElement();
  });
});
