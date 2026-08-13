import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CategoryCarousel } from "./category-carousel";

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

const categories = [
  {
    description: "Giải pháp Facebook",
    id: "facebook",
    name: "Facebook",
    slug: "facebook",
    subCategories: [
      { id: "recover", name: "Khôi phục Facebook", slug: "recover" },
      { id: "checkpoint", name: "Kháng Checkpoint", slug: "checkpoint" },
      { id: "fanpage", name: "Kháng Fanpage", slug: "fanpage" },
      { id: "growth", name: "Tăng trưởng Facebook", slug: "growth" },
    ],
  },
  {
    description: "Giải pháp Instagram",
    id: "instagram",
    name: "Instagram",
    slug: "instagram",
    subCategories: [
      { id: "growth", name: "Tăng trưởng Instagram", slug: "growth" },
    ],
  },
];

class ObserverMock {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];

  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();
}

describe("CategoryCarousel", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", ObserverMock);
    vi.stubGlobal("ResizeObserver", ObserverMock);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }))
    );
  });

  it("shows the active category and its real subcategories", () => {
    render(<CategoryCarousel categories={categories} />);

    expect(screen.getByText("Giải pháp Facebook")).toBeInTheDocument();
    expect(screen.getByText("Khôi phục Facebook")).toBeInTheDocument();
    expect(screen.getByText("4 lựa chọn")).toBeInTheDocument();
    expect(screen.getByText("Kháng Fanpage")).toBeInTheDocument();
    expect(screen.queryByText("Tăng trưởng Facebook")).not.toBeInTheDocument();
  });

  it("moves to the next category using the carousel control", () => {
    render(<CategoryCarousel categories={categories} />);

    fireEvent.click(screen.getByRole("button", { name: "Danh mục tiếp theo" }));

    expect(screen.getByText("Giải pháp Instagram")).toBeInTheDocument();
    expect(screen.getByText("Tăng trưởng Instagram")).toBeInTheDocument();
  });
});
