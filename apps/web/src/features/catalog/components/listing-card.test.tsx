import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ListingCard } from "./listing-card";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => <a href={to.replace("$id", params?.id ?? "")}>{children}</a>,
}));

describe("ListingCard", () => {
  afterEach(cleanup);

  const mockListing = {
    category: {
      id: "sub-1",
      name: "Lấy lại tài khoản",
      slug: "lay-lai-tai-khoan",
    },
    id: "list-1",
    priceAmount: 150_000,
    seller: { id: "seller-1", name: "Agency Viêt Nam" },
    title: "Dịch vụ lấy lại nick FB bị hack",
    type: "SERVICE" as const,
    warrantyDurationHours: 168,
  };

  it("renders listing title, VND formatted price, seller name, and badges", () => {
    render(<ListingCard listing={mockListing} />);

    expect(
      screen.getByText("Dịch vụ lấy lại nick FB bị hack")
    ).toBeInTheDocument();
    expect(screen.getByText("150.000 ₫")).toBeInTheDocument();
    expect(screen.getByText("Agency Viêt Nam")).toBeInTheDocument();
    expect(screen.getByText("Lấy lại tài khoản")).toBeInTheDocument();
    expect(screen.getByText("Bảo hành 168h")).toBeInTheDocument();
  });

  it("makes the entire listing card navigate to the listing detail page", () => {
    render(<ListingCard listing={mockListing} />);

    const link = screen.getByRole("link");

    expect(link).toHaveAttribute("href", "/listing/list-1");
    expect(screen.getByText("150.000 ₫").closest("a")).toBe(link);
  });
});
