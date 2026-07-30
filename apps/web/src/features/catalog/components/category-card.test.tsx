import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CategoryCard } from "./category-card";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to.replace("$parentSlug", params?.parentSlug ?? "")}>{children}</a>
  ),
}));

describe("CategoryCard", () => {
  afterEach(cleanup);

  const mockCategory = {
    description: "Kháng cờ fanpage và tăng trưởng Facebook",
    id: "cat-1",
    name: "Dịch vụ Facebook",
    slug: "dich-vu-facebook",
    subCategories: [
      { id: "sub-1", name: "Lấy lại tài khoản", slug: "lay-lai-tai-khoan" },
      { id: "sub-2", name: "Kháng checkpoint", slug: "khang-checkpoint" },
    ],
  };

  it("renders category details, subcategories count and name tags", () => {
    render(<CategoryCard category={mockCategory} />);

    expect(screen.getByText("Dịch vụ Facebook")).toBeInTheDocument();
    expect(
      screen.getByText("Kháng cờ fanpage và tăng trưởng Facebook")
    ).toBeInTheDocument();
    expect(screen.getByText("2 danh mục con")).toBeInTheDocument();
    expect(screen.getByText("Lấy lại tài khoản")).toBeInTheDocument();
    expect(screen.getByText("Kháng checkpoint")).toBeInTheDocument();
  });

  it("renders explore link to category detail page", () => {
    render(<CategoryCard category={mockCategory} />);

    const link = screen.getByRole("link", { name: /Xem danh mục/iu });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/category/dich-vu-facebook");
  });
});
