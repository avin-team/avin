import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CompactCategoryCard } from "./compact-category-card";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    to,
  }: {
    children: React.ReactNode;
    params?: Record<string, string>;
    to: string;
  }) => (
    <a href={to.replace("$parentSlug", params?.parentSlug ?? "")}>{children}</a>
  ),
}));

describe("CompactCategoryCard", () => {
  afterEach(cleanup);

  it("keeps the category summary compact and links to its detail page", () => {
    render(
      <CompactCategoryCard
        category={{
          description: "Giải pháp Facebook",
          id: "facebook",
          name: "Facebook",
          slug: "facebook",
          subCategories: [
            { id: "recover", name: "Khôi phục", slug: "recover" },
            { id: "growth", name: "Tăng trưởng", slug: "growth" },
          ],
        }}
      />
    );

    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("2 dịch vụ đang hoạt động")).toBeInTheDocument();
    expect(screen.queryByText("Giải pháp Facebook")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/category/facebook"
    );
  });
});
